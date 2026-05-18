import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Edge middleware — runs on every request before route handlers.
 *
 * Responsibilities:
 *   1. Defense-in-depth: re-apply critical security headers (also set in next.config.ts).
 *      Some hosting edges strip per-route headers, so re-applying here is belt-and-suspenders.
 *   2. Block clearly malicious paths (path traversal, raw script extensions).
 *   3. Refresh Supabase auth tokens — this is the ONLY place that can safely
 *      mutate cookies on every request. Server components can READ them but
 *      can't write them during render.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.includes("..") || /\.(php|asp|aspx|jsp|cgi)$/i.test(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let response = NextResponse.next({ request });

  // Re-apply critical headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Refresh Supabase session if configured
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            response.headers.set("X-Content-Type-Options", "nosniff");
            response.headers.set("X-Frame-Options", "DENY");
            response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Touch getUser() to refresh the JWT if needed
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  // Skip static asset paths to keep the edge cheap.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|theme-init.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
