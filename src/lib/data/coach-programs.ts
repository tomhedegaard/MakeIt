/**
 * Coach program builder — data layer.
 *
 * A program template now carries its workout structure: a list of
 * day-blueprints (Dag A/B/C…), each with exercises pulled from the
 * library and a per-exercise set scheme. Assigning a program to a
 * member generates real `sessions` for weeks 1..N from these
 * blueprints — see assignProgramAction in the route's actions.ts.
 *
 * Read-only here; mutations live in the server actions.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProgramSetScheme = {
  reps: number;
  weight: number;
  rpe: number | null;
  rest_sec: number;
};

export type ProgramDayExercise = {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  cue: string | null;
  position: number;
  sets: ProgramSetScheme[];
};

export type ProgramDay = {
  id: string;
  position: number;
  dayLabel: string;
  title: string;
  estimatedMinutes: number | null;
  exercises: ProgramDayExercise[];
};

export type ProgramBuilder = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  weeks: number;
  level: string | null;
  isPublished: boolean;
  days: ProgramDay[];
};

export type ProgramSummary = {
  id: string;
  code: string;
  name: string;
  type: string;
  weeks: number;
  level: string | null;
  isPublished: boolean;
  dayCount: number;
  activeAssignments: number;
};

export type AssignableMember = {
  id: string;
  handle: string;
  displayName: string | null;
  tier: string;
  hasActiveProgram: boolean;
};

/* ---------------------------------------------------------------- *
 * Listing
 * ---------------------------------------------------------------- */

export async function listCoachPrograms(): Promise<ProgramSummary[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_PROGRAM_SUMMARIES;

  const { data } = await supabase
    .from("programs")
    .select(
      `
      id, code, name, type, weeks, level, is_published,
      days:program_days(id),
      assignments:program_assignments(status)
    `,
    )
    .order("created_at", { ascending: false });

  return ((data ?? []) as RawProgramRow[]).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
    weeks: p.weeks,
    level: p.level,
    isPublished: p.is_published,
    dayCount: (p.days ?? []).length,
    activeAssignments: (p.assignments ?? []).filter(
      (a) => a.status === "active",
    ).length,
  }));
}

type RawProgramRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  weeks: number;
  level: string | null;
  is_published: boolean;
  days?: { id: string }[] | null;
  assignments?: { status: string }[] | null;
};

/* ---------------------------------------------------------------- *
 * Builder tree — program + days + day-exercises
 * ---------------------------------------------------------------- */

export async function getProgramBuilder(
  code: string,
): Promise<ProgramBuilder | null> {
  const supabase = await createClient();
  if (!supabase) {
    return MOCK_PROGRAM_BUILDER.code === code ? MOCK_PROGRAM_BUILDER : null;
  }

  const { data } = await supabase
    .from("programs")
    .select(
      `
      id, code, name, type, description, weeks, level, is_published,
      days:program_days(
        id, position, day_label, title, estimated_minutes,
        exercises:program_day_exercises(
          id, exercise_id, exercise_name, cue, position, sets
        )
      )
    `,
    )
    .eq("code", code)
    .maybeSingle();

  if (!data) return null;
  const row = data as RawBuilderRow;

  const days = (row.days ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((d) => ({
      id: d.id,
      position: d.position,
      dayLabel: d.day_label,
      title: d.title,
      estimatedMinutes: d.estimated_minutes,
      exercises: (d.exercises ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((e) => ({
          id: e.id,
          exerciseId: e.exercise_id,
          exerciseName: e.exercise_name,
          cue: e.cue,
          position: e.position,
          sets: normalizeSets(e.sets),
        })),
    }));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    description: row.description,
    weeks: row.weeks,
    level: row.level,
    isPublished: row.is_published,
    days,
  };
}

type RawBuilderRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  weeks: number;
  level: string | null;
  is_published: boolean;
  days?: {
    id: string;
    position: number;
    day_label: string;
    title: string;
    estimated_minutes: number | null;
    exercises?: {
      id: string;
      exercise_id: string | null;
      exercise_name: string;
      cue: string | null;
      position: number;
      sets: unknown;
    }[] | null;
  }[] | null;
};

function normalizeSets(raw: unknown): ProgramSetScheme[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      reps: toNum(s.reps, 0),
      weight: toNum(s.weight, 0),
      rpe: s.rpe == null ? null : toNum(s.rpe, 0),
      rest_sec: toNum(s.rest_sec, 0),
    }));
}

function toNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ---------------------------------------------------------------- *
 * Assignable members — the crew a coach can publish a program to
 * ---------------------------------------------------------------- */

export async function getAssignableMembers(): Promise<AssignableMember[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_ASSIGNABLE_MEMBERS;

  const { data } = await supabase
    .from("members")
    .select(
      `
      id, handle, display_name, tier, is_coach,
      assignments:program_assignments(status)
    `,
    )
    .not("onboarded_at", "is", null)
    .order("handle", { ascending: true });

  return ((data ?? []) as RawMemberRow[])
    .filter((m) => !m.is_coach)
    .map((m) => ({
      id: m.id,
      handle: m.handle,
      displayName: m.display_name,
      tier: m.tier,
      hasActiveProgram: (m.assignments ?? []).some(
        (a) => a.status === "active",
      ),
    }));
}

type RawMemberRow = {
  id: string;
  handle: string;
  display_name: string | null;
  tier: string;
  is_coach: boolean | null;
  assignments?: { status: string }[] | null;
};

/* ---------------------------------------------------------------- *
 * Demo-mode mocks — so /coach/programs is demonstrable without a
 * backend. Production reads from Supabase via the queries above.
 * ---------------------------------------------------------------- */

const MOCK_PROGRAM_SUMMARIES: ProgramSummary[] = [
  {
    id: "mock-prog-1",
    code: "STR-12",
    name: "PR-Block",
    type: "Strength",
    weeks: 12,
    level: "Intermediate",
    isPublished: true,
    dayCount: 3,
    activeAssignments: 4,
  },
  {
    id: "mock-prog-2",
    code: "HYP-08",
    name: "Build Phase",
    type: "Hypertrophy",
    weeks: 8,
    level: "All levels",
    isPublished: false,
    dayCount: 2,
    activeAssignments: 0,
  },
];

const MOCK_PROGRAM_BUILDER: ProgramBuilder = {
  id: "mock-prog-1",
  code: "STR-12",
  name: "PR-Block",
  type: "Strength",
  description: "Lineær periodisering med RPE-styring over 12 uger.",
  weeks: 12,
  level: "Intermediate",
  isPublished: true,
  days: [
    {
      id: "mock-day-1",
      position: 0,
      dayLabel: "Dag A",
      title: "Squat — tung",
      estimatedMinutes: 65,
      exercises: [
        {
          id: "mock-dx-1",
          exerciseId: "mock-back-squat",
          exerciseName: "Back Squat",
          cue: "Bryst op, knæ ud, driv hårdt op.",
          position: 0,
          sets: [
            { reps: 5, weight: 100, rpe: 7, rest_sec: 180 },
            { reps: 3, weight: 120, rpe: 8, rest_sec: 240 },
            { reps: 3, weight: 120, rpe: 8, rest_sec: 240 },
          ],
        },
        {
          id: "mock-dx-2",
          exerciseId: "mock-deadlift",
          exerciseName: "Romanian Deadlift",
          cue: null,
          position: 1,
          sets: [{ reps: 8, weight: 90, rpe: 7, rest_sec: 120 }],
        },
      ],
    },
    {
      id: "mock-day-2",
      position: 1,
      dayLabel: "Dag B",
      title: "Bench — tung",
      estimatedMinutes: 55,
      exercises: [
        {
          id: "mock-dx-3",
          exerciseId: "mock-bench",
          exerciseName: "Bench Press",
          cue: null,
          position: 0,
          sets: [
            { reps: 5, weight: 80, rpe: 7, rest_sec: 180 },
            { reps: 5, weight: 80, rpe: 8, rest_sec: 180 },
          ],
        },
      ],
    },
  ],
};

const MOCK_ASSIGNABLE_MEMBERS: AssignableMember[] = [
  {
    id: "mock-m1",
    handle: "stine",
    displayName: "Stine K.",
    tier: "Athlete",
    hasActiveProgram: false,
  },
  {
    id: "mock-m2",
    handle: "rasmus",
    displayName: "Rasmus B.",
    tier: "Beast",
    hasActiveProgram: true,
  },
];
