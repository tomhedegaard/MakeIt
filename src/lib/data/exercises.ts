/**
 * Exercise library — query layer for /train/exercises/*.
 *
 * The `exercises` table (0001 + 0028) is source-of-truth. We expose
 * a typed view + a small mock dataset for demo mode so the UI can
 * render without Supabase. Mock contains 4 representative lifts
 * (squat, bench, deadlift, OHP) for visual sanity — the full 20+
 * library lives in supabase/seed-exercises.sql.
 */
import { createClient } from "@/lib/supabase/server";
import type { MuscleGroup } from "@/lib/data/muscle-groups";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type ExerciseMistake = { title: string; body: string };

export type Exercise = {
  slug: string;
  name: string;
  category: string | null;
  pattern: string | null;
  equipment: string | null;
  difficulty: ExerciseDifficulty | null;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  tertiaryMuscles: MuscleGroup[];
  cues: string[];
  mistakes: ExerciseMistake[];
  whyMatters: string | null;
  setup: string | null;
  progression: string | null;
  regression: string | null;
  demoAssetUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  displayOrder: number;
};

/* ---------------------------------------------------------------- *
 * Row -> Exercise mapping
 * ---------------------------------------------------------------- */

type ExerciseRow = {
  slug: string;
  name: string;
  category: string | null;
  pattern: string | null;
  equipment: string | null;
  difficulty: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  tertiary_muscles: string[] | null;
  cues: unknown;
  mistakes: unknown;
  why_matters: string | null;
  setup: string | null;
  progression: string | null;
  regression: string | null;
  demo_asset_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  display_order: number | null;
};

const SELECT_COLS =
  "slug, name, category, pattern, equipment, difficulty, " +
  "primary_muscles, secondary_muscles, tertiary_muscles, " +
  "cues, mistakes, why_matters, setup, progression, regression, " +
  "demo_asset_url, video_url, thumbnail_url, display_order";

function asExercise(r: ExerciseRow): Exercise {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category,
    pattern: r.pattern,
    equipment: r.equipment,
    difficulty:
      r.difficulty === "beginner" || r.difficulty === "intermediate" || r.difficulty === "advanced"
        ? r.difficulty
        : null,
    primaryMuscles: (r.primary_muscles ?? []) as MuscleGroup[],
    secondaryMuscles: (r.secondary_muscles ?? []) as MuscleGroup[],
    tertiaryMuscles: (r.tertiary_muscles ?? []) as MuscleGroup[],
    cues: Array.isArray(r.cues) ? (r.cues as string[]) : [],
    mistakes: Array.isArray(r.mistakes) ? (r.mistakes as ExerciseMistake[]) : [],
    whyMatters: r.why_matters,
    setup: r.setup,
    progression: r.progression,
    regression: r.regression,
    demoAssetUrl: r.demo_asset_url,
    videoUrl: r.video_url,
    thumbnailUrl: r.thumbnail_url,
    displayOrder: r.display_order ?? 0,
  };
}

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export type ExerciseFilters = {
  category?: string;
  equipment?: string;
  pattern?: string;
  difficulty?: ExerciseDifficulty;
};

export async function listPublishedExercises(
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_EXERCISES.filter((e) => matches(e, filters));

  let q = supabase
    .from("exercises")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (filters.category) q = q.eq("category", filters.category);
  if (filters.equipment) q = q.eq("equipment", filters.equipment);
  if (filters.pattern) q = q.eq("pattern", filters.pattern);
  if (filters.difficulty) q = q.eq("difficulty", filters.difficulty);

  const { data } = await q;
  // Supabase's generated DB types don't yet include the columns added
  // in migration 0028 — cast via unknown until `npm run db:types` is
  // re-run against the cloud project.
  return (data ?? []).map((r) => asExercise(r as unknown as ExerciseRow));
}

export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const supabase = await createClient();
  if (!supabase) {
    return MOCK_EXERCISES.find((e) => e.slug === slug) ?? null;
  }

  const { data } = await supabase
    .from("exercises")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data ? asExercise(data as unknown as ExerciseRow) : null;
}

export async function listPublishedExerciseSlugs(): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_EXERCISES.map((e) => e.slug);

  const { data } = await supabase
    .from("exercises")
    .select("slug")
    .eq("is_published", true);
  return (data ?? []).map((r) => r.slug as string);
}

/**
 * The dominant view to show on the figure when previewing an
 * exercise. Counts primary+secondary muscles per side, ties go to
 * back (most posterior-chain lifts read better from behind).
 */
export function dominantView(ex: Exercise): "front" | "back" {
  const FRONT = new Set<MuscleGroup>([
    "neck", "chest", "front_delts", "biceps", "forearms", "abs",
    "obliques", "adductors", "quads", "calves_front",
  ]);
  const all = [...ex.primaryMuscles, ...ex.secondaryMuscles];
  let front = 0;
  let back = 0;
  for (const m of all) (FRONT.has(m) ? front++ : back++);
  return back >= front ? "back" : "front";
}

function matches(e: Exercise, f: ExerciseFilters): boolean {
  if (f.category && e.category !== f.category) return false;
  if (f.equipment && e.equipment !== f.equipment) return false;
  if (f.pattern && e.pattern !== f.pattern) return false;
  if (f.difficulty && e.difficulty !== f.difficulty) return false;
  return true;
}

/* ---------------------------------------------------------------- *
 * Demo-mode mocks — 4 representative lifts. Production data lives
 * in supabase/seed-exercises.sql (20+ exercises).
 * ---------------------------------------------------------------- */

const MOCK_EXERCISES: Exercise[] = [
  {
    slug: "back-squat",
    name: "Back Squat",
    category: "lower-body",
    pattern: "squat",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "lower_back"],
    tertiaryMuscles: ["abs", "adductors", "calves_back"],
    cues: [
      "Bryst op og spændt mave før du drukner under baren.",
      "Knæ sporer tæerne — pres dem aktivt ud.",
      "Sid lavt: hofte under knæ.",
      "Driv gulvet væk og lås ud uden hyperextension.",
      "Træk vejret ind i bunden, pust ud på vej op.",
    ],
    mistakes: [
      {
        title: "Knæene falder ind",
        body: "Skubber kraften gennem inderlåret i stedet for at engagere glutes. Cue: pres knæene aktivt ud mod lillefingertåen.",
      },
      {
        title: "Bryst kollapser frem",
        body: "Mister bar-position. Hold albuerne ind under baren og pres brystet op — bagsiden skal være stiv.",
      },
      {
        title: "Hælen letter",
        body: "Vægten over fortæen. Sko med fast hæl + bevidst tryk i bagest tredjedel af foden.",
      },
    ],
    whyMatters:
      "Bygger benstyrke fra bunden og tvinger hele kæden — core, ryg, hofte — til at arbejde samtidig.",
    setup:
      "Bar i high-bar position på øvre traps. Fødderne skulderbredde, lille udadrotation. Spændt mave før liften.",
    progression:
      "Tilføj pause i bunden, eller skift til front squat for mere quads og oprejst torso.",
    regression: "Goblet squat med en kettlebell, eller box squat for at lære dybdetilvænning.",
    demoAssetUrl: null,
    videoUrl: null,
    thumbnailUrl: null,
    displayOrder: 10,
  },
  {
    slug: "deadlift",
    name: "Conventional Deadlift",
    category: "full-body",
    pattern: "hinge",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["hamstrings", "glutes", "lower_back"],
    secondaryMuscles: ["lats", "traps", "quads"],
    tertiaryMuscles: ["forearms", "abs", "calves_back"],
    cues: [
      "Lats engageret — træk baren ind i kroppen, ikke væk fra den.",
      "Stang over midtfod ved opstart.",
      "Skuldre lige over baren — ikke bag.",
      "Pres gulvet væk, ikke træk baren op.",
      "Lås hofterne ud i toppen uden hyperextension.",
    ],
    mistakes: [
      {
        title: "Hofte skyder op først",
        body: "Du laver en stiff-leg pull med dårligt knæ-engagement. Cue: pres gulvet væk — knæ og hofte ekstenderer samtidig.",
      },
      {
        title: "Rygsænkning ved lockout",
        body: "Hofterne overstrækker bagud. Stop ved hip extension neutral — ingen lean back.",
      },
    ],
    whyMatters:
      "Den øvelse der bedst tester hele bagsiden — fra hælen til nakken. Bygger den styrke der overfører til alt.",
    setup:
      "Bar over midtfod. Skin tæt på baren. Grip lige uden for benene. Træk slæk ud af baren før liften.",
    progression: "Pause-deadlift 2 cm over gulv, eller deficit pull for ekstra range.",
    regression: "Trap bar deadlift eller block pull fra knæhøjde.",
    demoAssetUrl: null,
    videoUrl: null,
    thumbnailUrl: null,
    displayOrder: 30,
  },
  {
    slug: "bench",
    name: "Bench Press",
    category: "upper-body-push",
    pattern: "push-horizontal",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["chest", "front_delts", "triceps"],
    secondaryMuscles: ["forearms"],
    tertiaryMuscles: ["abs", "lats"],
    cues: [
      "Skuldre tilbage og ned — pres dem ind i bænken.",
      "Ben i gulvet, hofte aktiv — bench er en helkrops-øvelse.",
      "Baren ned til midten af brystet, albuer omkring 45° ud.",
      "Pust ud på vej op, hold core spændt hele vejen.",
      "Lås albuerne uden at miste skulder-position.",
    ],
    mistakes: [
      {
        title: "Albuerne flagrer 90° ud",
        body: "Skader skulderen og fjerner triceps engagement. Hold 45° vinkel mellem overarm og torso.",
      },
      {
        title: "Bagdel forlader bænk",
        body: "Cheats range of motion. Hofte skal røre bænken hele liften.",
      },
    ],
    whyMatters:
      "Hovedøvelse for bryststyrke og overkrops-push. Mest brugte målestok for overkropskraft.",
    setup:
      "Skulderblade tilbage og ned. Bro i ryggen ok. Fødderne plantet. Grip ca. ringfinger på bar-ringen.",
    progression: "Paused bench eller tempo bench (3 sek nedad).",
    regression: "Dumbbell bench eller floor press hvis skulder-fleksibilitet er begrænset.",
    demoAssetUrl: null,
    videoUrl: null,
    thumbnailUrl: null,
    displayOrder: 50,
  },
  {
    slug: "ohp",
    name: "Overhead Press",
    category: "shoulders",
    pattern: "push-vertical",
    equipment: "barbell",
    difficulty: "intermediate",
    primaryMuscles: ["front_delts", "triceps"],
    secondaryMuscles: ["chest", "traps"],
    tertiaryMuscles: ["abs", "forearms"],
    cues: [
      "Stang i front rack — albuer let foran baren.",
      "Spændt mave og glutes — som en stående plank.",
      "Træk hovedet tilbage så baren passerer ansigt.",
      "Stang ender direkte over midtfod, ikke fremover.",
      "Ingen ben-drive — strict pres hele vejen.",
    ],
    mistakes: [
      {
        title: "Ryglæn",
        body: "Bench press på gulv — fjerner OHP intentet. Hold core spændt og torso lodret.",
      },
      {
        title: "Stang ender fremover",
        body: "Lockout-position over panden i stedet for over midtfod. Træk haglen ind og pres op + bagover så bar finder linjen.",
      },
    ],
    whyMatters:
      "Den øvelse der bedst tester core-stabilitet under load. Bygger skulder-styrke og total kæde-stivhed.",
    setup: "Bar i front rack. Stance omkring hofte. Mave hård. Albuer let foran baren.",
    progression: "Push press hvis lockout-styrken er der, eller seated OHP for ren skulder-load.",
    regression: "Dumbbell shoulder press eller seated barbell press.",
    demoAssetUrl: null,
    videoUrl: null,
    thumbnailUrl: null,
    displayOrder: 70,
  },
];
