"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageSelector() {
  const t = useTranslations("Language");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(locale: Locale) {
    if (locale === active || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("title")}
      className="inline-flex rounded-full border hairline-strong p-1"
    >
      {locales.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => select(locale)}
            disabled={pending}
            aria-pressed={isActive}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 touch-app"
            style={{
              background: isActive ? "var(--fg)" : "transparent",
              color: isActive ? "var(--bg)" : "var(--fg-dim)",
            }}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}
