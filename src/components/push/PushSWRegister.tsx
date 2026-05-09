"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount. Browsers require the SW to
 * be registered before subscribe() is called, and registration is
 * cheap + idempotent (same scope+url returns the existing
 * registration). Failures are non-fatal: the rest of the app keeps
 * working without push.
 *
 * Mounted in the (app) layout so a member loading any signed-in
 * page primes the SW for the eventual subscribe click. We don't
 * register on the marketing/auth surfaces — those don't need it.
 */
export default function PushSWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        // Logged once at boot; the toggle UI shows a clearer message
        // if subscribe() later fails for the same reason.
        console.warn("[push] service worker registration failed:", err);
      });
  }, []);

  return null;
}
