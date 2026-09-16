import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getAdminByUsername, createOtpCode } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// Purpose OTP yang didukung endpoint ini. Kalau nanti ada kebutuhan OTP lain
// (mis. konfirmasi hapus akun), tinggal tambah nilai baru di sini.
const ALLOWED_PURPOSES = new Set(["change_password"]);

// Rate limit per akun (bukan per IP) - supaya satu petugas tidak bisa minta
// OTP berkali-kali dalam waktu singkat (spam ke inbox sendiri / orang lain
// kalau emailnya salah ketik).
const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const { purpose } = await req.json();
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }

    const check = rateLimit(`otp-request:${session.username}`, OTP_REQUEST_LIMIT, OTP_REQUEST_WINDOW_MS);
    if (!check.allowed) {
      const retryAfterSec = Math.ceil(check.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Terlalu banyak permintaan kode. Coba lagi beberapa menit lagi." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    await ensureSchema();
    const admin = await getAdminByUsername(session.username);
    if (!admin) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }
    if (!admin.email) {
      return NextResponse.json(
        {
          error:
            "Akun ini belum punya email terdaftar, jadi belum bisa pakai verifikasi kode. Minta petugas lain menambahkan email lewat database, atau buat ulang akun lewat menu Tambah Petugas.",
        },
        { status: 400 }
      );
    }

    const code = await createOtpCode(admin.id, purpose);
    await sendOtpEmail({ to: admin.email, nama: admin.nama, code });

    // Tunjukkan sebagian email yang disamarkan, supaya petugas yakin kode
    // dikirim ke alamat yang benar tanpa membocorkan email penuh ke layar
    // (mis. kalau ada orang lain yang kebetulan lihat layar).
    return NextResponse.json({ ok: true, emailHint: maskEmail(admin.email) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengirim kode verifikasi." }, { status: 500 });
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}