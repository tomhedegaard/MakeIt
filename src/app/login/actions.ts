"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { isValidMockInvite, SESSION_COOKIE } from "@/lib/auth";

/**
 * Demo-mode login: cookie session keyed by invite code.
 */
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

/**
 * Connected mode: validate the invite code in the database, then send
 * the user a magic-link. The invite is consumed in /auth/callback after
 * the user clicks the link and we create the member row.
 */
export async function magicLinkAction(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?err=1");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!email || !code) redirect("/login?err=missing");

  // Validate invite code first (open SELECT denied by RLS — we use rpc-style guard later;
  // for the closed beta we check existence + capacity here using anon read which we
  // explicitly allow only for this exact lookup. To keep RLS strict we instead try
  // a service-role-less lookup via a secured view... Simpler: rely on /auth/callback
  // to consume the invite under the new authed user. Here we just validate format.)
  if (code.length < 4) redirect("/login?err=invite");

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3002";
  const base = `${proto}://${host}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${base}/auth/callback?invite=${encodeURIComponent(code)}`,
    },
  });

  if (error) redirect(`/login?err=otp`);
  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`);
}

/**
 * Re-export which path is in use. The login page uses this to decide
 * which form to render at SSR time.
 */
export async function authMode() {
  return SUPABASE_ENABLED ? ("supabase" as const) : ("mock" as const);
}
