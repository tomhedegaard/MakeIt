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
  food: <DomainMark domain="food" className="tab-icon" />,
  mind: <DomainMark domain="mind" className="tab-icon" />,
};

// Five tabs (spec §6). Me, Reps, HRV and Science live in the header menu.
const TABS: Tab[] = [
  { href: "/dashboard", labelKey: "today", icon: Icon.today },
  { href: "/coaching",  labelKey: "train", icon: Icon.train, domain: "body" },
  { href: "/nutrition", labelKey: "food",  icon: Icon.food,  domain: "food" },
  { href: "/mind",      labelKey: "mind",  icon: Icon.mind,  domain: "mind" },
  { href: "/community", labelKey: "crew",  icon: Icon.crew },
];

export default function MobileTabBar() {
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
