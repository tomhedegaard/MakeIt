"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "mi_tour_done_v1";

const STEP_KEYS = ["welcome", "today", "tabs", "formCheck", "reps"] as const;

export default function FirstTimeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const t = useTranslations("Nav.tour");

  // One-shot client-only check for the localStorage flag. The lint
  // rule about setState-in-effect doesn't apply here — this is the
  // exact pattern for "show me only on first visit" persistence and
  // the alternative (initializer) would cause hydration mismatch.
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

  const currentKey = STEP_KEYS[step];
  const isLast = step === STEP_KEYS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md surface-2 rounded-2xl p-6 lg:p-8"
        style={{ borderColor: "var(--line-bright)" }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 text-fg-dim hover:text-fg text-xs font-mono uppercase tracking-[0.14em]"
        >
          {t("skip")}
        </button>

        <div className="eyebrow mb-3">{t(`steps.${currentKey}.eyebrow`)}</div>
        <h2
          id="tour-title"
          className="font-display text-2xl md:text-3xl leading-[1.05] mb-3"
        >
          {t(`steps.${currentKey}.title`)}
        </h2>
        <p className="text-fg-dim text-sm md:text-base leading-relaxed mb-6">
          {t(`steps.${currentKey}.body`)}
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {STEP_KEYS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="flex-1 h-1 rounded-full"
              style={{
                background:
                  i <= step ? "var(--fg)" : "var(--bg-elev)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setStep((s) => s - 1)}
            >
              {t("back")}
            </button>
          ) : null}
          {isLast ? (
            <Link
              href="/coaching"
              onClick={dismiss}
              className="btn btn-primary ml-auto"
            >
              {t("begin")}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary ml-auto"
              onClick={next}
            >
              {t("next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
