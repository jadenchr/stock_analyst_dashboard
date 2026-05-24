import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign-out endpoint. POST only - protects against CSRF-by-link.
 * After signout we redirect back to the home page.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/", url.origin), { status: 303 });
}
