/**
 * Nutrition skip-days — days the member pre-declares as off-plan
 * (eating out, travelling, fasting). The planner omits meals for
 * these day indices, the day-strip on /nutrition labels them as
 * skipped, and adherence math excludes them from the denominator.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SkipDay = {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string | null;
};

/**
 * Returns the [0..6] day indices (Mon=0) inside the given ISO week
 * that have a skip record for this member. Used by the planner +
 * the day-strip UI.
 */
export async function getSkipDayIndices(
  memberId: string,
  weekStart: string,
): Promise<number[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const { data } = await supabase
    .from("nutrition_skip_days")
    .select("skip_date")
    .eq("member_id", memberId)
    .gte("skip_date", weekStart)
    .lt("skip_date", end.toISOString().slice(0, 10));

  const indices: number[] = [];
  for (const r of (data ?? []) as Array<{ skip_date: string }>) {
    const d = new Date(`${r.skip_date}T00:00:00Z`);
    const idx = (d.getUTCDay() + 6) % 7;
    if (idx >= 0 && idx < 7) indices.push(idx);
  }
  return indices;
}

/** Full list with reasons for the current week — used by UI. */
export async function listSkipDaysForWeek(
  memberId: string,
  weekStart: string,
): Promise<SkipDay[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const { data } = await supabase
    .from("nutrition_skip_days")
    .select("id, skip_date, reason")
    .eq("member_id", memberId)
    .gte("skip_date", weekStart)
    .lt("skip_date", end.toISOString().slice(0, 10))
    .order("skip_date");

  return ((data ?? []) as Array<{ id: string; skip_date: string; reason: string | null }>).map((r) => ({
    id: r.id,
    date: r.skip_date,
    reason: r.reason,
  }));
}

export async function addSkipDay(
  memberId: string,
  date: string,
  reason: string | null,
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("nutrition_skip_days")
    .upsert(
      { member_id: memberId, skip_date: date, reason },
      { onConflict: "member_id,skip_date" },
    );
}

export async function removeSkipDay(memberId: string, date: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("nutrition_skip_days")
    .delete()
    .eq("member_id", memberId)
    .eq("skip_date", date);
}
