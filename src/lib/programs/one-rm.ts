/**
 * Onboarding 1RM → personal week-1 weights.
 *
 * The member answers per lift: a known 1RM, a recent heavy set
 * (kg × reps, converted with Epley) or "har ikke løftet det". The
 * catalog blueprint carries absolute kg written for one reference
 * lifter, so each main lift is scaled by member e1RM / blueprint e1RM.
 * Later weeks progress from logged sets (`progressWeek`), so only
 * week 1 needs this.
 *
 * Pure: imported by the onboarding client (estimate preview) and the
 * server assign path.
 */

export type LiftKey = "squat" | "bench" | "deadlift" | "ohp";

export const LIFT_KEYS: LiftKey[] = ["squat", "bench", "deadlift", "ohp"];

/** null = "har ikke løftet det". */
export type OneRmInput = Record<LiftKey, number | null>;

export type LiftAnswerMode = "max" | "set" | "none";

/** Epley e1RM, capped at reps ≤ 10 where the formula holds. */
export function epley(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (reps === 1) return round1(weight);
  if (reps > 10) return null;
  return round1(weight * (1 + reps / 30));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function liftKeyFor(name: string): LiftKey | null {
  const n = name.trim().toLowerCase();
  if (n === "back squat") return "squat";
  if (n === "bench press" || n === "paused bench") return "bench";
  if (n === "conventional deadlift") return "deadlift";
  if (n === "push press" || n === "overhead press" || n === "ohp") return "ohp";
  return null;
}

function parseNum(v: string | null | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * One lift's answer → e1RM. `undefined` means the answer is incomplete
 * or out of range (the step cannot continue); `null` is a valid
 * "har ikke løftet det".
 */
export function liftAnswerToOneRm(answer: {
  mode: string | null | undefined;
  max?: string | null;
  setKg?: string | null;
  setReps?: string | null;
}): number | null | undefined {
  if (answer.mode === "none") return null;
  if (answer.mode === "max") {
    const kg = parseNum(answer.max);
    return kg != null && kg > 0 && kg <= 600 ? kg : undefined;
  }
  if (answer.mode === "set") {
    const kg = parseNum(answer.setKg);
    const reps = parseNum(answer.setReps);
    if (kg == null || kg <= 0 || kg > 600) return undefined;
    if (reps == null || !Number.isInteger(reps) || reps < 1 || reps > 10) return undefined;
    return epley(kg, reps) ?? undefined;
  }
  return undefined;
}

/** Form fields: `{lift}Mode`, `{lift}Max`, `{lift}SetKg`, `{lift}SetReps`. */
export function parseOneRmForm(
  get: (key: string) => string | null,
): OneRmInput | null {
  const out = {} as OneRmInput;
  for (const lift of LIFT_KEYS) {
    const v = liftAnswerToOneRm({
      mode: get(`${lift}Mode`),
      max: get(`${lift}Max`),
      setKg: get(`${lift}SetKg`),
      setReps: get(`${lift}SetReps`),
    });
    if (v === undefined) return null;
    out[lift] = v;
  }
  return out;
}

type ScalableExercise = { exercise_name: string; sets: unknown };
type ScalableDay<E extends ScalableExercise> = { exercises: E[] };
type RawSet = Record<string, unknown>;

/** Empty bar: never prescribe a barbell main lift below it. */
const BAR_KG = 20;

function setsOf(ex: ScalableExercise): RawSet[] {
  return Array.isArray(ex.sets) ? (ex.sets as RawSet[]) : [];
}

function weightOf(set: RawSet): number {
  const n = Number(set.weight);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Heaviest set's e1RM, reading reps + reps-in-reserve (RPE 8 if unset).
 * Uncapped Epley: a ratio between two estimates, and a hypertrophy
 * block may have no set at ≤ 10 rep-equivalents.
 */
function referenceOneRm(sets: RawSet[]): number | null {
  let best: number | null = null;
  for (const set of sets) {
    const w = weightOf(set);
    const reps = Number(set.reps);
    const rpe = set.rpe == null ? 8 : Number(set.rpe);
    if (w <= 0 || !(reps > 0) || !Number.isFinite(rpe)) continue;
    const e = w * (1 + (reps + Math.max(0, 10 - rpe)) / 30);
    if (best == null || e > best) best = e;
  }
  return best;
}

function floor25(n: number) {
  return Math.floor(n / 2.5) * 2.5;
}

/**
 * Scale every weighted blueprint set to the member. Main lifts use
 * their own ratio; "har ikke løftet det" leaves the target empty so
 * the member picks a light weight. Other exercises use the mean ratio
 * of the known lifts, empty if none is known. Bodyweight sets
 * (weight 0) are untouched. If no main lift in the blueprint has a
 * reference, there is nothing to scale against and weights stay.
 */
export function scaleBlueprintDays<E extends ScalableExercise, D extends ScalableDay<E>>(
  days: D[],
  oneRm: OneRmInput,
): D[] {
  const refSets: Partial<Record<LiftKey, RawSet[]>> = {};
  for (const day of days) {
    for (const ex of day.exercises) {
      const key = liftKeyFor(ex.exercise_name);
      if (key) refSets[key] = [...(refSets[key] ?? []), ...setsOf(ex)];
    }
  }

  const ratio: Partial<Record<LiftKey, number>> = {};
  let anyRef = false;
  for (const key of LIFT_KEYS) {
    const ref = refSets[key] ? referenceOneRm(refSets[key]) : null;
    if (ref == null) continue;
    anyRef = true;
    const member = oneRm[key];
    if (member != null && member > 0) ratio[key] = member / ref;
  }
  if (!anyRef) return days;

  const ratios = Object.values(ratio);
  // ponytail: one mean ratio for every accessory; per-pattern mapping
  // (RDL → deadlift, row → bench) if accessory loads come out wrong.
  const meanRatio =
    ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map((ex) => {
      const key = liftKeyFor(ex.exercise_name);
      const r =
        key == null ? meanRatio : oneRm[key] == null ? null : (ratio[key] ?? meanRatio);
      return {
        ...ex,
        sets: setsOf(ex).map((set) => {
          const w = weightOf(set);
          if (w <= 0) return set;
          if (r == null) return { ...set, weight: null };
          const scaled = floor25(w * r);
          return { ...set, weight: key ? Math.max(BAR_KG, scaled) : Math.max(2.5, scaled) };
        }),
      };
    }),
  }));
}
