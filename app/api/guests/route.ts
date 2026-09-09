import { NextRequest, NextResponse } from "next/server";
import { listGuests } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/http";

// Cegah CSV/Formula Injection: field ini diisi publik lewat form tamu,
// lalu dibuka petugas di Excel/Sheets. Kalau isinya diawali =, +, -, @, atau
// tab/CR, aplikasi spreadsheet bisa membacanya sebagai formula, bukan teks.
// Solusinya: beri prefiks kutip tunggal supaya selalu dibaca sebagai teks.
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

function csvEscape(value: string) {
  let safe = value;
  if (DANGEROUS_PREFIX.test(safe)) {
    safe = `'${safe}`;
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