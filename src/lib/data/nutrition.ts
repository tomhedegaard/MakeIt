import "server-only";
import { createClient } from "@/lib/supabase/server";
import { generateMockPlan } from "@/lib/nutrition/mock-plan";
import { getMealImage, getMealImagesBatch } from "@/lib/nutrition/unsplash";

/* ---------------------------------------------------------------- *
 * Types
 * ---------------------------------------------------------------- */

export type NutritionGoal = "cut" | "recomp" | "mass" | "maintain";
export type Diet = "omnivore" | "pescatarian" | "vegetarian" | "vegan";
export type CookingLevel = "basic" | "intermediate" | "advanced";
export type BudgetLevel = "lean" | "standard" | "premium";
export type MealSlot = "morgen" | "frokost" | "aften" | "snack" | "pre" | "post";
export type MealKind = "recipe" | "component";
export type CarbDensity = "low" | "standard" | "high";
export type GeneratorKind = "claude" | "mock" | "manual";

export type Ingredient = {
  name: string;
  amount: number;
  unit: string;        // "g", "stk", "spsk", "tsk", "dl", "ml", "håndfuld"
  group?: string;      // allowlist category, set when generator can match it
};

export type NutritionProfile = {
  memberId: string;
  goal: NutritionGoal;
  dailyKcalTarget: number | null;
  dailyProteinGTarget: number | null;
  mealsPerDay: number;
  householdSize: number;
  cookingLevel: CookingLevel;
  budgetLevel: BudgetLevel;
  diet: Diet;
  allergies: string[];
  dislikes: string[];
  preferences: string[];
  cookDays: string[];
  fishPerWeek: number;
  /** When true, planner repeats 2-3 meals strategically across the
   *  week so the user can batch-cook Sunday. Default false. */
  mealPrepMode: boolean;
  updatedAt: string;
};

export type Meal = {
  id: string;
  planId: string;
  dayIndex: number; // 0=Mon
  slot: MealSlot;
  kind: MealKind;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  steps: string[];
  estKcal: number | null;
  estProteinG: number | null;
  estCarbsG: number | null;
  estFatG: number | null;
  carbDensity: CarbDensity;
  prepMinutes: number | null;
  swappable: boolean;
  position: number;
  /** Unsplash image — null when integration is off or no match was found. */
  imageUrl: string | null;
  imageThumbUrl: string | null;
  imageAttributionName: string | null;
  imageAttributionUrl: string | null;
};

export type Plan = {
  id: string;
  memberId: string;
  weekStart: string; // YYYY-MM-DD (ISO Monday)
  dailyKcal: number | null;
  dailyProteinG: number | null;
  dailyCarbsG: number | null;
  dailyFatG: number | null;
  generator: GeneratorKind;
  generatorModel: string | null;
  notes: string | null;
  generatedAt: string;
  meals: Meal[];
};

export type LogStatus = "eaten" | "skipped";

export type NutritionLog = {
  id: string;
  memberId: string;
  mealId: string | null;
  loggedForDate: string;
  loggedForSlot: MealSlot | null;
  status: LogStatus;
  photoPath: string | null;
  matchScore: number | null;
  proteinEstimate: "low" | "on_target" | "high" | null;
  aiHeadline: string | null;
  aiNotes: string | null;
  gradedAt: string | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
};

/* ---------------------------------------------------------------- *
 * Defaults
 * ---------------------------------------------------------------- */

export const DEFAULT_PROFILE: Omit<NutritionProfile, "memberId" | "updatedAt"> = {
  goal: "maintain",
  dailyKcalTarget: null,
  dailyProteinGTarget: null,
  mealsPerDay: 3,
  householdSize: 1,
  cookingLevel: "intermediate",
  budgetLevel: "standard",
  diet: "omnivore",
  allergies: [],
  dislikes: [],
  preferences: [],
  cookDays: [],
  fishPerWeek: 2,
  mealPrepMode: false,
};

/* ---------------------------------------------------------------- *
 * Profile getters / setters
 * ---------------------------------------------------------------- */

export async function getNutritionProfile(memberId: string): Promise<NutritionProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("nutrition_profiles")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  if (!data) return null;
  return rowToProfile(data);
}

export async function getOrCreateNutritionProfile(memberId: string): Promise<NutritionProfile> {
  const existing = await getNutritionProfile(memberId);
  if (existing) return existing;

  const supabase = await createClient();
  if (!supabase) {
    return {
      memberId,
      ...DEFAULT_PROFILE,
      updatedAt: new Date().toISOString(),
    };
  }

  const { data } = await supabase
    .from("nutrition_profiles")
    .insert({ member_id: memberId })
    .select("*")
    .single();

  if (!data) throw new Error("Failed to create nutrition profile");
  return rowToProfile(data);
}

export async function saveNutritionProfile(
  memberId: string,
  patch: Partial<Omit<NutritionProfile, "memberId" | "updatedAt">>
): Promise<NutritionProfile> {
  const supabase = await createClient();
  if (!supabase) {
    // Demo mode — pretend it saved
    return {
      memberId,
      ...DEFAULT_PROFILE,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  }

  const row = {
    member_id: memberId,
    goal: patch.goal,
    daily_kcal_target: patch.dailyKcalTarget,
    daily_protein_g_target: patch.dailyProteinGTarget,
    meals_per_day: patch.mealsPerDay,
    household_size: patch.householdSize,
    cooking_level: patch.cookingLevel,
    budget_level: patch.budgetLevel,
    diet: patch.diet,
    allergies: patch.allergies,
    dislikes: patch.dislikes,
    preferences: patch.preferences,
    cook_days: patch.cookDays,
    fish_per_week: patch.fishPerWeek,
    meal_prep_mode: patch.mealPrepMode,
  };

  // Drop undefined keys so partial updates don't NULL out columns.
  const cleaned: Record<string, unknown> = { member_id: memberId };
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined) cleaned[k] = v;
  }

  const { data, error } = await supabase
    .from("nutrition_profiles")
    .upsert(cleaned, { onConflict: "member_id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save profile");
  return rowToProfile(data);
}

/* ---------------------------------------------------------------- *
 * Plan getters
 * ---------------------------------------------------------------- */

export async function getPlanForWeek(memberId: string, weekStart: string): Promise<Plan | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("*")
    .eq("member_id", memberId)
    .eq("week_start", weekStart)
    .is("archived_at", null)
    .maybeSingle();

  if (!plan) return null;

  const { data: meals } = await supabase
    .from("nutrition_meals")
    .select("*")
    .eq("plan_id", plan.id)
    .order("day_index", { ascending: true })
    .order("position", { ascending: true });

  return rowToPlan(plan, meals ?? []);
}

export async function getCurrentPlan(memberId: string): Promise<Plan | null> {
  return getPlanForWeek(memberId, currentIsoMonday());
}

/* ---------------------------------------------------------------- *
 * Plan generation — persists via insert. AI hook is wired later;
 * for now the deterministic mock generator covers both demo mode
 * and the "generate plan" CTA before the AI key is set.
 * ---------------------------------------------------------------- */

export async function generatePlan(
  memberId: string,
  weekStart: string,
  profile: NutritionProfile
): Promise<Plan> {
  // Build the plan shape (ingredients, steps, macros) from the mock
  // generator. The real Claude generator (commit 3) will replace
  // this call with a Sonnet-4.6 round-trip when ANTHROPIC_API_KEY is
  // present, falling back to the same mock on miss/error.
  const planShape = generateMockPlan({ profile, weekStart });

  const supabase = await createClient();
  if (!supabase) {
    // Demo mode: synthesize an in-memory plan with stable ids.
    return {
      id: `demo-${weekStart}`,
      memberId,
      weekStart,
      dailyKcal: planShape.targets.kcal,
      dailyProteinG: planShape.targets.proteinG,
      dailyCarbsG: planShape.targets.carbsG,
      dailyFatG: planShape.targets.fatG,
      generator: "mock",
      generatorModel: null,
      notes: planShape.notes,
      generatedAt: new Date().toISOString(),
      meals: planShape.meals.map((m, i) => ({
        ...m,
        id: `demo-meal-${i}`,
        planId: `demo-${weekStart}`,
        imageUrl: null,
        imageThumbUrl: null,
        imageAttributionName: null,
        imageAttributionUrl: null,
      })),
    };
  }

  // Archive any existing plan for this week so the new one wins.
  await supabase
    .from("nutrition_plans")
    .update({ archived_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .eq("week_start", weekStart)
    .is("archived_at", null);

  const { data: planRow, error: planErr } = await supabase
    .from("nutrition_plans")
    .insert({
      member_id: memberId,
      week_start: weekStart,
      daily_kcal: planShape.targets.kcal,
      daily_protein_g: planShape.targets.proteinG,
      daily_carbs_g: planShape.targets.carbsG,
      daily_fat_g: planShape.targets.fatG,
      generator: "mock",
      notes: planShape.notes,
    })
    .select("*")
    .single();

  if (planErr || !planRow) throw new Error(planErr?.message ?? "Failed to create plan");

  // Parallel image fetch + 2s timeout each (see unsplash.ts).
  // Cache hits dominate after first plan; first time may add 1-3s.
  const images = await getMealImagesBatch(planShape.meals.map((m) => m.title));

  const mealRows = planShape.meals.map((m) => {
    const img = images.get(m.title);
    return {
      plan_id: planRow.id,
      day_index: m.dayIndex,
      slot: m.slot,
      kind: m.kind,
      title: m.title,
      description: m.description,
      ingredients: m.ingredients,
      steps: m.steps,
      est_kcal: m.estKcal,
      est_protein_g: m.estProteinG,
      est_carbs_g: m.estCarbsG,
      est_fat_g: m.estFatG,
      carb_density: m.carbDensity,
      prep_minutes: m.prepMinutes,
      swappable: m.swappable,
      position: m.position,
      image_url: img?.url ?? null,
      image_thumb_url: img?.thumbUrl ?? null,
      image_attribution_name: img?.attributionName ?? null,
      image_attribution_url: img?.attributionUrl ?? null,
    };
  });

  const { data: insertedMeals } = await supabase
    .from("nutrition_meals")
    .insert(mealRows)
    .select("*");

  return rowToPlan(planRow, insertedMeals ?? []);
}

/* ---------------------------------------------------------------- *
 * Recipe swap — generate a sibling meal for the same slot/day
 * ---------------------------------------------------------------- */

export async function swapMeal(
  memberId: string,
  mealId: string,
  profile: NutritionProfile
): Promise<Meal | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("nutrition_meals")
    .select("*, plan:nutrition_plans!inner(member_id)")
    .eq("id", mealId)
    .single();

  if (!existing || existing.plan?.member_id !== memberId) return null;

  // Mock-style swap: ask the mock generator for a single replacement.
  const { swapMockMeal } = await import("@/lib/nutrition/mock-plan");
  const replacement = swapMockMeal({
    profile,
    dayIndex: existing.day_index,
    slot: existing.slot,
    avoidTitle: existing.title,
  });

  // Single-meal image fetch — same 2s timeout + null-fallback as
  // the batch path. Worst case adds 2s to a meal swap which the
  // user is already expecting to take a moment.
  const image = await getMealImage(replacement.title);

  const { data: updated, error } = await supabase
    .from("nutrition_meals")
    .update({
      kind: replacement.kind,
      title: replacement.title,
      description: replacement.description,
      ingredients: replacement.ingredients,
      steps: replacement.steps,
      est_kcal: replacement.estKcal,
      est_protein_g: replacement.estProteinG,
      est_carbs_g: replacement.estCarbsG,
      est_fat_g: replacement.estFatG,
      carb_density: replacement.carbDensity,
      prep_minutes: replacement.prepMinutes,
      image_url: image?.url ?? null,
      image_thumb_url: image?.thumbUrl ?? null,
      image_attribution_name: image?.attributionName ?? null,
      image_attribution_url: image?.attributionUrl ?? null,
    })
    .eq("id", mealId)
    .select("*")
    .single();

  if (error || !updated) return null;
  return rowToMeal(updated);
}

/* ---------------------------------------------------------------- *
 * Photo-log adherence
 * ---------------------------------------------------------------- */

export async function listLogsForRange(
  memberId: string,
  fromDate: string,
  toDate: string
): Promise<NutritionLog[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("member_id", memberId)
    .gte("logged_for_date", fromDate)
    .lte("logged_for_date", toDate)
    .order("logged_for_date", { ascending: false });
  return (data ?? []).map(rowToLog);
}

export async function createLog(input: {
  memberId: string;
  mealId: string | null;
  loggedForDate: string;
  loggedForSlot: MealSlot | null;
  status?: LogStatus;
  photoPath: string | null;
  rating: number | null;
  notes: string | null;
}): Promise<NutritionLog | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("nutrition_logs")
    .insert({
      member_id: input.memberId,
      meal_id: input.mealId,
      logged_for_date: input.loggedForDate,
      logged_for_slot: input.loggedForSlot,
      status: input.status ?? "eaten",
      photo_path: input.photoPath,
      rating: input.rating,
      notes: input.notes,
    })
    .select("*")
    .single();
  return data ? rowToLog(data) : null;
}

export async function attachLogGrade(
  logId: string,
  grade: {
    matchScore: number;
    proteinEstimate: "low" | "on_target" | "high";
    aiHeadline: string;
    aiNotes: string;
  }
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("nutrition_logs")
    .update({
      match_score: grade.matchScore,
      protein_estimate: grade.proteinEstimate,
      ai_headline: grade.aiHeadline,
      ai_notes: grade.aiNotes,
      graded_at: new Date().toISOString(),
    })
    .eq("id", logId);
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

export function currentIsoMonday(d: Date = new Date()): string {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = out.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  out.setUTCDate(out.getUTCDate() + diff);
  return out.toISOString().slice(0, 10);
}

/**
 * Daily kcal target from member profile. Conservative Mifflin-St Jeor
 * with a training-day multiplier applied at meal level (not here).
 * Returns null if we don't have enough info to compute it.
 */
export function estimateDailyKcal(opts: {
  weightKg?: number | null;
  heightCm?: number | null;
  ageYears?: number | null;
  sex?: "m" | "f" | null;
  activityFactor?: number; // 1.4 sedentary → 1.8 athlete; default 1.6
  goal: NutritionGoal;
}): number | null {
  const { weightKg, heightCm, ageYears, sex } = opts;
  if (!weightKg || !heightCm || !ageYears || !sex) return null;
  const bmr =
    sex === "m"
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  const tdee = bmr * (opts.activityFactor ?? 1.6);
  const adj =
    opts.goal === "cut"
      ? -400
      : opts.goal === "mass"
        ? +300
        : opts.goal === "recomp"
          ? -150
          : 0;
  return Math.round((tdee + adj) / 50) * 50;
}

/* ---------------------------------------------------------------- *
 * Row mappers
 * ---------------------------------------------------------------- */

type ProfileRow = {
  member_id: string;
  goal: NutritionGoal;
  daily_kcal_target: number | null;
  daily_protein_g_target: number | null;
  meals_per_day: number;
  household_size: number;
  cooking_level: CookingLevel;
  budget_level: BudgetLevel;
  diet: Diet;
  allergies: string[] | null;
  dislikes: string[] | null;
  preferences: string[] | null;
  cook_days: string[] | null;
  fish_per_week: number;
  meal_prep_mode: boolean | null;
  updated_at: string;
};

function rowToProfile(row: ProfileRow): NutritionProfile {
  return {
    memberId: row.member_id,
    goal: row.goal,
    dailyKcalTarget: row.daily_kcal_target,
    dailyProteinGTarget: row.daily_protein_g_target,
    mealsPerDay: row.meals_per_day,
    householdSize: row.household_size,
    cookingLevel: row.cooking_level,
    budgetLevel: row.budget_level,
    diet: row.diet,
    allergies: row.allergies ?? [],
    dislikes: row.dislikes ?? [],
    preferences: row.preferences ?? [],
    cookDays: row.cook_days ?? [],
    fishPerWeek: row.fish_per_week,
    mealPrepMode: row.meal_prep_mode ?? false,
    updatedAt: row.updated_at,
  };
}

type PlanRow = {
  id: string;
  member_id: string;
  week_start: string;
  daily_kcal: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  generator: GeneratorKind;
  generator_model: string | null;
  notes: string | null;
  generated_at: string;
};

type MealRow = {
  id: string;
  plan_id: string;
  day_index: number;
  slot: MealSlot;
  kind: MealKind;
  title: string;
  description: string | null;
  ingredients: Ingredient[] | null;
  steps: string[] | null;
  est_kcal: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
  carb_density: CarbDensity;
  prep_minutes: number | null;
  swappable: boolean;
  position: number;
  image_url: string | null;
  image_thumb_url: string | null;
  image_attribution_name: string | null;
  image_attribution_url: string | null;
};

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    planId: row.plan_id,
    dayIndex: row.day_index,
    slot: row.slot,
    kind: row.kind,
    title: row.title,
    description: row.description,
    ingredients: (row.ingredients ?? []) as Ingredient[],
    steps: (row.steps ?? []) as string[],
    estKcal: row.est_kcal,
    estProteinG: row.est_protein_g,
    estCarbsG: row.est_carbs_g,
    estFatG: row.est_fat_g,
    carbDensity: row.carb_density,
    prepMinutes: row.prep_minutes,
    swappable: row.swappable,
    position: row.position,
    imageUrl: row.image_url,
    imageThumbUrl: row.image_thumb_url,
    imageAttributionName: row.image_attribution_name,
    imageAttributionUrl: row.image_attribution_url,
  };
}

function rowToPlan(plan: PlanRow, meals: MealRow[]): Plan {
  return {
    id: plan.id,
    memberId: plan.member_id,
    weekStart: plan.week_start,
    dailyKcal: plan.daily_kcal,
    dailyProteinG: plan.daily_protein_g,
    dailyCarbsG: plan.daily_carbs_g,
    dailyFatG: plan.daily_fat_g,
    generator: plan.generator,
    generatorModel: plan.generator_model,
    notes: plan.notes,
    generatedAt: plan.generated_at,
    meals: meals.map(rowToMeal),
  };
}

type LogRow = {
  id: string;
  member_id: string;
  meal_id: string | null;
  logged_for_date: string;
  logged_for_slot: MealSlot | null;
  status: LogStatus | null;
  photo_path: string | null;
  match_score: number | null;
  protein_estimate: "low" | "on_target" | "high" | null;
  ai_headline: string | null;
  ai_notes: string | null;
  graded_at: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

function rowToLog(row: LogRow): NutritionLog {
  return {
    id: row.id,
    memberId: row.member_id,
    mealId: row.meal_id,
    loggedForDate: row.logged_for_date,
    loggedForSlot: row.logged_for_slot,
    status: row.status ?? "eaten",
    photoPath: row.photo_path,
    matchScore: row.match_score,
    proteinEstimate: row.protein_estimate,
    aiHeadline: row.ai_headline,
    aiNotes: row.ai_notes,
    gradedAt: row.graded_at,
    rating: row.rating,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
