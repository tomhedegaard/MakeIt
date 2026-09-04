import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  consumeInviteForUser,
  fetchInviteAdmitted,
} from "@/lib/data/invites";
import {
  admitInviteConsume,
  decideInviteConsume,
} from "@/lib/invite-gate";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/i18n/config";

const PENDING_INVITE_COOKIE = "mi_pending_invite";

/**
 * Auth callback — handles every flow that ends here:
 *
 *   - Magic-link OTP    : ?code=<otp>&invite=<CODE>  (invite in URL)
 *   - Password confirm  : leftover confirm-mail click after
 *                         invite-gated signup already auto-confirmed
 *                         (`invite` in URL; consume is idempotent)
 *   - OAuth (Google/    : ?code=<authcode>           (invite in cookie)
 *      Apple)
 *
 * We exchange whatever code is present for a session, then consume
 * the invite for newly created users. The invite source is
 * "URL first, cookie fallback" so the magic-link / password flows
 * keep working unchanged, and OAuth picks up the stashed cookie.
 *
 * Failure modes:
 *   - No code in URL          → /login?err=callback
 *   - Exchange fails          → /login?err=callback
 *   - New user, no invite or consume fails → sign out, /login?err=invite
 *     (fail closed — never land a signup that did not spend a valid code)
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

  const cookieStore = await cookies();
  const inviteFromCookie = cookieStore.get(PENDING_INVITE_COOKIE)?.value ?? null;
  const invite = inviteFromUrl ?? inviteFromCookie;
  cookieStore.delete(PENDING_INVITE_COOKIE);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?err=callback", url));
  }

  const alreadyAdmitted = await fetchInviteAdmitted();
  const decision = decideInviteConsume({
    invite,
    userCreatedAt: user.created_at,
    nowMs: Date.now(),
    alreadyAdmitted,
  });

  if (decision.action === "reject") {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?err=invite", url));
  }

  if (decision.action === "consume") {
    const consumed = await consumeInviteForUser(decision.invite, user.id);
    if (!admitInviteConsume(consumed)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?err=invite", url));
    }
  }

  // Re-seed the language cookie from the member's saved preference so
  // the chosen locale follows the user onto a new device. Best-effort:
  // a missing column or row leaves the existing cookie untouched.
  const { data: member } = await supabase
    .from("members")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  if (isLocale(member?.locale)) {
    cookieStore.set(LOCALE_COOKIE, member.locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return NextResponse.redirect(new URL(next, url));
}
