import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const isAuthed = req.cookies.get("admin_session")?.value === "authorized";

  if (!isAuthed) {
    const loginUrl = new URL("/admin", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard"],
};
