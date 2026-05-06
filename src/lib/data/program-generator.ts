/**
 * Program generator — v1 (rule-based, deterministic).
 *
 * Takes the onboarding profile (goal, experience, frequency, equipment,
 * 1RMs, injuries) and produces the first week of training. Real LLM
 * integration is a drop-in replacement: the function signature is what
 * matters.
 *
 * All weights are kg, rounded to 2.5 kg increments.
 */

export type GoalFocus =
  | "strength"
  | "hypertrophy"
  | "hybrid"
  | "squat_spec"
  | "bench_spec"
  | "deadlift_spec";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentLevel = "full" | "home_rack" | "minimal";

export type ProfileInput = {
  goalFocus: GoalFocus;
  experienceLevel: ExperienceLevel;
  weeklyFrequency: number;
  equipmentLevel: EquipmentLevel;
  maxSquatKg?: number | null;
  maxBenchKg?: number | null;
  maxDeadliftKg?: number | null;
  maxOhpKg?: number | null;
  notesInjuries?: string | null;
};

export type GeneratedSet = {
  reps: number;
  weight: number;
  rpe: number | null;
  restSec: number;
};

export type GeneratedExercise = {
  name: string;
  cue: string;
  sets: GeneratedSet[];
};

export type GeneratedSession = {
  dayLabel: string;
  title: string;
  estimatedMinutes: number;
  /** offset in days from "today" (0 = today, 1 = tomorrow, …) */
  scheduledOffsetDays: number;
  exercises: GeneratedExercise[];
};

/* ----------------------------------------------------------------- *
 * Helpers
 * ----------------------------------------------------------------- */

function r25(n: number) {
  return Math.round(n / 2.5) * 2.5;
}

function fallbackOneRm(profile: ProfileInput, lift: "sq" | "b" | "dl" | "ohp"): number {
  // Sensible defaults if user skipped 1RM input — based on intermediate male.
  // The point is to produce a usable program, not perfection.
  const tier =
    profile.experienceLevel === "beginner"
      ? 0.7
      : profile.experienceLevel === "advanced"
        ? 1.25
        : 1.0;
  const base =
    lift === "dl" ? 140 :
    lift === "sq" ? 120 :
    lift === "b"  ? 90  :
    /* ohp */       55;
  return r25(base * tier);
}

function pick1RM(profile: ProfileInput, lift: "sq" | "b" | "dl" | "ohp"): number {
  const v =
    lift === "sq"  ? profile.maxSquatKg :
    lift === "b"   ? profile.maxBenchKg :
    lift === "dl"  ? profile.maxDeadliftKg :
    /* ohp */        profile.maxOhpKg;
  if (v && v > 0) return Number(v);
  return fallbackOneRm(profile, lift);
}

function set(reps: number, weight: number, restSec: number, rpe: number | null = null): GeneratedSet {
  return { reps, weight: r25(weight), rpe, restSec };
}

/** Rest defaults — strength is longer than hypertrophy. */
function restFor(intent: "main_strength" | "main_hyp" | "accessory" | "isolation") {
  switch (intent) {
    case "main_strength": return 180;
    case "main_hyp":      return 120;
    case "accessory":     return 90;
    case "isolation":     return 60;
  }
}

/* ----------------------------------------------------------------- *
 * Day templates
 * ----------------------------------------------------------------- */

function strengthDayA(p: ProfileInput): GeneratedSession {
  const rm = pick1RM(p, "sq");
  return {
    dayLabel: "Dag A — Squat",
    title: "Squat fokus + posterior chain",
    estimatedMinutes: 65,
    scheduledOffsetDays: 0,
    exercises: [
      {
        name: "Back Squat",
        cue: "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.",
        sets: [
          set(5, rm * 0.50, restFor("main_strength")),
          set(5, rm * 0.65, restFor("main_strength")),
          set(3, rm * 0.75, restFor("main_strength")),
          set(3, rm * 0.85, 240, 8),
          set(5, rm * 0.72, restFor("main_strength")),
          set(5, rm * 0.72, restFor("main_strength")),
          set(5, rm * 0.72, 0),
        ],
      },
      {
        name: "Romanian Deadlift",
        cue: "Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen.",
        sets: [
          set(8, pick1RM(p, "dl") * 0.60, restFor("accessory")),
          set(8, pick1RM(p, "dl") * 0.60, restFor("accessory")),
          set(8, pick1RM(p, "dl") * 0.60, 0),
        ],
      },
      {
        name: "Walking Lunge",
        cue: "Lange skridt, lodret torso, push fra hælen på forreste fod.",
        sets: [
          set(10, 20, restFor("isolation")),
          set(10, 20, restFor("isolation")),
          set(10, 20, 0),
        ],
      },
      {
        name: "Hanging Knee Raise",
        cue: "Kontrolleret tempo, brug ikke momentum.",
        sets: [
          set(12, 0, restFor("isolation")),
          set(12, 0, restFor("isolation")),
          set(12, 0, 0),
        ],
      },
    ],
  };
}

function strengthDayB(p: ProfileInput): GeneratedSession {
  const rm = pick1RM(p, "b");
  return {
    dayLabel: "Dag B — Bench",
    title: "Pause-bench + horisontalt træk",
    estimatedMinutes: 55,
    scheduledOffsetDays: 1,
    exercises: [
      {
        name: "Paused Bench",
        cue: "Pause 1-2 sek med baren rørende brystet før eksplosiv pres.",
        sets: [
          set(5, rm * 0.55, restFor("main_strength")),
          set(5, rm * 0.65, restFor("main_strength")),
          set(3, rm * 0.78, restFor("main_strength")),
          set(3, rm * 0.83, 240, 8),
          set(5, rm * 0.72, restFor("main_strength")),
          set(5, rm * 0.72, restFor("main_strength")),
          set(5, rm * 0.72, 0),
        ],
      },
      {
        name: "Pull-up",
        cue: "Hænge fuld stræk, træk albuerne ned mod hofterne, bryst til bar.",
        sets: [
          set(8, 0, restFor("accessory")),
          set(8, 0, restFor("accessory")),
          set(8, 0, restFor("accessory")),
          set(8, 0, 0),
        ],
      },
      {
        name: "Push Press",
        cue: "Lille dyk i benene, ekstendér eksplosivt, lås ud over hovedet.",
        sets: [
          set(5, pick1RM(p, "ohp") * 0.65, restFor("accessory")),
          set(5, pick1RM(p, "ohp") * 0.65, restFor("accessory")),
          set(5, pick1RM(p, "ohp") * 0.65, 0),
        ],
      },
      {
        name: "Barbell Row",
        cue: "Hofte fast, ryggen flad, ro til nedre bryst.",
        sets: [
          set(10, pick1RM(p, "dl") * 0.40, restFor("isolation")),
          set(10, pick1RM(p, "dl") * 0.40, restFor("isolation")),
          set(10, pick1RM(p, "dl") * 0.40, 0),
        ],
      },
    ],
  };
}

function strengthDayC(p: ProfileInput): GeneratedSession {
  const rm = pick1RM(p, "dl");
  return {
    dayLabel: "Dag C — Deadlift",
    title: "Deadlift fokus + benstyrke",
    estimatedMinutes: 70,
    scheduledOffsetDays: 3,
    exercises: [
      {
        name: "Conventional Deadlift",
        cue: "Lats engageret, baren tæt på kroppen, tryk gulvet væk.",
        sets: [
          set(5, rm * 0.55, restFor("main_strength")),
          set(3, rm * 0.70, restFor("main_strength")),
          set(3, rm * 0.80, restFor("main_strength")),
          set(3, rm * 0.88, 240, 8),
          set(3, rm * 0.78, 0),
        ],
      },
      {
        name: "Front Squat",
        cue: "Albuer høje, torso oprejst, knæene først over tæerne.",
        sets: [
          set(5, pick1RM(p, "sq") * 0.55, restFor("accessory")),
          set(5, pick1RM(p, "sq") * 0.55, restFor("accessory")),
          set(5, pick1RM(p, "sq") * 0.55, 0),
        ],
      },
      {
        name: "Pull-up",
        cue: "Hænge fuld stræk, træk albuerne ned mod hofterne, bryst til bar.",
        sets: [
          set(8, 0, restFor("accessory")),
          set(8, 0, restFor("accessory")),
          set(8, 0, 0),
        ],
      },
      {
        name: "Hanging Knee Raise",
        cue: "Kontrolleret tempo, brug ikke momentum.",
        sets: [
          set(12, 0, restFor("isolation")),
          set(12, 0, 0),
        ],
      },
    ],
  };
}

function strengthDayD(p: ProfileInput): GeneratedSession {
  return {
    dayLabel: "Dag D — Hyper",
    title: "Volumen-blok: kvadriceps + skulder",
    estimatedMinutes: 50,
    scheduledOffsetDays: 4,
    exercises: [
      {
        name: "Front Squat",
        cue: "Albuer høje, torso oprejst, knæene først over tæerne.",
        sets: [
          set(8, pick1RM(p, "sq") * 0.55, restFor("main_hyp")),
          set(8, pick1RM(p, "sq") * 0.55, restFor("main_hyp")),
          set(8, pick1RM(p, "sq") * 0.55, restFor("main_hyp")),
          set(8, pick1RM(p, "sq") * 0.55, 0),
        ],
      },
      {
        name: "Push Press",
        cue: "Lille dyk i benene, ekstendér eksplosivt, lås ud over hovedet.",
        sets: [
          set(8, pick1RM(p, "ohp") * 0.55, restFor("accessory")),
          set(8, pick1RM(p, "ohp") * 0.55, restFor("accessory")),
          set(8, pick1RM(p, "ohp") * 0.55, restFor("accessory")),
          set(8, pick1RM(p, "ohp") * 0.55, 0),
        ],
      },
      {
        name: "Barbell Row",
        cue: "Hofte fast, ryggen flad, ro til nedre bryst.",
        sets: [
          set(10, pick1RM(p, "dl") * 0.40, restFor("accessory")),
          set(10, pick1RM(p, "dl") * 0.40, restFor("accessory")),
          set(10, pick1RM(p, "dl") * 0.40, 0),
        ],
      },
      {
        name: "Hanging Knee Raise",
        cue: "Kontrolleret tempo, brug ikke momentum.",
        sets: [
          set(12, 0, restFor("isolation")),
          set(12, 0, 0),
        ],
      },
    ],
  };
}

/* ----------------------------------------------------------------- *
 * Hypertrophy variant — lighter weights, more reps
 * ----------------------------------------------------------------- */

function hypertrophyShift(s: GeneratedSet): GeneratedSet {
  // 8-12 reps at ~60-70%, slightly shorter rest
  const reps = Math.max(8, Math.min(12, s.reps + 4));
  const weight = r25(s.weight * 0.85);
  return { reps, weight, rpe: null, restSec: Math.min(s.restSec, 120) };
}

function asHypertrophy(session: GeneratedSession): GeneratedSession {
  return {
    ...session,
    title: session.title.replace("fokus", "volumen"),
    exercises: session.exercises.map((e) => ({
      ...e,
      sets: e.sets.map(hypertrophyShift),
    })),
  };
}

/* ----------------------------------------------------------------- *
 * Public API
 * ----------------------------------------------------------------- */

export function generateProgram(profile: ProfileInput): {
  programCode: string;
  programName: string;
  sessions: GeneratedSession[];
} {
  const days =
    profile.weeklyFrequency >= 4
      ? [strengthDayA, strengthDayB, strengthDayC, strengthDayD]
      : [strengthDayA, strengthDayB, strengthDayC];

  let sessions = days.map((d, i) => {
    const s = d(profile);
    return { ...s, scheduledOffsetDays: i === 3 ? 4 : i === 2 ? 3 : i };
  });

  if (profile.goalFocus === "hypertrophy") {
    sessions = sessions.map(asHypertrophy);
  } else if (profile.goalFocus === "deadlift_spec") {
    // Promote DL day to first slot, add a second pull day
    const dl = sessions.find((s) => s.dayLabel.includes("Deadlift")) ?? strengthDayC(profile);
    const others = sessions.filter((s) => !s.dayLabel.includes("Deadlift"));
    sessions = [
      { ...dl, scheduledOffsetDays: 0 },
      ...others.slice(0, 2).map((s, i) => ({ ...s, scheduledOffsetDays: i + 1 })),
      { ...dl, dayLabel: "Dag D — Pull volumen", title: "DL technik + accessory pulls", scheduledOffsetDays: 4 },
    ];
  }

  // Beginner: cap top sets to RPE 7 by reducing intensity 5%
  if (profile.experienceLevel === "beginner") {
    sessions = sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((st) => ({
          ...st,
          weight: r25(st.weight * 0.95),
          rpe: st.rpe ? Math.max(6, st.rpe - 1) : st.rpe,
        })),
      })),
    }));
  }

  return {
    programCode:
      profile.goalFocus === "hypertrophy"
        ? "HYP-08"
        : profile.goalFocus === "deadlift_spec"
          ? "DL-06"
          : "STR-12",
    programName:
      profile.goalFocus === "hypertrophy"
        ? "Build Phase"
        : profile.goalFocus === "deadlift_spec"
          ? "Deadlift Specialization"
          : "PR-Block",
    sessions,
  };
}
