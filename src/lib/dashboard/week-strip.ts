/**
 * Træn week strip — same Today pick as header / session card.
 *
 * The visible week is the Copenhagen ISO week that contains the
 * picked pas (not the UTC calendar week, and not «sessions that
 * happen to fall in this Monday–Sunday»). Otherwise an overdue
 * Dag A drops out and the pulse lands on Bench.
 */

import { isoMondayOf, isoPlusDays } from "@/lib/dates/copenhagen";
import {
  pickDashboardTodaySession,
  preferSessionForDate,
  type TodaySessionCandidate,
} from "@/lib/dashboard/pick-today-session";
import type { SessionStatus } from "@/lib/workout";

export const WEEK_DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type WeekDayKey = (typeof WEEK_DAY_KEYS)[number];

export type WeekDay = {
  /** Mon..Sun key — chrome label resolves from Coaching.week.days */
  dayKey: WeekDayKey;
  /** Day-of-month (1..31) */
  date: number;
  /** YYYY-MM-DD for click-through */
  iso: string;
  /**
   * Compressed session label, e.g. "Squat" / "Push".
   * Exercise names stay as program/exercise proper labels (not translated).
   * Empty string = rest day; the page renders Coaching.week.rest.
   */
  sessionLabel: string;
  /** Session id if a session is scheduled, for the link */
  sessionId: string | null;
  /** Status flags driving the dot variant */
  done: boolean;
  today: boolean;
  rest: boolean;
};

export type WeekStripSession = TodaySessionCandidate;

export function compressSessionLabel(
  dayLabel: string | null,
  title: string,
): string {
  const candidates = [dayLabel, title].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  for (const c of candidates) {
    const m = c.match(/—\s*(.+)$/);
    const tail = m ? m[1] : c;
    const word = tail.trim().split(/\s+/)[0] ?? tail;
    if (word) return word.slice(0, 12);
  }
  return "—";
}

/**
 * Build Mon..Sun tiles from the member's dated sessions.
 *
 * Pick first (same rules as the dashboard), then show the ISO week
 * that contains that pas so the pulse and the label cannot drift.
 */
export function buildWeekStrip(input: {
  sessions: WeekStripSession[];
  todayIso: string;
}): WeekDay[] {
  const picked = pickDashboardTodaySession(input.sessions, input.todayIso);
  const anchor = picked?.scheduledFor ?? input.todayIso;
  const monday = isoMondayOf(anchor);
  const weekIsos = Array.from({ length: 7 }, (_, i) => isoPlusDays(monday, i));

  const byDate = new Map<
    string,
    { id: string; dayLabel: string | null; title: string; status: SessionStatus }
  >();
  for (const s of input.sessions) {
    if (!s.scheduledFor || !weekIsos.includes(s.scheduledFor)) continue;
    const incoming = {
      id: s.id,
      dayLabel: s.dayLabel,
      title: s.title,
      status: s.status,
    };
    const existing = byDate.get(s.scheduledFor);
    byDate.set(
      s.scheduledFor,
      existing ? preferSessionForDate(existing, incoming) : incoming,
    );
  }

  const pulseIso =
    picked?.scheduledFor && weekIsos.includes(picked.scheduledFor)
      ? picked.scheduledFor
      : weekIsos.includes(input.todayIso)
        ? input.todayIso
        : monday;

  return weekIsos.map((iso, i) => {
    const session = byDate.get(iso);
    return {
      dayKey: WEEK_DAY_KEYS[i],
      date: Number(iso.slice(8, 10)),
      iso,
      sessionLabel: session
        ? compressSessionLabel(session.dayLabel, session.title)
        : "",
      sessionId: session?.id ?? null,
      done: session?.status === "completed",
      today: iso === pulseIso,
      rest: !session,
    };
  });
}
