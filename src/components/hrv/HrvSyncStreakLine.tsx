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
  if (progress.daysSynced === 0) return null;

  const { daysSynced, nextMilestone, nextMilestoneReps } = progress;

  let detail: string;
  if (nextMilestone === null || nextMilestoneReps === null) {
    detail = "alle milestones gennemført";
  } else {
    const remaining = nextMilestone - daysSynced;
    detail =
      remaining <= 0
        ? `næste milestone i dag (+${nextMilestoneReps} Reps)`
        : `næste milestone om ${remaining} ${
            remaining === 1 ? "dag" : "dage"
          } (+${nextMilestoneReps} Reps)`;
  }

  return (
    <p
      className="text-xs text-fg-dim"
      data-testid="hrv-sync-streak-line"
    >
      Sync-streak: {daysSynced} {daysSynced === 1 ? "dag" : "dage"} · {detail}
    </p>
  );
}
