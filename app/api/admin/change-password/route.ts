import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getAdminByUsername, updateAdminPassword, hitRateLimit } from "@/lib/db";
import { getSession, verifyPassword, hashPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/auth";

// WSTG-ATHN-08: sebelumnya tidak ada cara bagi petugas untuk mengganti kata
// sandinya sendiri -- kalau akun bocor/dicurigai, satu-satunya jalan adalah
// mengubah manual lewat query database. Endpoint ini menutup celah itu.
//
// Rate limit per akun tetap dipasang di sini juga: seseorang yang berhasil
// mencuri/menebak cookie sesi admin (tanpa tahu kata sandi aslinya) tidak
// boleh bisa mencoba banyak kemungkinan "kata sandi saat ini" tanpa batas.
const ATTEMPT_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    await ensureSchema();

    const check = await hitRateLimit(`changepw:${session.username}`, ATTEMPT_LIMIT, WINDOW_MS);
    if (!check.allowed) {
      const retryAfterSec = Math.ceil(check.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }
    if (String(currentPassword).length > MAX_PASSWORD_LENGTH || String(newPassword).length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json({ error: "Kata sandi tidak valid." }, { status: 400 });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Kata sandi baru minimal ${MIN_PASSWORD_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    const admin = await getAdminByUsername(session.username);
    if (!admin || !verifyPassword(currentPassword, admin.password_hash)) {
      return NextResponse.json({ error: "Kata sandi saat ini salah." }, { status: 401 });
    }

    await updateAdminPassword(admin.username, hashPassword(newPassword));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengganti kata sandi." }, { status: 500 });
  }
}
