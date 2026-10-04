"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

/**
 * Full-screen celebration moment fired when a cooking-streak crosses
 * a milestone (3/7/14/30 days). Brand vocabulary: a typographic day-
 * count stamp — no badges, no medals, no confetti. Just the number,
 * a line that earns the moment, and the Reps payout.
 *
 * Controlled: pass `milestone` (the day count) to show, `null` to
 * hide. AnimatePresence plays the exit animation on dismiss.
 */

const COPY_KEYS: Record<number, string> = {
  3: "copy3",
  7: "copy7",
  14: "copy14",
  30: "copy30",
};

export default function StreakCelebration({
  milestone,
  onClose,
}: {
  milestone: number | null;
  onClose: () => void;
}) {
  const t = useTranslations("Nutrition.streak");
  // Reduced motion: a plain fade, no scale or travel (spec §5: 200 ms ease-out).
  const reduce = useReducedMotion();
  const ease = { duration: 0.2, ease: "easeOut" } as const;
  return (
    <AnimatePresence>
      {milestone != null ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={ease}
          onClick={onClose}
          role="dialog"
          aria-label={t("dialogLabel", { days: milestone })}
        >
          <motion.div
            className="w-full max-w-sm text-center"
            initial={reduce ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 8 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.98, opacity: 0 }}
            transition={ease}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="eyebrow text-fg-dim mb-6">
              MakeIt <span className="mx-1">{"//"}</span> {t("brand")}
            </div>

            {/* Typographic stamp */}
            <div className="relative inline-block px-8 py-5 border hairline-strong">
              <span className="absolute -top-px -left-px size-2 border-l-2 border-t-2 border-fg" aria-hidden />
              <span className="absolute -top-px -right-px size-2 border-r-2 border-t-2 border-fg" aria-hidden />
              <span className="absolute -bottom-px -left-px size-2 border-l-2 border-b-2 border-fg" aria-hidden />
              <span className="absolute -bottom-px -right-px size-2 border-r-2 border-b-2 border-fg" aria-hidden />
              <div className="font-display text-hero-lg tabular-nums">
                {String(milestone).padStart(2, "0")}
              </div>
              <div className="eyebrow text-fg mt-1">{t("stamp")}</div>
            </div>

            <p className="mt-7 text-fg-dim text-copy">
              {COPY_KEYS[milestone]
                ? t(COPY_KEYS[milestone])
                : t("copyDefault", { days: milestone })}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 border hairline-strong px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-fg" aria-hidden />
              <span className="numeric text-micro">
                {t("reward")}
              </span>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
              >
                {t("continue")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
