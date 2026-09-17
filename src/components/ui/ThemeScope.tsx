// src/components/ui/ThemeScope.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Theme = "kalk" | "nat";

/**
 * The only way to switch a surface's theme (spec 2026-09-17 §2).
 * globals.css lifts the nearest theme to <html> via :has(), so the
 * page background and root-level UI follow. Server component.
 */
export default function ThemeScope({
  theme,
  className,
  children,
}: {
  theme: Theme;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-theme={theme} className={cn("theme-root", className)}>
      {children}
    </div>
  );
}
