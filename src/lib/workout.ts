/**
 * Workout / session — types + mock data for the closed beta.
 * Replace with database fetch once schema is in place.
 */
import type { MuscleGroup } from "@/lib/data/muscle-groups";

/**
 * When a session_exercises row has its exercise_id populated, we
 * hydrate this slice of the structured exercise library so the
 * session page can render the mini anatomy figure, structured cues,
 * and a deep-link to the full /train/exercises/[slug] detail page.
 * Null for free-text exercises that don't match a library entry.
 */
export type ExerciseLibrary = {
  slug: string;
  cues: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  tertiaryMuscles: MuscleGroup[];
};

export type ExerciseSet = {
  id: string;
  targetReps: number;
  targetWeight: number;
  targetRpe?: number;
  // Logged values (populated as user trains)
  loggedReps?: number;
  loggedWeight?: number;
  loggedRpe?: number;
  done?: boolean;
  restSec?: number;
};

export type Exercise = {
  id: string;
  name: string;
  cue?: string;
  videoCue?: string;
  sets: ExerciseSet[];
  library?: ExerciseLibrary | null;
};

export type Session = {
  id: string;
  programCode: string;
  programName: string;
  week: number;
  dayLabel: string;
  title: string;
  estimatedMinutes: number;
  exercises: Exercise[];
};

export const TODAY_SESSION: Session = {
  id: "sess-2026-05-05",
  programCode: "STR-12",
  programName: "PR-Block",
  week: 4,
  dayLabel: "Dag A — Squat",
  title: "Squat — Top set @ RPE 8, 3×3 backoff",
  estimatedMinutes: 65,
  exercises: [
    {
      id: "ex-1",
      name: "Back Squat",
      cue: "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.",
      sets: [
        { id: "s1", targetReps: 5, targetWeight: 80, restSec: 120 },
        { id: "s2", targetReps: 3, targetWeight: 110, restSec: 180 },
        { id: "s3", targetReps: 3, targetWeight: 130, restSec: 180 },
        { id: "s4", targetReps: 3, targetWeight: 150, targetRpe: 8, restSec: 240 },
        { id: "s5", targetReps: 3, targetWeight: 137.5, restSec: 180 },
        { id: "s6", targetReps: 3, targetWeight: 137.5, restSec: 180 },
        { id: "s7", targetReps: 3, targetWeight: 137.5, restSec: 0 },
      ],
    },
    {
      id: "ex-2",
      name: "Romanian Deadlift",
      cue: "Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen.",
      sets: [
        { id: "s1", targetReps: 8, targetWeight: 100, restSec: 90 },
        { id: "s2", targetReps: 8, targetWeight: 100, restSec: 90 },
        { id: "s3", targetReps: 8, targetWeight: 100, restSec: 0 },
      ],
    },
    {
      id: "ex-3",
      name: "Walking Lunge",
      cue: "Lange skridt, lodret torso, push fra hælen på forreste fod.",
      sets: [
        { id: "s1", targetReps: 10, targetWeight: 20, restSec: 60 },
        { id: "s2", targetReps: 10, targetWeight: 20, restSec: 60 },
        { id: "s3", targetReps: 10, targetWeight: 20, restSec: 0 },
      ],
    },
    {
      id: "ex-4",
      name: "Hanging Knee Raise",
      cue: "Kontrolleret tempo, brug ikke momentum.",
      sets: [
        { id: "s1", targetReps: 12, targetWeight: 0, restSec: 45 },
        { id: "s2", targetReps: 12, targetWeight: 0, restSec: 45 },
        { id: "s3", targetReps: 12, targetWeight: 0, restSec: 0 },
      ],
    },
  ],
};

export function totalSets(s: Session) {
  return s.exercises.reduce((acc, e) => acc + e.sets.length, 0);
}
