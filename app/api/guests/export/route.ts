import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listGuests } from "@/lib/db";

function isAdmin() {
  return cookies().get("admin_session")?.value === "authorized";
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
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
    },
  });
}
