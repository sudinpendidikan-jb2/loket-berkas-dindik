import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, createFirstAdminIfNone } from "@/lib/db";
import { hashPassword, createSessionToken, validateUsername, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const { username, password, nama, initials } = await req.json();
    if (!username || !password || !nama || !initials) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.ok) {
      return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH || String(password).length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Kata sandi harus ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    // Rute ini hanya boleh dipakai sekali, waktu belum ada petugas sama
    // sekali. createFirstAdminIfNone mengecek DAN membuat admin secara
    // atomik (advisory lock) supaya dua request bersamaan tidak bisa
    // sama-sama lolos saat tabel admins masih kosong (WSTG-IDNT-02).
    const admin = await createFirstAdminIfNone({
      username: usernameCheck.value,
      password_hash: hashPassword(password),
      nama: String(nama).trim(),
      initials: String(initials).trim().toUpperCase().slice(0, 4),
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Akun admin sudah ada. Masuk lewat form login." },
        { status: 400 }
      );
    }

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