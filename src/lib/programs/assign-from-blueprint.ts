/**
 * Shared «assign program + materialize sessions from blueprint».
 *
 * Coach assign and member Start Program both enroll a member on a
 * catalog program. The wave inserts (assignment → sessions →
 * session_exercises → session_sets) must stay in one place so the
 * two paths cannot drift.
 *
 * Scope choice: materialize **all remaining weeks** (`startWeek`..
 * `weeks`), matching the existing coach assign path. Week 1-only
 * would leave later weeks empty until some other generator ran;
 * `maybeAdvanceWeek` progresses weights from a completed week, it
 * does not create missing week rows from the blueprint.
 *
 * Empty blueprints (`days.length === 0`) fail **before** any
 * assignment write — published catalog shells must not look enrolled.
 */

export const EMPTY_PROGRAM_DAYS_ERROR =
  "Programmet har ingen dage at generere fra";

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
};

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

export function prepareAssignFromBlueprint(input: {
  memberId: string;
  programId: string;
  startWeek: number;
  weeks: number;
  days: BlueprintDay[] | null | undefined;
}): { ok: false; error: string } | { ok: true; plan: AssignPlan } {
  const days = normalizeBlueprintDays(input.days);
  if (days.length === 0) {
    return { ok: false, error: EMPTY_PROGRAM_DAYS_ERROR };
  }

  const startWeek = Math.max(1, Math.floor(input.startWeek || 1));
  const sessionRows: SessionInsertRow[] = [];
  const sessionSeeds: SessionSeed[] = [];
  for (let week = startWeek; week <= input.weeks; week++) {
    days.forEach((day, dayIdx) => {
      sessionRows.push({
        member_id: input.memberId,
        program_id: input.programId,
        week,
        day_label: day.day_label,
        title: day.title,
        estimated_minutes: day.estimated_minutes,
        status: "scheduled",
      });
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

/**
 * Load blueprint, refuse empty days, supersede the current active
 * assignment, insert the new one, then materialize sessions for
 * remaining weeks. Callers own revalidation and member-policy checks.
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
  });
  if (!prepared.ok) return prepared;

  const { plan } = prepared;

  const { error: supersedeErr } = await supabase
    .from("program_assignments")
    .update({ status: input.supersedeStatus })
    .eq("member_id", input.memberId)
    .eq("status", "active");
  if (supersedeErr) return { ok: false, error: supersedeErr.message };

  const { error: aErr } = await supabase
    .from("program_assignments")
    .insert(plan.assignment);
  if (aErr) return { ok: false, error: aErr.message };

  if (plan.sessionRows.length === 0) {
    return { ok: true, sessionsCreated: 0 };
  }

  const { data: insertedSessions, error: sErr } = await supabase
    .from("sessions")
    .insert(plan.sessionRows)
    .select("id");
  if (sErr || !insertedSessions) {
    return { ok: false, error: sErr?.message ?? "Kunne ikke oprette sessioner" };
  }

  const { rows: exerciseRows, seeds: exerciseSeeds } = buildSessionExerciseRows(
    insertedSessions,
    plan.sessionSeeds,
    plan.days,
  );

  if (exerciseRows.length > 0) {
    const { data: insertedEx, error: eErr } = await supabase
      .from("session_exercises")
      .insert(exerciseRows)
      .select("id");
    if (eErr || !insertedEx) {
      return { ok: false, error: eErr?.message ?? "Kunne ikke oprette øvelser" };
    }

    const setRows = buildSessionSetRows(insertedEx, exerciseSeeds, plan.days);
    if (setRows.length > 0) {
      const { error: setErr } = await supabase
        .from("session_sets")
        .insert(setRows);
      if (setErr) return { ok: false, error: setErr.message };
    }
  }

  return { ok: true, sessionsCreated: insertedSessions.length };
}
