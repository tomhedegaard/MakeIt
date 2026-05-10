"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode };

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
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Today", icon: Icon.today },
  { href: "/coaching",  label: "Træn",  icon: Icon.train },
  { href: "/nutrition", label: "Mad",   icon: Icon.food },
  { href: "/community", label: "Crew",  icon: Icon.crew },
  { href: "/messages",  label: "Chat",  icon: Icon.chat },
  { href: "/reps",      label: "Reps",  icon: Icon.reps },
  { href: "/profile",   label: "Mig",   icon: Icon.me },
];

export default function MobileTabBar({
  unreadMessages = 0,
}: {
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  return (
    <nav
      className="tabbar lg:hidden"
      aria-label="Hovednavigation"
    >
      <div className="tabbar-row">
        {TABS.map((t) => {
          const active =
            t.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(t.href);
          const showBadge = t.href === "/messages" && unreadMessages > 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="tab relative"
              data-active={active || false}
            >
              {t.icon}
              <span>{t.label}</span>
              {showBadge ? (
                <span
                  className="absolute top-1 right-2 numeric text-[9px] tabular-nums px-1 py-0.5 rounded-full bg-fg text-bg leading-none min-w-[14px] text-center"
                  aria-label={`${unreadMessages} ulæste`}
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
