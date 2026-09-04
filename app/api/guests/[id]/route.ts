import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateGuestStatus, GuestStatus } from "@/lib/db";

function isAdmin() {
  return cookies().get("admin_session")?.value === "authorized";
}

const VALID_STATUSES: GuestStatus[] = ["menunggu", "diproses", "selesai"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  const body = await req.json();
  const status = body.status as GuestStatus;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  const guest = await updateGuestStatus(id, status);
  if (!guest) {
    return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ guest });
}
