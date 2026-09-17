"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/platform";
import { schemeFromDocument, statusBarPlugin, syncStatusBar } from "@/lib/native/status-bar";

/**
 * Reads the active theme straight from the DOM (not computed `color-scheme`,
 * which relies on `:has()` — absent in older Android WebViews) and syncs the
 * native status bar to match. Re-reads on mount, on every navigation, and via
 * a MutationObserver on <body> so a theme change without navigation (e.g. a
 * Nat-scoped sheet opening) is still picked up. Only calls the plugin when
 * the resolved scheme actually changed.
 */
export default function NativeChrome() {
  const pathname = usePathname();
  const lastScheme = useRef<"light" | "dark" | null>(null);
  const pendingFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;

    const sync = () => {
      pendingFrame.current = null;
      const scheme = schemeFromDocument(document);
      if (scheme === lastScheme.current) return;
      lastScheme.current = scheme;
      void syncStatusBar(statusBarPlugin(), scheme);
    };

    const scheduleSync = () => {
      if (pendingFrame.current !== null) return;
      pendingFrame.current = requestAnimationFrame(sync);
    };

    scheduleSync();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    };
  }, [pathname]);

  return null;
}
