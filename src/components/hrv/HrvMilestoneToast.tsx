"use client";

import { useEffect, useState } from "react";
import { markHrvMilestoneSeen } from "@/app/(app)/hrv/connect-actions";
import type { MilestoneDay } from "@/lib/hrv/progress";

type Props = {
  unseen: { milestone: MilestoneDay; reps: number } | null;
};

/**
 * V2.5 sync-streak milestone celebration toast (spec §5.2).
 *
 * Renders only when an unseen milestone row exists. The on-mount
 * effect calls markHrvMilestoneSeen so the next /hrv visit shows
 * nothing. Dismiss button is purely cosmetic — the seen-flag is
 * what determines visibility on subsequent loads.
 *
 * Brand vocabulary: no emoji. Matches StreakCelebration.tsx — the
 * existing nutrition-streak celebration uses a typographic stamp,
 * not confetti. We stay in the same restrained register.
 */
export function HrvMilestoneToast({ unseen }: Props) {
  const [visible, setVisible] = useState(unseen !== null);

  useEffect(() => {
    if (unseen) {
      void markHrvMilestoneSeen(unseen.milestone);
    }
  }, [unseen]);

  if (!visible || !unseen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="surface-2 rounded-2xl px-4 py-3 text-sm flex items-center gap-3"
      style={{ borderColor: "var(--line-bright)" }}
      data-testid="hrv-milestone-toast"
    >
      <span className="flex-1">
        {unseen.milestone}-dages HRV-streak nået. +{unseen.reps} Reps tilføjet.
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-xs text-fg-dim"
        aria-label="Luk besked"
      >
        Luk
      </button>
    </div>
  );
}
