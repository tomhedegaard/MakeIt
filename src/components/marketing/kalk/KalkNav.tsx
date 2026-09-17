import { useTranslations } from "next-intl";
import Link from "next/link";
import { PUBLIC_LOGIN_HREF, PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";

const SECTIONS = [
  { href: "#engine", key: "engine" },
  { href: "#systems", key: "systems" },
  { href: "#munk", key: "munk" },
  { href: "#crew", key: "crew" },
] as const;

const LINK = "font-mono text-xs uppercase tracking-[0.08em] text-fg-dim no-underline transition-colors hover:text-fg";

/**
 * Kalk header (reference B `.hdr`). Four section links, login and one
 * access pill. From 1024 px everything sits on one line; below that the
 * section links live in a native `<details>` menu, so it works without JS.
 */
export default function KalkNav() {
  const t = useTranslations("Marketing.kalk.nav");
  const menu = useTranslations("Marketing.nav");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-[10px]">
      <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="font-display whitespace-nowrap text-[20px] tracking-[0.02em]! no-underline sm:text-[24px]"
        >
          MakeIt <span className="text-fg-dim">{"//"} HQ</span>
        </Link>

        <nav className="flex items-center gap-4 lg:gap-7">
          <ul data-nav="desktop" className="hidden items-center gap-7 whitespace-nowrap lg:flex">
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <a href={s.href} className={LINK}>
                  {t(s.key)}
                </a>
              </li>
            ))}
          </ul>

          <Link href={PUBLIC_LOGIN_HREF} className={`${LINK} hidden whitespace-nowrap sm:inline`}>
            {t("login")}
          </Link>
          <Link href={PUBLIC_WAITLIST_HREF} className="btn btn-primary btn-sm">
            {t("cta")}
          </Link>

          <details className="group relative lg:hidden">
            <summary
              aria-label={menu("menuOpen")}
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line-strong text-fg [&::-webkit-details-marker]:hidden"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 6h14M3 10h14M3 14h14" className="group-open:hidden" />
                <path d="M5 5l10 10M15 5L5 15" className="hidden group-open:inline" />
              </svg>
            </summary>
            <ul className="absolute right-0 top-[calc(100%+12px)] flex min-w-[220px] flex-col rounded-[14px] border border-line bg-bg-2 p-2 shadow-[0_24px_40px_-24px_color-mix(in_oklab,var(--fg)_40%,transparent)]">
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={`${LINK} block rounded-[10px] px-3 py-3 hover:bg-bg-3`}>
                    {t(s.key)}
                  </a>
                </li>
              ))}
              <li className="sm:hidden">
                <Link href={PUBLIC_LOGIN_HREF} className={`${LINK} block rounded-[10px] px-3 py-3 hover:bg-bg-3`}>
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
