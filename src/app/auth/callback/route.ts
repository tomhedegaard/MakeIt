import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback.
 * Supabase redirects here with ?code=... after the user clicks the
 * email link. We exchange the code for a session, optionally consume
 * the invite code, and redirect to /dashboard.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) return NextResponse.redirect(new URL("/login?err=callback", url));

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login?err=disabled", url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?err=callback`, url));
  }

  // Consume the invite code (best-effort — the trigger has already
  // created the public.members row at this point).
  if (invite) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("invite_codes")
        .update({
          used_by: user.id,
          used_at: new Date().toISOString(),
          uses_count: 1,
        })
        .eq("code", invite.toUpperCase())
        .is("used_by", null);
    }
  }

  return NextResponse.redirect(new URL(next, url));
}
