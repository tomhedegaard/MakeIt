/**
 * Adaptive Program Engine — Supabase data layer.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md §4
 *
 * Two responsibilities:
 *   1. `loadEligibleMemberIds` — return member_ids that opted in to the
 *      adaptive engine (hrv_settings.adaptive_program_enabled = true).
 *      Cron handler maps over these.
 *   2. `buildEngineInput` — for one member, fetch every signal the engine
 *      consumes and assemble a frozen `EngineInput` snapshot. The rule
 *      layer + reasoning layer never touch Supabase directly.
 *
 * Returns `null` from `buildEngineInput` for "skip this member" cases
 * (no upcoming session, no HRV reading at all). The cron handler logs
 * the reason and moves on — these aren't errors.
 *
 * Pure aggregation helpers (`aggregateLifestyle`, `summarizeRecentSession`,
 * `pickLighterVariant`) are exported for unit testing. The async wrapper
 * itself is integration-tested.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AlcoholDrinksValue,
  FeelingState,
  FeelingValue,
  SleepHoursValue,
} from "@/lib/hrv/lifestyle";
import type {
  ReadinessBucket,
  WarmUpState,
} from "@/lib/hrv/types";
import type { Database } from "@/lib/supabase/database.types";

import { formCheckReadableByEngine } from "@/lib/form-queue/queue";
import type {
  EngineInput,
  LifestyleAggregate,
  NextSessionExerciseInfo,
  RecentFormCheck,
  RecentSessionSummary,
} from "./types";

/** Window sizes — kept here so spec changes touch one place. */
const READINGS_WINDOW_FOR_VERY_LOW = 5;
const SESSIONS_WINDOW_DAYS = 14;
const FORM_CHECK_WINDOW_DAYS = 7;
const LIFESTYLE_WINDOW_DAYS = 3;
const NEXT_SESSION_WINDOW_DAYS = 2;
const MS_PER_DAY = 86_400_000;

/* ================================================================== *
 * Pure aggregation helpers (unit-tested)
 * ================================================================== */

/** Row shape from `hrv_lifestyle_logs` after a typed PostgREST select. */
export interface LifestyleRow {
  logged_for_date: string;
  event_type: string;
  value: unknown;
}

/**
 * Roll up lifestyle logs into the engine's aggregated shape. Looks at
 * sleep_hours (last 2 days), alcohol_drinks (last 2 days), feeling
 * (most recent in last 3 days). Other event_types are ignored.
 *
 * Pure — `now` is injected so tests can pin the clock.
 */
export function aggregateLifestyle(
  rows: LifestyleRow[],
  now: Date
): LifestyleAggregate {
  const today = isoDate(now);
  const yesterday = isoDate(new Date(now.getTime() - MS_PER_DAY));
  const recentDates = new Set([today, yesterday]);

  // Sleep: average sleep_hours across the last 2 days.
  const sleepValues: number[] = [];
  for (const row of rows) {
    if (row.event_type !== "sleep_hours") continue;
    if (!recentDates.has(row.logged_for_date)) continue;
    const hours = parseSleepHours(row.value);
    if (hours !== null) sleepValues.push(hours);
  }
  const sleepHoursAvg2d =
    sleepValues.length > 0
      ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length
      : null;

  // Alcohol: any alcohol_drinks log with count ≥1 in last 2 days.
  let alcoholLast2d = false;
  for (const row of rows) {
    if (row.event_type !== "alcohol_drinks") continue;
    if (!recentDates.has(row.logged_for_date)) continue;
    const count = parseAlcoholCount(row.value);
    if (count !== null && count >= 1) {
      alcoholLast2d = true;
      break;
    }
  }

  // Feeling: the most recent `feeling` log in the last 3 days.
  const feelingRows = rows
    .filter((r) => r.event_type === "feeling")
    .sort((a, b) => b.logged_for_date.localeCompare(a.logged_for_date));
  let feelingLast3d: FeelingState | null = null;
  const threeDaysAgo = isoDate(
    new Date(now.getTime() - 3 * MS_PER_DAY)
  );
  for (const row of feelingRows) {
    if (row.logged_for_date < threeDaysAgo) break;
    const state = parseFeelingState(row.value);
    if (state !== null) {
      feelingLast3d = state;
      break;
    }
  }

  return { sleepHoursAvg2d, alcoholLast2d, feelingLast3d };
}

function parseSleepHours(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const hours = (value as Partial<SleepHoursValue>).hours;
  return typeof hours === "number" && hours >= 0 && hours <= 24 ? hours : null;
}

function parseAlcoholCount(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const count = (value as Partial<AlcoholDrinksValue>).count;
  return typeof count === "number" && count >= 0 ? count : null;
}

function parseFeelingState(value: unknown): FeelingState | null {
  if (typeof value !== "object" || value === null) return null;
  const state = (value as Partial<FeelingValue>).state;
  if (
    state === "fresh" ||
    state === "ok" ||
    state === "tired" ||
    state === "stressed"
  ) {
    return state;
  }
  return null;
}

/**
 * Row shape for a session_sets join — one row per set across many sessions.
 * Used by `summarizeRecentSessions` and `computeRpeDriftLast14d`.
 */
export interface SessionSetRow {
  session_id: string;
  session_scheduled_for: string | null;
  session_status: "scheduled" | "active" | "completed" | "skipped";
  exercise_position: number;
  set_position: number;
  target_rpe: number | null;
  logged_rpe: number | null;
  logged_reps: number | null;
}

/**
 * Group a flat row of session_sets joins into per-session summaries.
 * Returns sessions sorted oldest-first.
 *
 * - topSetRpeAvg/topSetTargetRpeAvg are computed across exercise_position=1
 *   AND set_position=1 sets (the main lift's top set).
 * - completionRatio = logged_reps non-null count / total set count.
 */
export function summarizeRecentSessions(
  rows: SessionSetRow[]
): RecentSessionSummary[] {
  const bySession = new Map<string, SessionSetRow[]>();
  for (const row of rows) {
    const arr = bySession.get(row.session_id) ?? [];
    arr.push(row);
    bySession.set(row.session_id, arr);
  }

  const summaries: RecentSessionSummary[] = [];
  for (const [sessionId, sessionRows] of bySession) {
    const topSets = sessionRows.filter(
      (r) => r.exercise_position === 1 && r.set_position === 1
    );
    const topSetRpes = topSets
      .map((r) => r.logged_rpe)
      .filter((v): v is number => v !== null);
    const topSetTargetRpes = topSets
      .map((r) => r.target_rpe)
      .filter((v): v is number => v !== null);
    const loggedCount = sessionRows.filter((r) => r.logged_reps !== null).length;

    summaries.push({
      sessionId,
      scheduledFor: sessionRows[0].session_scheduled_for,
      status: sessionRows[0].session_status,
      topSetRpeAvg:
        topSetRpes.length > 0
          ? topSetRpes.reduce((a, b) => a + b, 0) / topSetRpes.length
          : null,
      topSetTargetRpeAvg:
        topSetTargetRpes.length > 0
          ? topSetTargetRpes.reduce((a, b) => a + b, 0) /
            topSetTargetRpes.length
          : null,
      completionRatio:
        sessionRows.length > 0 ? loggedCount / sessionRows.length : null,
    });
  }

  summaries.sort((a, b) => {
    const av = a.scheduledFor ?? "";
    const bv = b.scheduledFor ?? "";
    return av.localeCompare(bv);
  });
  return summaries;
}

/**
 * Average (logged_rpe - target_rpe) across all top sets in the supplied
 * rows. Pure. Returns null when insufficient paired data exists.
 */
export function computeRpeDrift(rows: SessionSetRow[]): number | null {
  const deltas: number[] = [];
  for (const row of rows) {
    if (row.exercise_position !== 1 || row.set_position !== 1) continue;
    if (row.logged_rpe === null || row.target_rpe === null) continue;
    deltas.push(row.logged_rpe - row.target_rpe);
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

/** Row shape from `exercise_variant_map`. */
export interface VariantMapRow {
  exercise_id: string;
  lighter_variant_id: string;
  variant_reason: "joint_friendly" | "unilateral" | "low_cns" | "time_efficient";
}

/**
 * Pick the best lighter variant for a given exercise from the map.
 * v0 returns the first match deterministically by `variant_reason`
 * ordering: joint_friendly > low_cns > unilateral > time_efficient.
 * Curated map is small (~few hundred rows), so this in-memory pick
 * is fast and easy to reason about.
 */
export function pickLighterVariant(
  exerciseId: string,
  variants: VariantMapRow[]
): NextSessionExerciseInfo["lighterVariant"] {
  const priority: Record<VariantMapRow["variant_reason"], number> = {
    joint_friendly: 0,
    low_cns: 1,
    unilateral: 2,
    time_efficient: 3,
  };
  const matches = variants
    .filter((v) => v.exercise_id === exerciseId)
    .sort((a, b) => priority[a.variant_reason] - priority[b.variant_reason]);
  if (matches.length === 0) return null;
  return {
    exerciseId: matches[0].lighter_variant_id,
    variantReason: matches[0].variant_reason,
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ================================================================== *
 * Async Supabase wrappers
 * ================================================================== */

/**
 * Return the list of member_ids opted in to the adaptive engine.
 * Cron handler maps over these.
 */
export async function loadEligibleMemberIds(
  supabase: SupabaseClient<Database>
): Promise<string[]> {
  const { data, error } = await supabase
    .from("hrv_settings")
    .select("member_id")
    .eq("adaptive_program_enabled", true);
  if (error) throw new Error(`loadEligibleMemberIds: ${error.message}`);
  return (data ?? []).map((r) => r.member_id as string);
}

/**
 * Build an EngineInput snapshot for one member. Returns null when the
 * engine should silently skip this member (no next session in next 2
 * days, or no HRV reading at all). The cron handler logs skips for
 * telemetry but does not treat them as errors.
 */
export async function buildEngineInput(
  supabase: SupabaseClient<Database>,
  memberId: string,
  now: Date
): Promise<EngineInput | null> {
  // --- 1) Settings (opt-in confirmation + sanity). ---
  const { data: settings, error: settingsErr } = await supabase
    .from("hrv_settings")
    .select("adaptive_program_enabled")
    .eq("member_id", memberId)
    .maybeSingle();
  if (settingsErr) {
    throw new Error(`buildEngineInput settings: ${settingsErr.message}`);
  }
  const adaptiveProgramEnabled = settings?.adaptive_program_enabled ?? false;

  // --- 2) Next session in next 2 days. Required — null means skip. ---
  const todayDate = isoDate(now);
  const horizonDate = isoDate(
    new Date(now.getTime() + NEXT_SESSION_WINDOW_DAYS * MS_PER_DAY)
  );
  const { data: nextSessionRow, error: nextErr } = await supabase
    .from("sessions")
    .select("id, scheduled_for, title, week, program_id")
    .eq("member_id", memberId)
    .eq("status", "scheduled")
    .gte("scheduled_for", todayDate)
    .lte("scheduled_for", horizonDate)
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextErr) throw new Error(`buildEngineInput next session: ${nextErr.message}`);
  if (!nextSessionRow) return null;

  // --- 3) Next session's exercises + their lighter variants. ---
  const { data: exerciseRows, error: exErr } = await supabase
    .from("session_exercises")
    .select("id, exercise_id, exercise_name, position")
    .eq("session_id", nextSessionRow.id)
    .order("position", { ascending: true });
  if (exErr) throw new Error(`buildEngineInput exercises: ${exErr.message}`);
  const exerciseIds = (exerciseRows ?? [])
    .map((e) => e.exercise_id as string | null)
    .filter((id): id is string => id !== null);

  let variantRows: VariantMapRow[] = [];
  if (exerciseIds.length > 0) {
    const { data: vRows, error: vErr } = await supabase
      .from("exercise_variant_map")
      .select("exercise_id, lighter_variant_id, variant_reason")
      .in("exercise_id", exerciseIds);
    if (vErr) throw new Error(`buildEngineInput variants: ${vErr.message}`);
    variantRows = (vRows ?? []) as VariantMapRow[];
  }
  const nextSessionExercises: NextSessionExerciseInfo[] = (exerciseRows ?? []).map(
    (e) => {
      const exerciseId = (e.exercise_id as string | null) ?? "";
      const lighter = exerciseId ? pickLighterVariant(exerciseId, variantRows) : null;
      return {
        sessionExerciseId: e.id as string,
        exerciseId,
        exerciseName: (e.exercise_name as string) ?? "",
        position: (e.position as number) ?? 0,
        hasLighterVariant: lighter !== null,
        lighterVariant: lighter,
      };
    }
  );

  // --- 4) Latest HRV reading + last 5 readings for very_low count. ---
  const { data: readingRows, error: rErr } = await supabase
    .from("hrv_readings")
    .select(
      "measured_at, warm_up_state, readiness_bucket, is_sick"
    )
    .eq("member_id", memberId)
    .order("measured_at", { ascending: false })
    .limit(READINGS_WINDOW_FOR_VERY_LOW);
  if (rErr) throw new Error(`buildEngineInput readings: ${rErr.message}`);
  const readings = readingRows ?? [];
  const latestReading =
    readings.length > 0
      ? {
          measuredAt: readings[0].measured_at as string,
          warmUpState: readings[0].warm_up_state as WarmUpState,
          readinessBucket: readings[0].readiness_bucket as ReadinessBucket | null,
          isSick: (readings[0].is_sick as boolean | null) ?? false,
        }
      : null;
  const veryLowDaysLast5 = readings.filter(
    (r) => r.readiness_bucket === "very_low"
  ).length;

  // --- 5) Lifestyle logs (last 3 days). ---
  const lifestyleSinceDate = isoDate(
    new Date(now.getTime() - LIFESTYLE_WINDOW_DAYS * MS_PER_DAY)
  );
  const { data: lifestyleRows, error: lsErr } = await supabase
    .from("hrv_lifestyle_logs")
    .select("logged_for_date, event_type, value")
    .eq("member_id", memberId)
    .gte("logged_for_date", lifestyleSinceDate);
  if (lsErr) throw new Error(`buildEngineInput lifestyle: ${lsErr.message}`);
  const lifestyle = aggregateLifestyle(
    (lifestyleRows ?? []) as LifestyleRow[],
    now
  );

  // --- 6) Recent sessions (last SESSIONS_WINDOW_DAYS days) with set-level joins. ---
  const sessionsSince = isoDate(
    new Date(now.getTime() - SESSIONS_WINDOW_DAYS * MS_PER_DAY)
  );
  const { data: recentSessionRows, error: rsErr } = await supabase
    .from("sessions")
    .select(
      "id, scheduled_for, status, session_exercises(position, session_sets(position, target_rpe, logged_rpe, logged_reps))"
    )
    .eq("member_id", memberId)
    .gte("scheduled_for", sessionsSince)
    .lt("scheduled_for", todayDate)
    .order("scheduled_for", { ascending: false })
    .limit(20);
  if (rsErr) throw new Error(`buildEngineInput recent sessions: ${rsErr.message}`);
  const setRows: SessionSetRow[] = [];
  for (const session of recentSessionRows ?? []) {
    const exs = (session.session_exercises as Array<{
      position: number;
      session_sets: Array<{
        position: number;
        target_rpe: number | null;
        logged_rpe: number | null;
        logged_reps: number | null;
      }>;
    }> | null) ?? [];
    for (const ex of exs) {
      for (const set of ex.session_sets) {
        setRows.push({
          session_id: session.id as string,
          session_scheduled_for: session.scheduled_for as string | null,
          session_status: session.status as SessionSetRow["session_status"],
          exercise_position: ex.position,
          set_position: set.position,
          target_rpe: set.target_rpe,
          logged_rpe: set.logged_rpe,
          logged_reps: set.logged_reps,
        });
      }
    }
  }
  const recentSessions = summarizeRecentSessions(setRows).slice(-3);
  const rpeDriftLast14d = computeRpeDrift(setRows);

  // --- 7) Recent form checks (last 7 days). ---
  const formCheckSince = new Date(
    now.getTime() - FORM_CHECK_WINDOW_DAYS * MS_PER_DAY
  ).toISOString();
  const { data: formCheckRows, error: fcErr } = await supabase
    .from("form_checks")
    .select("exercise_id, ai_score, coach_reviewed_at")
    .eq("member_id", memberId)
    .gte("coach_reviewed_at", formCheckSince)
    .not("coach_reviewed_at", "is", null)
    .not("ai_score", "is", null);
  if (fcErr) throw new Error(`buildEngineInput form checks: ${fcErr.message}`);
  const recentFormChecks: RecentFormCheck[] = (formCheckRows ?? [])
    .filter((r) => r.exercise_id !== null && r.ai_score !== null)
    .filter((r) =>
      formCheckReadableByEngine({
        status: r.coach_reviewed_at ? "reviewed" : "pending",
        reviewedAt: r.coach_reviewed_at,
      }),
    )
    .map((r) => ({
      exerciseId: r.exercise_id as string,
      score: r.ai_score as number,
      reviewedAt: r.coach_reviewed_at as string,
    }));

  // --- 8) Days since heavy lift. v0 simplification: latest completed
  //     session whose top set had target_rpe >= 8. Good enough proxy
  //     until we have a curated "heavy" flag on programs.
  const heavySessionDay = findMostRecentHeavySessionDay(setRows);
  const daysSinceHeavyLift =
    heavySessionDay !== null
      ? Math.floor(
          (now.getTime() - new Date(heavySessionDay).getTime()) / MS_PER_DAY
        )
      : null;

  return {
    memberId,
    adaptiveProgramEnabled,
    latestReading,
    veryLowDaysLast5,
    rpeDriftLast14d,
    lifestyle,
    recentSessions,
    recentFormChecks,
    daysSinceHeavyLift,
    nextSession: {
      sessionId: nextSessionRow.id as string,
      scheduledFor: nextSessionRow.scheduled_for as string,
      title: (nextSessionRow.title as string) ?? "",
      week: nextSessionRow.week as number | null,
      exercises: nextSessionExercises,
    },
    now,
  };
}

/**
 * Find the most recent session_scheduled_for that contains a top set
 * with target_rpe >= 8. Returns null if no such session in the window.
 *
 * Exported for tests; same purity contract as the other helpers.
 */
export function findMostRecentHeavySessionDay(
  rows: SessionSetRow[]
): string | null {
  const heavyDays = rows
    .filter(
      (r) =>
        r.exercise_position === 1 &&
        r.set_position === 1 &&
        r.target_rpe !== null &&
        r.target_rpe >= 8 &&
        r.session_scheduled_for !== null
    )
    .map((r) => r.session_scheduled_for as string);
  if (heavyDays.length === 0) return null;
  heavyDays.sort();
  return heavyDays[heavyDays.length - 1];
}
