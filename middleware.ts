import { NextRequest, NextResponse } from "next/server";

// Middleware sekarang mengerjakan DUA hal per request:
//
// 1) CSP nonce per-request (WSTG-CONF-11) - sebelumnya CSP dipasang statis
//    lewat next.config.js dengan `script-src 'unsafe-inline'` supaya skrip
//    hydration bawaan Next.js App Router tetap jalan. 'unsafe-inline'
//    melemahkan proteksi CSP terhadap XSS (browser akan menjalankan skrip
//    inline APA SAJA yang berhasil disuntikkan). Gantinya: generate nonce
//    acak di sini, kirim lewat header, dan Next.js otomatis menempelkan
//    nonce itu ke skrip (dan style tag) miliknya sendiri - skrip inline
//    lain (mis. hasil injeksi XSS) yang tidak punya nonce ini akan diblokir
//    browser walau berhasil disisipkan ke DOM.
//
// 2) Gerbang cepat auth untuk /admin/dashboard: cuma cek cookie sesi ADA
//    atau tidak (redirect ke /admin kalau tidak ada). Verifikasi tanda
//    tangan HMAC + status revokasi yang sesungguhnya tetap dilakukan di
//    setiap API route lewat lib/auth.ts -> getSession(), yang berjalan di
//    Node.js runtime (Edge Runtime di sini tidak selalu mendukung modul
//    crypto Node.js sepenuhnya). Jadi walau seseorang lolos dari sini
//    dengan cookie palsu, data tamu tetap tidak bisa diambil.
export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  if (req.nextUrl.pathname.startsWith("/admin/dashboard")) {
    const cookie = req.cookies.get("admin_session")?.value;
    if (!cookie) {
      const loginUrl = new URL("/admin", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Semua route KECUALI file statis Next.js (_next/static, _next/image,
    // favicon) - CSP nonce perlu berlaku di semua halaman, tidak cuma
    // /admin, supaya form tamu publik juga terlindungi.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
