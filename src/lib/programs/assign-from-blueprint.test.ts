import { describe, expect, it } from "vitest";
import { copenhagenTodayIso } from "@/lib/dashboard/today-prose";
import {
  EMPTY_PROGRAM_DAYS_ERROR,
  MEMBER_SELF_SERVE_THROUGH_WEEK,
  assignProgramFromBlueprint,
  buildSessionExerciseRows,
  buildSessionSetRows,
  isEmptyDaysError,
  plannedSessionCount,
  prepareAssignFromBlueprint,
  resolveMaterializeThroughWeek,
  scheduleBlueprintDates,
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
    const dates = result.plan.sessionRows.map((s) => s.scheduled_for);
    expect(dates.every((d) => typeof d === "string" && d.length === 10)).toBe(
      true,
    );
    expect(dates).toEqual(scheduleBlueprintDates(16, copenhagenTodayIso()));
  });

  it("dates every session from fromDate in insertion order", () => {
    const result = prepareAssignFromBlueprint({
      memberId: "m1",
      programId: "p1",
      startWeek: 1,
      weeks: 2,
      fromDate: "2026-09-05",
      days: TWO_DAYS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dates = result.plan.sessionRows.map((s) => s.scheduled_for);
    expect(dates).toEqual(["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08"]);
    expect(new Set(dates).size).toBe(dates.length);
    expect(result.plan.sessionRows.every((s) => s.scheduled_for != null)).toBe(
      true,
    );
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

  it("caps member self-serve at week 1 so PWR-10 stays 4 sessions, not 40", () => {
    expect(
      resolveMaterializeThroughWeek({
        startWeek: 1,
        programWeeks: 10,
        throughWeek: MEMBER_SELF_SERVE_THROUGH_WEEK,
      }),
    ).toBe(1);
    const result = prepareAssignFromBlueprint({
      memberId: "m1",
      programId: "pwr-10",
      startWeek: 1,
      weeks: 10,
      throughWeek: MEMBER_SELF_SERVE_THROUGH_WEEK,
      days: [day(0, "A"), day(1, "B"), day(2, "C"), day(3, "D")],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.sessionRows).toHaveLength(4);
    expect(new Set(result.plan.sessionRows.map((s) => s.week))).toEqual(
      new Set([1]),
    );
    expect(plannedSessionCount(1, 1, 4)).toBe(4);
    expect(result.plan.sessionRows.every((s) => s.scheduled_for != null)).toBe(
      true,
    );
  });
});

describe("scheduleBlueprintDates", () => {
  it("returns sequential YYYY-MM-DD dates from fromDate", () => {
    expect(scheduleBlueprintDates(4, "2026-09-05")).toEqual([
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
    ]);
  });

  it("returns an empty list for a zero / negative count", () => {
    expect(scheduleBlueprintDates(0, "2026-09-05")).toEqual([]);
    expect(scheduleBlueprintDates(-2, "2026-09-05")).toEqual([]);
  });

  it("does not skip or duplicate a day across Copenhagen DST", () => {
    // 2026-03-29 is the spring-forward Sunday. Date-only UTC math
    // must still emit 29 then 30, not jump to 31.
    expect(scheduleBlueprintDates(3, "2026-03-28")).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
    expect(scheduleBlueprintDates(3, "2026-10-24")).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
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
 * Fake PostgREST — records write order so we can assert empty days
 * never insert, sessions land before the assignment flip, and a
 * failed flip rolls sessions + the previous active row back.
 * ---------------------------------------------------------------- */

type Row = Record<string, unknown> & { id?: string };
type FailAt =
  | "sessions"
  | "session_exercises"
  | "session_sets"
  | "supersede"
  | "assignment";
type Filter =
  | { kind: "eq"; col: string; val: unknown }
  | { kind: "in"; col: string; vals: unknown[] };

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.kind === "eq") return row[f.col] === f.val;
    return f.vals.includes(row[f.col]);
  });
}

function createFakeAssignClient(opts: {
  program: {
    id: string;
    weeks: number;
    days: BlueprintDay[];
  };
  previousActive?: { id: string; program_id?: string };
  previousSessions?: Row[];
  failAt?: FailAt;
}): {
  client: AssignClient;
  inserted: Record<string, Row[]>;
  updated: { table: string; values: Record<string, unknown> }[];
  deleted: { table: string; ids: string[] }[];
  ops: string[];
  previousSessions: Row[];
} {
  const { program, previousActive, failAt } = opts;
  const previousSessions = (opts.previousSessions ?? []).map((row) => ({
    ...row,
  }));
  const inserted: Record<string, Row[]> = {
    program_assignments: [],
    sessions: [],
    session_exercises: [],
    session_sets: [],
  };
  const updated: { table: string; values: Record<string, unknown> }[] = [];
  const deleted: { table: string; ids: string[] }[] = [];
  const ops: string[] = [];
  let seq = 0;
  const nextId = () => `id-${++seq}`;

  const fail = (message: string) => ({ data: null, error: { message } });

  const sessionPool = () => [...previousSessions, ...(inserted.sessions ?? [])];

  const client: AssignClient = {
    from(table: string) {
      return {
        select() {
          const filters: Filter[] = [];
          const q = {
            eq(col: string, val: unknown) {
              filters.push({ kind: "eq", col, val });
              return q;
            },
            in(col: string, vals: unknown[]) {
              filters.push({ kind: "in", col, vals });
              return q;
            },
            async maybeSingle() {
              ops.push(`select:${table}`);
              if (table === "programs") {
                return { data: program, error: null };
              }
              if (table === "program_assignments") {
                return { data: previousActive ?? null, error: null };
              }
              return { data: null, error: null };
            },
            then(
              onFulfilled?: (v: { data: Row[]; error: null }) => unknown,
              onRejected?: (e: unknown) => unknown,
            ) {
              ops.push(`select:${table}`);
              const pool = table === "sessions" ? sessionPool() : [];
              const data = pool.filter((row) => matchesFilters(row, filters));
              return Promise.resolve({ data, error: null }).then(
                onFulfilled,
                onRejected,
              );
            },
          };
          return q;
        },
        update(values: Record<string, unknown>) {
          const filters: Filter[] = [];
          const finish = () => {
            ops.push(`update:${table}`);
            updated.push({ table, values });
            if (
              failAt === "supersede" &&
              table === "program_assignments" &&
              values.status !== "active"
            ) {
              return fail("supersede failed");
            }
            if (table === "sessions") {
              for (const row of previousSessions) {
                if (matchesFilters(row, filters)) {
                  Object.assign(row, values);
                }
              }
            }
            return { error: null };
          };
          const q = {
            eq(col: string, val: unknown) {
              filters.push({ kind: "eq", col, val });
              return q;
            },
            in(col: string, vals: unknown[]) {
              filters.push({ kind: "in", col, vals });
              return q;
            },
            then(
              onFulfilled?: (v: { error: { message: string } | null }) => unknown,
              onRejected?: (e: unknown) => unknown,
            ) {
              return Promise.resolve(finish()).then(onFulfilled, onRejected);
            },
          };
          return q;
        },
        insert(values: unknown) {
          if (failAt === table || (failAt === "assignment" && table === "program_assignments")) {
            const err = fail(`${table} insert failed`);
            ops.push(`insert:${table}:fail`);
            return {
              select() {
                return Promise.resolve(err);
              },
              then(
                onFulfilled?: (v: typeof err) => unknown,
                onRejected?: (e: unknown) => unknown,
              ) {
                return Promise.resolve(err).then(onFulfilled, onRejected);
              },
            };
          }
          const rows = (Array.isArray(values) ? values : [values]).map(
            (row) => ({
              ...(row as Row),
              id: (row as Row).id ?? nextId(),
            }),
          );
          (inserted[table] ??= []).push(...rows);
          ops.push(`insert:${table}`);
          const result = {
            data: rows.map((r) => ({ id: r.id as string })),
            error: null,
          };
          return {
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
        },
        delete() {
          const q = {
            in(_column: string, ids: string[]) {
              ops.push(`delete:${table}`);
              deleted.push({ table, ids });
              inserted[table] = (inserted[table] ?? []).filter(
                (row) => !ids.includes(row.id as string),
              );
              return Promise.resolve({ error: null });
            },
          };
          return q;
        },
      };
    },
  };

  return { client, inserted, updated, deleted, ops, previousSessions };
}

describe("assignProgramFromBlueprint", () => {
  it("refuses empty days and writes no assignment", async () => {
    const { client, inserted, ops } = createFakeAssignClient({
      program: {
        id: "p-empty",
        weeks: 8,
        days: [],
      },
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
    expect(ops.filter((op) => op.startsWith("insert:"))).toEqual([]);
    expect(ops.filter((op) => op.startsWith("update:"))).toEqual([]);
  });

  it("creates assignment + remaining-week sessions when days exist", async () => {
    const { client, inserted, ops } = createFakeAssignClient({
      program: {
        id: "p-full",
        weeks: 8,
        days: TWO_DAYS,
      },
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
    expect(
      inserted.sessions.every(
        (s) => typeof s.scheduled_for === "string" && s.scheduled_for,
      ),
    ).toBe(true);
    expect(inserted.sessions.map((s) => s.scheduled_for)).toEqual(
      scheduleBlueprintDates(16, copenhagenTodayIso()),
    );
    // 3 exercises × 8 weeks
    expect(inserted.session_exercises).toHaveLength(24);
    // (1 + 1 + 2) sets × 8 weeks
    expect(inserted.session_sets).toHaveLength(32);
    expect(ops.indexOf("insert:sessions")).toBeLessThan(
      ops.indexOf("insert:program_assignments"),
    );
    expect(ops.indexOf("update:program_assignments")).toBeLessThan(
      ops.indexOf("insert:program_assignments"),
    );
  });

  it("materializes only week 1 on the member horizon", async () => {
    const { client, inserted } = createFakeAssignClient({
      program: {
        id: "pwr-10",
        weeks: 10,
        days: TWO_DAYS,
      },
    });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "pwr-10",
      startWeek: 1,
      throughWeek: MEMBER_SELF_SERVE_THROUGH_WEEK,
      supersedeStatus: "paused",
    });
    expect(result).toEqual({ ok: true, sessionsCreated: 2 });
    expect(inserted.sessions).toHaveLength(2);
    expect(inserted.sessions.every((s) => s.week === 1)).toBe(true);
    expect(inserted.sessions.map((s) => s.scheduled_for)).toEqual(
      scheduleBlueprintDates(2, copenhagenTodayIso()),
    );
  });

  it("skips leftover scheduled/active sessions from the previous program", async () => {
    const { client, inserted, updated, previousSessions, ops } =
      createFakeAssignClient({
        program: {
          id: "pwr-10",
          weeks: 10,
          days: TWO_DAYS,
        },
        previousActive: { id: "hyp-08-active", program_id: "hyp-08" },
        previousSessions: [
          {
            id: "hyp-s1",
            member_id: "m1",
            program_id: "hyp-08",
            status: "scheduled",
          },
          {
            id: "hyp-s2",
            member_id: "m1",
            program_id: "hyp-08",
            status: "active",
          },
          {
            id: "hyp-done",
            member_id: "m1",
            program_id: "hyp-08",
            status: "completed",
          },
          {
            id: "other-open",
            member_id: "m1",
            program_id: "other-prog",
            status: "scheduled",
          },
        ],
      });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "pwr-10",
      startWeek: 1,
      throughWeek: MEMBER_SELF_SERVE_THROUGH_WEEK,
      supersedeStatus: "paused",
      fromDate: "2026-09-05",
    });
    expect(result).toEqual({ ok: true, sessionsCreated: 2 });
    expect(inserted.sessions).toHaveLength(2);
    expect(inserted.sessions.every((s) => s.scheduled_for != null)).toBe(true);
    expect(updated).toEqual(
      expect.arrayContaining([
        { table: "program_assignments", values: { status: "paused" } },
        { table: "sessions", values: { status: "skipped" } },
      ]),
    );
    expect(previousSessions.find((s) => s.id === "hyp-s1")?.status).toBe(
      "skipped",
    );
    expect(previousSessions.find((s) => s.id === "hyp-s2")?.status).toBe(
      "skipped",
    );
    expect(previousSessions.find((s) => s.id === "hyp-done")?.status).toBe(
      "completed",
    );
    expect(previousSessions.find((s) => s.id === "other-open")?.status).toBe(
      "scheduled",
    );
    expect(inserted.sessions.every((s) => s.status === "scheduled")).toBe(true);
    expect(ops.indexOf("insert:sessions")).toBeLessThan(
      ops.indexOf("update:program_assignments"),
    );
  });

  it("does not leave previous sessions skipped if assignment insert fails", async () => {
    const { client, inserted, updated, deleted, previousSessions } =
      createFakeAssignClient({
        program: {
          id: "pwr-10",
          weeks: 10,
          days: TWO_DAYS,
        },
        previousActive: { id: "hyp-08-active", program_id: "hyp-08" },
        previousSessions: [
          {
            id: "hyp-s1",
            member_id: "m1",
            program_id: "hyp-08",
            status: "scheduled",
          },
          {
            id: "hyp-s2",
            member_id: "m1",
            program_id: "hyp-08",
            status: "active",
          },
        ],
        failAt: "assignment",
      });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "pwr-10",
      startWeek: 1,
      throughWeek: 1,
      supersedeStatus: "paused",
    });
    expect(result.ok).toBe(false);
    expect(inserted.program_assignments).toHaveLength(0);
    expect(inserted.sessions).toHaveLength(0);
    expect(deleted.some((d) => d.table === "sessions")).toBe(true);
    expect(updated).toEqual(
      expect.arrayContaining([
        { table: "program_assignments", values: { status: "paused" } },
        { table: "sessions", values: { status: "skipped" } },
        { table: "sessions", values: { status: "scheduled" } },
        { table: "sessions", values: { status: "active" } },
        { table: "program_assignments", values: { status: "active" } },
      ]),
    );
    expect(previousSessions.find((s) => s.id === "hyp-s1")?.status).toBe(
      "scheduled",
    );
    expect(previousSessions.find((s) => s.id === "hyp-s2")?.status).toBe(
      "active",
    );
  });

  it("leaves the previous assignment untouched if sessions fail", async () => {
    const { client, inserted, updated, deleted, ops } = createFakeAssignClient({
      program: {
        id: "p-full",
        weeks: 8,
        days: TWO_DAYS,
      },
      previousActive: { id: "hyp-08-active" },
      failAt: "sessions",
    });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "p-full",
      startWeek: 1,
      throughWeek: 1,
      supersedeStatus: "paused",
    });
    expect(result.ok).toBe(false);
    expect(inserted.program_assignments).toHaveLength(0);
    expect(inserted.sessions).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(deleted).toHaveLength(0);
    expect(ops).not.toContain("update:program_assignments");
    expect(ops).not.toContain("insert:program_assignments");
  });

  it("deletes materialized sessions and restores the previous active if assignment insert fails", async () => {
    const { client, inserted, updated, deleted, ops } = createFakeAssignClient({
      program: {
        id: "p-full",
        weeks: 8,
        days: TWO_DAYS,
      },
      previousActive: { id: "hyp-08-active" },
      failAt: "assignment",
    });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "p-full",
      startWeek: 1,
      throughWeek: 1,
      supersedeStatus: "paused",
    });
    expect(result.ok).toBe(false);
    expect(inserted.program_assignments).toHaveLength(0);
    expect(inserted.sessions).toHaveLength(0);
    expect(deleted.some((d) => d.table === "sessions" && d.ids.length === 2)).toBe(
      true,
    );
    expect(updated).toEqual(
      expect.arrayContaining([
        { table: "program_assignments", values: { status: "paused" } },
        { table: "program_assignments", values: { status: "active" } },
      ]),
    );
    expect(ops.indexOf("insert:sessions")).toBeLessThan(
      ops.indexOf("insert:program_assignments:fail"),
    );
    expect(ops).toContain("delete:sessions");
  });

  it("rolls sessions back when exercise insert fails, without flipping assignment", async () => {
    const { client, inserted, updated, deleted } = createFakeAssignClient({
      program: {
        id: "p-full",
        weeks: 1,
        days: TWO_DAYS,
      },
      previousActive: { id: "hyp-08-active" },
      failAt: "session_exercises",
    });
    const result = await assignProgramFromBlueprint(client, {
      memberId: "m1",
      programId: "p-full",
      startWeek: 1,
      throughWeek: 1,
      supersedeStatus: "paused",
    });
    expect(result.ok).toBe(false);
    expect(inserted.sessions).toHaveLength(0);
    expect(inserted.program_assignments).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(deleted.some((d) => d.table === "sessions")).toBe(true);
  });
});
