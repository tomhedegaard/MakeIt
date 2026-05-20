"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { validateLifestyleValue } from "@/lib/hrv/lifestyle";

/**
 * HRV lifestyle-log server action.
 *
 * Called by the `/hrv` page so a member can log daily lifestyle context
 * (alcohol, sleep, feeling, late meal, illness, cycle start) into
 * `hrv_lifestyle_logs`. See spec §6.
 *
 * Ownership model: `hrv_lifestyle_logs` has the `members_own_lifestyle_logs`
 * RLS policy (`for all using member_id = auth.uid()`), so a member's writes
 * go through the SSR session client directly — no service client needed.
 *
 * Demo mode (`!SUPABASE_ENABLED`): the action is a no-op success.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Logs a single lifestyle event for the current member, for today.
 *
 * Upserts on the `(member_id, logged_for_date, event_type)` unique tuple
 * (migration 0033), so re-logging the same event on the same day overwrites
 * the previous value rather than erroring.
 *
 * Special case `sick`: also best-effort flags today's `hrv_readings` row on
 * the member's primary connection with `is_sick`, so the baseline engine
 * (which reads only the primary connection) excludes/includes the day.
 *
 * The untrusted `value` is validated via `validateLifestyleValue`, which
 * throws on an unknown `eventType` or a bad shape — the throw is caught and
 * mapped to `{ ok: false, error: "invalid_value" }`, never a 500.
 */
export async function logLifestyleEvent(
  eventType: string,
  value: unknown,
): Promise<ActionResult> {
  // Demo mode — no HRV tables; no-op success.
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_session" };

  const { data: userData } = await supabase.auth.getUser();
  const memberId = userData?.user?.id;
  if (!memberId) return { ok: false, error: "no_session" };

  // Validate + normalize the untrusted value. Throws → invalid_value.
  let normalized;
  try {
    normalized = validateLifestyleValue(eventType, value);
  } catch {
    return { ok: false, error: "invalid_value" };
  }

  // Today's date as a YYYY-MM-DD string, server date in UTC.
  const today = new Date().toISOString().slice(0, 10);

  const { error: logError } = await supabase
    .from("hrv_lifestyle_logs")
    .upsert(
      {
        member_id: memberId,
        logged_for_date: today,
        event_type: eventType,
        value: normalized,
      },
      { onConflict: "member_id,logged_for_date,event_type" },
    );

  if (logError) return { ok: false, error: "log_failed" };

  // Special case: propagate `sick` to today's reading on the primary
  // connection so the baseline engine can exclude/include the day. This is
  // best-effort — a failure here does not fail the action.
  if (eventType === "sick") {
    const sick = (normalized as { sick: boolean }).sick;

    const { data: connection } = await supabase
      .from("hrv_wearable_connections")
      .select("id")
      .eq("member_id", memberId)
      .eq("is_primary", true)
      .maybeSingle();

    if (connection) {
      // UTC day boundaries for `today`.
      const dayStart = `${today}T00:00:00.000Z`;
      const tomorrow = new Date(`${today}T00:00:00.000Z`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const dayEnd = tomorrow.toISOString().slice(0, 10) + "T00:00:00.000Z";

      const { data: reading } = await supabase
        .from("hrv_readings")
        .select("id")
        .eq("connection_id", connection.id as string)
        .gte("measured_at", dayStart)
        .lt("measured_at", dayEnd)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // No reading row yet → skip silently. V2.1 does not retro-flag; a
      // later sync writes the reading (known limitation).
      if (reading) {
        const { error: flagError } = await supabase
          .from("hrv_readings")
          .update({ is_sick: sick })
          .eq("id", reading.id as string);

        if (flagError) {
          // Best-effort: the lifestyle log itself succeeded.
          console.error(
            "logLifestyleEvent: failed to propagate sick flag to reading",
            flagError,
          );
        }
      }
    }
  }

  revalidatePath("/hrv");
  return { ok: true };
}
