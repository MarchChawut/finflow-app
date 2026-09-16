import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (same mechanism, see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// Optimistic-only auth gate: `auth()` here reads the JWT session cookie and
// never touches the DB (session strategy is "jwt" — see auth.ts), which is
// required since Proxy runs on every matched request. Real authorization
// still happens per Server Action / DAL call (Phase 2), this is just the
// redirect-to-login layer.
const publicRoutes = new Set(["/login"]);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (!isLoggedIn && !publicRoutes.has(pathname)) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && publicRoutes.has(pathname)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  // Excludes: NextAuth's own routes, the LINE webhook (verifies its own
  // signature, no cookie session to check), the cron trigger (verifies its
  // own shared secret — called by an external scheduler with no session
  // cookie, see app/api/cron/savings-reminder/route.ts) and LIFF (opened
  // inside the LINE app, not a browser session), plus static assets.
  matcher: [
    "/((?!api/auth|api/line|api/cron|liff|img/|_next/static|_next/image|favicon.ico).*)",
  ],
};
