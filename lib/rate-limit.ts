// Rate limiter berbasis Postgres (lihat incrementRateLimit di lib/db.ts).
//
// Kenapa bukan Map di memori: di lingkungan serverless (mis. Vercel) tiap
// instance/warm container punya memori sendiri-sendiri, jadi limiter berbasis
// memori bisa dilewati dengan menyebar request ke instance berbeda
// (WSTG-ATHN-03, Temuan 1). Menyimpan counter di DB yang sama dengan data
// aplikasi membuat batas ini konsisten di instance/region manapun, tanpa
// menambah dependensi infra baru (Redis/Upstash) di luar Supabase yang sudah
// dipakai.
import { incrementRateLimit } from "@/lib/db";

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const { count, resetAt } = await incrementRateLimit(key, windowMs);
  const retryAfterMs = Math.max(0, resetAt.getTime() - Date.now());

  if (count > limit) {
    return { allowed: false, remaining: 0, retryAfterMs };
  }
  return { allowed: true, remaining: Math.max(0, limit - count), retryAfterMs: 0 };
}

// Trust boundary untuk IP klien (WSTG-ATHN-03, Temuan 2):
//
// Header X-Forwarded-For/X-Real-IP hanya bisa dipercaya kalau kita YAKIN
// request tidak bisa mencapai server tanpa lewat reverse proxy tepercaya
// yang menimpa header tsb. Vercel adalah edge network yang menimpa header
// ini untuk semua traffic yang masuk (klien tidak bisa mem-bypass edge-nya),
// jadi di sana header tersebut aman dipakai. Di luar Vercel (self-host, VPS,
// docker compose, dsb.) header ini bisa dipalsukan bebas oleh siapa pun
// kecuali admin secara eksplisit mengonfirmasi topologi proxy-nya lewat
// TRUST_PROXY_HEADERS=1 (mis. ada Nginx/Caddy di depan yang SELALU
// menimpa header ini sebelum diteruskan ke app).
export function getClientIp(req: Request): string {
  const runningOnVercel = process.env.VERCEL === "1";
  const trustConfigured = process.env.TRUST_PROXY_HEADERS === "1";

  if (!runningOnVercel && !trustConfigured) {
    // Tidak ada dasar untuk mempercayai header ini di topologi yang tidak
    // dikenal. Mengembalikan "unknown" membuat SEMUA request non-Vercel
    // berbagi satu bucket rate-limit per-IP (konservatif, tidak bisa
    // dilewati dengan memalsukan header), sementara lockout per-username
    // (lihat app/api/admin/login/route.ts) tetap menjadi lapisan utama.
    return "unknown";
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
