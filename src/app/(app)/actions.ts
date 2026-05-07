"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { revalidatePath } from "next/cache";

export async function logoutAction() {
  if (SUPABASE_ENABLED) {
    const supabase = await createClient();
    if (supabase) await supabase.auth.signOut();
  } else {
    const c = await cookies();
    c.delete(SESSION_COOKIE);
  }
  redirect("/");
}

/**
 * Marks a tier_events row as seen so the dashboard banner clears.
 * Members can only mark their own.
 */
export async function dismissTierEventAction(eventId: string): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("tier_events")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return { ok: false };

  revalidatePath("/dashboard");
  return { ok: true };
}
