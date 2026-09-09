import { NextRequest, NextResponse } from "next/server";
import { getAdminByUsername, updateAdminPassword } from "@/lib/db";
import {
  getSession,
  hashPassword,
  verifyPassword,
  validatePasswordLength,
} from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// WSTG-ATHN-08: sebelumnya tidak ada cara mandiri untuk mengganti kata
// sandi — kalau lupa atau akun dicurigai kompromis, satu-satunya jalan
// adalah query manual ke database. Endpoint ini memberi petugas yang
// SUDAH login jalur resmi untuk mengganti kata sandinya sendiri.
//
// Catatan cakupan: ini BUKAN alur "lupa kata sandi" (forgot-password) lewat
// email/OTP, karena aplikasi belum punya layanan pengiriman email. Selama
// itu belum ada, akun yang benar-benar lupa kata sandi (bukan sekadar ingin
// menggantinya) tetap harus dibantu petugas lain yang masih bisa login lewat
// endpoint /api/admin/register untuk dibuatkan akun baru, atau lewat query
// manual sebagai jalan terakhir.
const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterMs } = await rateLimit(
      `change-password:${session.username}:${ip}`,
      LIMIT,
      WINDOW_MS
    );
    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Kata sandi saat ini dan kata sandi baru wajib diisi." },
        { status: 400 }
      );
    }

    // Batasi panjang KEDUA input sebelum scryptSync dipanggil (WSTG-ATHN-07).
    const currentError = validatePasswordLength(currentPassword);
    if (currentError) {
      return NextResponse.json({ error: currentError }, { status: 400 });
    }
    const newError = validatePasswordLength(newPassword);
    if (newError) {
      return NextResponse.json({ error: newError }, { status: 400 });
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
