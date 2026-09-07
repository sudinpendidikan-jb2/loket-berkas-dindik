import { NextRequest, NextResponse } from "next/server";
import { updateGuestStatus, GuestStatus } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_STATUSES: GuestStatus[] = ["menunggu", "diproses", "selesai"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession();
  if (!session) {
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

  const guest = await updateGuestStatus(id, status, session.initials);
  if (!guest) {
    return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ guest });
}
