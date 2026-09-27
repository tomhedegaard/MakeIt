/**
 * Is the signed-in member a MakeIt Ung account? Read with the member's
 * own session (members is readable to the member). A read error counts
 * as "not youth" so a missing column before migration 0063 never locks
 * adults out; no youth account can exist before 0063 anyway.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function isYouthAccount(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data, error } = await supabase.from("members").select("account_type").eq("id", memberId).maybeSingle();
  if (error || !data) return false;
  return data.account_type === "youth";
}
