"use client";

import { useEffect, useState } from "react";

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

type Stage = { label: string; afterSec: number };

const STAGES: Stage[] = [
  { label: "Analyserer din profil", afterSec: 0 },
  { label: "Vælger måltider der matcher dit mål", afterSec: 3 },
  { label: "Beregner macros for hver dag", afterSec: 8 },
  { label: "Validerer mod brand-policy", afterSec: 16 },
  { label: "Pakker indkøbsliste sammen", afterSec: 24 },
  { label: "Næsten klar — sidste sanity-tjek", afterSec: 35 },
];

export default function PlanGenerationOverlay({
  pending,
}: {
  pending: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [pending]);

  if (!pending) return null;

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
        <div className="eyebrow mb-3">Genererer</div>
        <h2 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[0.95] mb-8">
          Bygger din plan.
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
          {currentStage.label}…
        </p>

        <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint mb-1">
          {elapsed}s elapsed · forventet 10–20 sek · max 50 sek
        </p>

        {overtime ? (
          <p className="mt-6 text-xs font-mono uppercase tracking-[0.14em] text-yellow-400">
            Tager lidt længere end normalt — falder tilbage til regelbaseret plan om lidt
          </p>
        ) : null}

        <div className="mt-12 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          Bliv på siden — ingen grund til at refreshe
        </div>
      </div>
    </div>
  );
}
