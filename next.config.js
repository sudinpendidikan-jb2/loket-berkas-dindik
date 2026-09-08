/** @type {import('next').NextConfig} */
const nextConfig = {
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
          // 'unsafe-inline' pada script-src DIPERLUKAN karena Next.js App Router
          // menyisipkan inline <script> untuk hydration (mengirim data hasil
          // render server ke client). Tanpa ini, JavaScript React tidak pernah
          // "menyala" dan halaman macet di tampilan awal (mis. stuck di
          // "Memuat..."). Trade-off: proteksi CSP terhadap XSS jadi sedikit
          // lebih longgar. Untuk versi lebih ketat, bisa pakai CSP nonce
          // per-request lewat middleware (lihat docs Next.js: Content Security
          // Policy) — tapi butuh perubahan lebih di middleware.ts & layout.tsx.
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
