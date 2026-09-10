import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { NO_STORE_HEADERS } from "@/lib/http";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401, headers: NO_STORE_HEADERS });
  }
  // Info sesi admin - jangan sampai tersimpan di cache dan "bocor" ke
  // pengguna lain di komputer/proxy yang sama.
  return NextResponse.json(
    { nama: session.name, username: session.username, initials: session.initials },
    { headers: NO_STORE_HEADERS }
  );
}