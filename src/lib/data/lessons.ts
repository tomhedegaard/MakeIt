/**
 * Crew Coaching Pyramid — lesson data layer (CC-6).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §8
 *
 * Reads coaching_lessons + lesson_progress for the /coach-school tree
 * and the per-slug lesson detail page. Lock state is computed against
 * the member's tier (Lifter / Athlete / Beast / Legend) — Munk sees
 * every lesson regardless because he's the content author and
 * spot-checker.
 *
 * Demo-mode fallback: ships the five v0 lessons Munk records during
 * M5 (per spec §8) so the tree + detail surfaces are exercisable
 * without a backend.
 */
import "server-only";

import { getSession } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Tier } from "@/lib/auth";
import type { PracticeEval } from "@/lib/coach-school/practice-eval";

export type RequiredTier = "athlete" | "beast" | "legend";

/** One quiz question — three multiple-choice items per lesson per spec §8. */
export interface QuizQuestion {
  question: string;
  choices: string[];
  /** 0-indexed correct answer. */
  correct_index: number;
  explanation?: string;
}

/** One practice scenario the member writes a free-text response to. */
export interface PracticeScenario {
  prompt: string;
  context?: string | null;
  /** Hidden from the UI — fed to Claude as the eval rubric. */
  rubric_for_claude: string;
}

/** Per-lesson list row for the /coach-school tree. */
export interface LessonForList {
  id: string;
  slug: string;
  requiredTier: RequiredTier;
  titleDa: string;
  durationSec: number | null;
  repsAward: number;
  unlocked: boolean;
  completedAt: string | null;
}

/** Full lesson detail for /coach-school/lessons/[slug]. */
export interface LessonDetail {
  id: string;
  slug: string;
  requiredTier: RequiredTier;
  titleDa: string;
  videoUrl: string;
  durationSec: number | null;
  quiz: QuizQuestion[];
  practiceScenario: PracticeScenario | null;
  repsAward: number;
  unlocked: boolean;
  progress: LessonProgress | null;
}

/** Per-(member, lesson) progress. Null while no attempt has been made. */
export interface LessonProgress {
  quizScore: number | null;
  practiceEval: PracticeEval | null;
  completedAt: string | null;
}

/* ============================================================== *
 * Pure: tier unlock logic
 * ============================================================== */

const TIER_ORDER: Record<RequiredTier, number> = {
  athlete: 1,
  beast: 2,
  legend: 3,
};
const MEMBER_TIER_RANK: Record<Tier, number> = {
  Lifter: 0,
  Athlete: 1,
  Beast: 2,
  Legend: 3,
};

/** Is `memberTier` (or coach_tier='munk') high enough to unlock `required`? */
export function isLessonUnlocked(
  memberTier: Tier,
  coachTier: string | null,
  required: RequiredTier,
): boolean {
  if (coachTier === "munk") return true; // Munk sees all lessons
  return MEMBER_TIER_RANK[memberTier] >= TIER_ORDER[required];
}

/* ============================================================== *
 * Demo-mode mocks: the five v0 lessons Munk records during M5
 * ============================================================== */

const MOCK_LESSONS: LessonDetail[] = [
  {
    id: "demo-lesson-1",
    slug: "form-cue-der-lander",
    requiredTier: "athlete",
    titleDa: "Sådan giver du et form-cue der lander",
    videoUrl: "",
    durationSec: 110,
    repsAward: 20,
    unlocked: false,
    quiz: [
      {
        question: "Hvilken cue-form lander bedst hos en træt lærling?",
        choices: [
          "En liste med tre observationer",
          "Én konkret instruktion til næste sæt",
          "En henvisning til en YouTube-video",
        ],
        correct_index: 1,
        explanation: "Én ting at fokusere på pr. sæt — listen overvælder.",
      },
      {
        question: "Hvad bør du undgå i et cue?",
        choices: ["AI-jargon (score, percentile)", "Et lille billede", "Et opmuntrende ord"],
        correct_index: 0,
      },
      {
        question: "Hvornår er et cue 'landet'?",
        choices: [
          "Når lærlingen kan gentage det",
          "Når næste sæt viser den ønskede ændring",
          "Når lærlingen siger tak",
        ],
        correct_index: 1,
      },
    ],
    practiceScenario: {
      prompt:
        "Du ser et form-check med ai_score 6 og bullet 'knæene falder ind på rep 4-5'. Skriv ÉT cue til medlemmet.",
      context: "Medlem er Athlete-tier, midt i en Build Phase, uge 4.",
      rubric_for_claude:
        "Lærlingen skal: 1) fange knæ-valgus som kernepunktet, 2) levere ÉN konkret instruktion (ikke en liste), 3) IKKE bruge tal-jargon. strong=alle tre, on_track=de første to, needs_work=ingen.",
    },
    progress: null,
  },
  {
    id: "demo-lesson-2",
    slug: "nudge-eller-stoj",
    requiredTier: "athlete",
    titleDa: "Hvornår sender du et nudge — og hvornår er det støj",
    videoUrl: "",
    durationSec: 95,
    repsAward: 20,
    unlocked: false,
    quiz: [
      {
        question: "Hvad er et 'godt' nudge?",
        choices: [
          "En generisk 'kom så!' når lærlingen er på pause",
          "En specifik observation knyttet til lærlingens næste session",
          "En reminder om et abonnementstilbud",
        ],
        correct_index: 1,
      },
      {
        question: "Hvor ofte er det støj?",
        choices: ["Hver dag", "Hver gang vi har data men ikke en relevant observation", "Aldrig"],
        correct_index: 1,
      },
      {
        question: "Hvilken kanal er bedst til nudge?",
        choices: ["Den kanal lærlingen allerede tjekker", "E-mail", "SMS"],
        correct_index: 0,
      },
    ],
    practiceScenario: {
      prompt:
        "En lærling har sprunget to sessioner over på en uge, men loggede søvn på 5.4 timer i går. Skriv et nudge — eller forklar hvorfor du IKKE sender et.",
      context: null,
      rubric_for_claude:
        "Lærlingen skal vise: nudge eller ej er en valid afgørelse her; hvis nudge → skal være knyttet til søvn ikke session-fravær. strong=tager standpunkt + begrunder.",
    },
    progress: null,
  },
  {
    id: "demo-lesson-3",
    slug: "darlig-dag-uden-at-fikse",
    requiredTier: "athlete",
    titleDa: "At rumme en dårlig dag uden at fikse den",
    videoUrl: "",
    durationSec: 130,
    repsAward: 20,
    unlocked: false,
    quiz: [
      {
        question: "Hvad er 'rumme' uden 'fikse'?",
        choices: [
          "Anerkend dagen som den er, uden løsning",
          "Skift programmet helt om",
          "Stille en personlig diagnose",
        ],
        correct_index: 0,
      },
      {
        question: "Hvilket signal ER en dårlig dag?",
        choices: ["Lav HRV", "Et form-check med score 7", "En afvist tilpasning"],
        correct_index: 0,
      },
      {
        question: "Hvad er IKKE coach-ens job?",
        choices: ["Mental sundhed", "Søvn", "Form-cue"],
        correct_index: 0,
      },
    ],
    practiceScenario: {
      prompt:
        "Lærlingen skriver: 'jeg er bare træt, alt er træls'. Hvad svarer du?",
      context: null,
      rubric_for_claude:
        "Lærlingen skal: 1) anerkende uden at fikse, 2) ikke diagnosticere, 3) tilbyde ÉT lille skridt hvis muligt. strong=alle tre.",
    },
    progress: null,
  },
  {
    id: "demo-lesson-4",
    slug: "squat-depth-4-ting",
    requiredTier: "beast",
    titleDa: "Squat depth: 4 ting jeg leder efter",
    videoUrl: "",
    durationSec: 175,
    repsAward: 20,
    unlocked: false,
    quiz: [
      {
        question: "Hvilket signal er VIGTIGST for depth?",
        choices: ["Hofte under knæ", "Knæ over tå", "Albue-position"],
        correct_index: 0,
      },
      {
        question: "Hvad indikerer for lidt mobilitet?",
        choices: ["Hælen letter", "Stangen vipper", "Strappet er løst"],
        correct_index: 0,
      },
      {
        question: "Hvad kompenserer den trætte squat ofte med?",
        choices: ["Bøjet ryg", "For højt baranlæg", "For tæt fodstilling"],
        correct_index: 0,
      },
    ],
    practiceScenario: {
      prompt:
        "Form-check viser hofte lige over parallel og stangen vipper en smule. Hvad cuer du?",
      context: "Lærlingen er Beast-tier, kører Powerbuilding uge 6.",
      rubric_for_claude:
        "Lærlingen skal: 1) prioritere et af de fire signaler frem for at liste alt, 2) vælge cue der adresserer årsagen (mobilitet/styrke/teknik), ikke symptomet. strong=specifikt cue + rationale.",
    },
    progress: null,
  },
  {
    id: "demo-lesson-5",
    slug: "tag-en-dag-fri",
    requiredTier: "beast",
    titleDa: "Hvornår siger jeg 'tag en dag fri'?",
    videoUrl: "",
    durationSec: 140,
    repsAward: 20,
    unlocked: false,
    quiz: [
      {
        question: "Hvilket signal er IKKE i sig selv grund til at sige tag-fri?",
        choices: [
          "Et single form-check på 6/10",
          "Vedvarende lav HRV (≥3 dage)",
          "Lærlingen har bedt om det",
        ],
        correct_index: 0,
      },
      {
        question: "Hvad er 'fri' i denne kontekst?",
        choices: ["Helt hvile", "Lavintensiv aktiv restitution", "Skift til cardio"],
        correct_index: 1,
      },
      {
        question: "Hvem ejer beslutningen?",
        choices: ["Lærlingen", "Coachen", "Begge i fællesskab"],
        correct_index: 2,
      },
    ],
    practiceScenario: {
      prompt:
        "Lærling: 'jeg har det stadig fint, men HRV er meget lav 3 dage i træk.' Hvad anbefaler du?",
      context: null,
      rubric_for_claude:
        "Lærlingen skal: 1) anbefale aktiv restitution, IKKE bare 'fri', 2) anerkende lærlingens vurdering, 3) sætte konkret kriterie for hvornår man genoptager. strong=alle tre.",
    },
    progress: null,
  },
];

function memberTierOf(t: string): Tier {
  if (t === "Athlete" || t === "Beast" || t === "Legend" || t === "Lifter") return t;
  return "Lifter";
}

/* ============================================================== *
 * Async fetchers
 * ============================================================== */

/**
 * Return every published lesson with lock state + completion status
 * for the current member. Demo mode returns the five v0 mocks with
 * lock-state computed against the demo member's tier.
 */
export async function loadLessonsForMember(): Promise<LessonForList[]> {
  const member = await getSession();
  if (!member) return [];

  const tier = memberTierOf(member.tier);
  // getSession's Member type doesn't surface coach_tier; we look it
  // up only when the surface needs it.

  if (!SUPABASE_ENABLED) {
    // Demo mode — Munk (MUNK-01) gets all unlocked; other invite codes
    // see lock-state by tier.
    const isMunk = member.handle.toLowerCase() === "munk";
    return MOCK_LESSONS.map<LessonForList>((l) => ({
      id: l.id,
      slug: l.slug,
      requiredTier: l.requiredTier,
      titleDa: l.titleDa,
      durationSec: l.durationSec,
      repsAward: l.repsAward,
      unlocked: isMunk
        ? true
        : isLessonUnlocked(tier, isMunk ? "munk" : null, l.requiredTier),
      completedAt: null,
    }));
  }

  const supabase = await createClient();
  if (!supabase) return [];

  const svc = createServiceClient();
  const { data: coachRow } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", member.id)
    .single();
  const coachTier = (coachRow?.coach_tier as string | null) ?? null;

  const [lessonsRes, progressRes] = await Promise.all([
    supabase
      .from("coaching_lessons")
      .select("id, slug, required_tier, title_da, duration_sec, reps_award, published_at")
      .not("published_at", "is", null)
      .order("required_tier", { ascending: true })
      .order("slug", { ascending: true }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("member_id", member.id),
  ]);
  if (lessonsRes.error) throw new Error(`lessons: ${lessonsRes.error.message}`);
  if (progressRes.error) throw new Error(`progress: ${progressRes.error.message}`);

  const completedBy = new Map<string, string>();
  for (const p of progressRes.data ?? []) {
    if (p.completed_at) completedBy.set(p.lesson_id as string, p.completed_at as string);
  }

  return (lessonsRes.data ?? []).map<LessonForList>((l) => {
    const required = (l.required_tier as RequiredTier);
    return {
      id: l.id as string,
      slug: l.slug as string,
      requiredTier: required,
      titleDa: l.title_da as string,
      durationSec: (l.duration_sec as number | null) ?? null,
      repsAward: (l.reps_award as number) ?? 20,
      unlocked: isLessonUnlocked(tier, coachTier, required),
      completedAt: completedBy.get(l.id as string) ?? null,
    };
  });
}

/**
 * Full lesson detail for the per-slug page, including the current
 * member's progress (if any). Returns null when the slug doesn't
 * exist or isn't published.
 */
export async function loadLessonBySlug(slug: string): Promise<LessonDetail | null> {
  const member = await getSession();
  if (!member) return null;

  const tier = memberTierOf(member.tier);

  if (!SUPABASE_ENABLED) {
    const found = MOCK_LESSONS.find((l) => l.slug === slug);
    if (!found) return null;
    const isMunk = member.handle.toLowerCase() === "munk";
    return {
      ...found,
      unlocked: isMunk
        ? true
        : isLessonUnlocked(tier, isMunk ? "munk" : null, found.requiredTier),
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const svc = createServiceClient();
  const { data: coachRow } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", member.id)
    .single();
  const coachTier = (coachRow?.coach_tier as string | null) ?? null;

  const { data: lessonRow, error: lessonErr } = await supabase
    .from("coaching_lessons")
    .select(
      "id, slug, required_tier, title_da, video_url, duration_sec, quiz, practice_scenario, reps_award, published_at",
    )
    .eq("slug", slug)
    .not("published_at", "is", null)
    .single();
  if (lessonErr || !lessonRow) return null;

  const { data: progressRow } = await supabase
    .from("lesson_progress")
    .select("quiz_score, practice_eval, completed_at")
    .eq("member_id", member.id)
    .eq("lesson_id", lessonRow.id)
    .maybeSingle();

  const required = lessonRow.required_tier as RequiredTier;
  return {
    id: lessonRow.id as string,
    slug: lessonRow.slug as string,
    requiredTier: required,
    titleDa: lessonRow.title_da as string,
    videoUrl: (lessonRow.video_url as string) ?? "",
    durationSec: (lessonRow.duration_sec as number | null) ?? null,
    quiz: ((lessonRow.quiz as unknown) as QuizQuestion[]) ?? [],
    practiceScenario:
      ((lessonRow.practice_scenario as unknown) as PracticeScenario | null) ?? null,
    repsAward: (lessonRow.reps_award as number) ?? 20,
    unlocked: isLessonUnlocked(tier, coachTier, required),
    progress: progressRow
      ? {
          quizScore: (progressRow.quiz_score as number | null) ?? null,
          practiceEval:
            ((progressRow.practice_eval as unknown) as PracticeEval | null) ?? null,
          completedAt: (progressRow.completed_at as string | null) ?? null,
        }
      : null,
  };
}
