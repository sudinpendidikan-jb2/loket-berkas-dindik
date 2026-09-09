import { NextRequest, NextResponse } from "next/server";
import { getAdminByUsername } from "@/lib/db";
import { verifyPassword, createSessionToken, validatePasswordLength } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Maksimal 5 percobaan login per IP setiap 10 menit, untuk memperlambat
// serangan brute-force / password guessing terhadap akun admin.
const LOGIN_LIMIT_PER_IP = 5;
const LOGIN_WINDOW_PER_IP_MS = 10 * 60 * 1000;

// Lockout per-username (WSTG-ATHN-03, Temuan 3): limiter per-IP saja bisa
// dilewati dengan botnet / IP dinamis yang tetap menyasar satu username.
// Kunci kedua ini independen dari IP, jadi satu akun tetap terlindungi
// meski penyerang berganti-ganti sumber IP.
const LOGIN_LIMIT_PER_USER = 8;
const LOGIN_WINDOW_PER_USER_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan kata sandi wajib diisi." }, { status: 400 });
    }

    // Cek panjang password SEBELUM menyentuh rate limiter atau memanggil
    // scryptSync (lihat lib/auth.ts) agar payload password raksasa tidak
    // bisa menyaturasi CPU (WSTG-ATHN-07).
    const passwordError = validatePasswordLength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const ip = getClientIp(req);

    const [ipLimit, userLimit] = await Promise.all([
      rateLimit(`login:ip:${ip}`, LOGIN_LIMIT_PER_IP, LOGIN_WINDOW_PER_IP_MS),
      rateLimit(`login:user:${normalizedUsername}`, LOGIN_LIMIT_PER_USER, LOGIN_WINDOW_PER_USER_MS),
    ]);

    const blocked = !ipLimit.allowed || !userLimit.allowed;
    if (blocked) {
      const retryAfterMs = Math.max(ipLimit.retryAfterMs, userLimit.retryAfterMs);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const admin = await getAdminByUsername(normalizedUsername);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    }

    const token = createSessionToken({
      username: admin.username,
      name: admin.nama,
      initials: admin.initials,
      exp: Date.now() + 1000 * 60 * 60 * 8,
    });

    const res = NextResponse.json({ ok: true, nama: admin.nama, initials: admin.initials });
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 jam
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal masuk. Coba lagi." }, { status: 500 });
  }
}
