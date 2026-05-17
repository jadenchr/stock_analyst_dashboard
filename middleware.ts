import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — runs on every request before route handlers.
 *
 * Phase 1 responsibilities:
 *   1. Defense-in-depth: re-apply critical security headers (also set in next.config.ts).
 *      Some hosting edges strip per-route headers, so re-applying here is belt-and-suspenders.
 *   2. Block clearly malicious paths (path traversal, raw script extensions).
 *
 * Phase 2 will add IP-based rate limiting on `/api/` routes using @upstash/ratelimit.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cheap pre-checks: refuse anything attempting path traversal or executable upload paths.
  if (pathname.includes("..") || /\.(php|asp|aspx|jsp|cgi)$/i.test(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const response = NextResponse.next();

  // Re-apply critical headers (next.config.ts handles the full set; these are the strictest)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  // Skip static asset paths to keep the edge cheap.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
