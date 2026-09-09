/**
 * Shared dashboard «today» session pick.
 *
 * Header / Today-prose, the session card, and the week-strip pulse must
 * describe the same pas. The previous split (calendar-today vs earliest
 * open) is what Testy saw: Dag B in the prose, Dag A on the CTA.
 *
 * Verified against @tomtesty2 (2026-09-08):
 *   Dag A — Squat  active    2026-09-07
 *   Dag B — Bench  scheduled 2026-09-08
 *   Dag C — Deadlift scheduled 2026-09-09
 */

import type { TodayProseSession, TodaySessionState } from "@/lib/dashboard/today-prose";
import type { SessionStatus } from "@/lib/workout";

export type TodaySessionCandidate = {
  id: string;
  status: SessionStatus;
  scheduledFor: string | null;
  dayLabel: string | null;
  title: string;
};

const OPEN: ReadonlySet<SessionStatus> = new Set(["scheduled", "active"]);

const STATUS_RANK: Record<SessionStatus, number> = {
  active: 0,
  scheduled: 1,
  completed: 2,
  skipped: 3,
};

export function isOpenSessionStatus(status: SessionStatus): boolean {
  return OPEN.has(status);
}

export function sessionStateFromStatus(status: SessionStatus): TodaySessionState {
  if (status === "completed") return "done";
  if (status === "skipped") return "skipped";
  return "assigned";
}

export function compareScheduledAsc(
  a: string | null,
  b: string | null,
): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function preferSessionForDate<T extends { status: SessionStatus }>(
  current: T,
  incoming: T,
): T {
  return STATUS_RANK[incoming.status] < STATUS_RANK[current.status]
    ? incoming
    : current;
}

function isDueOnOrBefore(scheduledFor: string | null, todayIso: string): boolean {
  return scheduledFor != null && scheduledFor <= todayIso;
}

function pickFirst<T>(
  rows: T[],
  compare: (a: T, b: T) => number,
): T | null {
  if (rows.length === 0) return null;
  return rows.slice().sort(compare)[0] ?? null;
}

/**
 * One session for Today surfaces.
 *
 * 1. An `active` pas (member is in it) — even if dated yesterday.
 * 2. Earliest still-open session dated today or earlier (catch-up).
 * 3. The Copenhagen-today row (done / skipped) so prose can close the day.
 * 4. Earliest future open session (next upcoming).
 * 5. Nothing → rest / empty card.
 */
export function pickDashboardTodaySession<T extends TodaySessionCandidate>(
  rows: T[],
  todayIso: string,
): T | null {
  const active = rows.filter((row) => row.status === "active");
  const activePick = pickFirst(active, (a, b) =>
    compareScheduledAsc(a.scheduledFor, b.scheduledFor),
  );
  if (activePick) return activePick;

  const dueOpen = rows.filter(
    (row) =>
      isOpenSessionStatus(row.status) &&
      isDueOnOrBefore(row.scheduledFor, todayIso),
  );
  const duePick = pickFirst(dueOpen, (a, b) =>
    compareScheduledAsc(a.scheduledFor, b.scheduledFor),
  );
  if (duePick) return duePick;

  const onToday = rows.filter((row) => row.scheduledFor === todayIso);
  const todayPick = pickFirst(onToday, (a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return a.id.localeCompare(b.id);
  });
  if (todayPick) return todayPick;

  const futureOpen = rows.filter(
    (row) =>
      isOpenSessionStatus(row.status) &&
      (row.scheduledFor == null || row.scheduledFor > todayIso),
  );
  return pickFirst(futureOpen, (a, b) =>
    compareScheduledAsc(a.scheduledFor, b.scheduledFor),
  );
}

export function todayProseSessionFromPick(
  row: TodaySessionCandidate | null,
): TodayProseSession {
  if (!row) return { state: "rest", dayLabel: null };
  const label = (row.dayLabel ?? row.title)?.trim() || null;
  return {
    state: sessionStateFromStatus(row.status),
    dayLabel: label,
  };
}

/**
 * Week-strip pulse follows the picked session when that date is in
 * the visible week. Otherwise it stays on the Copenhagen calendar day.
 */
export function weekStripPulseIso(
  pickedScheduledFor: string | null | undefined,
  calendarToday: string,
  weekIsos: readonly string[],
): string {
  if (pickedScheduledFor && weekIsos.includes(pickedScheduledFor)) {
    return pickedScheduledFor;
  }
  return calendarToday;
}
