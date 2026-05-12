/**
 * Bodyweight log — append-only entries used by:
 *   1. The meal-planner kcal estimator (latest entry → Mifflin-St Jeor)
 *   2. The ugentlige adjust-engine (delta week-over-week → cut/bulk
 *      direction signal, runs in the Sunday cron / coach-summary)
 *
 * Reads are scoped to the authenticated member by RLS; coaches see
 * across via the additive coach-read policy. Writes are member-only.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type WeightLog = {
  id: string;
  memberId: string;
  kg: number;
  notes: string | null;
  loggedAt: string;
};

type Row = {
  id: string;
  member_id: string;
  kg: string | number;
  notes: string | null;
  logged_at: string;
};

function mapRow(r: Row): WeightLog {
  return {
    id: r.id,
    memberId: r.member_id,
    kg: typeof r.kg === "string" ? parseFloat(r.kg) : r.kg,
    notes: r.notes,
    loggedAt: r.logged_at,
  };
}

/** Insert a weigh-in. notes optional, default to null. */
export async function logWeight(input: {
  memberId: string;
  kg: number;
  notes?: string | null;
}): Promise<WeightLog | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("weight_logs")
    .insert({
      member_id: input.memberId,
      kg: input.kg,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapRow(data as Row);
}

/** Latest entry — the meal-planner reads this for kcal estimation. */
export async function getLatestWeight(memberId: string): Promise<WeightLog | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapRow(data as Row) : null;
}

/** Recent history — capped at 90 days for trend display. */
export async function getRecentWeights(
  memberId: string,
  days = 90,
): Promise<WeightLog[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("member_id", memberId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: false });

  if (!data) return [];
  return (data as Row[]).map(mapRow);
}

/**
 * Week-over-week delta — average of the most recent ≤7 days
 * minus average of the 7 days before that. Returns null when
 * either window is empty so the caller can show "—" rather than
 * a misleading zero.
 *
 * Two-window averaging beats latest-vs-latest because daily
 * weight noise (hydration, glycogen, stool, sodium) is ~1.5kg
 * day-to-day — a single-point delta produces false positives
 * the adjust-engine would over-react to.
 */
export async function getWeightTrend(memberId: string): Promise<{
  recent: number | null;
  previous: number | null;
  deltaKg: number | null;
}> {
  const logs = await getRecentWeights(memberId, 14);
  if (logs.length === 0) {
    return { recent: null, previous: null, deltaKg: null };
  }

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  const recentWindow: number[] = [];
  const previousWindow: number[] = [];

  for (const l of logs) {
    const t = Date.parse(l.loggedAt);
    const age = now - t;
    if (age <= sevenDaysMs) recentWindow.push(l.kg);
    else if (age <= fourteenDaysMs) previousWindow.push(l.kg);
  }

  const avg = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

  const recent = avg(recentWindow);
  const previous = avg(previousWindow);
  const deltaKg =
    recent !== null && previous !== null
      ? Number((recent - previous).toFixed(2))
      : null;

  return { recent, previous, deltaKg };
}
