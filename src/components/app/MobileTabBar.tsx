"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type Tab = { href: string; labelKey: string; icon: React.ReactNode; domain?: string };

const Icon = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  train: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <rect x="2" y="9" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="19" y="9" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="6" y="7" width="2" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="16" y="7" width="2" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
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
  food: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path d="M3 12h18a9 9 0 0 1-18 0z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 7c0 1 1 1.5 1 3M14 6c0 1.2 1 1.8 1 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
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
  mind: (
    <svg viewBox="0 0 24 24" fill="none" className="tab-icon" aria-hidden>
      <path
        d="M12 4c-3.5 0-6 2.5-6 5.5 0 2 1 3.5 2 4.5v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3c1-1 2-2.5 2-4.5 0-3-2.5-5.5-6-5.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 19h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 11v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  { href: "/profile",   labelKey: "me",    icon: Icon.me },
];

export default function MobileTabBar({
  unreadMessages = 0,
}: {
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  return (
    <nav
      className="tabbar lg:hidden"
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
