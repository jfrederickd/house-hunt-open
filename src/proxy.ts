import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, authEnabled, SESSION_COOKIE } from "@/lib/auth";

// Next 16's "Proxy" (formerly Middleware). Gates every page/route behind the
// shared-password session EXCEPT the login page and the public health check.
// When the gate isn't configured (no AUTH_SECRET — i.e. local dev) it stays
// open; production enforces config at container start (docker-entrypoint.sh).
export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next's static assets and the favicon, so uploaded
  // photos (/uploads/*) are gated too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
