"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { isValidMockInvite, SESSION_COOKIE } from "@/lib/auth";

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

/** Short-lived cookie that carries the invite code through an OAuth
 *  redirect. Supabase appends its own `state` param, so we can't
 *  smuggle the invite in the URL — a cookie is the simplest place
 *  that survives the round-trip and is read in /auth/callback. */
const PENDING_INVITE_COOKIE = "mi_pending_invite";

async function setPendingInvite(code: string) {
  const c = await cookies();
  c.set(PENDING_INVITE_COOKIE, code.trim().toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min — long enough for the OAuth dance
  });
}

async function baseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3002";
  return `${proto}://${host}`;
}

/** Consume an invite code under the currently authed user. Idempotent
 *  via the `is null` guard on used_by — replays don't double-mark. */
async function consumeInvite(code: string, userId: string) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("invite_codes")
    .update({
      used_by: userId,
      used_at: new Date().toISOString(),
      uses_count: 1,
    })
    .eq("code", code.toUpperCase())
    .is("used_by", null);
}

/* ---------------------------------------------------------------- *
 * Demo-mode login (cookie-keyed by invite code)
 * ---------------------------------------------------------------- */

export async function mockLoginAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  if (!isValidMockInvite(code)) redirect("/login?err=1");
  const c = await cookies();
  c.set(SESSION_COOKIE, code.trim().toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}

/* ---------------------------------------------------------------- *
 * Magic link (passwordless)
 * ---------------------------------------------------------------- */

export async function magicLinkAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?err=1");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!email || !code) redirect("/login?err=missing");
  if (code.length < 4) redirect("/login?err=invite");

  const base = await baseUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${base}/auth/callback?invite=${encodeURIComponent(code)}`,
    },
  });

  // Most errors at this point are either rate-limit (Supabase sends
  // the mail anyway — known SDK behavior) or transient network blips
  // that resolve quickly. Surface as "sent" UI so the user goes to
  // check their inbox, and log the underlying error server-side for
  // diagnostics. We only bail to err=otp on truly blocking signals.
  if (error) {
    const code = error.code ?? "";
    const status = error.status ?? 0;
    const message = error.message ?? "";

    console.warn("[magic-link] signInWithOtp returned error:", {
      code,
      status,
      message,
    });

    // Hard fails — the mail definitely did not go out: invalid email
    // address shape (server-side sanity check), invite/redirect URL
    // not allow-listed, anonymous sign-ins disabled. Bubble to UI.
    const isHardFail =
      status === 422 || // unprocessable input
      status === 400 ||
      /invalid|forbidden|not allowed|disabled/i.test(message);

    if (isHardFail) {
      redirect(`/login?err=otp`);
    }
    // Otherwise (429 rate-limit, 5xx, transient) — assume the mail
    // is on its way and tell the user to check their inbox.
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`);
}

/* ---------------------------------------------------------------- *
 * Email + password — sign-in OR sign-up depending on `mode` field
 *
 * Sign-in: requires email + password.
 * Sign-up: requires email + password + invite. If email-confirmation
 *          is enabled in Supabase (prod default), the action returns
 *          immediately and the user gets a confirmation mail; the
 *          callback consumes the invite. If it's disabled (dev only),
 *          we have a session right after signUp and consume inline.
 * ---------------------------------------------------------------- */

export async function passwordAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?err=1");

  const mode = String(formData.get("mode") ?? "signin");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!email || !password) redirect("/login?err=missing");
  if (password.length < 8) redirect("/login?err=pw_short");

  if (mode === "signup") {
    if (code.length < 4) redirect("/login?err=invite");

    const base = await baseUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Used when email-confirmation is on (prod). Includes the
        // invite so the callback can consume it after the user
        // clicks the confirm link.
        emailRedirectTo: `${base}/auth/callback?invite=${encodeURIComponent(code)}`,
      },
    });

    if (error) {
      // Most common: email already registered.
      const reason = /registered/i.test(error.message) ? "exists" : "signup";
      redirect(`/login?err=${reason}`);
    }

    // If email-confirmation is OFF, signUp returns a session straight
    // away. Consume the invite synchronously and land them.
    if (data.session && data.user) {
      await consumeInvite(code, data.user.id);
      redirect("/dashboard");
    }

    // Otherwise nudge them to check their inbox.
    redirect(`/login?sent=1&email=${encodeURIComponent(email)}`);
  }

  // mode = signin
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const reason = /credentials/i.test(error.message) ? "creds" : "signin";
    redirect(`/login?err=${reason}`);
  }
  redirect("/dashboard");
}

/* ---------------------------------------------------------------- *
 * OAuth — Google + Apple
 *
 * Flow:
 *   1. Stash invite code in a short-lived cookie.
 *   2. Ask Supabase for the provider's authorization URL.
 *   3. Redirect — provider auths the user, redirects back to
 *      /auth/callback where the code is exchanged + cookie consumed.
 *
 * Sign-in vs sign-up: OAuth doesn't distinguish. If the user already
 * exists, they sign in. If not, the Supabase `on_auth_user_created`
 * trigger creates a public.members row. Invite code is required for
 * BOTH paths — we treat it as a closed-beta gate, not a one-time
 * signup token.
 * ---------------------------------------------------------------- */

export async function oauthAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?err=1");

  const provider = String(formData.get("provider") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (provider !== "google" && provider !== "apple") {
    redirect("/login?err=provider");
  }
  if (code.length < 4) redirect("/login?err=invite");

  // Stash the invite for /auth/callback to read after the round-trip.
  await setPendingInvite(code);

  const base = await baseUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${base}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?err=oauth");
  }
  redirect(data.url);
}

/* ---------------------------------------------------------------- *
 * Authmode helper for the login page (which form to render)
 * ---------------------------------------------------------------- */

export async function authMode() {
  return SUPABASE_ENABLED ? ("supabase" as const) : ("mock" as const);
}
