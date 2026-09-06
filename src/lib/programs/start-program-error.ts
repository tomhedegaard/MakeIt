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
