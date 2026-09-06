/**
 * Shared «assign program + materialize sessions from blueprint».
 *
 * Coach assign and member Start Program both enroll a member on a
 * catalog program. The wave inserts must stay in one place so the
 * two paths cannot drift.
 *
 * Write order (transactional safety without a DB transaction):
 *   1. load blueprint + prepare (empty days fail here — no writes)
 *   2. materialize sessions → exercises → sets
 *   3. only then supersede the previous active assignment + insert
 *   4. as part of the flip, skip leftover scheduled/active sessions
 *      of the previous program so they cannot own Today / week-strip
 * If materialize fails, the previous assignment is untouched. If the
 * assignment flip fails after sessions exist, those sessions are
 * deleted, leftover skips are restored, and the previous active row
 * is restored.
 *
 * Horizon:
 *   - Coach (default): all remaining weeks (`startWeek`..`weeks`).
 *   - Member self-serve: `throughWeek = startWeek` (week 1 / the
 *     current week). Remaining weeks are generated later by
 *     `maybeAdvanceWeek` from completed sessions — do not dump
 *     10×4 sessions through a user-scoped server action.
 *
 * Dates: every materialized session gets a non-null `scheduled_for`
 * (Europe/Copenhagen calendar day). Without it, `getWeekStrip` drops
 * the row and `getTodayCard` keeps showing leftover dated sessions
 * from the previous program. See `scheduleBlueprintDates`.
 *
 * Empty blueprints (`days.length === 0`) fail **before** any write.
 */

import { copenhagenTodayIso } from "@/lib/dates/copenhagen";

export const EMPTY_PROGRAM_DAYS_ERROR =
  "Programmet har ingen dage at generere fra";

const MS_PER_DAY = 86_400_000;
const OPEN_SESSION_STATUSES = ["scheduled", "active"] as const;

type LeftoverSession = { id: string; status: string };

/**
 * Consecutive Europe/Copenhagen calendar dates starting at `fromDate`.
 *
 * Rule (member week-1 and coach full-wave): session i is scheduled on
 * `fromDate + i` days, in blueprint insertion order (week-major, then
 * day position). Later weeks continue the sequence — they do not jump
 * to the next Monday. Deterministic, DST-safe (date-only UTC math).
 *
 * `fromDate` is YYYY-MM-DD in the Europe/Copenhagen calendar (typically
 * `copenhagenTodayIso()`). Used so `/coaching` week-strip and the
 * Today card can see newly started programs.
 */
export function scheduleBlueprintDates(
  dayCount: number,
  fromDate: string,
): string[] {
  const count = Math.max(0, Math.floor(dayCount));
  if (count === 0) return [];
  const start = Date.parse(`${fromDate}T00:00:00Z`);
  if (!Number.isFinite(start)) return [];
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * MS_PER_DAY).toISOString().slice(0, 10),
  );
}

export type BlueprintExercise = {
  exercise_id: string | null;
  exercise_name: string;
  cue: string | null;
  position: number;
  sets: unknown;
};

export type BlueprintDay = {
  position: number;
  day_label: string;
  title: string;
  estimated_minutes: number | null;
  exercises: BlueprintExercise[];
};

export type ProgramBlueprint = {
  id: string;
  weeks: number;
  days: BlueprintDay[] | null;
};

export type AssignSupersedeStatus = "abandoned" | "paused";

export type SessionSeed = { week: number; dayIdx: number };
export type ExerciseSeed = { dayIdx: number; exIdx: number };

export type SessionInsertRow = {
  member_id: string;
  program_id: string;
  week: number;
  day_label: string;
  title: string;
  estimated_minutes: number | null;
  status: "scheduled";
  /** YYYY-MM-DD in Europe/Copenhagen. Required for week-strip + Today. */
  scheduled_for: string;
};

export type ExerciseInsertRow = {
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  cue: string | null;
  position: number;
};

export type SetInsertRow = {
  session_exercise_id: string;
  position: number;
  target_reps: number | null;
  target_weight: number | null;
  target_rpe: number | null;
  rest_sec: number | null;
};

export type AssignPlan = {
  assignment: {
    member_id: string;
    program_id: string;
    status: "active";
    current_week: number;
  };
  sessionRows: SessionInsertRow[];
  sessionSeeds: SessionSeed[];
  days: BlueprintDay[];
};

export type AssignFromBlueprintResult =
  | { ok: true; sessionsCreated: number }
  | { ok: false; error: string };

export type AssignFromBlueprintInput = {
  memberId: string;
  programId: string;
  startWeek: number;
  /** Coach abandons the previous active assignment; member pauses it. */
  supersedeStatus: AssignSupersedeStatus;
  /**
   * Inclusive last week to materialize. Omit for all remaining weeks
   * (coach). Member self-serve passes `MEMBER_SELF_SERVE_THROUGH_WEEK`
   * so the request stays small (week 1 / next training week).
   */
  throughWeek?: number;
  /**
   * YYYY-MM-DD Europe/Copenhagen start date for `scheduled_for`.
   * Defaults to Copenhagen today. Tests pass a fixed date.
   */
  fromDate?: string;
};

/** Inclusive last week for member Start Program (week 1 when startWeek is 1). */
export const MEMBER_SELF_SERVE_THROUGH_WEEK = 1;

/**
 * PostgREST-shaped client. Kept loose because the real
 * `createClient()` builder is thenable-but-not-Promise, which a
 * structural type cannot match without infinite instantiation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AssignClient = { from: (table: string) => any };

export function normalizeBlueprintDays(
  days: BlueprintDay[] | null | undefined,
): BlueprintDay[] {
  return (days ?? []).slice().sort((a, b) => a.position - b.position);
}

export function plannedSessionCount(
  weeks: number,
  startWeek: number,
  dayCount: number,
): number {
  const start = Math.max(1, Math.floor(startWeek || 1));
  if (dayCount <= 0 || weeks < start) return 0;
  return (weeks - start + 1) * dayCount;
}

export function isEmptyDaysError(error: string | undefined): boolean {
  return error === EMPTY_PROGRAM_DAYS_ERROR;
}

export function resolveMaterializeThroughWeek(opts: {
  startWeek: number;
  programWeeks: number;
  throughWeek?: number;
}): number {
  const start = Math.max(1, Math.floor(opts.startWeek || 1));
  const last =
    opts.throughWeek == null
      ? opts.programWeeks
      : Math.floor(opts.throughWeek);
  return Math.min(opts.programWeeks, Math.max(start, last));
}

export function prepareAssignFromBlueprint(input: {
  memberId: string;
  programId: string;
  startWeek: number;
  weeks: number;
  days: BlueprintDay[] | null | undefined;
  throughWeek?: number;
  fromDate?: string;
}): { ok: false; error: string } | { ok: true; plan: AssignPlan } {
  const days = normalizeBlueprintDays(input.days);
  if (days.length === 0) {
    return { ok: false, error: EMPTY_PROGRAM_DAYS_ERROR };
  }

  const startWeek = Math.max(1, Math.floor(input.startWeek || 1));
  const endWeek = resolveMaterializeThroughWeek({
    startWeek,
    programWeeks: input.weeks,
    throughWeek: input.throughWeek,
  });
  const sessionCount = (endWeek - startWeek + 1) * days.length;
  const dates = scheduleBlueprintDates(
    sessionCount,
    input.fromDate ?? copenhagenTodayIso(),
  );
  if (dates.length !== sessionCount) {
    return { ok: false, error: "Kunne ikke datere sessioner" };
  }
  const sessionRows: SessionInsertRow[] = [];
  const sessionSeeds: SessionSeed[] = [];
  let dateIdx = 0;
  for (let week = startWeek; week <= endWeek; week++) {
    days.forEach((day, dayIdx) => {
      sessionRows.push({
        member_id: input.memberId,
        program_id: input.programId,
        week,
        day_label: day.day_label,
        title: day.title,
        estimated_minutes: day.estimated_minutes,
        status: "scheduled",
        scheduled_for: dates[dateIdx] as string,
      });
      dateIdx += 1;
      sessionSeeds.push({ week, dayIdx });
    });
  }

  return {
    ok: true,
    plan: {
      assignment: {
        member_id: input.memberId,
        program_id: input.programId,
        status: "active",
        current_week: startWeek,
      },
      sessionRows,
      sessionSeeds,
      days,
    },
  };
}

export function sortedDayExercises(day: BlueprintDay): BlueprintExercise[] {
  return day.exercises.slice().sort((a, b) => a.position - b.position);
}

export function buildSessionExerciseRows(
  insertedSessions: { id: string }[],
  sessionSeeds: SessionSeed[],
  days: BlueprintDay[],
): { rows: ExerciseInsertRow[]; seeds: ExerciseSeed[] } {
  const rows: ExerciseInsertRow[] = [];
  const seeds: ExerciseSeed[] = [];
  insertedSessions.forEach((session, i) => {
    const { dayIdx } = sessionSeeds[i];
    sortedDayExercises(days[dayIdx]).forEach((ex, exIdx) => {
      rows.push({
        session_id: session.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        cue: ex.cue,
        position: ex.position,
      });
      seeds.push({ dayIdx, exIdx });
    });
  });
  return { rows, seeds };
}

export function buildSessionSetRows(
  insertedExercises: { id: string }[],
  exerciseSeeds: ExerciseSeed[],
  days: BlueprintDay[],
): SetInsertRow[] {
  const setRows: SetInsertRow[] = [];
  insertedExercises.forEach((sx, i) => {
    const { dayIdx, exIdx } = exerciseSeeds[i];
    const sortedEx = sortedDayExercises(days[dayIdx]);
    const sets = Array.isArray(sortedEx[exIdx]?.sets)
      ? (sortedEx[exIdx].sets as Record<string, unknown>[])
      : [];
    sets.forEach((set, setIdx) => {
      setRows.push({
        session_exercise_id: sx.id,
        position: setIdx + 1,
        target_reps: numOr(set.reps, null),
        target_weight: numOr(set.weight, null),
        target_rpe: set.rpe == null ? null : numOr(set.rpe, null),
        rest_sec: numOr(set.rest_sec, null),
      });
    });
  });
  return setRows;
}

export function numOr(v: unknown, fallback: number | null): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const BLUEPRINT_SELECT = `
      id, weeks,
      days:program_days(
        id, position, day_label, title, estimated_minutes,
        exercises:program_day_exercises(
          id, exercise_id, exercise_name, cue, position, sets
        )
      )
    `;

async function rollbackInsertedSessions(
  supabase: AssignClient,
  sessionIds: string[],
): Promise<void> {
  if (sessionIds.length === 0) return;
  await supabase.from("sessions").delete().in("id", sessionIds);
}

async function restorePreviousAssignment(
  supabase: AssignClient,
  previousId: string | null,
): Promise<void> {
  if (!previousId) return;
  await supabase
    .from("program_assignments")
    .update({ status: "active" })
    .eq("id", previousId);
}

async function loadLeftoverSessions(
  supabase: AssignClient,
  memberId: string,
  previousProgramId: string,
  excludeIds: string[],
): Promise<
  { ok: true; rows: LeftoverSession[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("member_id", memberId)
    .eq("program_id", previousProgramId)
    .in("status", [...OPEN_SESSION_STATUSES]);
  if (error) return { ok: false, error: error.message };
  const exclude = new Set(excludeIds);
  const rows = ((data ?? []) as LeftoverSession[])
    .filter((row) => typeof row.id === "string" && !exclude.has(row.id))
    .map((row) => ({ id: row.id, status: row.status }));
  return { ok: true, rows };
}

async function skipLeftoverSessions(
  supabase: AssignClient,
  leftoverIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (leftoverIds.length === 0) return { ok: true };
  const { error } = await supabase
    .from("sessions")
    .update({ status: "skipped" })
    .in("id", leftoverIds);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function restoreLeftoverSessions(
  supabase: AssignClient,
  leftovers: LeftoverSession[],
): Promise<void> {
  const byStatus = new Map<string, string[]>();
  for (const row of leftovers) {
    const list = byStatus.get(row.status) ?? [];
    list.push(row.id);
    byStatus.set(row.status, list);
  }
  for (const [status, ids] of byStatus) {
    if (ids.length === 0) continue;
    await supabase.from("sessions").update({ status }).in("id", ids);
  }
}

async function materializePlanSessions(
  supabase: AssignClient,
  plan: AssignPlan,
): Promise<{ ok: true; sessionIds: string[] } | { ok: false; error: string; sessionIds: string[] }> {
  if (plan.sessionRows.length === 0) {
    return { ok: true, sessionIds: [] };
  }

  const { data: insertedSessions, error: sErr } = await supabase
    .from("sessions")
    .insert(plan.sessionRows)
    .select("id");
  const sessionIds = (insertedSessions ?? []).map((row: { id: string }) => row.id);
  if (sErr || !insertedSessions) {
    return {
      ok: false,
      error: sErr?.message ?? "Kunne ikke oprette sessioner",
      sessionIds,
    };
  }

  const { rows: exerciseRows, seeds: exerciseSeeds } = buildSessionExerciseRows(
    insertedSessions,
    plan.sessionSeeds,
    plan.days,
  );

  if (exerciseRows.length === 0) {
    return { ok: true, sessionIds };
  }

  const { data: insertedEx, error: eErr } = await supabase
    .from("session_exercises")
    .insert(exerciseRows)
    .select("id");
  if (eErr || !insertedEx) {
    return {
      ok: false,
      error: eErr?.message ?? "Kunne ikke oprette øvelser",
      sessionIds,
    };
  }

  const setRows = buildSessionSetRows(insertedEx, exerciseSeeds, plan.days);
  if (setRows.length > 0) {
    const { error: setErr } = await supabase
      .from("session_sets")
      .insert(setRows);
    if (setErr) {
      return { ok: false, error: setErr.message, sessionIds };
    }
  }

  return { ok: true, sessionIds };
}

/**
 * Load blueprint, refuse empty days, materialize the session wave,
 * then flip the active assignment. Callers own revalidation and
 * member-policy checks. `memberId` must be the authenticated
 * caller's id — never a client-supplied stand-in.
 */
export async function assignProgramFromBlueprint(
  supabase: AssignClient,
  input: AssignFromBlueprintInput,
): Promise<AssignFromBlueprintResult> {
  const startWeek = Math.max(1, Math.floor(input.startWeek || 1));

  const { data: program, error: loadErr } = await supabase
    .from("programs")
    .select(BLUEPRINT_SELECT)
    .eq("id", input.programId)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!program) return { ok: false, error: "Program ikke fundet" };

  const bp = program as ProgramBlueprint;
  const prepared = prepareAssignFromBlueprint({
    memberId: input.memberId,
    programId: input.programId,
    startWeek,
    weeks: bp.weeks,
    days: bp.days,
    throughWeek: input.throughWeek,
    fromDate: input.fromDate,
  });
  if (!prepared.ok) return prepared;

  const { plan } = prepared;

  const materialized = await materializePlanSessions(supabase, plan);
  if (!materialized.ok) {
    await rollbackInsertedSessions(supabase, materialized.sessionIds);
    return { ok: false, error: materialized.error };
  }

  const { data: previousActive } = await supabase
    .from("program_assignments")
    .select("id, program_id")
    .eq("member_id", input.memberId)
    .eq("status", "active")
    .maybeSingle();
  const previousId =
    previousActive && typeof previousActive.id === "string"
      ? previousActive.id
      : null;
  const previousProgramId =
    previousActive && typeof previousActive.program_id === "string"
      ? previousActive.program_id
      : null;

  let leftovers: LeftoverSession[] = [];
  if (previousProgramId) {
    const loaded = await loadLeftoverSessions(
      supabase,
      input.memberId,
      previousProgramId,
      materialized.sessionIds,
    );
    if (!loaded.ok) {
      await rollbackInsertedSessions(supabase, materialized.sessionIds);
      return { ok: false, error: loaded.error };
    }
    leftovers = loaded.rows;
  }

  const { error: supersedeErr } = await supabase
    .from("program_assignments")
    .update({ status: input.supersedeStatus })
    .eq("member_id", input.memberId)
    .eq("status", "active");
  if (supersedeErr) {
    await rollbackInsertedSessions(supabase, materialized.sessionIds);
    return { ok: false, error: supersedeErr.message };
  }

  const skipped = await skipLeftoverSessions(
    supabase,
    leftovers.map((row) => row.id),
  );
  if (!skipped.ok) {
    await restorePreviousAssignment(supabase, previousId);
    await rollbackInsertedSessions(supabase, materialized.sessionIds);
    return { ok: false, error: skipped.error };
  }

  const { error: aErr } = await supabase
    .from("program_assignments")
    .insert(plan.assignment);
  if (aErr) {
    await restoreLeftoverSessions(supabase, leftovers);
    await restorePreviousAssignment(supabase, previousId);
    await rollbackInsertedSessions(supabase, materialized.sessionIds);
    return { ok: false, error: aErr.message };
  }

  return { ok: true, sessionsCreated: materialized.sessionIds.length };
}
