"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "mi_mind_tour_done_v1";

const STEP_KEYS = ["pillar", "check", "library"] as const;

/**
 * First-visit tour for /mind, mirrors the existing FirstTimeTour
 * pattern (localStorage flag, full-screen overlay, 3-step walkthrough).
 *
 * Renders only on first visit. After dismissal, key flips and the
 * component is a no-op. Chrome resolves from Mind.tour so DA/EN
 * follow the member locale.
 */
export default function MindFirstTimeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const t = useTranslations("Mind.tour");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(true);
      }
    } catch {
      // localStorage might be blocked — silently skip.
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function next() {
    if (step >= STEP_KEYS.length - 1) {
      dismiss();
      return;
    }
    setStep((s) => s + 1);
  }

  if (!open) return null;
  const currentKey = STEP_KEYS[step]!;
  const isLast = step >= STEP_KEYS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mind-tour-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="max-w-lg w-full rounded-2xl border hairline bg-bg-2 p-8 md:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{t(`steps.${currentKey}.eyebrow`)}</div>
          <div className="text-fg-faint text-[10px] font-mono uppercase tracking-[0.16em]">
            {step + 1} / {STEP_KEYS.length}
          </div>
        </div>

        <h2
          id="mind-tour-title"
          className="font-display text-2xl md:text-3xl leading-tight"
        >
          {t(`steps.${currentKey}.title`)}
        </h2>

        <p className="text-fg-dim leading-relaxed text-base md:text-lg">
          {t(`steps.${currentKey}.body`)}
        </p>

        <div className="h-1 bg-bg-3 overflow-hidden rounded-full">
          <div
            className="h-full bg-fg transition-all duration-500"
            style={{ width: `${((step + 1) / STEP_KEYS.length) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={dismiss}
            className="text-fg-dim text-sm hover:text-fg transition-colors"
          >
            {t("skip")}
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
          >
            {isLast ? t("begin") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
