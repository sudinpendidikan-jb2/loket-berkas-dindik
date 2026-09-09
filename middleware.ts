import { NextRequest, NextResponse } from "next/server";

// Middleware berjalan di Edge Runtime, yang tidak selalu mendukung modul
// crypto Node.js sepenuhnya. Jadi di sini kita cuma cek cookie sesi ADA
// atau tidak (gerbang cepat untuk redirect); verifikasi tanda tangan
// (HMAC) yang sesungguhnya dilakukan di setiap API route lewat
// lib/auth.ts -> getSession(), yang berjalan di Node.js runtime.
// Jadi walaupun seseorang lolos dari sini dengan cookie palsu, data tamu
// tetap tidak akan bisa diambil karena API-nya menolak sesi yang tidak valid.
export function middleware(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;

  if (!cookie) {
    const loginUrl = new URL("/admin", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard"],
};
