"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";

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

  const currentKey = STEP_KEYS[step]!;
  const isLast = step >= STEP_KEYS.length - 1;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : dismiss())}
      title={t(`steps.${currentKey}.title`)}
      className="max-w-lg space-y-6 md:p-10"
    >
      <div className="flex items-center justify-between">
        <div className="eyebrow">{t(`steps.${currentKey}.eyebrow`)}</div>
        <div className="text-fg-faint text-micro">
          {step + 1} / {STEP_KEYS.length}
        </div>
      </div>

      <h2 id="mind-tour-title" className="font-display text-section">
        {t(`steps.${currentKey}.title`)}
      </h2>

      <p className="text-fg-dim leading-relaxed text-copy">{t(`steps.${currentKey}.body`)}</p>

      <div className="h-1 bg-bg-3 overflow-hidden">
        <div
          className="h-full bg-fg transition-all duration-500"
          style={{ width: `${((step + 1) / STEP_KEYS.length) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={dismiss} className="text-fg-dim text-meta hover:text-fg transition-colors">
          {t("skip")}
        </button>
        <button
          type="button"
          onClick={next}
          className="inline-flex items-center justify-center bg-fg text-bg px-7 py-3 text-copy font-medium hover:opacity-90 transition-opacity"
        >
          {isLast ? t("begin") : t("next")}
        </button>
      </div>
    </Modal>
  );
}
