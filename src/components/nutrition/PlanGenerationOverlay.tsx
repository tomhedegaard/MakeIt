"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Full-screen overlay shown while Claude is generating a meal plan.
 * Driven by an external `pending` prop so we can reuse it from both
 * useFormStatus (wizard form) and useTransition (regen button on
 * /nutrition empty state) without coupling either site to a specific
 * hook.
 *
 * Stages advance on an internal 1-second tick so the user sees the
 * label progress in step with their wait. We deliberately don't try
 * to map this to actual Claude-side progress — there's no streaming
 * hook for structured-output generation — but the stage copy is
 * truthful: those steps DO happen in the order shown, just not at
 * predictable boundaries. The time-elapsed counter is what tells
 * users objectively where they are in the wait.
 *
 * Honest UX: no fake percentage bar. A 3-dot pulse indicator that
 * doesn't claim more progress than it actually has.
 */

type Stage = { labelKey: string; afterSec: number };

const STAGES: Stage[] = [
  { labelKey: "stage1", afterSec: 0 },
  { labelKey: "stage2", afterSec: 3 },
  { labelKey: "stage3", afterSec: 8 },
  { labelKey: "stage4", afterSec: 16 },
  { labelKey: "stage5", afterSec: 24 },
  { labelKey: "stage6", afterSec: 35 },
];

type OverlayNamespace = "Nutrition.planOverlay" | "Onboarding.programOverlay";

export default function PlanGenerationOverlay({
  pending,
  namespace = "Nutrition.planOverlay",
}: {
  pending: boolean;
  namespace?: OverlayNamespace;
}) {
  // Unmount when idle so elapsed resets on the next run without a
  // setState-in-effect (react-hooks/set-state-in-effect).
  if (!pending) return null;
  return <PlanGenerationOverlayActive namespace={namespace} />;
}

function PlanGenerationOverlayActive({
  namespace,
}: {
  namespace: OverlayNamespace;
}) {
  const t = useTranslations(namespace);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Find the latest stage whose afterSec threshold has been crossed.
  const currentStage =
    STAGES.reduce<Stage | null>(
      (acc, s) => (elapsed >= s.afterSec ? s : acc),
      null,
    ) ?? STAGES[0];

  const overtime = elapsed > 50;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-md mx-auto text-center px-6">
        <div className="eyebrow mb-3">{t("eyebrow")}</div>
        <h2 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[0.95] mb-8">
          {t("title")}
        </h2>

        {/* 3-dot loading indicator — staggered pulse, no fake % */}
        <div className="flex justify-center gap-2 mb-8" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2.5 rounded-full bg-fg animate-pulse"
              style={{ animationDelay: `${i * 220}ms` }}
            />
          ))}
        </div>

        <p className="text-base md:text-lg text-fg leading-relaxed mb-3">
          {t("stageProgress", { label: t(currentStage.labelKey) })}
        </p>

        <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint mb-1">
          {t("elapsed", { elapsed })}
        </p>

        {overtime ? (
          <p className="mt-6 text-xs font-mono uppercase tracking-[0.14em] text-warn">
            {t("overtime")}
          </p>
        ) : null}

        <div className="mt-12 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          {t("stayOnPage")}
        </div>
      </div>
    </div>
  );
}
