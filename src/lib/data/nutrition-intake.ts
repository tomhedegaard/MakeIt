import "server-only";
import { createClient } from "@/lib/supabase/server";
import { currentIsoMonday } from "@/lib/data/nutrition";
import { copenhagenIsoDate } from "@/lib/data/nutrition-checkin";

/**
 * Today's calorie + protein intake vs. target.
 *
 * Consumed = sum over today's `eaten` logs:
 *   - off-plan logs contribute their member-entered kcal / protein_g
 *   - planned logs contribute the linked nutrition_meals macros
 *
 * Target comes from this week's active plan; if no plan exists we
 * fall back to the standing nutrition_profiles target so the
 * "Spiste noget andet" flow still has a denominator. Either may be
 * null — the card then shows the consumed number without a goal.
 */
export type DailyIntake = {
  dateIso: string;
  consumedKcal: number;
  consumedProtein: number;
  targetKcal: number | null;
  targetProtein: number | null;
  /** Portion of the consumed totals that came from off-plan logs. */
  offPlanKcal: number;
  offPlanProtein: number;
};

export async function getDailyIntake(memberId: string): Promise<DailyIntake> {
  const dateIso = copenhagenIsoDate();
  const empty: DailyIntake = {
    dateIso,
    consumedKcal: 0,
    consumedProtein: 0,
    targetKcal: null,
    targetProtein: null,
    offPlanKcal: 0,
    offPlanProtein: 0,
  };

  const supabase = await createClient();
  if (!supabase) return empty;

  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("daily_kcal, daily_protein_g")
    .eq("member_id", memberId)
    .eq("week_start", currentIsoMonday())
    .is("archived_at", null)
    .maybeSingle();

  const { data: logs } = await supabase
    .from("nutrition_logs")
    .select("meal_id, off_plan, kcal, protein_g")
    .eq("member_id", memberId)
    .eq("logged_for_date", dateIso)
    .eq("status", "eaten");

  let consumedKcal = 0;
  let consumedProtein = 0;
  let offPlanKcal = 0;
  let offPlanProtein = 0;
  const plannedMealIds: string[] = [];

  for (const log of logs ?? []) {
    if (log.off_plan) {
      consumedKcal += log.kcal ?? 0;
      consumedProtein += log.protein_g ?? 0;
      offPlanKcal += log.kcal ?? 0;
      offPlanProtein += log.protein_g ?? 0;
    } else if (log.meal_id) {
      plannedMealIds.push(log.meal_id);
    }
  }

  if (plannedMealIds.length > 0) {
    const { data: meals } = await supabase
      .from("nutrition_meals")
      .select("id, est_kcal, est_protein_g")
      .in("id", plannedMealIds);
    const macroById = new Map(
      (meals ?? []).map((m) => [m.id, m] as const),
    );
    // Walk the id list (not the meal rows) so a meal logged twice
    // counts twice — eating the same dish again is real intake.
    for (const id of plannedMealIds) {
      const meal = macroById.get(id);
      if (!meal) continue;
      consumedKcal += meal.est_kcal ?? 0;
      consumedProtein += meal.est_protein_g ?? 0;
    }
  }

  let targetKcal = plan?.daily_kcal ?? null;
  let targetProtein = plan?.daily_protein_g ?? null;

  if (targetKcal == null && targetProtein == null) {
    const { data: profile } = await supabase
      .from("nutrition_profiles")
      .select("daily_kcal_target, daily_protein_g_target")
      .eq("member_id", memberId)
      .maybeSingle();
    targetKcal = profile?.daily_kcal_target ?? null;
    targetProtein = profile?.daily_protein_g_target ?? null;
  }

  return {
    dateIso,
    consumedKcal,
    consumedProtein,
    targetKcal,
    targetProtein,
    offPlanKcal,
    offPlanProtein,
  };
}
