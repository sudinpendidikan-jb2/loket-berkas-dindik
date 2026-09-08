// Rate limiter sederhana berbasis memori, per proses server.
//
// CATATAN PENTING: di lingkungan serverless (mis. Vercel) tiap instance
// fungsi punya memori sendiri-sendiri, jadi limit ini TIDAK 100% akurat
// lintas instance/region. Untuk perlindungan yang lebih kuat & konsisten,
// pindahkan penyimpanan counter ini ke Redis/Upstash atau layanan sejenis.
// Tapi ini tetap jauh lebih baik daripada tanpa rate limit sama sekali,
// dan cukup efektif untuk deployment single-region / traffic kecil-menengah.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bersihkan bucket kadaluarsa secara berkala supaya memori tidak bocor.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
