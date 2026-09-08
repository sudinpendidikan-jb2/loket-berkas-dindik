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
          // 'unsafe-inline' untuk style diperlukan karena Next.js/Tailwind
          // memakai inline style pada beberapa komponen; sesuaikan lagi kalau
          // nanti menambah CDN/skrip pihak ketiga.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self'",
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
