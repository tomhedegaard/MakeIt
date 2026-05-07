/**
 * Lifts + e1RM analytics for the member's profile.
 *
 * No dedicated PRs table in v1 — we derive everything from
 * session_sets that have been logged. Estimated 1RM (Epley):
 *   e1RM = weight × (1 + reps / 30), capped at reps ≤ 10 for sanity.
 *
 * Compound lifts mapped from exercise_name:
 *   "Back Squat"            → squat
 *   "Bench Press" | "Paused Bench" → bench
 *   "Conventional Deadlift" → deadlift
 *   "Push Press" | "Overhead Press" | "OHP" → ohp
 */
import { createClient } from "@/lib/supabase/server";

export type LiftKey = "squat" | "bench" | "deadlift" | "ohp";

export const LIFT_LABELS: Record<LiftKey, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
  ohp: "OHP",
};

export type LiftPoint = { date: string; e1rm: number };

export type LiftPr = {
  date: string;
  weight: number;
  reps: number;
  e1rm: number;
  exerciseName: string;
};

export type LiftStats = {
  key: LiftKey;
  label: string;
  currentE1rm: number | null;
  delta4w: number | null; // kg compared to e1RM ~4 weeks ago
  history: LiftPoint[];   // chronological, weekly aggregated
  prs: LiftPr[];          // chronological, only true e1RM PRs
};

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function epley(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (reps === 1) return round(weight);
  if (reps > 10) return null; // Epley unreliable above ~10 reps
  return round(weight * (1 + reps / 30));
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function liftKeyFor(name: string): LiftKey | null {
  const n = name.trim().toLowerCase();
  if (n === "back squat") return "squat";
  if (n === "bench press" || n === "paused bench") return "bench";
  if (n === "conventional deadlift") return "deadlift";
  if (n === "push press" || n === "overhead press" || n === "ohp") return "ohp";
  return null;
}

function isoDate(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // Mon=0
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Reduce a set of (date, e1rm) samples to one weekly max series.
 * Returns ISO date (Monday of that week) → best e1RM.
 */
function aggregateWeekly(samples: { date: Date; e1rm: number }[]): LiftPoint[] {
  const byWeek = new Map<string, number>();
  for (const s of samples) {
    const key = isoDate(startOfWeek(s.date));
    const prev = byWeek.get(key) ?? 0;
    if (s.e1rm > prev) byWeek.set(key, s.e1rm);
  }
  return Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, e1rm]) => ({ date, e1rm }));
}

function computeStats(
  samples: { date: Date; e1rm: number }[],
  pickPrSet: Map<string, { weight: number; reps: number; exerciseName: string }>
): Pick<LiftStats, "currentE1rm" | "delta4w" | "history" | "prs"> {
  if (samples.length === 0) {
    return { currentE1rm: null, delta4w: null, history: [], prs: [] };
  }

  const sorted = samples.slice().sort((a, b) => a.date.getTime() - b.date.getTime());

  // PR detection: walk chronologically, mark each new running max.
  const prs: LiftPr[] = [];
  let runningMax = 0;
  for (const s of sorted) {
    if (s.e1rm > runningMax) {
      runningMax = s.e1rm;
      const key = s.date.toISOString();
      const meta = pickPrSet.get(key);
      if (meta) {
        prs.push({
          date: isoDate(s.date),
          weight: meta.weight,
          reps: meta.reps,
          e1rm: s.e1rm,
          exerciseName: meta.exerciseName,
        });
      }
    }
  }

  const history = aggregateWeekly(sorted).slice(-12); // last 12 weeks
  const currentE1rm = sorted[sorted.length - 1].e1rm;

  // Delta vs ~4 weeks ago (best in week N-4)
  const fourWeeksAgo = history[Math.max(0, history.length - 5)];
  const delta4w = fourWeeksAgo ? round(currentE1rm - fourWeeksAgo.e1rm) : null;

  return {
    currentE1rm,
    delta4w,
    history,
    prs: prs.slice(-8), // last 8 PRs
  };
}

/* ---------------------------------------------------------------- *
 * Demo-mode mocks
 * ---------------------------------------------------------------- */

function buildMockHistory(curve: number[]): LiftPoint[] {
  const today = startOfWeek(new Date());
  return curve.map((e1rm, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (curve.length - 1 - i) * 7);
    return { date: isoDate(d), e1rm };
  });
}

function MOCK(): LiftStats[] {
  const sq = [160, 162.5, 165, 165, 167.5, 170, 172.5, 172.5, 175, 175, 177.5, 180];
  const b  = [110, 110,   112.5, 112.5, 115, 115, 117.5, 117.5, 120, 120, 120, 120];
  const dl = [195, 197.5, 200, 200, 202.5, 205, 207.5, 207.5, 210, 210, 210, 210];
  const oh = [60,  60,    62.5, 62.5, 62.5, 65, 65, 65, 67.5, 67.5, 67.5, 70];

  const today = new Date();
  const week = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n * 7);
    return isoDate(d);
  };

  return [
    {
      key: "squat", label: LIFT_LABELS.squat,
      currentE1rm: 180, delta4w: 7.5,
      history: buildMockHistory(sq),
      prs: [
        { date: week(0), weight: 175, reps: 1, e1rm: 180, exerciseName: "Back Squat" },
        { date: week(2), weight: 170, reps: 1, e1rm: 175, exerciseName: "Back Squat" },
        { date: week(4), weight: 165, reps: 1, e1rm: 170, exerciseName: "Back Squat" },
      ],
    },
    {
      key: "bench", label: LIFT_LABELS.bench,
      currentE1rm: 120, delta4w: 2.5,
      history: buildMockHistory(b),
      prs: [
        { date: week(2), weight: 117.5, reps: 1, e1rm: 120, exerciseName: "Paused Bench" },
        { date: week(5), weight: 115, reps: 1, e1rm: 117.5, exerciseName: "Bench Press" },
      ],
    },
    {
      key: "deadlift", label: LIFT_LABELS.deadlift,
      currentE1rm: 210, delta4w: 2.5,
      history: buildMockHistory(dl),
      prs: [
        { date: week(2), weight: 207.5, reps: 1, e1rm: 210, exerciseName: "Conventional Deadlift" },
        { date: week(4), weight: 205, reps: 1, e1rm: 207.5, exerciseName: "Conventional Deadlift" },
      ],
    },
    {
      key: "ohp", label: LIFT_LABELS.ohp,
      currentE1rm: 70, delta4w: 5,
      history: buildMockHistory(oh),
      prs: [
        { date: week(0), weight: 67.5, reps: 1, e1rm: 70, exerciseName: "Push Press" },
      ],
    },
  ];
}

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export async function getMyLifts(memberId: string): Promise<LiftStats[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK();

  // Pull all logged sets for this member (RLS scopes to own).
  const { data } = await supabase
    .from("session_sets")
    .select(
      `
      logged_weight, logged_reps, logged_at,
      session_exercise:session_exercises!inner(
        exercise_name,
        session:sessions!inner(member_id)
      )
    `
    )
    .not("logged_at", "is", null)
    .filter("session_exercise.session.member_id", "eq", memberId)
    .order("logged_at", { ascending: true });

  if (!data || data.length === 0) {
    // Empty state — return all 4 lifts with no data
    return (Object.keys(LIFT_LABELS) as LiftKey[]).map((k) => ({
      key: k,
      label: LIFT_LABELS[k],
      currentE1rm: null,
      delta4w: null,
      history: [],
      prs: [],
    }));
  }

  // Bucket by lift key
  const buckets: Record<
    LiftKey,
    { date: Date; e1rm: number }[]
  > = { squat: [], bench: [], deadlift: [], ohp: [] };
  const meta: Record<LiftKey, Map<string, { weight: number; reps: number; exerciseName: string }>> = {
    squat: new Map(), bench: new Map(), deadlift: new Map(), ohp: new Map(),
  };

  for (const r of data) {
    const se = Array.isArray(r.session_exercise) ? r.session_exercise[0] : r.session_exercise;
    const name = se?.exercise_name as string | undefined;
    if (!name) continue;
    const k = liftKeyFor(name);
    if (!k) continue;
    const w = Number(r.logged_weight ?? 0);
    const reps = Number(r.logged_reps ?? 0);
    const e = epley(w, reps);
    if (e == null) continue;
    const at = r.logged_at as string;
    const d = new Date(at);
    buckets[k].push({ date: d, e1rm: e });
    meta[k].set(d.toISOString(), { weight: w, reps, exerciseName: name });
  }

  return (Object.keys(LIFT_LABELS) as LiftKey[]).map((k) => ({
    key: k,
    label: LIFT_LABELS[k],
    ...computeStats(buckets[k], meta[k]),
  }));
}
