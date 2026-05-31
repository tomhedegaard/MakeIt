"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * `HrvSubNav` — compact sub-navigation shared across the four `/hrv` pages.
 *
 * A horizontal row of four links: I dag (`/hrv`) · Forløb (`/hrv/trends`) ·
 * Indsigt (`/hrv/insights`) · Lær (`/hrv/learn`). The active link is emphasised
 * via weight + opacity only — monochrome, no colour accents (MakeIt design
 * language).
 *
 * Client component: reads `usePathname` to resolve the active link. `/hrv` is
 * matched exactly so it doesn't light up on a sub-route.
 */

const LINKS = [
  { href: "/hrv", label: "I dag" },
  { href: "/hrv/trends", label: "Forløb" },
  { href: "/hrv/insights", label: "Indsigt" },
  { href: "/hrv/learn", label: "Lær" },
];

export default function HrvSubNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="HRV"
      className="flex items-center gap-5 text-[11px] font-mono uppercase tracking-[0.14em]"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/hrv"
            ? pathname === "/hrv"
            : pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "transition-colors",
              active
                ? "text-fg underline underline-offset-4"
                : "text-fg-faint hover:text-fg",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
