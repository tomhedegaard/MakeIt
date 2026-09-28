/**
 * Is the signed-in member a MakeIt Ung account? Read with the member's
 * own session (members is readable to the member). A read error counts
 * as "not youth" so a missing column before migration 0063 never locks
 * adults out; no youth account can exist before 0063 anyway.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { youthClaims, type YouthClaims } from "./routes";

export type Audience = "adult" | "youth";

/** Which programme catalogue a member may see and start (0064 programs.audience). */
export async function memberAudience(memberId: string): Promise<Audience> {
  return (await isYouthAccount(memberId)) ? "youth" : "adult";
}

export async function isYouthAccount(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data, error } = await supabase.from("members").select("account_type").eq("id", memberId).maybeSingle();
  if (error || !data) return false;
  return data.account_type === "youth";
}

/**
 * The young account's claims for the navigation, or null for adults.
 * Account type from the database (defence in depth next to middleware),
 * consent from the server-written app_metadata the middleware also uses.
 */
export async function youthClaimsFor(memberId: string): Promise<YouthClaims | null> {
  if (!(await isYouthAccount(memberId))) return null;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const claims = youthClaims(data.user?.app_metadata);
  return { youth: true, mind: claims.mind };
}
