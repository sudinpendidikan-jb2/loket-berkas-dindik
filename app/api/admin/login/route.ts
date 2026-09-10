import { NextRequest, NextResponse } from "next/server";
import { getAdminByUsername } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Maksimal 5 percobaan login per IP setiap 10 menit, untuk memperlambat
// serangan brute-force / password guessing terhadap akun admin.
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterMs } = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan kata sandi wajib diisi." }, { status: 400 });
    }
    // Batas panjang input, supaya orang tidak bisa mengirim string raksasa
    // (mis. jutaan karakter) untuk memicu scrypt memproses payload besar
    // secara berulang-ulang (DoS pada CPU/memori server).
    if (String(username).length > 100 || String(password).length > 200) {
      return NextResponse.json({ error: "Username atau kata sandi terlalu panjang." }, { status: 400 });
    }

    const admin = await getAdminByUsername(String(username).trim().toLowerCase());
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
