"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquare, User } from "lucide-react";
import { ICON } from "@/components/ui/icon";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/auth";
import { logoutAction } from "@/app/(app)/actions";
import MobileTabBar from "@/components/app/MobileTabBar";
import { youthMayOpen, type YouthClaims } from "@/lib/youth/routes";
import { YouthProvider } from "@/components/youth/YouthContext";

const NAV = [
  { href: "/dashboard", labelKey: "today",    num: "01" },
  { href: "/coaching",  labelKey: "train",    num: "02", domain: "body" },
  { href: "/nutrition", labelKey: "food",     num: "03", domain: "food" },
  { href: "/community", labelKey: "crew",     num: "04" },
  { href: "/hrv",       labelKey: "hrv",      num: "05", domain: "heart" },
  { href: "/mind",      labelKey: "mind",     num: "06", domain: "mind" },
  { href: "/reps",      labelKey: "reps",     num: "07" },
  { href: "/science",   labelKey: "science",  num: "08" },
  { href: "/profile",   labelKey: "me",       num: "09" },
  { href: "/messages",  labelKey: "messages", num: "10" },
] as const;

/**
 * MakeIt Ung (spec afsnit 3): a young account sees only its own routes,
 * with Mad pointing at the number-free /ung/mad instead of /nutrition.
 */
export function navFor(youth: YouthClaims | null) {
  if (!youth) return [...NAV];
  return NAV.map((item) => (item.href === "/nutrition" ? { ...item, href: "/ung/mad" } : item)).filter((item) =>
    youthMayOpen(item.href, youth),
  );
}

export default function AppShell({
  member,
  unreadMessages = 0,
  demoMode = false,
  youth = null,
  children,
}: {
  member: Member;
  unreadMessages?: number;
  demoMode?: boolean;
  /** MakeIt Ung: the young account's claims; null for adults. */
  youth?: YouthClaims | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const menuRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // <details> works without JS; with JS, close it once a link is chosen,
  // on any route change, on Escape and on a press outside.
  const closeMenu = () => menuRef.current?.removeAttribute("open");

  useEffect(() => {
    menuRef.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        menuRef.current?.removeAttribute("open");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      menuRef.current?.removeAttribute("open");
      summaryRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);
  // Immersive mode for the active workout — hide chrome.
  const immersive = pathname?.startsWith("/session");

  if (immersive) {
    return (
      <YouthProvider value={youth}>
        <div className="relative z-10 flex-1 min-h-dvh">{children}</div>
      </YouthProvider>
    );
  }

  return (
    <YouthProvider value={youth}>
    <div className="relative z-10 flex h-dvh flex-1 lg:h-auto lg:min-h-dvh">
      {/* Desktop sidebar (≥ lg) */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r hairline bg-bg-2/40 sticky top-0 h-dvh">
        <div className="px-6 py-6 border-b hairline">
          <Logo />
        </div>

        <nav className="flex-1 px-3 py-6">
          <ul className="space-y-1">
            {navFor(youth).map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href);
              const domain = "domain" in item ? item.domain : undefined;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    data-domain={domain}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors border-l-2 border-transparent",
                      active
                        ? "bg-bg-3 text-fg"
                        : "text-fg-dim hover:text-fg hover:bg-bg-3/60",
                      active && domain && "border-l-domain"
                    )}
                  >
                    <span
                      className={cn(
                        "numeric text-micro w-6",
                        domain
                          ? "text-domain"
                          : "text-fg-faint group-hover:text-fg-dim"
                      )}
                    >
                      {item.num}
                    </span>
                    <span className="tracking-tight">{t(`links.${item.labelKey}`)}</span>
                    {item.href === "/messages" && unreadMessages > 0 ? (
                      <span
                        className="ml-auto numeric text-micro tabular-nums px-1.5 py-0.5 bg-fg text-bg"
                        aria-label={t("shell.unread", { count: unreadMessages })}
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t hairline">
          {member.isCoach ? (
            <Link
              href="/coach"
              className="block surface-2 p-3 rounded-lg mb-3 hover:bg-bg-3 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="numeric text-micro border hairline-strong px-2 py-0.5">
                    {t("shell.coachBadge")}
                  </span>
                  <span className="text-sm">{t("shell.coachConsole")}</span>
                </div>
                <span className="text-fg-dim group-hover:text-fg" aria-hidden>→</span>
              </div>
            </Link>
          ) : null}
          <div className="surface-2 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow mb-1.5">{t("shell.tier")}</div>
                <div className="font-display text-2xl">{member.tier}</div>
              </div>
              <div className="numeric text-fg-faint text-xs">
                @{member.handle}
              </div>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="btn btn-ghost btn-sm w-full">
              {t("shell.logout")}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top header — outside the scrollport. */}
        {/* Nord topbjælke (spec §5): ordmærke til venstre, beskeder og profil
            som 24 px linjeikoner til højre, 1 px linje under. Hvid flade,
            ingen blur. */}
        <header className="safe-top lg:hidden relative flex h-14 shrink-0 items-center justify-between pl-5 pr-2 border-b hairline z-30 bg-bg">
          <Logo />
          <div className="flex items-center">
            {/* Messages — kept one-tap on mobile after the tab bar
                lost its Messages slot to /mind (Søjle 5). */}
            {youth ? null : (
            <Link
              href="/messages"
              className="relative size-11 flex items-center justify-center text-fg"
              aria-label={
                unreadMessages > 0
                  ? `${t("links.messages")}, ${t("shell.unread", { count: unreadMessages })}`
                  : t("links.messages")
              }
            >
              <MessageSquare {...ICON} className="size-6" />
              {unreadMessages > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1 numeric text-micro tabular-nums px-1 py-0.5 bg-fg text-bg leading-none min-w-[14px] text-center"
                >
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              ) : null}
            </Link>
            )}
            {/* Header menu (spec §6): the five tabs leave Me, Reps, HRV
                and Science here. */}
            <details
              ref={menuRef}
              data-mobile-menu
              className="relative z-10"
              onToggle={(e) => setMenuOpen(e.currentTarget.open)}
            >
              <summary
                ref={summaryRef}
                className="size-11 flex items-center justify-center text-fg cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                aria-label={t("shell.menu")}
              >
                <User {...ICON} className="size-6" />
              </summary>
              <nav
                aria-label={t("shell.menu")}
                className="absolute right-0 top-full mt-2 w-48 rounded-lg border hairline bg-bg py-1"
              >
                <ul>
                  {([
                    { href: "/profile", labelKey: "me" },
                    { href: "/reps", labelKey: "reps" },
                    { href: "/hrv", labelKey: "hrv" },
                    { href: "/science", labelKey: "science" },
                  ] as const)
                    .filter((item) => !youth || youthMayOpen(item.href, youth))
                    .map((item) => {
                    const active = pathname?.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block px-4 py-3 text-sm transition-colors hover:bg-bg-3",
                            active ? "text-fg" : "text-fg-dim"
                          )}
                        >
                          {t(`links.${item.labelKey}`)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </details>
          </div>
        </header>

        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-tabbar lg:overflow-visible lg:pb-0"
        >
          {demoMode ? (
            <div
              role="status"
              className="px-5 py-2 border-b hairline text-micro text-fg-dim"
            >
              {t("shell.demoBanner")}
            </div>
          ) : null}
          {children}
        </main>
        {/* In-flow on mobile so main's viewport ends above the tab bar.
            Fixed overlay was why #69's token bump never cleared Learn/Reps. */}
        <MobileTabBar youth={youth} />
      </div>
    </div>
    </YouthProvider>
  );
}
