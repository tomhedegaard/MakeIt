/**
 * Which landing `/` renders. Server-only env, read per request so a
 * Vercel Preview can run Kalk while Production stays classic
 * (spec 2026-09-17 §5, plan F2). Remove with the classic landing.
 */
export type LandingVariant = "classic" | "kalk";

export function getLandingVariant(
  env: Record<string, string | undefined> = process.env,
): LandingVariant {
  return env.LANDING_VARIANT?.trim().toLowerCase() === "kalk" ? "kalk" : "classic";
}
