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
          // Content-Security-Policy TIDAK dipasang statis di sini lagi -
          // sekarang dibuat per-request dengan nonce acak di middleware.ts
          // (WSTG-CONF-11), supaya script-src/style-src tidak perlu
          // 'unsafe-inline'. Lihat komentar di middleware.ts.
        ],
      },
    ];
  },
};

module.exports = nextConfig;