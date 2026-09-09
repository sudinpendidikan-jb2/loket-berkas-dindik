import { NextRequest, NextResponse } from "next/server";
import { listGuests } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/http";
import { KEPERLUAN_OPTIONS, INSTANSI_OPTIONS } from "@/lib/constants";

// Cegah CSV/Formula Injection: field ini diisi publik lewat form tamu,
// lalu dibuka petugas di Excel/Sheets. Kalau isinya diawali =, +, -, @, atau
// tab/CR, aplikasi spreadsheet bisa membacanya sebagai formula, bukan teks.
// Solusinya: beri prefiks kutip tunggal supaya selalu dibaca sebagai teks.
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

<<<<<<< HEAD
// Nomor HP Indonesia: boleh diawali +62/62/0, lalu 8-13 digit lagi setelah
// awalan "8". Cukup longgar untuk menampung variasi operator, tapi menolak
// input yang jelas bukan nomor telepon.
const PHONE_REGEX = /^(\+62|62|0)8[0-9]{7,12}$/;

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

    // Validasi opsi terhadap daftar resmi di lib/constants.ts, bukan cuma
    // "field tidak kosong". Tanpa ini, request langsung ke API (di luar UI
    // dropdown) bisa menyisipkan nilai bebas untuk asal_instansi/keperluan.
    if (!INSTANSI_OPTIONS.includes(body.asal_instansi)) {
      return NextResponse.json({ error: "Asal instansi tidak valid." }, { status: 400 });
    }
    if (!KEPERLUAN_OPTIONS.includes(body.keperluan)) {
      return NextResponse.json({ error: "Keperluan tidak valid." }, { status: 400 });
    }
    if (!PHONE_REGEX.test(String(body.no_hp).trim())) {
      return NextResponse.json({ error: "Format nomor HP tidak valid." }, { status: 400 });
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
=======
function csvEscape(value: string) {
  let safe = value;
  if (DANGEROUS_PREFIX.test(safe)) {
    safe = `'${safe}`;
>>>>>>> 69c12d67d8cf2038688a86594020f80e7fbb56ed
  }
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(req: NextRequest) {
  if (!getSession()) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? undefined;

  const guests = await listGuests({ date });

  const header = [
    "Jam Masuk",
    "Nama",
    "Asal Instansi",
    "No. HP",
    "Keperluan",
    "Nama Siswa",
    "Sekolah Asal",
    "Sekolah Tujuan",
    "Status",
    "Catatan",
  ];

  const lines = [header.join(",")];
  for (const g of guests) {
    lines.push(
      [
        new Date(g.created_at).toLocaleString("id-ID"),
        g.nama,
        g.asal_instansi,
        g.no_hp,
        g.keperluan,
        g.nama_siswa ?? "",
        g.sekolah_asal ?? "",
        g.sekolah_tujuan ?? "",
        g.status,
        g.catatan ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    );
  }

  const csv = lines.join("\n");
  const filename = `daftar-tamu-${date ?? "semua"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // File CSV ini berisi data pribadi tamu (nama, no. HP, dll) - jangan
      // sampai tersimpan di cache browser atau proxy perantara.
      ...NO_STORE_HEADERS,
    },
  });
}