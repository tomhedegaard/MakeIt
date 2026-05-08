import { createClient } from "@/lib/supabase/server";

export type EditableSet = {
  id: string;
  position: number;
  targetReps: number;
  targetWeight: number;
  targetRpe: number | null;
  restSec: number;
};

export type EditableExercise = {
  id: string;
  position: number;
  exerciseName: string;
  cue: string | null;
  sets: EditableSet[];
};

export type EditableSession = {
  id: string;
  memberId: string;
  memberHandle: string;
  programCode: string | null;
  week: number | null;
  dayLabel: string;
  title: string;
  scheduledFor: string | null;
  estimatedMinutes: number;
  status: string;
  exercises: EditableExercise[];
};

const MOCK_SESSION: EditableSession = {
  id: "demo-sess",
  memberId: "m-nina",
  memberHandle: "nina_dl",
  programCode: "STR-12",
  week: 4,
  dayLabel: "Dag A — Squat",
  title: "Squat — Top set @ RPE 8, 3×3 backoff",
  scheduledFor: new Date().toISOString().slice(0, 10),
  estimatedMinutes: 65,
  status: "scheduled",
  exercises: [
    {
      id: "ex-1",
      position: 1,
      exerciseName: "Back Squat",
      cue: "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.",
      sets: [
        { id: "s1", position: 1, targetReps: 5, targetWeight: 80,    targetRpe: null, restSec: 120 },
        { id: "s2", position: 2, targetReps: 3, targetWeight: 110,   targetRpe: null, restSec: 180 },
        { id: "s3", position: 3, targetReps: 3, targetWeight: 130,   targetRpe: null, restSec: 180 },
        { id: "s4", position: 4, targetReps: 3, targetWeight: 150,   targetRpe: 8,    restSec: 240 },
        { id: "s5", position: 5, targetReps: 5, targetWeight: 137.5, targetRpe: null, restSec: 180 },
      ],
    },
    {
      id: "ex-2",
      position: 2,
      exerciseName: "Romanian Deadlift",
      cue: "Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen.",
      sets: [
        { id: "s6", position: 1, targetReps: 8, targetWeight: 100, targetRpe: null, restSec: 90 },
        { id: "s7", position: 2, targetReps: 8, targetWeight: 100, targetRpe: null, restSec: 90 },
        { id: "s8", position: 3, targetReps: 8, targetWeight: 100, targetRpe: null, restSec: 0 },
      ],
    },
  ],
};

export async function getEditableSession(sessionId: string): Promise<EditableSession | null> {
  const supabase = await createClient();
  if (!supabase) return MOCK_SESSION;

  const { data } = await supabase
    .from("sessions")
    .select(
      `
      id, member_id, week, day_label, title, scheduled_for,
      estimated_minutes, status,
      program:programs(code),
      member:members(handle),
      exercises:session_exercises(
        id, exercise_name, cue, position,
        sets:session_sets(id, position, target_reps, target_weight, target_rpe, rest_sec)
      )
    `
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return null;

  const program = Array.isArray(data.program) ? data.program[0] : data.program;
  const member = Array.isArray(data.member) ? data.member[0] : data.member;
  const exercises = (data.exercises ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((ex) => ({
      id: ex.id,
      position: ex.position,
      exerciseName: ex.exercise_name,
      cue: ex.cue,
      sets: (ex.sets ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          id: s.id,
          position: s.position,
          targetReps: s.target_reps ?? 0,
          targetWeight: Number(s.target_weight ?? 0),
          targetRpe: s.target_rpe != null ? Number(s.target_rpe) : null,
          restSec: s.rest_sec ?? 0,
        })),
    }));

  return {
    id: data.id,
    memberId: data.member_id,
    memberHandle: member?.handle ?? "",
    programCode: program?.code ?? null,
    week: data.week,
    dayLabel: data.day_label ?? "",
    title: data.title,
    scheduledFor: data.scheduled_for,
    estimatedMinutes: data.estimated_minutes ?? 60,
    status: data.status,
    exercises,
  };
}
