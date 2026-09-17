import { useTranslations } from "next-intl";
import type { HrvSyncProgress } from "@/lib/hrv/progress";

type Props = { progress: HrvSyncProgress };

/**
 * V2.5 sync-streak progress line for /hrv.
 *
 * Three visible states (spec §5.1):
 *   - daysSynced = 0 → render nothing
 *   - daysSynced > 0, nextMilestone != null → "Sync-streak: N
 *     dage · næste milestone om M dage (+R Reps)"
 *   - daysSynced > 0, nextMilestone = null → "Sync-streak: N
 *     dage · alle milestones gennemført"
 */
export function HrvSyncStreakLine({ progress }: Props) {
  const t = useTranslations("Hrv.syncStreak");
  if (progress.daysSynced === 0) return null;

  const { daysSynced, nextMilestone, nextMilestoneReps } = progress;

  let detail: string;
  if (nextMilestone === null || nextMilestoneReps === null) {
    detail = t("allDone");
  } else {
    const remaining = nextMilestone - daysSynced;
    detail =
      remaining <= 0
        ? t("nextToday", { reps: nextMilestoneReps })
        : t("nextIn", { count: remaining, reps: nextMilestoneReps });
  }

  return (
    <p
      className="text-xs text-fg-dim"
      data-testid="hrv-sync-streak-line"
    >
      {t("line", { count: daysSynced, detail })}
    </p>
  );
}
