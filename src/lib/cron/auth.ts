/**
 * Vercel Cron bearer check.
 *
 * Fail-closed: a missing or empty CRON_SECRET is never a valid
 * expected token. Interpolating `Bearer ${undefined}` produced the
 * string `Bearer undefined`, which an attacker can send.
 *
 * Spec: docs/superpowers/specs/2026-09-01-cron-auth-fail-closed.md
 */
import { NextResponse } from "next/server";

export function cronSecretIsConfigured(
  secret: string | undefined | null,
): secret is string {
  return typeof secret === "string" && secret.length > 0;
}

export function isCronAuthorized(
  authorizationHeader: string | null,
  secret: string | undefined | null = process.env.CRON_SECRET,
): boolean {
  if (!cronSecretIsConfigured(secret)) return false;
  return authorizationHeader === `Bearer ${secret}`;
}

/**
 * Admit the request or return a 401 JSON response. Callers return
 * the response immediately — no work, no service-role client.
 */
export function assertCronAuth(request: Request): NextResponse | null {
  if (isCronAuthorized(request.headers.get("authorization"))) {
    return null;
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
