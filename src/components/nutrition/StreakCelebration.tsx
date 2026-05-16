"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Full-screen celebration moment fired when a cooking-streak crosses
 * a milestone (3/7/14/30 days). Brand vocabulary: a typographic day-
 * count stamp — no badges, no medals, no confetti. Just the number,
 * a line that earns the moment, and the Reps payout.
 *
 * Controlled: pass `milestone` (the day count) to show, `null` to
 * hide. AnimatePresence plays the exit animation on dismiss.
 */

const COPY: Record<number, string> = {
  3: "Tre dage i træk. Vanen er ved at sætte sig.",
  7: "En hel uge. Det er ikke tilfældigt længere.",
  14: "Fjorten dage. De fleste falder fra her — ikke dig.",
  30: "Tredive dage. Det er en livsstil nu, ikke et forsøg.",
};

export default function StreakCelebration({
  milestone,
  onClose,
}: {
  milestone: number | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {milestone != null ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          style={{ background: "rgba(10,10,11,0.92)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-label={`Streak-milepæl: ${milestone} dage`}
        >
          <motion.div
            className="w-full max-w-sm text-center"
            initial={{ scale: 0.86, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="eyebrow text-fg-faint mb-6">
              MakeIt <span className="mx-1">//</span> Streak
            </div>

            {/* Typographic stamp */}
            <div className="relative inline-block px-8 py-5 border hairline-strong rounded-lg">
              <span className="absolute -top-px -left-px size-2 border-l-2 border-t-2 border-fg" aria-hidden />
              <span className="absolute -top-px -right-px size-2 border-r-2 border-t-2 border-fg" aria-hidden />
              <span className="absolute -bottom-px -left-px size-2 border-l-2 border-b-2 border-fg" aria-hidden />
              <span className="absolute -bottom-px -right-px size-2 border-r-2 border-b-2 border-fg" aria-hidden />
              <div className="font-display leading-[0.85] text-[clamp(5rem,28vw,9rem)]">
                {String(milestone).padStart(2, "0")}
              </div>
              <div className="eyebrow text-fg mt-1">Dage i træk</div>
            </div>

            <p className="mt-7 text-fg-dim text-base leading-relaxed">
              {COPY[milestone] ?? `${milestone} dage i træk. Stærkt.`}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 border hairline-strong rounded-full px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-fg" aria-hidden />
              <span className="numeric text-[11px] tracking-[0.16em] uppercase">
                +50 Reps tildelt
              </span>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
              >
                Fortsæt
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
