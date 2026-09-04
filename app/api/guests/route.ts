import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, insertGuest, listGuests } from "@/lib/db";

function isAdmin() {
  return cookies().get("admin_session")?.value === "authorized";
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();

    const required = ["nama", "asal_instansi", "no_hp", "keperluan", "bidang_tujuan"];
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === "") {
        return NextResponse.json(
          { error: `Kolom "${field}" wajib diisi.` },
          { status: 400 }
        );
      }
    }

    const guest = await insertGuest({
      nama: body.nama,
      asal_instansi: body.asal_instansi,
      no_hp: body.no_hp,
      keperluan: body.keperluan,
      bidang_tujuan: body.bidang_tujuan,
      nama_petugas: body.nama_petugas,
      catatan: body.catatan,
    });

    return NextResponse.json({ guest }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal menyimpan data. Coba lagi." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    await ensureSchema();
    const { searchParams } = new URL(req.url);
    const guests = await listGuests({
      date: searchParams.get("date") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ guests });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal memuat data." },
      { status: 500 }
    );
  }
}
