/**
 * Builds the deterministic JSON payload that feeds both the AI personal
 * micro-session generator (MH-4) and the daily AI mental coach (MH-7).
 *
 * Pulls from already-shipped data sources:
 *   - mind_check_logs (last 7 days median + today)
 *   - hrv_readings via existing trend helpers (if connected)
 *   - training-week summary (existing)
 *
 * Pure function shape — same input always produces same payload so the
 * Anthropic prompt-cache prefix keeps hitting across cron batches.
 */

import type { MindCheckLog, MentalSignal } from "./types";

export interface CoachContext {
  member: { handle: string; tier: string };
  mind_today: {
    energy: number | null;
    stress: number | null;
    focus: number | null;
    note: string | null;
  };
  mind_signal_7d: MentalSignal;
  hrv: {
    week_mean_rmssd_ms: number | null;
    prior_week_mean_rmssd_ms: number | null;
    week_reading_count: number;
  };
  training: {
    sessions_completed_7d: number;
    sessions_planned_7d: number;
    last_session_rpe: number | null;
    last_session_was: "good" | "average" | "tough" | "missed" | null;
  };
  generated_for_date: string;
}

/** Median of a numeric array, or null if empty. */
function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s[mid] ?? null;
}

/** Compute the 7-day mental signal from raw logs. */
export function computeMentalSignal(
  logs: Pick<MindCheckLog, "logged_date" | "energy" | "stress" | "focus">[],
  today: Date = new Date(),
): MentalSignal {
  const todayDateStr = new Date(today).toISOString().slice(0, 10);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = logs.filter((l) => l.logged_date >= cutoffStr);
  const energies = recent.map((l) => l.energy);
  const stresses = recent.map((l) => l.stress);
  const focuses = recent.map((l) => l.focus);

  // Consecutive days with energy<=2 OR stress>=4, ending at today or yesterday.
  const byDate = new Map(recent.map((l) => [l.logged_date, l]));
  let lowForDays = 0;
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const log = byDate.get(key);
    if (!log) {
      if (offset === 0) continue; // today not logged yet — don't break the chain
      break;
    }
    if (log.energy <= 2 || log.stress >= 4) {
      lowForDays++;
    } else if (offset > 0) {
      break;
    }
  }

  // Freshness: days since most recent log.
  const sorted = [...recent.map((l) => l.logged_date)].sort();
  const latest = sorted[sorted.length - 1];
  let freshness = 99;
  if (latest) {
    const latestDate = new Date(latest + "T00:00:00Z");
    const todayDate = new Date(todayDateStr + "T00:00:00Z");
    freshness = Math.max(
      0,
      Math.round((todayDate.getTime() - latestDate.getTime()) / 86_400_000),
    );
  }

  return {
    energy_median_7d: median(energies),
    stress_median_7d: median(stresses),
    focus_median_7d: median(focuses),
    low_for_days: lowForDays,
    freshness_days: freshness,
  };
}

/**
 * Build the full coach context for a member's today date. All numeric
 * inputs must already be computed by the caller — this is a pure
 * assembly function so it stays deterministic and unit-testable.
 */
export function buildCoachContext(args: {
  member: { handle: string; tier: string };
  mindToday: Pick<MindCheckLog, "energy" | "stress" | "focus" | "note"> | null;
  signal: MentalSignal;
  hrv: CoachContext["hrv"];
  training: CoachContext["training"];
  forDate: string;
}): CoachContext {
  return {
    member: args.member,
    mind_today: {
      energy: args.mindToday?.energy ?? null,
      stress: args.mindToday?.stress ?? null,
      focus: args.mindToday?.focus ?? null,
      note: args.mindToday?.note ?? null,
    },
    mind_signal_7d: args.signal,
    hrv: args.hrv,
    training: args.training,
    generated_for_date: args.forDate,
  };
}
