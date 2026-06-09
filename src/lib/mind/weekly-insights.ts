/**
 * Weekly mental insights — compute a member's last-7-days mental
 * summary, comparing against the prior 7 days. Pure function;
 * caller passes pre-fetched logs/completions.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §13
 *
 * Surface: /mind/weekly (member-facing)
 * Cron: /api/cron/mental-weekly-insights (Sundays 18:00 UTC)
 */

import type { MentalSessionCompletion, MindCheckLog, JournalEntry } from "./types";
import { utcDateNDaysAgo } from "./streak";

export interface WeeklyInsights {
  weekStartDate: string; // YYYY-MM-DD, 7 days ago at UTC midnight
  weekEndDate: string;   // YYYY-MM-DD, today
  current: WeekStats;
  prior: WeekStats;
  delta: {
    energy: number | null;
    stress: number | null;
    focus: number | null;
    sessionsCompleted: number;
    journalEntries: number;
    mindCheckDays: number;
  };
  /** Days in the week with at least one mind-check (0-7). */
  consistency: {
    daysLogged: number;
    daysExpected: number;
  };
}

interface WeekStats {
  energyMedian: number | null;
  stressMedian: number | null;
  focusMedian: number | null;
  sessionsCompleted: number;
  journalEntries: number;
  mindCheckDays: number;
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? null;
}

function inRange(date: string, fromInclusive: string, toInclusive: string): boolean {
  return date >= fromInclusive && date <= toInclusive;
}

function computeWeek(
  logs: Pick<MindCheckLog, "logged_date" | "energy" | "stress" | "focus">[],
  completions: Pick<MentalSessionCompletion, "completed_date">[],
  journals: Pick<JournalEntry, "logged_date">[],
  fromDate: string,
  toDate: string,
): WeekStats {
  const inWeek = logs.filter((l) => inRange(l.logged_date, fromDate, toDate));
  return {
    energyMedian: median(inWeek.map((l) => l.energy)),
    stressMedian: median(inWeek.map((l) => l.stress)),
    focusMedian: median(inWeek.map((l) => l.focus)),
    sessionsCompleted: completions.filter((c) => inRange(c.completed_date, fromDate, toDate))
      .length,
    journalEntries: journals.filter((j) => inRange(j.logged_date, fromDate, toDate)).length,
    mindCheckDays: new Set(inWeek.map((l) => l.logged_date)).size,
  };
}

/**
 * Compute the full weekly insights bundle. Caller fetches all input
 * arrays once and hands them in; this is pure compute.
 */
export function computeWeeklyInsights(
  logs: Pick<MindCheckLog, "logged_date" | "energy" | "stress" | "focus">[],
  completions: Pick<MentalSessionCompletion, "completed_date">[],
  journals: Pick<JournalEntry, "logged_date">[],
  today: Date = new Date(),
): WeeklyInsights {
  const weekStart = utcDateNDaysAgo(6, today);
  const weekEnd = utcDateNDaysAgo(0, today);
  const priorStart = utcDateNDaysAgo(13, today);
  const priorEnd = utcDateNDaysAgo(7, today);

  const current = computeWeek(logs, completions, journals, weekStart, weekEnd);
  const prior = computeWeek(logs, completions, journals, priorStart, priorEnd);

  const dlt = (a: number | null, b: number | null): number | null => {
    if (a === null || b === null) return null;
    return a - b;
  };

  return {
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    current,
    prior,
    delta: {
      energy: dlt(current.energyMedian, prior.energyMedian),
      stress: dlt(current.stressMedian, prior.stressMedian),
      focus: dlt(current.focusMedian, prior.focusMedian),
      sessionsCompleted: current.sessionsCompleted - prior.sessionsCompleted,
      journalEntries: current.journalEntries - prior.journalEntries,
      mindCheckDays: current.mindCheckDays - prior.mindCheckDays,
    },
    consistency: {
      daysLogged: current.mindCheckDays,
      daysExpected: 7,
    },
  };
}

/**
 * Short one-line headline derived from the insights. Used in the
 * weekly push notification body and the page hero.
 */
export function headlineFromInsights(w: WeeklyInsights): string {
  if (w.current.mindCheckDays === 0) {
    return "Vi mangler din mentale data — start ugen med et mind-check.";
  }
  if (w.delta.stress !== null && w.delta.stress <= -1) {
    return `Stress er nede ${Math.abs(w.delta.stress)} trin sammenlignet med sidste uge.`;
  }
  if (w.delta.energy !== null && w.delta.energy >= 1) {
    return `Energi op ${w.delta.energy} trin — god uge.`;
  }
  if (w.delta.stress !== null && w.delta.stress >= 1) {
    return `Stress op ${w.delta.stress} trin — værd at lægge mærke til.`;
  }
  if (w.current.mindCheckDays >= 6) {
    return `Stærk uge — du tjekkede ind ${w.current.mindCheckDays} af 7 dage.`;
  }
  return `Din uge i tal — ${w.current.mindCheckDays} mind-check, ${w.current.sessionsCompleted} sessioner.`;
}
