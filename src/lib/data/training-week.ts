/**
 * Training-day awareness for the meal planner.
 *
 * Pulls the member's scheduled sessions for a given ISO week and
 * returns a 7-element boolean array (Mon→Sun) indicating which days
 * are training days. The meal-planner uses this to bias carb
 * allocation: high-volume training days get a `high` carbDensity
 * slot, rest days stay `standard` or trend `low`.
 *
 * This is the lifting-context differentiator — generic meal planners
 * can't do this because they don't have programs + sessions wired to
 * the same member. We do.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns [Mon, Tue, Wed, Thu, Fri, Sat, Sun] flags. True when at
 * least one session is scheduled or completed on that ISO-week day.
 * Status filter intentionally permissive (scheduled OR completed) —
 * a planned-but-skipped day still shaped the macro target before
 * the user decided to skip, and we don't retro-rewrite plans.
 */
export async function getTrainingDaysForWeek(
  memberId: string,
  weekStart: string,
): Promise<boolean[]> {
  const flags = [false, false, false, false, false, false, false];

  const supabase = await createClient();
  if (!supabase) {
    // Demo mode — fall back to a typical 3-day split (Mon, Wed, Fri).
    return [true, false, true, false, true, false, false];
  }

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endIso = end.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("sessions")
    .select("scheduled_for, status")
    .eq("member_id", memberId)
    .gte("scheduled_for", weekStart)
    .lt("scheduled_for", endIso);

  for (const s of (data ?? []) as Array<{ scheduled_for: string; status: string }>) {
    if (!s.scheduled_for) continue;
    // Date parsing in UTC to avoid timezone-induced day shifts.
    const d = new Date(`${s.scheduled_for}T00:00:00Z`);
    // JS getDay() — 0=Sun, 1=Mon… → shift so Monday=0.
    const idx = (d.getUTCDay() + 6) % 7;
    if (idx >= 0 && idx < 7) flags[idx] = true;
  }

  return flags;
}

/** Day labels paired with training-flag, for UI labelling. */
export const DAY_LABELS_FULL = [
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
  "Søndag",
] as const;
