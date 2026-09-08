import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, insertGuest, listGuests } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const MUTASI_KEPERLUAN = ["Mutasi masuk siswa", "Mutasi keluar siswa"];

// Form ini publik (tanpa login), jadi butuh perlindungan dasar dari spam/bot:
// - rate limit per IP
// - honeypot field ("website") yang harus kosong; bot pengisi-otomatis
//   biasanya mengisi semua field yang mereka temukan di HTML
// - batas panjang tiap field, supaya tidak ada yang mengirim payload raksasa
const SUBMIT_LIMIT = 5;
const SUBMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_FIELD_LENGTH = 300;
const MAX_NOTE_LENGTH = 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterMs } = rateLimit(`guest-submit:${ip}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS);
    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Terlalu banyak pengiriman dari perangkat ini. Coba lagi sebentar lagi." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    await ensureSchema();
    const body = await req.json();

    // Honeypot: field tersembunyi di form yang tidak boleh diisi manusia.
    // Kalau terisi, kemungkinan besar ini bot -> tolak diam-diam (200 palsu
    // supaya bot tidak tahu ditolak, tapi data TIDAK disimpan).
    if (body.website) {
      return NextResponse.json({ guest: null }, { status: 201 });
    }

    const required = ["nama", "asal_instansi", "no_hp", "keperluan"];
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === "") {
        return NextResponse.json(
          { error: `Kolom "${field}" wajib diisi.` },
          { status: 400 }
        );
      }
      if (String(body[field]).length > MAX_FIELD_LENGTH) {
        return NextResponse.json(
          { error: `Kolom "${field}" terlalu panjang.` },
          { status: 400 }
        );
      }
    }
    if (body.catatan && String(body.catatan).length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: "Keterangan tambahan terlalu panjang." }, { status: 400 });
    }

    if (MUTASI_KEPERLUAN.includes(body.keperluan)) {
      const requiredSiswa = ["nama_siswa", "sekolah_asal", "sekolah_tujuan"];
      for (const field of requiredSiswa) {
        if (!body[field] || String(body[field]).trim() === "") {
          return NextResponse.json(
            { error: `Kolom "${field}" wajib diisi untuk keperluan mutasi.` },
            { status: 400 }
          );
        }
      }
    }

    const guest = await insertGuest({
      nama: body.nama,
      asal_instansi: body.asal_instansi,
      no_hp: body.no_hp,
      keperluan: body.keperluan,
      nama_siswa: body.nama_siswa,
      sekolah_asal: body.sekolah_asal,
      sekolah_tujuan: body.sekolah_tujuan,
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
  if (!getSession()) {
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
