/**
 * Munk Multiplier — morning-report data aggregation (MM-7).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-1), §3 (MM-3)
 *
 * The cron (coach-morning-report) calls aggregateMorningReportInputs to
 * turn raw Supabase state into the camelCase MorningReportInputs the
 * pure builder (morning-report.ts) consumes. Cohort patterns are
 * computed inline here via the MM-3 detectors.
 *
 * Roster model (v0): Munk is the only coach, so the "cohort" is every
 * non-coach member. One roster-wide report is built and written per
 * coach. Multi-coach rosters (per-coach member assignment) are future.
 *
 * Pure shaping helpers are exported for unit testing; the async
 * wrapper is integration-tested / smoke-tested via the cron.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReadinessBucket } from "@/lib/hrv/types";
import type { Database } from "@/lib/supabase/database.types";
import {
  detectCohortPatterns,
  type HrvReadinessDay,
  type MemberFormCheckHistory,
  type MemberModifierHistory,
} from "@/lib/coach/cohort-patterns";
import type {
  MorningReportInputs,
  SustainedLowHrvMember,
} from "@/lib/coach/types";

/* --------------------------- windows / thresholds --------------------------- */
const MS_PER_DAY = 86_400_000;
/** How far back to pull readiness readings for cluster + sustained-low. */
const READINESS_WINDOW_DAYS = 10;
/** How far back to pull modifier + form-check history for the detectors. */
const HISTORY_WINDOW_DAYS = 60;
/** Trailing consecutive low/very_low reading-days to count as "sustained". */
const SUSTAINED_MIN_DAYS = 2;
/** Readiness buckets that count as "low" for the sustained-low signal. */
const LOW_BUCKETS = new Set<ReadinessBucket>(["very_low", "low"]);

/* ============================================================== *
 * Date helpers (UTC; injected `now` keeps the pure helpers testable)
 * ============================================================== */

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

/* ============================================================== *
 * Pure shaping helpers (unit-tested)
 * ============================================================== */

export interface RawReadingRow {
  memberId: string;
  measuredAt: string;
  bucket: ReadinessBucket | null;
}

/**
 * Collapse raw readings to one bucket per (member, date): the latest
 * reading of each calendar day wins. Output is the per-day shape the
 * cohort detectors + sustained-low logic consume.
 */
export function collapseReadinessDays(
  rows: RawReadingRow[],
  handleOf: Map<string, string>,
): HrvReadinessDay[] {
  // key = `${memberId}::${date}` -> { measuredAt, bucket }
  const latest = new Map<string, { measuredAt: string; bucket: ReadinessBucket | null }>();
  for (const r of rows) {
    const date = r.measuredAt.slice(0, 10);
    const key = `${r.memberId}::${date}`;
    const prev = latest.get(key);
    if (!prev || r.measuredAt > prev.measuredAt) {
      latest.set(key, { measuredAt: r.measuredAt, bucket: r.bucket });
    }
  }
  const out: HrvReadinessDay[] = [];
  for (const [key, v] of latest) {
    const [memberId, date] = key.split("::");
    out.push({
      memberId,
      handle: handleOf.get(memberId) ?? "—",
      date,
      readinessBucket: v.bucket,
    });
  }
  // Stable order: member, then date ascending.
  out.sort((a, b) =>
    a.memberId === b.memberId
      ? a.date.localeCompare(b.date)
      : a.memberId.localeCompare(b.memberId),
  );
  return out;
}

/**
 * Members whose most recent reading-days form a trailing run of
 * low/very_low ≥ minDays. "Reading-days" not calendar-days: a missed
 * day doesn't reset the streak, it's just absent. daysLow is the run
 * length. Sorted by daysLow descending (most concerning first).
 */
export function computeSustainedLow(
  days: HrvReadinessDay[],
  minDays: number = SUSTAINED_MIN_DAYS,
): SustainedLowHrvMember[] {
  const byMember = new Map<string, HrvReadinessDay[]>();
  for (const d of days) {
    const arr = byMember.get(d.memberId) ?? [];
    arr.push(d);
    byMember.set(d.memberId, arr);
  }
  const out: SustainedLowHrvMember[] = [];
  for (const [memberId, arr] of byMember) {
    // Newest day first.
    const sorted = [...arr].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const d of sorted) {
      if (d.readinessBucket && LOW_BUCKETS.has(d.readinessBucket)) streak += 1;
      else break;
    }
    if (streak >= minDays) {
      out.push({ memberId, handle: sorted[0].handle, daysLow: streak });
    }
  }
  out.sort((a, b) => b.daysLow - a.daysLow);
  return out;
}

export interface RawModifierRow {
  memberId: string;
  createdAt: string;
  acceptedByMember: boolean | null;
}

/** Group adaptive modifiers per member, oldest-first, for the reject-streak detector. */
export function groupModifierHistories(
  rows: RawModifierRow[],
  handleOf: Map<string, string>,
): MemberModifierHistory[] {
  const byMember = new Map<string, RawModifierRow[]>();
  for (const r of rows) {
    const arr = byMember.get(r.memberId) ?? [];
    arr.push(r);
    byMember.set(r.memberId, arr);
  }
  const out: MemberModifierHistory[] = [];
  for (const [memberId, arr] of byMember) {
    const modifiers = [...arr]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({ createdAt: m.createdAt, acceptedByMember: m.acceptedByMember }));
    out.push({ memberId, handle: handleOf.get(memberId) ?? "—", modifiers });
  }
  return out;
}

export interface RawFormCheckRow {
  memberId: string;
  exerciseId: string | null;
  exerciseName: string | null;
  score: number;
  reviewedAt: string;
}

/** Group reviewed form-check scores per (member, exercise), oldest-first, for the decline detector. */
export function groupFormCheckHistories(
  rows: RawFormCheckRow[],
  handleOf: Map<string, string>,
): MemberFormCheckHistory[] {
  // key = `${memberId}::${exerciseKey}`
  const byKey = new Map<
    string,
    { memberId: string; exerciseId: string; exerciseName: string; scores: { score: number; reviewedAt: string }[] }
  >();
  for (const r of rows) {
    const exerciseKey = r.exerciseId ?? r.exerciseName ?? "ukendt";
    const key = `${r.memberId}::${exerciseKey}`;
    const entry =
      byKey.get(key) ??
      {
        memberId: r.memberId,
        exerciseId: exerciseKey,
        exerciseName: r.exerciseName ?? exerciseKey,
        scores: [],
      };
    entry.scores.push({ score: r.score, reviewedAt: r.reviewedAt });
    byKey.set(key, entry);
  }
  const out: MemberFormCheckHistory[] = [];
  for (const entry of byKey.values()) {
    entry.scores.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
    out.push({
      memberId: entry.memberId,
      handle: handleOf.get(entry.memberId) ?? "—",
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      scores: entry.scores,
    });
  }
  return out;
}

/** Mean wait in hours for a set of created_at timestamps relative to now. */
export function avgWaitHours(createdAts: string[], now: Date): number {
  if (createdAts.length === 0) return 0;
  const total = createdAts.reduce((sum, ts) => {
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) return sum;
    return sum + Math.max(0, now.getTime() - t);
  }, 0);
  return total / createdAts.length / (1000 * 60 * 60);
}

function emptyInputs(): MorningReportInputs {
  return {
    sustainedLowHrvMembers: [],
    openAdaptiveEscalations: 0,
    pendingFormChecks: { count: 0, avgWaitHours: 0 },
    patterns: [],
    yesterday: {
      sessionsCompleted: 0,
      sessionsSkipped: 0,
      prsNoted: 0,
      formChecksUploaded: 0,
      adaptiveModifiers: 0,
      adaptiveAccepted: 0,
    },
  };
}

/* ============================================================== *
 * Async aggregator
 * ============================================================== */

/**
 * Build the roster-wide MorningReportInputs from live Supabase state.
 * Runs under the service-role client (called from the cron). `now` is
 * injectable for tests / replays; defaults to wall-clock.
 *
 * v0 simplifications (documented, not bugs):
 *  - programWeekRpe is left empty: the rpe_drift_program_week detector
 *    needs a stable program code + cross-member per-week aggregation we
 *    haven't wired yet. The other three cohort detectors run inline.
 *  - prsNoted is 0 until a PR/personal-record source is wired into the
 *    yesterday roll-up.
 */
export async function aggregateMorningReportInputs(
  supabase: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<MorningReportInputs> {
  // --- Roster: every non-coach member is in the cohort (single-coach v0). ---
  const { data: rosterRows, error: rosterErr } = await supabase
    .from("members")
    .select("id, handle")
    .eq("is_coach", false);
  if (rosterErr) throw new Error(`roster: ${rosterErr.message}`);
  const roster = (rosterRows ?? []).map((r) => ({
    id: r.id as string,
    handle: (r.handle as string) ?? "—",
  }));
  if (roster.length === 0) return emptyInputs();

  const rosterIds = roster.map((r) => r.id);
  const handleOf = new Map(roster.map((r) => [r.id, r.handle]));
  const cohortSize = roster.length;

  // --- Date boundaries (UTC). ---
  const todayDate = isoDate(now);
  const yesterdayDate = isoDate(addDays(now, -1));
  const todayStart = `${todayDate}T00:00:00.000Z`;
  const yesterdayStart = `${yesterdayDate}T00:00:00.000Z`;
  const readingsSince = `${isoDate(addDays(now, -READINESS_WINDOW_DAYS))}T00:00:00.000Z`;
  const historySince = `${isoDate(addDays(now, -HISTORY_WINDOW_DAYS))}T00:00:00.000Z`;

  // --- Parallel fetch. Roster is small in beta; these are cheap. ---
  const [
    readingsRes,
    alertsRes,
    pendingRes,
    ySessionsRes,
    yUploadsRes,
    yModifiersRes,
    modHistRes,
    fcHistRes,
  ] = await Promise.all([
    supabase
      .from("hrv_readings")
      .select("member_id, measured_at, readiness_bucket")
      .in("member_id", rosterIds)
      .gte("measured_at", readingsSince),
    supabase.from("hrv_alerts").select("conditions_met").eq("status", "open"),
    supabase.from("form_checks").select("created_at").is("coach_reviewed_at", null),
    supabase
      .from("sessions")
      .select("status")
      .in("member_id", rosterIds)
      .eq("scheduled_for", yesterdayDate),
    supabase
      .from("form_checks")
      .select("id")
      .in("member_id", rosterIds)
      .gte("created_at", yesterdayStart)
      .lt("created_at", todayStart),
    supabase
      .from("hrv_session_modifiers")
      .select("accepted_by_member")
      .eq("reason", "adaptive_v0")
      .in("member_id", rosterIds)
      .gte("created_at", yesterdayStart)
      .lt("created_at", todayStart),
    supabase
      .from("hrv_session_modifiers")
      .select("member_id, created_at, accepted_by_member")
      .eq("reason", "adaptive_v0")
      .in("member_id", rosterIds)
      .gte("created_at", historySince)
      .order("created_at", { ascending: true }),
    supabase
      .from("form_checks")
      .select("member_id, exercise_id, exercise_name, ai_score, coach_reviewed_at")
      .in("member_id", rosterIds)
      .not("coach_reviewed_at", "is", null)
      .not("ai_score", "is", null)
      .gte("coach_reviewed_at", historySince)
      .order("coach_reviewed_at", { ascending: true }),
  ]);

  // --- Readiness → per-day → sustained-low + cohort cluster input. ---
  const readingRows: RawReadingRow[] = (readingsRes.data ?? []).map((r) => ({
    memberId: r.member_id as string,
    measuredAt: r.measured_at as string,
    bucket: (r.readiness_bucket as ReadinessBucket | null) ?? null,
  }));
  const hrvReadinessDays = collapseReadinessDays(readingRows, handleOf);
  const sustainedLowHrvMembers = computeSustainedLow(hrvReadinessDays);

  // --- Open adaptive escalations (filter source in TS, jsonb-safe). ---
  const openAdaptiveEscalations = (alertsRes.data ?? []).filter((a) => {
    const cm = a.conditions_met as { source?: string } | null;
    return cm?.source === "adaptive_v0";
  }).length;

  // --- Pending form-check queue. ---
  const pendingCreatedAts = (pendingRes.data ?? []).map((r) => r.created_at as string);
  const pendingFormChecks = {
    count: pendingCreatedAts.length,
    avgWaitHours: avgWaitHours(pendingCreatedAts, now),
  };

  // --- Yesterday roll-up. ---
  let sessionsCompleted = 0;
  let sessionsSkipped = 0;
  for (const s of ySessionsRes.data ?? []) {
    if (s.status === "completed") sessionsCompleted += 1;
    else if (s.status === "skipped") sessionsSkipped += 1;
  }
  const formChecksUploaded = (yUploadsRes.data ?? []).length;
  const yMods = yModifiersRes.data ?? [];
  const adaptiveModifiers = yMods.length;
  const adaptiveAccepted = yMods.filter((m) => m.accepted_by_member === true).length;

  // --- Cohort detector inputs (programWeekRpe deferred — see jsdoc). ---
  const memberModifierHistories = groupModifierHistories(
    (modHistRes.data ?? []).map((m) => ({
      memberId: m.member_id as string,
      createdAt: m.created_at as string,
      acceptedByMember: (m.accepted_by_member as boolean | null) ?? null,
    })),
    handleOf,
  );
  const memberFormCheckHistories = groupFormCheckHistories(
    (fcHistRes.data ?? []).map((r) => ({
      memberId: r.member_id as string,
      exerciseId: (r.exercise_id as string | null) ?? null,
      exerciseName: (r.exercise_name as string | null) ?? null,
      score: r.ai_score as number,
      reviewedAt: r.coach_reviewed_at as string,
    })),
    handleOf,
  );

  const patterns = detectCohortPatterns({
    hrvReadinessDays,
    cohortSize,
    programWeekRpe: [],
    memberModifierHistories,
    memberFormCheckHistories,
  });

  return {
    sustainedLowHrvMembers,
    openAdaptiveEscalations,
    pendingFormChecks,
    patterns,
    yesterday: {
      sessionsCompleted,
      sessionsSkipped,
      prsNoted: 0,
      formChecksUploaded,
      adaptiveModifiers,
      adaptiveAccepted,
    },
  };
}
