import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, countAdmins, createAdmin } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    // Rute ini hanya boleh dipakai sekali, waktu belum ada petugas sama sekali.
    // Setelah itu, penambahan petugas baru harus lewat dashboard (sudah login).
    const existing = await countAdmins();
    if (existing > 0) {
      return NextResponse.json(
        { error: "Akun admin sudah ada. Masuk lewat form login." },
        { status: 400 }
      );
    }

    const { username, password, nama, initials } = await req.json();
    if (!username || !password || !nama || !initials) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Kata sandi minimal 6 karakter." }, { status: 400 });
    }

    const admin = await createAdmin({
      username: String(username).trim().toLowerCase(),
      password_hash: hashPassword(password),
      nama: String(nama).trim(),
      initials: String(initials).trim().toUpperCase().slice(0, 4),
    });

    const token = createSessionToken({
      username: admin.username,
      name: admin.nama,
      initials: admin.initials,
      exp: Date.now() + 1000 * 60 * 60 * 8,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal membuat akun admin." }, { status: 500 });
  }
}
