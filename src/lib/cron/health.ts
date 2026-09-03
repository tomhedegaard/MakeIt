/**
 * Cron health — silent-empty detection (B3).
 *
 * Spec: docs/superpowers/specs/2026-09-03-cron-health-alerting.md
 *
 * Pure: no I/O. A successful run with candidates>0 and generated==0
 * is an empty success. Three consecutive empty successes (failures
 * skipped) → alert.
 */

export const EMPTY_STREAK_THRESHOLD = 3;

export const WATCHED_CRONS = [
  "mental-coach-daily",
  "adapt-program-daily",
  "draft-form-check-replies",
  "coach-morning-report",
] as const;

export type WatchedCronId = (typeof WATCHED_CRONS)[number];

export type CronRunStats = {
  cron: WatchedCronId;
  ok: boolean;
  generated: number;
  failed: number;
  candidates: number;
};

export type CronRunRecord = CronRunStats & {
  at: string;
};

export function isWatchedCron(value: string): value is WatchedCronId {
  return (WATCHED_CRONS as readonly string[]).includes(value);
}

function asInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  return 0;
}

/**
 * Map a cron's success JSON onto the durable {candidates, generated,
 * failed} shape. `generated` is useful primary work — see spec §3.
 */
export function extractRunStats(
  cron: WatchedCronId,
  body: Record<string, unknown>,
): CronRunStats {
  const ok = body.ok === true;
  const failed = asInt(body.failed);

  switch (cron) {
    case "mental-coach-daily":
      return {
        cron,
        ok,
        generated: asInt(body.generated),
        failed,
        candidates: asInt(body.candidates),
      };
    case "adapt-program-daily":
      return {
        cron,
        ok,
        generated: asInt(body.persisted) + asInt(body.skipped_no_action),
        failed,
        candidates: asInt(body.eligible),
      };
    case "draft-form-check-replies":
      return {
        cron,
        ok,
        generated: asInt(body.drafted),
        failed,
        candidates: asInt(body.pending),
      };
    case "coach-morning-report":
      return {
        cron,
        ok,
        generated: asInt(body.written),
        failed,
        candidates: asInt(body.coaches),
      };
  }
}

/** A 200-ok run that had work to do but produced none. */
export function isEmptySuccess(run: CronRunStats): boolean {
  return run.ok && run.candidates > 0 && run.generated === 0;
}

/**
 * Newest-first. Failures are skipped (Vercel already flags 500).
 * A non-empty success resets the streak.
 */
export function emptySuccessStreak(runsNewestFirst: CronRunStats[]): number {
  let streak = 0;
  for (const run of runsNewestFirst) {
    if (!run.ok) continue;
    if (!isEmptySuccess(run)) return streak;
    streak += 1;
  }
  return streak;
}

export function shouldAlertEmptyStreak(
  runsNewestFirst: CronRunStats[],
  threshold: number = EMPTY_STREAK_THRESHOLD,
): boolean {
  return emptySuccessStreak(runsNewestFirst) >= threshold;
}

export type CronHealthStatus = "ok" | "quiet" | "empty" | "none";

export type CronHealthRow = {
  cron: WatchedCronId;
  status: CronHealthStatus;
  emptyStreak: number;
  alert: boolean;
  lastRun: CronRunRecord | null;
};

export function evaluateCronHealth(
  cron: WatchedCronId,
  runsNewestFirst: CronRunRecord[],
): CronHealthRow {
  const scoped = runsNewestFirst.filter((r) => r.cron === cron);
  const lastRun = scoped[0] ?? null;
  const emptyStreak = emptySuccessStreak(scoped);
  const alert = emptyStreak >= EMPTY_STREAK_THRESHOLD;

  let status: CronHealthStatus = "none";
  if (lastRun) {
    if (alert) status = "quiet";
    else if (isEmptySuccess(lastRun)) status = "empty";
    else status = "ok";
  }

  return { cron, status, emptyStreak, alert, lastRun };
}
