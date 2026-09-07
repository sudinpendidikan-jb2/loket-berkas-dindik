import { NextResponse } from "next/server";
import { ensureSchema, countAdmins } from "@/lib/db";

export async function GET() {
  try {
    await ensureSchema();
    const count = await countAdmins();
    return NextResponse.json({ hasAdmins: count > 0 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal memuat status." }, { status: 500 });
  }
}
