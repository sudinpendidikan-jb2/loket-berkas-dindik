import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getAdminByUsername, hitRateLimit, resetRateLimit } from "@/lib/db";
import { verifyPassword, createSessionToken, MAX_PASSWORD_LENGTH } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";

// Maksimal percobaan login per IP dan per akun (username), dalam jendela
// waktu yang sama. Keduanya dicek terpisah (WSTG-ATHN-03):
//  - Limit per IP menahan satu penyerang yang mencoba banyak username dari
//    alamat yang sama.
//  - Limit per USERNAME (account-level lockout) menahan penyerang yang
//    menyebar percobaan dari banyak IP/botnet ke SATU akun spesifik --
//    yang tidak akan terhalang kalau cuma ada limit per-IP.
const IP_LIMIT = 8;
const USERNAME_LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const ip = getClientIp(req);
    const ipCheck = await hitRateLimit(`login:ip:${ip}`, IP_LIMIT, WINDOW_MS);
    if (!ipCheck.allowed) {
      const retryAfterSec = Math.ceil(ipCheck.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan kata sandi wajib diisi." }, { status: 400 });
    }

    // WSTG-ATHN-07: tolak lebih dulu SEBELUM masuk ke scryptSync (yang mahal
    // secara komputasi), supaya payload password raksasa tidak bisa dipakai
    // untuk membebani CPU server (resource exhaustion / DoS).
    if (String(password).length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json({ error: "Kata sandi tidak valid." }, { status: 400 });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const userCheck = await hitRateLimit(`login:user:${normalizedUsername}`, USERNAME_LIMIT, WINDOW_MS);
    if (!userCheck.allowed) {
      const retryAfterSec = Math.ceil(userCheck.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const admin = await getAdminByUsername(normalizedUsername);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    }

    // Login berhasil -> hapus jejak percobaan gagal sebelumnya supaya tidak
    // ikut menumpuk ke arah lockout berikutnya.
    await resetRateLimit(`login:ip:${ip}`);
    await resetRateLimit(`login:user:${normalizedUsername}`);

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
