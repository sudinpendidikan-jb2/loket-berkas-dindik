import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, countAdmins } from "@/lib/db";

// Rate limit sederhana in-memory per IP.
// Catatan: state ini per-instance serverless (reset saat cold start / di-scale
// ke instance lain), jadi ini lapisan proteksi dasar — bukan pengganti rate
// limiter terpusat (mis. Upstash Redis) kalau traffic-nya besar atau
// deployment multi-region.
const RATE_LIMIT = 5; // maksimal request
const WINDOW_MS = 60_000; // per 1 menit

const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    await ensureSchema();
    const count = await countAdmins();
    return NextResponse.json({ hasAdmins: count > 0 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal memuat status." }, { status: 500 });
  }
}