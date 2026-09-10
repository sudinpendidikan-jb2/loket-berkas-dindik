import { NextRequest, NextResponse } from "next/server";
import { getAdminByUsername, createAdmin } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const { username, password, nama, initials } = await req.json();
    if (!username || !password || !nama || !initials) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
    }
    // Batas atas panjang input (lihat catatan di route login) supaya scrypt
    // tidak dipaksa memproses payload raksasa.
    if (String(username).length > 100 || String(password).length > 200 || String(nama).length > 200) {
      return NextResponse.json({ error: "Salah satu kolom terlalu panjang." }, { status: 400 });
    }

    const usernameNorm = String(username).trim().toLowerCase();
    const exists = await getAdminByUsername(usernameNorm);
    if (exists) {
      return NextResponse.json({ error: "Username sudah dipakai." }, { status: 400 });
    }

    await createAdmin({
      username: usernameNorm,
      password_hash: hashPassword(password),
      nama: String(nama).trim(),
      initials: String(initials).trim().toUpperCase().slice(0, 4),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menambah petugas." }, { status: 500 });
  }
}
