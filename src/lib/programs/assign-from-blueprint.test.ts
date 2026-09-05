import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRAM_DAYS_ERROR,
  assignProgramFromBlueprint,
  buildSessionExerciseRows,
  buildSessionSetRows,
  isEmptyDaysError,
  plannedSessionCount,
  prepareAssignFromBlueprint,
  type AssignClient,
  type BlueprintDay,
} from "./assign-from-blueprint";

function day(
  position: number,
  label: string,
  exercises: BlueprintDay["exercises"] = [],
): BlueprintDay {
  return {
    position,
    day_label: label,
    title: `${label} title`,
    estimated_minutes: 60,
    exercises,
  };
}

const TWO_DAYS: BlueprintDay[] = [
  day(1, "Dag B", [
    {
      exercise_id: "ex-bench",
      exercise_name: "Bench Press",
      cue: null,
      position: 0,
      sets: [
        { reps: 5, weight: 80, rpe: 8, rest_sec: 180 },
        { reps: 5, weight: 80, rpe: 8, rest_sec: 180 },
      ],
    },
  ]),
  day(0, "Dag A", [
    {
      exercise_id: "ex-squat",
      exercise_name: "Back Squat",
      cue: "Bryst op",
      position: 0,
      sets: [{ reps: 5, weight: 100, rpe: 7, rest_sec: 180 }],
    },
    {
      exercise_id: "ex-rdl",
      exercise_name: "RDL",
      cue: null,
      position: 1,
      sets: [{ reps: 8, weight: 90, rpe: null, rest_sec: 120 }],
    },
  ]),
];

describe("prepareAssignFromBlueprint", () => {
  it("errors on empty days and does not produce an assignment", () => {
    const result = prepareAssignFromBlueprint({
      memberId: "m1",
      programId: "p1",
      startWeek: 1,
      weeks: 8,
      days: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(EMPTY_PROGRAM_DAYS_ERROR);
    expect(isEmptyDaysError(result.error)).toBe(true);
  });

  it("treats null / missing days as empty", () => {
    expect(
      prepareAssignFromBlueprint({
        memberId: "m1",
        programId: "p1",
        startWeek: 1,
        weeks: 8,
        days: null,
      }).ok,
    ).toBe(false);
  });

  it("builds one session per (remaining week × day) and sorts days", () => {
    const result = prepareAssignFromBlueprint({
      memberId: "m1",
      programId: "p1",
      startWeek: 1,
      weeks: 8,
      days: TWO_DAYS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.assignment).toEqual({
      member_id: "m1",
      program_id: "p1",
      status: "active",
      current_week: 1,
    });
    expect(result.plan.days.map((d) => d.day_label)).toEqual(["Dag A", "Dag B"]);
    expect(result.plan.sessionRows).toHaveLength(16);
    expect(plannedSessionCount(8, 1, 2)).toBe(16);
    expect(result.plan.sessionRows[0]).toMatchObject({
      week: 1,
      day_label: "Dag A",
      status: "scheduled",
    });
    expect(result.plan.sessionRows[1].day_label).toBe("Dag B");
    expect(result.plan.sessionRows.at(-1)).toMatchObject({
      week: 8,
      day_label: "Dag B",
    });
  });

  it("materializes remaining weeks from startWeek, matching coach assign", () => {
    const result = prepareAssignFromBlueprint({
      memberId: "m1",
      programId: "p1",
      startWeek: 7,
      weeks: 8,
      days: TWO_DAYS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.assignment.current_week).toBe(7);
    expect(result.plan.sessionRows).toHaveLength(4);
    expect(result.plan.sessionRows.map((s) => s.week)).toEqual([7, 7, 8, 8]);
  });
});

describe("exercise / set wave builders", () => {
  it("counts exercises and sets from the sorted blueprint", () => {
    const prepared = prepareAssignFromBlueprint({
      memberId: "m1",
      programId: "p1",
      startWeek: 1,
      weeks: 1,
      days: TWO_DAYS,
    });
    if (!prepared.ok) throw new Error("expected plan");
    const sessions = prepared.plan.sessionRows.map((_, i) => ({
      id: `s${i}`,
    }));
    const { rows, seeds } = buildSessionExerciseRows(
      sessions,
      prepared.plan.sessionSeeds,
      prepared.plan.days,
    );
    // Dag A: 2 exercises, Dag B: 1 → 3 per week
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.exercise_name)).toEqual([
      "Back Squat",
      "RDL",
      "Bench Press",
    ]);
    const sets = buildSessionSetRows(
      rows.map((_, i) => ({ id: `e${i}` })),
      seeds,
      prepared.plan.days,
    );
    expect(sets).toHaveLength(4);
    expect(sets[0]).toMatchObject({
      target_reps: 5,
      target_weight: 100,
      target_rpe: 7,
      rest_sec: 180,
      position: 1,
    });
  });
});

/* ---------------------------------------------------------------- *
 * Fake PostgREST — records writes so we can assert empty days never
 * insert an assignment.
 * ---------------------------------------------------------------- */

type Row = Record<string, unknown> & { id?: string };

function createFakeAssignClient(program: {
  id: string;
  weeks: number;
  days: BlueprintDay[];
}): { client: AssignClient; inserted: Record<string, Row[]> } {
  const inserted: Record<string, Row[]> = {
    program_assignments: [],
    sessions: [],
    session_exercises: [],
    session_sets: [],
  };
  let seq = 0;
  const nextId = () => `id-${++seq}`;

  const client: AssignClient = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  if (table !== "programs") {
                    return { data: null, error: null };
                  }
                  return { data: program, error: null };
                },
              };
            },
          };
        },
        update() {
          return {
            eq() {
              return {
                async eq() {
                  return { error: null };
                },
              };
            },
          };
        },
        insert(values: unknown) {
          const rows = (Array.isArray(values) ? values : [values]).map(
            (row) => ({
              ...(row as Row),
              id: (row as Row).id ?? nextId(),
            }),
          );
          (inserted[table] ??= []).push(...rows);
          const result = { data: rows.map((r) => ({ id: r.id as string })), error: null };
          const thenable = {
            select() {
              return Promise.resolve(result);
            },
            then(
              onFulfilled?: (v: { error: null }) => unknown,
              onRejected?: (e: unknown) => unknown,
            ) {
              return Promise.resolve({ error: null }).then(
                onFulfilled,
                onRejected,
              );
            },
          };
          return thenable;
        },
      };
    },
  };

  return { client, inserted };
}

describe("assignProgramFromBlueprint", () => {
  it("refuses empty days and writes no assignment", async () => {
    const { client, inserted } = createFakeAssignClient({
      id: "p-empty",
      weeks: 8,
      days: [],
    });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "p-empty",
      startWeek: 1,
      supersedeStatus: "paused",
    });
    expect(result).toEqual({
      ok: false,
      error: EMPTY_PROGRAM_DAYS_ERROR,
    });
    expect(inserted.program_assignments).toHaveLength(0);
    expect(inserted.sessions).toHaveLength(0);
    expect(inserted.session_exercises).toHaveLength(0);
  });

  it("creates assignment + remaining-week sessions when days exist", async () => {
    const { client, inserted } = createFakeAssignClient({
      id: "p-full",
      weeks: 8,
      days: TWO_DAYS,
    });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "p-full",
      startWeek: 1,
      supersedeStatus: "abandoned",
    });
    expect(result).toEqual({ ok: true, sessionsCreated: 16 });
    expect(inserted.program_assignments).toHaveLength(1);
    expect(inserted.program_assignments[0]).toMatchObject({
      member_id: "m1",
      program_id: "p-full",
      status: "active",
      current_week: 1,
    });
    expect(inserted.sessions).toHaveLength(16);
    // 3 exercises × 8 weeks
    expect(inserted.session_exercises).toHaveLength(24);
    // (1 + 1 + 2) sets × 8 weeks
    expect(inserted.session_sets).toHaveLength(32);
  });
});
