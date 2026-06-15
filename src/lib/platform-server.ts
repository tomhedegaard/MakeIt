import { headers } from "next/headers";
import {
  NATIVE_UA_MARKER,
  parseNativePlatform,
  type NativePlatform,
} from "@/lib/platform";

/**
 * Server-side native detection (docs/APP_STORE_PLAN.md Fase 2).
 *
 * Reads the request user agent for the shell marker the Capacitor
 * apps append (see platform.ts). Server components use this to
 * gate store-sensitive UI — most importantly /billing, which must
 * not render purchase CTAs inside the native apps (Apple 3.1.1:
 * v1-apps sælger ingenting; abonnement købes på web).
 */
export async function isNativeRequest(): Promise<boolean> {
  const h = await headers();
  return (h.get("user-agent") ?? "").includes(NATIVE_UA_MARKER);
}

/** Which shell sent the request — or null for browsers/PWA. */
export async function getNativeRequestPlatform(): Promise<NativePlatform | null> {
  const h = await headers();
  return parseNativePlatform(h.get("user-agent") ?? "");
}
