"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/platform";
import { statusBarPlugin, syncStatusBar } from "@/lib/native/status-bar";

/** Re-reads <html>'s color-scheme after each navigation (the theme is lifted there via :has). */
export default function NativeChrome() {
  const pathname = usePathname();
  useEffect(() => {
    if (!isNativeApp()) return;
    const id = requestAnimationFrame(() => {
      void syncStatusBar(statusBarPlugin(), getComputedStyle(document.documentElement).colorScheme);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}
