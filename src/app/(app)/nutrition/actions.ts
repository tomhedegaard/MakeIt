"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  attachLogGrade,
  createLog,
  currentIsoMonday,
  generatePlan,
  getOrCreateNutritionProfile,
  saveNutritionProfile,
  swapMeal,
  type CookingLevel,
  type Diet,
  type BudgetLevel,
  type MealSlot,
  type NutritionGoal,
} from "@/lib/data/nutrition";
import { gradeMealPhoto } from "@/lib/data/nutrition-photo-claude";
import { generatePlanWithClaude } from "@/lib/data/nutrition-planner-claude";
import { logWeight } from "@/lib/data/weight";
import { getMealImagesBatch } from "@/lib/nutrition/unsplash";
import { checkLimit, recordAction } from "@/lib/data/rate-limits";
import { getTrainingDaysForWeek } from "@/lib/data/training-week";
import { randomUUID } from "crypto";

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

async function requireMember() {
  const member = await getSession();
  if (!member) redirect("/login");
  return member;
}

function parseStringList(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function parseEnum<T extends string>(
  raw: FormDataEntryValue | null,
  allowed: readonly T[],
  fallback: T
): T {
  const v = String(raw ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function parseInt0(raw: FormDataEntryValue | null, fallback: number): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/* ---------------------------------------------------------------- *
 * Save preferences
 * ---------------------------------------------------------------- */

export async function savePreferencesAction(formData: FormData): Promise<void> {
  const member = await requireMember();

  const goal = parseEnum<NutritionGoal>(
    formData.get("goal"),
    ["cut", "recomp", "mass", "maintain"],
    "maintain"
  );
  const diet = parseEnum<Diet>(
    formData.get("diet"),
    ["omnivore", "pescatarian", "vegetarian", "vegan"],
    "omnivore"
  );
  const cookingLevel = parseEnum<CookingLevel>(
    formData.get("cookingLevel"),
    ["basic", "intermediate", "advanced"],
    "intermediate"
  );
  const budgetLevel = parseEnum<BudgetLevel>(
    formData.get("budgetLevel"),
    ["lean", "standard", "premium"],
    "standard"
  );

  await saveNutritionProfile(member.id, {
    goal,
    diet,
    cookingLevel,
    budgetLevel,
    mealsPerDay: Math.max(2, Math.min(6, parseInt0(formData.get("mealsPerDay"), 3))),
    householdSize: Math.max(1, Math.min(8, parseInt0(formData.get("householdSize"), 1))),
    fishPerWeek: Math.max(0, Math.min(7, parseInt0(formData.get("fishPerWeek"), 2))),
    allergies: parseStringList(formData.get("allergies")),
    dislikes: parseStringList(formData.get("dislikes")),
    preferences: parseStringList(formData.get("preferences")),
  });

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/preferences");
}

/* ---------------------------------------------------------------- *
 * Generate or regenerate plan for the current week
 * ---------------------------------------------------------------- */

export async function generatePlanAction(): Promise<void> {
  const member = await requireMember();

  // Rate-limit check BEFORE doing any expensive work. Limit is
  // 1/day, 3/week — enforced so users commit to a plan instead
  // of regenerate-spamming until they hit a "perfect" plan and
  // never follow it (the real cost the limit protects against).
  const limit = await checkLimit(member.id, "plan_regen");
  if (!limit.allowed) {
    redirect("/nutrition?err=quota_plan");
  }

  const profile = await getOrCreateNutritionProfile(member.id);
  const weekStart = currentIsoMonday();

  // Pull training-day flags so the planner can bias carbs toward
  // workout days. Skip-day + meal-prep arrive in subsequent commits.
  const trainingDays = await getTrainingDaysForWeek(member.id, weekStart);

  // Try Claude first; fall back to mock generator inside generatePlan
  // when the AI hook returns null (no key, error, or invalid output).
  const aiShape = await generatePlanWithClaude({
    profile,
    weekStart,
    trainingDays,
  });

  // Persist with containment — if BOTH Claude rejection + mock fallback
  // throw (rare, usually DB-level: archive succeeded but insert hit a
  // constraint, RLS edge case, etc.), we still revalidate so the user
  // gets back to /nutrition. The empty state there has a retry CTA.
  // 500-ing the whole server action leaves the user stuck on a Next
  // error page instead.
  let succeeded = false;
  try {
    if (aiShape) {
      await persistAiPlan(member.id, weekStart, aiShape);
    } else {
      await generatePlan(member.id, weekStart, profile);
    }
    succeeded = true;
  } catch (err) {
    console.warn("[nutrition] plan persist failed:", err);
  }

  // Only burn quota when generation actually persisted a plan —
  // failed attempts shouldn't count against the user's budget.
  if (succeeded) {
    await recordAction(member.id, "plan_regen", {
      generator: aiShape ? "claude" : "mock",
      week_start: weekStart,
    });
  }

  revalidatePath("/nutrition");
}

/* Persist a Claude-generated plan shape. Mirrors the body of
 * generatePlan() but tags the generator as "claude" so the UI can
 * surface it. */
async function persistAiPlan(
  memberId: string,
  weekStart: string,
  shape: import("@/lib/nutrition/mock-plan").GeneratedPlanShape
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  await supabase
    .from("nutrition_plans")
    .update({ archived_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .eq("week_start", weekStart)
    .is("archived_at", null);

  const { data: planRow } = await supabase
    .from("nutrition_plans")
    .insert({
      member_id: memberId,
      week_start: weekStart,
      daily_kcal: shape.targets.kcal,
      daily_protein_g: shape.targets.proteinG,
      daily_carbs_g: shape.targets.carbsG,
      daily_fat_g: shape.targets.fatG,
      generator: "claude",
      generator_model: "claude-sonnet-4-6",
      notes: shape.notes,
    })
    .select("*")
    .single();

  if (!planRow) return;

  // Fetch meal images in parallel — Unsplash queries run with a
  // 2s timeout each, cache hits return instantly. Worst case +2s
  // added latency on the first plan; ~0ms thereafter as the cache
  // dominates. Failures fall through to null image_url and the
  // meal card renders its typography-only fallback.
  const images = await getMealImagesBatch(shape.meals.map((m) => m.title));

  const mealRows = shape.meals.map((m) => {
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
  await supabase.from("nutrition_meals").insert(mealRows);
}

/* ---------------------------------------------------------------- *
 * Swap a single meal
 * ---------------------------------------------------------------- */

export async function swapMealAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const mealId = String(formData.get("mealId") ?? "");
  if (!mealId) return;

  const limit = await checkLimit(member.id, "meal_swap");
  if (!limit.allowed) {
    redirect("/nutrition?err=quota_swap");
  }

  const profile = await getOrCreateNutritionProfile(member.id);
  const result = await swapMeal(member.id, mealId, profile);

  // Quota only burns on successful swap. swapMeal returns null
  // when the meal can't be replaced (RLS / not found) — those
  // don't count against the user.
  if (result) {
    await recordAction(member.id, "meal_swap", { meal_id: mealId });
  }

  revalidatePath("/nutrition");
}

/* ---------------------------------------------------------------- *
 * Photo-log a meal
 * ---------------------------------------------------------------- */

export async function logMealAction(formData: FormData): Promise<void> {
  const member = await requireMember();

  const mealId = String(formData.get("mealId") ?? "") || null;
  const loggedForDate = String(formData.get("loggedForDate") ?? "");
  const slot = String(formData.get("loggedForSlot") ?? "") as MealSlot | "";
  const rating = formData.get("rating") ? parseInt0(formData.get("rating"), 0) : null;
  const notes = String(formData.get("notes") ?? "") || null;
  const photo = formData.get("photo");

  if (!loggedForDate) return;

  // Upload photo if present
  let photoPath: string | null = null;
  let photoBytes: Buffer | null = null;
  let photoMime: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const supabase = await createClient();
    if (supabase) {
      const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${member.id}/${randomUUID()}.${ext}`;
      const buf = Buffer.from(await photo.arrayBuffer());
      const { error } = await supabase.storage
        .from("meal-photos")
        .upload(path, buf, {
          contentType: photo.type || "image/jpeg",
          upsert: false,
        });
      if (!error) {
        photoPath = path;
        photoBytes = buf;
        photoMime = photo.type || "image/jpeg";
      }
    }
  }

  const log = await createLog({
    memberId: member.id,
    mealId,
    loggedForDate,
    loggedForSlot: slot ? (slot as MealSlot) : null,
    photoPath,
    rating,
    notes,
  });

  // Background-grade the photo if we have one and a planned meal to compare to.
  if (log && photoBytes && photoMime && mealId) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { data: meal } = await supabase
          .from("nutrition_meals")
          .select("title, description, ingredients")
          .eq("id", mealId)
          .single();
        if (meal) {
          const grade = await gradeMealPhoto({
            photoBase64: photoBytes.toString("base64"),
            mimeType: photoMime,
            plannedTitle: meal.title,
            plannedIngredients: (meal.ingredients ?? []) as Array<{ name: string }>,
          });
          if (grade) await attachLogGrade(log.id, grade);
        }
      }
    } catch (err) {
      console.warn("[logMealAction] grading failed:", err);
    }
  }

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
}

/* ---------------------------------------------------------------- *
 * Quick-log — daily check-in actions (no photo, no modal)
 *
 * Used by DailyCheckInCard for the "Som planlagt" / "Skippet"
 * buttons. Records a single nutrition_logs row with status=eaten
 * (default) or status=skipped. Idempotent on the (member, date,
 * slot) tuple isn't enforced at the DB level, so the action
 * short-circuits if a log already exists for the slot.
 * ---------------------------------------------------------------- */

export async function quickLogAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const mealId = String(formData.get("mealId") ?? "") || null;
  const loggedForDate = String(formData.get("loggedForDate") ?? "");
  const slot = String(formData.get("loggedForSlot") ?? "") as MealSlot | "";
  const status = String(formData.get("status") ?? "eaten") as "eaten" | "skipped";

  if (!loggedForDate || !slot) return;

  const supabase = await createClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from("nutrition_logs")
      .select("id")
      .eq("member_id", member.id)
      .eq("logged_for_date", loggedForDate)
      .eq("logged_for_slot", slot)
      .limit(1);
    if (existing && existing.length > 0) {
      // Already logged this slot — do nothing rather than duplicate.
      return;
    }
  }

  await createLog({
    memberId: member.id,
    mealId,
    loggedForDate,
    loggedForSlot: slot as MealSlot,
    status,
    photoPath: null,
    rating: status === "eaten" ? 4 : null,
    notes: null,
  });

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
}

/* ---------------------------------------------------------------- *
 * Weigh-in log — idempotent per UTC day. The trend-engine reads
 * getLatestWeight() at plan-generation time + getWeightTrend() in
 * the Sunday adjust-engine, both of which only need one value per
 * day. Letting the user log twice in one day overwrites the older
 * entry rather than rejecting — common case is "oops I typed it
 * wrong" or "I weighed myself again post-bathroom."
 * ---------------------------------------------------------------- */
export async function logWeightAction(formData: FormData): Promise<void> {
  const member = await getSession();
  if (!member) redirect("/login");

  // Accept either decimal-point or comma (Danish locale habit).
  const raw = String(formData.get("kg") ?? "").replace(",", ".").trim();
  const kg = parseFloat(raw);
  const notes = String(formData.get("notes") ?? "").slice(0, 200) || null;

  // Hard-rejects: empty, NaN, out of realistic range. Silent no-op
  // — the form validates client-side; this is a server backstop.
  if (!isFinite(kg) || kg <= 30 || kg >= 300) {
    revalidatePath("/nutrition");
    return;
  }

  // Idempotent same-day overwrite. If a log exists for today
  // (UTC), update it in place. Otherwise insert a fresh row.
  // Day boundary in UTC is "good enough" for this — trend math
  // doesn't care about timezone slack of ±2h.
  const supabase = await createClient();
  if (supabase) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from("weight_logs")
      .select("id")
      .eq("member_id", member.id)
      .gte("logged_at", todayStart.toISOString())
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("weight_logs")
        .update({ kg, notes, logged_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await logWeight({ memberId: member.id, kg, notes });
    }
  } else {
    await logWeight({ memberId: member.id, kg, notes });
  }

  await recordAction(member.id, "weight_log", { kg });
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/setup");
  revalidatePath("/coach/members");
}

/* ---------------------------------------------------------------- *
 * Setup-wizard completion — wraps savePreferences + logWeight +
 * initial plan generation in one atomic submit so the wizard can
 * stay a single POST. Returns the user to /nutrition where the
 * fresh plan renders.
 *
 * Validation mirrors savePreferencesAction; the only addition is
 * the bodyweight field. We deliberately don't expose every
 * preference here (allergies, dislikes, household_size, etc.) —
 * the wizard is the KISS 4-question intro, power-user edits go
 * via /nutrition/preferences afterwards.
 * ---------------------------------------------------------------- */
export async function completeSetupAction(formData: FormData): Promise<void> {
  const member = await getSession();
  if (!member) redirect("/login");

  const goal = String(formData.get("goal") ?? "maintain") as NutritionGoal;
  const diet = String(formData.get("diet") ?? "omnivore") as Diet;
  const cooking_level = String(
    formData.get("cooking_level") ?? "basic",
  ) as CookingLevel;
  const kgRaw = String(formData.get("kg") ?? "").replace(",", ".").trim();
  const kg = parseFloat(kgRaw);

  // Strict-enum guard. Anything that didn't match a known value
  // gets coerced to a safe default rather than rejected — the
  // wizard is the user's first taste, we don't want a blank
  // failure page on edge inputs.
  const safeGoal: NutritionGoal = (
    ["cut", "recomp", "maintain", "mass"] satisfies NutritionGoal[]
  ).includes(goal)
    ? goal
    : "maintain";
  const safeDiet: Diet = (
    ["omnivore", "pescatarian", "vegetarian", "vegan"] satisfies Diet[]
  ).includes(diet)
    ? diet
    : "omnivore";
  const safeCooking: CookingLevel = (
    ["basic", "intermediate", "advanced"] satisfies CookingLevel[]
  ).includes(cooking_level)
    ? cooking_level
    : "basic";

  await saveNutritionProfile(member.id, {
    goal: safeGoal,
    diet: safeDiet,
    cookingLevel: safeCooking,
  });

  if (isFinite(kg) && kg > 30 && kg < 300) {
    await logWeight({ memberId: member.id, kg, notes: "setup wizard" });
  }

  // Kick off an initial plan with the just-saved preferences.
  // Mirrors generatePlanAction: Claude first, mock fallback. If
  // either path throws we DON'T want to lose the redirect — the
  // user still hits /nutrition where the empty state offers a
  // "Generér ugeplan" retry button. Logging the underlying error
  // server-side preserves diagnostic signal.
  try {
    await generatePlanAction();
  } catch (err) {
    // NEXT_REDIRECT is how Next.js implements redirect() — it
    // throws a sentinel error that the framework catches outside
    // the action. We must rethrow it; swallowing it would turn
    // generatePlanAction's internal redirect (if any) into a
    // silent no-op. Other errors (DB write, Claude validation
    // edge cases) get logged and we proceed to /nutrition.
    const e = err as { digest?: string; message?: string };
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.warn("[setup] generatePlanAction failed:", e?.message ?? err);
  }

  revalidatePath("/nutrition");
  redirect("/nutrition");
}
