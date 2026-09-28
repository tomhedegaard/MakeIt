/**
 * Platform detection — the capability bridge between the one web
 * codebase and the native shells (docs/APP_STORE_PLAN.md Fase 2).
 *
 * The Capacitor shells (Fase 3) append this marker to the WebView
 * user agent via `appendUserAgent: "MakeItApp/1 (ios|android)"` in
 * capacitor.config.ts. That makes native detection work BOTH
 * client-side (this file) and server-side (platform-server.ts) —
 * the server can strip purchase UI before it ever renders.
 *
 * Client-safe: no next/headers import here.
 */

export const NATIVE_UA_MARKER = "MakeItApp";

export type NativePlatform = "ios" | "android";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function capacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

/** Running inside one of the native app shells? (client) */
export function isNativeApp(): boolean {
  const cap = capacitor();
  if (cap?.isNativePlatform?.()) return true;
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(NATIVE_UA_MARKER);
}

/** Which shell — or null in a regular browser/PWA. (client) */
export function getNativePlatform(): NativePlatform | null {
  const cap = capacitor();
  const capPlatform = cap?.getPlatform?.();
  if (capPlatform === "ios" || capPlatform === "android") return capPlatform;
  if (typeof navigator === "undefined") return null;
  return parseNativePlatform(navigator.userAgent);
}

/** Shared UA parser — used by both client and server helpers. */
export function parseNativePlatform(userAgent: string): NativePlatform | null {
  if (!userAgent.includes(NATIVE_UA_MARKER)) return null;
  const match = userAgent.match(/MakeItApp\/\S+\s*\((ios|android)\)/i);
  if (match) return match[1].toLowerCase() as NativePlatform;
  // Marker present but malformed — fall back to OS sniffing so the
  // shell still behaves natively rather than as a browser.
  return /iphone|ipad|ipod/i.test(userAgent) ? "ios" : "android";
}
