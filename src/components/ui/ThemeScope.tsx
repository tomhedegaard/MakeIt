// src/components/ui/ThemeScope.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Theme = "nord" | "nat";

/**
 * The only way to switch a surface's theme (Nord, spec 2026-09-26 §3).
 * Nord lys sits on `:root`, so a "nord" scope only restates the default;
 * a "nat" scope is lifted to <html> via :has(), so the page background
 * and root-level UI follow it. Page/layout level ONLY: a Nat scope
 * anywhere on a light page turns the whole page dark. For a dark
 * fortællebånd inside a light page use a plain `data-theme="nat"`
 * wrapper without `.theme-root`. Server component.
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
