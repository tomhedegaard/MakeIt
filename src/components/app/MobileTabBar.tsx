"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Brain, CalendarDays, Dumbbell, Users, Utensils } from "lucide-react";

type Tab = { href: string; labelKey: string; icon: React.ReactNode; domain?: string };

/**
 * Nord tab icons (spec §5): one line family at 24 px, 1.5 px stroke,
 * square caps, monochrome. The anatomical DomainMark glyphs (stomach,
 * skull, figure) stay where they carry meaning — BodyMap, the HQ strip —
 * but as nav they read as illustrations, not icons.
 */
const LINE = { strokeWidth: 1.5, strokeLinecap: "square", strokeLinejoin: "miter", className: "tab-icon", "aria-hidden": true } as const;

const Icon = {
  today: <CalendarDays {...LINE} />,
  train: <Dumbbell {...LINE} />,
  food: <Utensils {...LINE} />,
  mind: <Brain {...LINE} />,
  crew: <Users {...LINE} />,
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
