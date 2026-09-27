"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, Users } from "lucide-react";
import DomainMark from "@/components/brand/DomainMark";
import { ICON } from "@/components/ui/icon";
import { youthMayOpen, type YouthClaims } from "@/lib/youth/routes";

type Tab = { href: string; labelKey: string; icon: React.ReactNode; domain?: string };

/**
 * Nord tab icons (spec §5, §11): the domain tabs show their DomainMark,
 * so a domain has one mark everywhere; I dag and Crew use the same line
 * family. 24 px, 1.5 px stroke, square caps, monochrome.
 */
const Icon = {
  today: <CalendarDays {...ICON} className="tab-icon" />,
  train: <DomainMark domain="body" className="tab-icon" />,
  food: <DomainMark domain="food" className="tab-icon" />,
  mind: <DomainMark domain="mind" className="tab-icon" />,
  crew: <Users {...ICON} className="tab-icon" />,
};

// Five tabs (spec §6). Me, Reps, HRV and Science live in the header menu.
const TABS: Tab[] = [
  { href: "/dashboard", labelKey: "today", icon: Icon.today },
  { href: "/coaching",  labelKey: "train", icon: Icon.train, domain: "body" },
  { href: "/nutrition", labelKey: "food",  icon: Icon.food,  domain: "food" },
  { href: "/mind",      labelKey: "mind",  icon: Icon.mind,  domain: "mind" },
  { href: "/community", labelKey: "crew",  icon: Icon.crew },
];

/** MakeIt Ung: only the young account's own tabs, Mad → /ung/mad. */
export function tabsFor(youth: YouthClaims | null): Tab[] {
  if (!youth) return TABS;
  return TABS.map((tab) => (tab.href === "/nutrition" ? { ...tab, href: "/ung/mad" } : tab)).filter((tab) =>
    youthMayOpen(tab.href, youth),
  );
}

export default function MobileTabBar({ youth = null }: { youth?: YouthClaims | null }) {
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
        {tabsFor(youth).map((tab) => {
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
