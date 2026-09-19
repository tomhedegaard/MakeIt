/**
 * The earlier readings a new HRV reading's baseline is computed from.
 *
 * A baseline only compares like with like. Camera PPG, a Polar H10 strap
 * and a synced WHOOP or Oura do not report the same absolute RMSSD for
 * the same night, so each source keeps its own baseline: a member who
 * measures with the camera while travelling and the strap at home gets
 * two histories, and switching back picks up where that source left
 * off instead of reading the device gap as a change in recovery.
 * Wearable readings are scoped to their connection. Sick days never
 * count (spec §5).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type PriorDb = SupabaseClient<Database>;

type Rows = { data: { ln_rmssd: number }[] | null; error: { message: string } | null };

async function run(query: PromiseLike<Rows>): Promise<number[]> {
  const { data, error } = await query;
  if (error) throw new Error(`prior HRV readings query failed: ${error.message}`);
  return (data ?? []).map((r) => r.ln_rmssd);
}

/** A member's own measurements (camera or strap) from one source, oldest first. */
export function priorLnRmssdForSource(
  db: PriorDb,
  { memberId, source }: { memberId: string; source: string },
): Promise<number[]> {
  return run(
    db
      .from("hrv_readings")
      .select("ln_rmssd")
      .eq("member_id", memberId)
      .eq("source", source)
      .eq("is_sick", false)
      .order("measured_at", { ascending: true }),
  );
}

/** A wearable connection's synced readings, oldest first. */
export function priorLnRmssdForConnection(db: PriorDb, connectionId: string): Promise<number[]> {
  return run(
    db
      .from("hrv_readings")
      .select("ln_rmssd")
      .eq("connection_id", connectionId)
      .eq("is_sick", false)
      .order("measured_at", { ascending: true }),
  );
}

/** The same rule for readings already in memory (demo mode). */
export function sameSourceSeries(
  rows: readonly { lnRmssd: number; source: string; isSick: boolean; measuredAt: string }[],
  source: string,
): number[] {
  return rows
    .filter((r) => r.source === source && !r.isSick)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((r) => r.lnRmssd);
}
