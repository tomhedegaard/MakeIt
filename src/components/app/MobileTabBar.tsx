"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import DomainMark from "@/components/brand/DomainMark";

type Tab = { href: string; labelKey: string; icon: React.ReactNode; domain?: string };

const Icon = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  train: <DomainMark domain="body" className="tab-icon" />,
  crew: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M14 19c0-2 1.5-3.5 4-3.5s3 1 3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  reps: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path d="M12 3l2.5 5 5.5.8-4 4 1 5.5-5-2.7-5 2.7 1-5.5-4-4 5.5-.8L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  me: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  food: <DomainMark domain="food" className="tab-icon" />,
  chat: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5v-3.5H6.5A2.5 2.5 0 0 1 4 14.5v-8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  mind: <DomainMark domain="mind" className="tab-icon" />,
  science: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path
        d="M10 3h4M10.5 3v6L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3l-5-9V3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 15h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

const TABS: Tab[] = [
  { href: "/dashboard", labelKey: "today", icon: Icon.today },
  { href: "/coaching",  labelKey: "train", icon: Icon.train, domain: "body" },
  { href: "/nutrition", labelKey: "food",  icon: Icon.food,  domain: "food" },
  { href: "/community", labelKey: "crew",  icon: Icon.crew },
  { href: "/mind",      labelKey: "mind",  icon: Icon.mind,  domain: "mind" },
  { href: "/reps",      labelKey: "reps",  icon: Icon.reps },
  { href: "/science",   labelKey: "science", icon: Icon.science },
  { href: "/profile",   labelKey: "me",    icon: Icon.me },
];

export default function MobileTabBar({
  unreadMessages = 0,
}: {
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const apply = () => {
      if (getComputedStyle(el).display === "none") {
        document.documentElement.style.removeProperty("--tabbar-stack");
        return;
      }
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--tabbar-stack", `${height}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.documentElement.style.removeProperty("--tabbar-stack");
    };
  }, []);

  return (
    <nav
      ref={barRef}
      className="tabbar relative inset-auto w-full shrink-0 lg:hidden"
      aria-label={t("shell.mainNav")}
    >
      <div className="tabbar-row">
        {TABS.map((tab) => {
          const active =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(tab.href);
          const showBadge = tab.href === "/messages" && unreadMessages > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="tab relative"
              data-active={active || false}
              data-domain={tab.domain}
            >
              {tab.icon}
              <span>{t(`links.${tab.labelKey}`)}</span>
              {showBadge ? (
                <span
                  className="absolute top-1 right-2 numeric text-[9px] tabular-nums px-1 py-0.5 rounded-full bg-fg text-bg leading-none min-w-[14px] text-center"
                  aria-label={t("shell.unread", { count: unreadMessages })}
                >
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
