"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/auth";

type NavItem = { href: string; labelKey: string; num: string; adminOnly?: boolean };

// "08 Co-coaches" is Munk-only (page also enforces tier='munk').
// In this codebase the Munk session === the admin session (see auth.ts),
// so the existing `adminOnly` flag is the right gate.
const NAV: NavItem[] = [
  { href: "/coach",             labelKey: "navOverview",    num: "01" },
  { href: "/coach/members",     labelKey: "navMembers",     num: "02" },
  { href: "/coach/programs",    labelKey: "navPrograms",    num: "03" },
  { href: "/coach/exercises",   labelKey: "navExercises",   num: "04" },
  { href: "/coach/queue",       labelKey: "navQueue",       num: "05" },
  { href: "/coach/redemptions", labelKey: "navRedemptions", num: "06" },
  { href: "/coach/analytics",   labelKey: "navAnalytics",   num: "07" },
  { href: "/coach/co-coaches",  labelKey: "navCoCoaches",   num: "08", adminOnly: true },
  { href: "/coach/patterns",    labelKey: "navPatterns",    num: "09" },
  { href: "/coach/system",      labelKey: "navSystem",      num: "10", adminOnly: true },
];

export default function CoachShell({
  member,
  children,
}: {
  member: Member;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("Coach.shell");
  const nav = NAV.filter((item) => !item.adminOnly || member.isAdmin);

  return (
    <div className="relative z-10 flex flex-1 minh-dvh">
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r hairline bg-bg-2/40 sticky top-0 h-dvh">
        <div className="px-5 py-5 border-b hairline">
          <Logo />
          <div className="mt-4 flex items-center gap-2">
            <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
              {t("badge")}
            </span>
            <span className="eyebrow">@{member.handle}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5">
          <ul className="space-y-1">
            {nav.map((item) => {
              const active =
                item.href === "/coach"
                  ? pathname === "/coach"
                  : pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-bg-3 text-fg"
                        : "text-fg-dim hover:text-fg hover:bg-bg-3/60"
                    )}
                  >
                    <span className="numeric text-[11px] text-fg-faint group-hover:text-fg-dim w-6">
                      {item.num}
                    </span>
                    <span className="tracking-tight">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t hairline">
          <Link href="/dashboard" className="btn btn-ghost btn-sm w-full">
            {t("backToMemberApp")}
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-bg/85 backdrop-blur border-b hairline">
          <div className="flex h-14 items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                {t("badge")}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim"
            >
              {t("memberApp")}
            </Link>
          </div>
          <nav aria-label={t("navAriaLabel")} className="overflow-x-auto">
            <ul className="flex gap-1 px-3 py-2 min-w-max">
              {nav.map((item) => {
                const active =
                  item.href === "/coach"
                    ? pathname === "/coach"
                    : pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-[0.14em] block",
                        active ? "bg-bg-3 text-fg" : "text-fg-dim"
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
