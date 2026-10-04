/**
 * HRV-deling med coach er udtrykkeligt samtykke (0068, default fra).
 *
 * RLS håndhæver det for session-klienten. Kode der læser medlemmers
 * HRV-data med service-rollen (createServiceClient) går uden om RLS og
 * skal selv filtrere med disse helpers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Medlemmer der lige nu deler HRV med coachen. */
export async function sharingMemberIds(
  svc: SupabaseClient<Database>,
): Promise<Set<string>> {
  const { data, error } = await svc
    .from("hrv_settings")
    .select("member_id")
    .eq("share_to_coach", true);
  if (error) throw new Error(`hrv_settings: ${error.message}`);
  return new Set((data ?? []).map((r) => r.member_id));
}

/** Behold kun rækker for medlemmer der deler. */
export function onlySharing<T extends { memberId: string }>(
  rows: T[],
  sharing: Set<string>,
): T[] {
  return rows.filter((r) => sharing.has(r.memberId));
}
