import { NextRequest, NextResponse } from "next/server";

// Middleware berjalan di Edge Runtime, yang tidak selalu mendukung modul
// crypto Node.js sepenuhnya. Jadi di sini kita cuma cek cookie sesi ADA
// atau tidak (gerbang cepat untuk redirect); verifikasi tanda tangan
// (HMAC) + status revokasi yang sesungguhnya dilakukan di setiap API route
// lewat lib/auth.ts -> getSession(), yang berjalan di Node.js runtime.
// Jadi walaupun seseorang lolos dari sini dengan cookie palsu, data tamu
// tetap tidak akan bisa diambil karena API-nya menolak sesi yang tidak valid.
//
// CATATAN (WSTG-CONF-11): sempat dicoba CSP dengan nonce per-request di sini
// (menghapus 'unsafe-inline' dari script-src) supaya lebih ketat. Ternyata
// di Next.js 14.2 + styled-jsx, kombinasi nonce + 'strict-dynamic' bikin
// skrip bootstrap hydration Next sendiri ikut terblokir di production —
// halaman jadi macet permanen di render SSR awal (JS tidak pernah "menyala").
// Karena ini situs yang sudah live dipakai, pendekatan itu di-revert supaya
// tidak ada downtime. Kalau mau dicoba lagi, HARUS diuji dulu di staging/
// preview deployment Vercel, bukan langsung ke production.
export function middleware(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;

  if (!cookie) {
    const loginUrl = new URL("/admin", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Termasuk subrute (mis. /admin/dashboard/apapun) supaya gerbang cepat ini
  // tidak lubang kalau nanti ditambah halaman baru di bawah /admin/dashboard.
  // Verifikasi tanda tangan sesi yang sesungguhnya tetap ada di setiap API
  // route lewat getSession() (lib/auth.ts), jadi ini lapisan tambahan, bukan
  // satu-satunya penjaga.
  matcher: ["/admin/dashboard", "/admin/dashboard/:path*"],
};
