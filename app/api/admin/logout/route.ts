import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // WSTG-SESS-06: cabut baris sesinya di server dulu (bukan cuma hapus
  // cookie di browser), supaya kalau token ini sempat disalin/dicuri
  // sebelumnya, dia langsung mati juga - bukan cuma tidak dipakai lagi
  // di browser ini.
  await revokeSession(req.cookies.get("admin_session")?.value);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
  return res;
}
