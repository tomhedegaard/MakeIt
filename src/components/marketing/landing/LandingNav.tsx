import { useTranslations } from "next-intl";
import Link from "next/link";
import { PUBLIC_LOGIN_HREF, PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import { Menu, X } from "lucide-react";
import { ICON } from "@/components/ui/icon";
import NavSpy from "./NavSpy";

const SECTIONS = [
  { href: "#train", key: "train" },
  { href: "#food", key: "food" },
  { href: "#hrv", key: "hrv" },
  { href: "#mind", key: "mind" },
  { href: "#crew-alone", key: "crew" },
  { href: "#munk", key: "munk" },
] as const;

const LINK = "text-xs text-fg-dim no-underline transition-colors hover:text-fg aria-[current=location]:text-fg";

/**
 * Kalk header (reference B `.hdr`). Six section links, login and one
 * access pill. From 1024 px everything sits on one line; below that the
 * section links live in a native `<details>` menu, so it works without JS.
 * NavSpy marks the chapter being read; on the desktop row the mark is a
 * 2 px ink line under the link.
 */
export default function LandingNav() {
  const t = useTranslations("Marketing.landing.nav");
  const menu = useTranslations("Marketing.nav");

  return (
    <header className="safe-top sticky top-0 z-50 border-b border-line bg-bg">
      <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="font-display whitespace-nowrap text-[20px] tracking-[0.02em]! no-underline sm:text-[24px]"
        >
          MakeIt <span className="text-fg-dim">{"//"} HQ</span>
        </Link>

        <nav className="flex items-center gap-4 lg:gap-7">
          <NavSpy />
          <ul data-nav="desktop" className="hidden items-center gap-7 whitespace-nowrap lg:flex">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <a href={s.href} className={`${LINK} relative after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-fg after:transition-transform after:duration-300 aria-[current=location]:after:scale-x-100 motion-reduce:after:transition-none`}>
                  {t(s.key)}
                </a>
              </li>
            ))}
          </ul>

          <Link href={PUBLIC_LOGIN_HREF} className={`${LINK} hidden whitespace-nowrap sm:inline`}>
            {t("login")}
          </Link>
          <Link href={PUBLIC_WAITLIST_HREF} className="btn btn-primary btn-sm h-9!">
            {t("cta")}
          </Link>

          <details className="group relative lg:hidden">
            <summary
              aria-label={menu("menuOpen")}
              className="flex size-10 cursor-pointer list-none items-center justify-center border border-line-strong text-fg [&::-webkit-details-marker]:hidden"
            >
              <Menu {...ICON} className="size-5 group-open:hidden" />
              <X {...ICON} className="hidden size-5 group-open:inline" />
            </summary>
            <ul className="absolute right-0 top-[calc(100%+12px)] flex min-w-[220px] flex-col border border-line bg-bg-2 p-2">
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={`${LINK} block px-3 py-3 hover:bg-bg-3`}>
                    {t(s.key)}
                  </a>
                </li>
              ))}
              <li className="sm:hidden">
                <Link href={PUBLIC_LOGIN_HREF} className={`${LINK} block px-3 py-3 hover:bg-bg-3`}>
                  {t("login")}
                </Link>
              </li>
            </ul>
          </details>
        </nav>
      </div>
    </header>
  );
}
