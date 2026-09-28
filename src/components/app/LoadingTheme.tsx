"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ThemeScope from "@/components/ui/ThemeScope";

/**
 * The (app) loading boundary is the first one a dynamic prefetch reaches,
 * so navigating to /session can show it before the session's own Nat
 * boundary. Turn it Nat there so the dark session never flashes light.
 */
export default function LoadingTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname?.startsWith("/session")) return <>{children}</>;
  return (
    <ThemeScope theme="nat" className="minh-dvh">
      {children}
    </ThemeScope>
  );
}
