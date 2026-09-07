/**
 * Start Program failure plumbing — safe on client and server.
 *
 * The button must never throw while rendering an error. These helpers
 * stringify unknown failures so Testy can report the raw assign /
 * server-action message under the alert.
 */

export function startProgramDetail(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return String(err);
}

export function isNextRedirectError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("digest" in err)) {
    return false;
  }
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/**
 * Path from a Next.js `redirect()` sentinel
 * (`NEXT_REDIRECT;replace;/dashboard;307;`). Used so a long server
 * action can hard-navigate after the throw — soft follow can flake.
 */
export function nextRedirectPath(err: unknown): string | null {
  if (!isNextRedirectError(err)) return null;
  const digest = String((err as { digest?: unknown }).digest ?? "");
  const path = digest.split(";")[2]?.trim();
  return path && path.startsWith("/") ? path : null;
}
