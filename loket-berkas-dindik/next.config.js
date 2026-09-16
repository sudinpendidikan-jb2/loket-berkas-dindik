/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sembunyikan header "X-Powered-By: Next.js" agar penyerang tidak mudah
  // fingerprint framework/versi yang dipakai (WSTG-INFO-02).
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Berlaku untuk semua route.
        source: "/:path*",
        headers: [
          // Cegah situs lain menaruh halaman ini dalam <iframe> (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Cegah browser "menebak" tipe konten (mis. file .txt dieksekusi sbg HTML/JS).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Batasi info referrer yang dikirim ke situs lain saat ada link keluar.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Matikan akses ke API sensor perangkat yang tidak dipakai aplikasi ini.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Paksa browser selalu pakai HTTPS untuk domain ini ke depannya.
          // Aman diaktifkan karena Vercel selalu serve lewat HTTPS.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Content-Security-Policy: hanya izinkan resource dari domain sendiri.
          // 'unsafe-inline' pada script-src & style-src DIPERLUKAN karena
          // Next.js App Router (skrip hydration) dan styled-jsx (dipakai di
          // beberapa halaman lewat <style jsx global>) sama-sama menyuntik
          // tag inline. Sempat dicoba diganti nonce per-request lewat
          // middleware (lebih ketat, tanpa unsafe-inline) tapi itu membuat
          // hydration Next patah di production (lihat catatan di
          // middleware.ts) - jadi dikembalikan ke versi ini yang terbukti
          // stabil. Trade-off: proteksi CSP terhadap XSS jadi lebih longgar.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;