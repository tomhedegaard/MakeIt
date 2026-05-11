"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/auth";

type NavItem = { href: string; label: string; num: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/coach",             label: "Overview",        num: "01" },
  { href: "/coach/members",     label: "Members",         num: "02" },
  { href: "/coach/queue",       label: "Form-check kø",   num: "03" },
  { href: "/coach/redemptions", label: "Reps-indløsninger", num: "04" },
  { href: "/coach/analytics",   label: "Analytics",       num: "05" },
  { href: "/coach/system",      label: "System",          num: "06", adminOnly: true },
];

export default function CoachShell({
  member,
  children,
}: {
  member: Member;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = NAV.filter((item) => !item.adminOnly || member.isAdmin);

  return (
    <div className="relative z-10 flex flex-1 minh-dvh">
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r hairline bg-bg-2/40 sticky top-0 h-dvh">
        <div className="px-5 py-5 border-b hairline">
          <Logo />
          <div className="mt-4 flex items-center gap-2">
            <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
              Coach
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
                    <span className="tracking-tight">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t hairline">
          <Link href="/dashboard" className="btn btn-ghost btn-sm w-full">
            ← Tilbage til medlem-app
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
                Coach
              </span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim"
            >
              Medlem ↗
            </Link>
          </div>
          <nav aria-label="Coach-navigation" className="overflow-x-auto">
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
                      {item.label}
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
