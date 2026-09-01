/**
 * Path classifier for the auth gate in src/middleware.ts.
 *
 * Default-deny: only these prefixes/exact paths are public. Everything
 * else that reaches the matcher requires a session. `/` is exact-match
 * so it cannot accidentally open `/mind`.
 *
 * `/api` is intentionally absent. The matcher already skips `api/`;
 * classifying those paths as protected means we never open a hole
 * that lets /api/settings/export through without its own getSession.
 *
 * Spec: docs/superpowers/specs/2026-09-01-middleware-default-deny.md
 */

const PUBLIC_EXACT = new Set([
  "/",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/hrv-ppg-probe.html",
  "/science/feed.json",
  "/science/feed.xml",
  "/favicon.ico",
]);

const PUBLIC_PREFIXES = [
  "/login",
  "/privacy",
  "/terms",
  "/auth",
  "/.well-known",
  "/_next",
] as const;

/** Strip query/hash and a trailing slash (except root). */
export function normalizePathname(pathname: string): string {
  const bare = pathname.split(/[?#]/, 1)[0] ?? pathname;
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare || "/";
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

export function needsAuth(pathname: string): boolean {
  return !isPublicPath(pathname);
}
