"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/auth";
import { logoutAction } from "@/app/(app)/actions";
import MobileTabBar from "@/components/app/MobileTabBar";

const NAV = [
  { href: "/dashboard", label: "Today",     num: "01" },
  { href: "/coaching",  label: "Træn",      num: "02" },
  { href: "/community", label: "Crew",      num: "03" },
  { href: "/reps",      label: "Reps",      num: "04" },
  { href: "/profile",   label: "Mig",       num: "05" },
];

export default function AppShell({
  member,
  children,
}: {
  member: Member;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Immersive mode for the active workout — hide chrome.
  const immersive = pathname?.startsWith("/session");

  if (immersive) {
    return <div className="relative z-10 flex-1 minh-dvh">{children}</div>;
  }

  return (
    <div className="relative z-10 flex flex-1 minh-dvh">
      {/* Desktop sidebar (≥ lg) */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r hairline bg-bg-2/40 sticky top-0 h-dvh">
        <div className="px-6 py-6 border-b hairline">
          <Logo />
        </div>

        <nav className="flex-1 px-3 py-6">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
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
          <div className="surface-2 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow mb-1.5">Tier</div>
                <div className="font-display text-2xl">{member.tier}</div>
              </div>
              <div className="numeric text-fg-faint text-xs">
                @{member.handle}
              </div>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="btn btn-ghost btn-sm w-full">
              Log ud
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header */}
        <header className="lg:hidden flex h-14 items-center justify-between px-5 border-b hairline sticky top-0 z-30 bg-bg/85 backdrop-blur">
          <Logo />
          <Link
            href="/profile"
            className="size-9 rounded-full surface-2 flex items-center justify-center text-xs font-mono uppercase"
            aria-label="Min profil"
          >
            {member.handle.slice(0, 2)}
          </Link>
        </header>

        <main className="flex-1 pb-tabbar lg:pb-0">{children}</main>
      </div>

      {/* Mobile tab-bar */}
      <MobileTabBar />
    </div>
  );
}
