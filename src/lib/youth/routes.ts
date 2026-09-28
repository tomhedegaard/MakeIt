/**
 * MakeIt Ung — which app routes a young account may open (spec afsnit 3).
 *
 * Enforced in middleware from the user's app_metadata (set only by the
 * server, so a young member cannot change it), and mirrored in the
 * navigation. Default-deny: anything not listed goes back to I dag.
 *
 * Not in the first version: nutrition with numbers, weight and the HQ
 * estimate (/nutrition), HRV numbers (/hrv), Crew and buddy, messages
 * with coaches, form-checks, Coach School, Reps shop, billing, science.
 */

export type YouthClaims = { youth: boolean; mind: boolean };

/** Read the server-written claims from Supabase's app_metadata. */
export function youthClaims(appMetadata: Record<string, unknown> | null | undefined): YouthClaims {
  return {
    youth: appMetadata?.account_type === "youth",
    mind: appMetadata?.consent_mind === true,
  };
}

const ALWAYS = [
  "/dashboard",
  "/coaching",
  "/program",
  "/session",
  "/train",
  "/profile",
  "/settings",
  "/push",
  "/ung/mad",
] as const;

const WITH_MIND_CONSENT = ["/mind"] as const;

function under(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** True when a young account may open this (already auth-gated) path. */
export function youthMayOpen(path: string, claims: YouthClaims): boolean {
  if (ALWAYS.some((p) => under(path, p))) return true;
  if (claims.mind && WITH_MIND_CONSENT.some((p) => under(path, p))) return true;
  return false;
}
