"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { isValidMockInvite, SESSION_COOKIE } from "@/lib/auth";
import {
  admitInviteValidation,
  hasMinimumInviteShape,
} from "@/lib/invite-gate";
import {
  consumeInviteForUser,
  fetchInviteValidity,
} from "@/lib/data/invites";
import { confirmAuthUserEmail } from "@/lib/data/auth-admin";
import { finishInvitePasswordSignup } from "@/lib/password-signup";

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

/** Connected-mode gate. Length is not enough — admit only RPC true. */
async function requireValidConnectedInvite(code: string) {
  if (!hasMinimumInviteShape(code)) redirect("/login?err=invite");
  const result = await fetchInviteValidity(code);
  if (!admitInviteValidation(result)) redirect("/login?err=invite");
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
  await requireValidConnectedInvite(code);

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
 * Sign-up: requires email + password + invite. The invite is the
 *          closed-beta gate. If signUp returns a session (confirm
 *          off), consume inline. If it created a user with no
 *          session (prod Confirm email ON), service-role confirm
 *          that user, sign in, consume, then /dashboard — never
 *          the magic-link «EMAIL SENT» wall.
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
    await requireValidConnectedInvite(code);

    const base = await baseUrl();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // raw_user_meta_data.invite lets handle_new_user (0059)
        // consume atomically. emailRedirectTo keeps a later
        // confirm-mail click harmless if GoTrue still sends one.
        data: { invite: code },
        emailRedirectTo: `${base}/auth/callback?invite=${encodeURIComponent(code)}`,
      },
    });

    if (error) {
      // Most common: email already registered.
      const reason = /registered/i.test(error.message) ? "exists" : "signup";
      redirect(`/login?err=${reason}`);
    }

    const finished = await finishInvitePasswordSignup({
      signUpUser: data.user,
      signUpSession: data.session,
      email,
      password,
      invite: code,
      confirmEmail: confirmAuthUserEmail,
      signInWithPassword: async (signInEmail, signInPassword) => {
        const signed = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password: signInPassword,
        });
        return {
          user: signed.data.user,
          session: signed.data.session,
          error: signed.error,
        };
      },
      consumeInvite: consumeInviteForUser,
      signOut: () => supabase.auth.signOut(),
    });

    if (!finished.ok) {
      redirect(`/login?err=${finished.err}`);
    }
    redirect("/dashboard");
  }

  // mode = signin
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    const reason = /credentials/i.test(error.message) ? "creds" : "signin";
    redirect(`/login?err=${reason}`);
  }

  // After 0059, restrictive RLS hides an un-admitted members row.
  // Pre-0059 the select still returns the row (residual until Tom
  // applies the migration). Same client as the sign-in so cookies
  // are already on the request.
  if (data.user) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!member) {
      await supabase.auth.signOut();
      redirect("/login?err=invite");
    }
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
 * exists, they sign in. If not, `handle_new_user` creates an
 * un-admitted members row; /auth/callback consumes the invite.
 * A currently valid invite is required for BOTH paths
 * (`is_invite_valid`). Consume only for users not yet admitted
 * so returning logins do not burn multi-use codes.
 * ---------------------------------------------------------------- */

export async function oauthAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?err=1");

  const provider = String(formData.get("provider") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (provider !== "google" && provider !== "apple") {
    redirect("/login?err=provider");
  }
  await requireValidConnectedInvite(code);

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
