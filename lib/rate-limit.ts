// getClientIp: menentukan alamat IP client untuk keperluan rate limiting.
//
// WSTG-ATHN-03 (Temuan 2): header "x-forwarded-for" biasa BISA disisipi
// nilai palsu oleh client kalau aplikasi berjalan di belakang proxy yang
// tidak memvalidasi/menimpa header masuk. Di Vercel, header
// "x-vercel-forwarded-for" diisi oleh edge network Vercel sendiri di titik
// masuk permintaan dan TIDAK bisa dipalsukan oleh client manapun -- ini
// yang jadi sumber utama. "x-forwarded-for" hanya dipakai sebagai fallback
// (mis. saat dites secara lokal), dan TIDAK boleh dipercaya sebagai satu-
// satunya sumber kalau nanti aplikasi ini pindah ke hosting lain yang bukan
// Vercel tanpa proxy tepercaya di depannya.
export function getClientIp(req: Request): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
