"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Container from "@/components/Container";
import { cn } from "@/lib/utils";

/**
 * `MindSubNav` — the Mind pages, reachable from inside Mind (same pattern
 * as HrvSubNav). The active link underlines in the mind domain colour.
 * Hidden on onboarding, where the disclaimer must be read first.
 */

const LINKS = [
  { href: "/mind", key: "check" as const },
  { href: "/mind/today", key: "today" as const },
  { href: "/mind/journal", key: "journal" as const },
  { href: "/mind/sessions", key: "sessions" as const },
  { href: "/mind/weekly", key: "weekly" as const },
  { href: "/mind/cirkler", key: "cirkler" as const },
  { href: "/mind/settings", key: "settings" as const },
];

export default function MindSubNav() {
  const pathname = usePathname();
  const t = useTranslations("Mind.nav");
  if (pathname?.startsWith("/mind/onboarding")) return null;

  return (
    <div className="border-b hairline">
      <Container>
        <nav
          aria-label={t("aria")}
          // Right-edge fade on phones says "more to scroll" (a mask, not a gradient fill).
          className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto [mask-image:linear-gradient(to_right,#000_80%,transparent)] md:[mask-image:none]"
          style={{ scrollbarWidth: "none" }}
        >
          <ul className="flex items-center gap-5 pr-12 md:pr-0 text-meta whitespace-nowrap">
            {LINKS.map((link) => {
              const active =
                link.href === "/mind"
                  ? pathname === "/mind"
                  : pathname?.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center transition-colors duration-200 ease-out",
                      active
                        ? "text-fg underline underline-offset-4 decoration-2 decoration-domain"
                        : "text-fg-dim hover:text-fg",
                    )}
                  >
                    {t(link.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>
    </div>
  );
}
