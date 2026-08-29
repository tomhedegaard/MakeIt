"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "mi_cookie_consent_v1";

type Choice = "accepted" | "essential" | null;

export default function CookieBanner() {
  const t = useTranslations("Misc.cookieBanner");
  const [choice, setChoice] = useState<Choice>("essential"); // assume dismissed until checked
  const [hasChecked, setHasChecked] = useState(false);

  // One-shot read of the persisted consent choice on mount; setState here
  // is intentional and won't cascade.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChoice((v === "accepted" || v === "essential" ? v : null) as Choice);
      setHasChecked(true);
    } catch {
      setHasChecked(true);
    }
  }, []);

  function persist(c: NonNullable<Choice>) {
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
    setChoice(c);
  }

  if (!hasChecked || choice !== null) return null;

  // UX-audit A3: v1-kortet dækkede ~45% af mobilviewporten og lå oven
  // på venteliste-formularens submit på desktop. Nu en lav, solid bar
  // langs bunden — én tekstlinje + knapper, intet der skygger for CTA'er.
  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed bottom-0 inset-x-0 z-50 border-t hairline-strong"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="flex-1 min-w-[240px] text-xs md:text-sm text-fg-dim leading-snug">
          {t("bodyBefore")}
          <Link href="/privacy" className="underline hover:text-fg">
            {t("privacyLink")}
          </Link>
          {t("bodyAfter")}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => persist("accepted")}
          >
            {t("accept")}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => persist("essential")}
          >
            {t("essential")}
          </button>
        </div>
      </div>
    </div>
  );
}
