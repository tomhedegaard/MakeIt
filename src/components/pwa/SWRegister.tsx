"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (push + offline fallback) on mount.
 *
 * Mounted in the ROOT layout so every surface — marketing included —
 * is PWA-installable (docs/APP_STORE_PLAN.md Fase 1). Registration is
 * cheap + idempotent (same scope+url returns the existing
 * registration), and push subscribe (PushToggle) awaits
 * navigator.serviceWorker.ready independently. Failures are
 * non-fatal: the app works without the SW.
 */
export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[pwa] service worker registration failed:", err);
      });
  }, []);

  return null;
}
