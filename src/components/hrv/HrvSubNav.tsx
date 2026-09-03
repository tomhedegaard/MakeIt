"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * `HrvSubNav` — compact sub-navigation shared across the four `/hrv` pages.
 *
 * A horizontal row of four links. The active link keeps white text but
 * underlines in the heart domain color (resolved via the /hrv layout's
 * data-domain scope) — see docs/DOMAIN_COLOR_SYSTEM.md.
 */

const LINKS = [
  { href: "/hrv", key: "today" as const },
  { href: "/hrv/trends", key: "trends" as const },
  { href: "/hrv/insights", key: "insights" as const },
  { href: "/hrv/learn", key: "learn" as const },
];

export default function HrvSubNav() {
  const pathname = usePathname();
  const t = useTranslations("Hrv.subNav");

  return (
    <nav
      aria-label={t("aria")}
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
                ? "text-fg underline underline-offset-4 decoration-2 decoration-domain"
                : "text-fg-faint hover:text-fg",
            )}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
