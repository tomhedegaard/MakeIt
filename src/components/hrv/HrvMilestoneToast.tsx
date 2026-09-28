"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Hrv.toast");
  const [visible, setVisible] = useState(unseen !== null);

  useEffect(() => {
    if (!unseen) return;
    void markHrvMilestoneSeen(unseen.milestone).then((res) => {
      if (!res.ok) {
        console.warn(
          "[HrvMilestoneToast] markHrvMilestoneSeen failed:",
          res.error,
        );
      }
    });
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
        {t("milestone", { days: unseen.milestone, reps: unseen.reps })}
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-xs text-fg-dim"
        aria-label={t("closeAria")}
      >
        {t("close")}
      </button>
    </div>
  );
}
