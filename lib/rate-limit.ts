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
  // PENTING (WSTG-ATHN-03): jangan ambil segmen PERTAMA dari X-Forwarded-For.
  // Header itu berbentuk "client, proxy1, proxy2, ..." dan client BEBAS
  // mengirim nilai awal apa saja (mis. IP acak baru di setiap request) untuk
  // membuat rate limiter mengira tiap request datang dari IP berbeda ->
  // bypass limit sepenuhnya.
  //
  // Di Vercel, header `x-vercel-forwarded-for` diisi ulang oleh edge network
  // Vercel sendiri dan TIDAK BISA dipalsukan oleh client (header masuk dengan
  // nama itu dari luar akan ditimpa) - jadi ini sumber IP paling bisa
  // dipercaya. Kalau tidak ada (mis. jalan di luar Vercel / saat dev lokal),
  // baru turun ke X-Forwarded-For, dan ambil segmen TERAKHIR (ditambahkan
  // oleh proxy tepercaya terdekat), bukan yang pertama.
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
