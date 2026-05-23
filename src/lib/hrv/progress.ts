/**
 * HRV V2.5 — pure sync-progress derivation.
 *
 * Takes already-fetched data (distinct-day count, the set of
 * milestones the member has been paid, and optionally the most
 * recent unseen milestone) and returns the typed shape consumed
 * by /hrv. Zero Supabase, zero React — fully unit-testable.
 *
 * Milestone ladder is fixed: 7 → 50, 14 → 100, 30 → 200, 90 → 500
 * (matches award_hrv_sync_streak_reps trigger in
 * migration 0040_hrv_reps_milestones.sql).
 */

export type MilestoneDay = 7 | 14 | 30 | 90;

const MILESTONE_LADDER: ReadonlyArray<{
  day: MilestoneDay;
  reps: number;
}> = [
  { day: 7, reps: 50 },
  { day: 14, reps: 100 },
  { day: 30, reps: 200 },
  { day: 90, reps: 500 },
];

export type HrvSyncProgress = {
  /** count(distinct UTC-date) of the member's hrv_readings. */
  daysSynced: number;
  /** Smallest unpaid milestone; null when all four are paid. */
  nextMilestone: MilestoneDay | null;
  /** Payout for `nextMilestone`; null when `nextMilestone` is null. */
  nextMilestoneReps: number | null;
  /** The highest-milestone row still `seen_at is null`, for the toast. */
  unseenMilestone: { milestone: MilestoneDay; reps: number } | null;
};

export type DeriveSyncProgressInput = {
  daysSynced: number;
  paidMilestones: ReadonlyArray<number>;
  latestUnseen: { milestone: MilestoneDay; reps: number } | null;
};

export function deriveSyncProgress(
  input: DeriveSyncProgressInput,
): HrvSyncProgress {
  const paid = new Set<number>(input.paidMilestones);
  const next = MILESTONE_LADDER.find((m) => !paid.has(m.day)) ?? null;

  return {
    daysSynced: input.daysSynced,
    nextMilestone: next ? next.day : null,
    nextMilestoneReps: next ? next.reps : null,
    unseenMilestone: input.latestUnseen,
  };
}
