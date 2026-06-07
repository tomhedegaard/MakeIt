/**
 * Mind-check streak math — pure functions, side-effect free.
 *
 * "Current streak" = consecutive UTC days ending today (or yesterday
 * if today not yet logged) where the member has at least one entry.
 * "Longest streak" = any historical run.
 *
 * The streak window allows yesterday-only because a 17:00 member who
 * hasn't logged today shouldn't see their streak reset to 0 — only
 * the evening-nudge cron breaks it overnight.
 */

import type { MindCheckLog } from "./types";

/** Returns YYYY-MM-DD for UTC midnight of the given offset from today. */
export function utcDateNDaysAgo(daysAgo: number, today: Date = new Date()): string {
  const d = new Date(today);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Current consecutive-day streak ending at today or yesterday.
 * Logs may be in any order — we work off the set of logged_date strings.
 */
export function currentStreak(logs: Pick<MindCheckLog, "logged_date">[], today: Date = new Date()): number {
  const dates = new Set(logs.map((l) => l.logged_date));
  const todayStr = utcDateNDaysAgo(0, today);
  const yesterdayStr = utcDateNDaysAgo(1, today);

  // Anchor: today if logged, else yesterday if logged, else 0.
  let cursor = 0;
  if (dates.has(todayStr)) {
    cursor = 0;
  } else if (dates.has(yesterdayStr)) {
    cursor = 1;
  } else {
    return 0;
  }

  let count = 0;
  while (dates.has(utcDateNDaysAgo(cursor, today))) {
    count++;
    cursor++;
  }
  return count;
}

/**
 * Longest historical run across the given logs.
 * O(n log n) — sorts dates then scans.
 */
export function longestStreak(logs: Pick<MindCheckLog, "logged_date">[]): number {
  if (logs.length === 0) return 0;
  const sorted = [...new Set(logs.map((l) => l.logged_date))].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev === undefined || curr === undefined) continue;
    const prevDate = new Date(prev + "T00:00:00Z");
    const currDate = new Date(curr + "T00:00:00Z");
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

/**
 * Streak milestones eligible for Reps awards.
 * Returns the milestones the member just crossed, given the new streak
 * value. Used by award helpers for idempotency at the application layer.
 */
export const STREAK_MILESTONES = [3, 7, 30, 90, 180] as const;

export function newlyHitMilestones(prevStreak: number, newStreak: number): number[] {
  return STREAK_MILESTONES.filter((m) => prevStreak < m && newStreak >= m);
}
