"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Logo from "@/components/Logo";
import Container from "@/components/Container";
import LanguageSelector from "@/components/LanguageSelector";
import {
  PUBLIC_LOGIN_HREF,
  PUBLIC_WAITLIST_HREF,
} from "@/lib/marketing/public-cta";

/**
 * WAUW-4 — adds a mobile hamburger sheet. The v1 nav was
 * `hidden md:flex`, meaning every nav link disappeared on phones
 * — a real regression. The hamburger uses the same fixed-header
 * shell, surface-2 panel, and font-mono link styling as the
 * desktop nav so it doesn't introduce a second style language.
 *
 * Sheet behaviour:
 *  - tap menu icon → panel slides in from below (under header)
 *  - Esc or tap-outside closes
 *  - selecting any link auto-closes (links use plain # anchors so
 *    the browser handles scroll for free)
 *  - body scroll-locked while open to prevent backdrop scroll
 */
export default function MarketingNav() {
  const t = useTranslations("Marketing.nav");
  const [open, setOpen] = useState(false);

  // Body scroll-lock while the sheet is open. Cleanup on close /
  // unmount so we never leave overflow:hidden behind.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links: { href: string; key: string; titleKey?: string }[] = [
    { href: "#crew",          key: "crew" },
    { href: "#munk",          key: "munk" },
    { href: "#engine",        key: "engine", titleKey: "engineTitle" },
    { href: "#pillar-engine", key: "coaching" },
    { href: "#tiers",         key: "tiers", titleKey: "tiersTitle" },
    { href: "#app",           key: "app" },
    { href: "#how",           key: "price" },
    { href: "#faq",           key: "faq" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b hairline backdrop-blur-md bg-[rgba(10,10,11,0.6)]">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link
            href="/"
            aria-label="MakeIt"
            className="text-fg"
            onClick={() => setOpen(false)}
          >
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-[12px] tracking-[0.18em] uppercase text-fg-dim font-mono">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                title={l.titleKey ? t(l.titleKey) : undefined}
                className="hover:text-fg transition-colors"
              >
                {t(l.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase font-mono text-fg-dim">
              <span className="pulse-dot" /> {t("closedBeta")}
            </span>
            {/* UX-audit A2: den fulde sprogvælger overflowede headeren
                på små skærme og skubbede hamburgeren ud af viewporten —
                på mobil bor den i stedet nederst i menu-sheetet. */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            <Link
              href={PUBLIC_LOGIN_HREF}
              className="hidden sm:inline-flex text-[12px] tracking-[0.18em] uppercase text-fg-dim font-mono hover:text-fg"
            >
              {t("login")}
            </Link>
            <Link href={PUBLIC_WAITLIST_HREF} className="btn btn-sm btn-primary">
              {t("getAccess")}
            </Link>

            {/* Mobile hamburger trigger */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center size-9 rounded-full border hairline-strong text-fg-dim hover:text-fg lift touch-app"
              aria-label={open ? t("menuClose") : t("menuOpen")}
              aria-expanded={open}
              aria-controls="marketing-nav-sheet"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <CloseGlyph /> : <MenuGlyph />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile sheet — anchored under the header, fills viewport
          below it. Backdrop is the body scroll-lock + a subtle dim. */}
      {open ? (
        <div
          id="marketing-nav-sheet"
          // Headerens backdrop-blur gør den til containing block for
          // fixed-positionerede børn, så `top-14 bottom-0` beregnes mod
          // den 56px høje header og kollapser til højde 0 (menuen var
          // usynlig i produktion). Eksplicit højde omgår det.
          className="md:hidden fixed left-0 right-0 top-full h-[calc(100dvh-3.5rem)] z-30 bg-[rgba(10,10,11,0.92)] backdrop-blur-lg overflow-y-auto"
          onClick={(e) => {
            // Close when tapping the backdrop directly (but not its
            // children — let link clicks bubble first).
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <Container className="py-8">
            <nav>
              <ul className="space-y-1">
                {links.map((l, i) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      title={l.titleKey ? t(l.titleKey) : undefined}
                      onClick={() => setOpen(false)}
                      className="block py-4 border-b hairline text-fg/90 text-sm font-mono uppercase tracking-[0.16em] hover:text-fg"
                    >
                      <span className="numeric text-fg-faint mr-3">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {t(l.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={PUBLIC_WAITLIST_HREF}
                onClick={() => setOpen(false)}
                className="btn btn-primary w-full"
              >
                {t("getAccess")}
              </Link>
              <Link
                href={PUBLIC_LOGIN_HREF}
                onClick={() => setOpen(false)}
                className="btn btn-ghost w-full"
              >
                {t("login")}
              </Link>
            </div>
            <div className="mt-8">
              <LanguageSelector />
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="size-4" aria-hidden>
      <rect x="2" y="3.5" width="10" height="1.2" rx="0.6" fill="currentColor" />
      <rect x="2" y="6.4" width="10" height="1.2" rx="0.6" fill="currentColor" />
      <rect x="2" y="9.3" width="10" height="1.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="size-4" aria-hidden>
      <path
        d="M3 3 L11 11 M11 3 L3 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
