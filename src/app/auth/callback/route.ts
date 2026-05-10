import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const PENDING_INVITE_COOKIE = "mi_pending_invite";

/**
 * Auth callback — handles every flow that ends here:
 *
 *   - Magic-link OTP    : ?code=<otp>&invite=<CODE>  (invite in URL)
 *   - Password sign-up  : ?code=<otp>&invite=<CODE>  (invite in URL)
 *   - OAuth (Google/    : ?code=<authcode>           (invite in cookie)
 *      Apple)
 *
 * We exchange whatever code is present for a session, then consume
 * the invite. The invite source is "URL first, cookie fallback" so
 * the magic-link / password flows keep working unchanged, and OAuth
 * picks up the stashed cookie value.
 *
 * Failure modes:
 *   - No code in URL          → /login?err=callback
 *   - Exchange fails          → /login?err=callback
 *   - Invite consumption is best-effort — the auth.users trigger has
 *     already created the public.members row at this point, so we
 *     don't block the redirect on a failed invite update. Worst case
 *     the user is in but the invite-code row stays "unused".
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const inviteFromUrl = url.searchParams.get("invite");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?err=callback", url));
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?err=disabled", url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?err=callback", url));
  }

  // Resolve invite — prefer URL (magic-link / password), fall back to
  // the cookie stashed by the OAuth action.
  const cookieStore = await cookies();
  const inviteFromCookie = cookieStore.get(PENDING_INVITE_COOKIE)?.value ?? null;
  const invite = inviteFromUrl ?? inviteFromCookie;

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
    // Always clear the cookie — even if we read invite from the URL,
    // a stale cookie shouldn't linger.
    cookieStore.delete(PENDING_INVITE_COOKIE);
  }

  return NextResponse.redirect(new URL(next, url));
}
