/**
 * Mental Health Pillar (Søjle 5) — data layer.
 *
 * Demo-mode safe: every read returns mock data when Supabase isn't
 * configured. Demo writes (e.g. disclaimer ack) go to a cookie.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  DEFAULT_MENTAL_SETTINGS,
  type MentalSettings,
  type MindCheckLog,
} from "@/lib/mind/types";
import { mockMentalSettings, mockMindCheckLogs } from "@/lib/mind/mock";

export const MIND_DISCLAIMER_COOKIE = "mi_mind_disclaimer_ack";

/**
 * Has the current member acknowledged the mental disclaimer?
 * Demo mode: stored in cookie. Connected mode: stored on members row.
 */
export async function hasAcknowledgedMentalDisclaimer(
  memberId: string,
): Promise<boolean> {
  if (!SUPABASE_ENABLED) {
    const c = await cookies();
    return c.get(MIND_DISCLAIMER_COOKIE)?.value === "1";
  }

  const supabase = await createClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("members")
    .select("acknowledged_mental_disclaimer_at")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    console.warn("[mind] disclaimer read failed", error.message);
    return false;
  }
  return !!data?.acknowledged_mental_disclaimer_at;
}

/**
 * Mark the disclaimer as acknowledged.
 * Idempotent — re-acknowledging is a no-op.
 */
export async function acknowledgeMentalDisclaimer(memberId: string): Promise<void> {
  if (!SUPABASE_ENABLED) {
    const c = await cookies();
    c.set(MIND_DISCLAIMER_COOKIE, "1", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return;
  }

  const supabase = await createClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("members")
    .update({ acknowledged_mental_disclaimer_at: new Date().toISOString() })
    .eq("id", memberId)
    .is("acknowledged_mental_disclaimer_at", null);

  if (error) {
    console.warn("[mind] disclaimer ack failed", error.message);
  }
}

/**
 * Ensure a mental_settings row exists for this member, returning the
 * current state. Demo mode returns a stable mock row.
 */
export async function getOrCreateMentalSettings(memberId: string): Promise<MentalSettings> {
  if (!SUPABASE_ENABLED) {
    return mockMentalSettings();
  }

  const supabase = await createClient();
  if (!supabase) return mockMentalSettings();

  const { data: existing } = await supabase
    .from("mental_settings")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (existing) return existing as MentalSettings;

  const { data: inserted, error } = await supabase
    .from("mental_settings")
    .insert({ member_id: memberId, ...DEFAULT_MENTAL_SETTINGS })
    .select("*")
    .single();

  if (error) {
    console.warn("[mind] settings insert failed", error.message);
    return {
      member_id: memberId,
      ...DEFAULT_MENTAL_SETTINGS,
      last_mind_check_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return inserted as MentalSettings;
}

/**
 * Last N days of mind-check logs for a member, newest first.
 * Returns mock data in demo mode.
 */
export async function getRecentMindCheckLogs(
  memberId: string,
  days = 30,
): Promise<MindCheckLog[]> {
  if (!SUPABASE_ENABLED) {
    return mockMindCheckLogs(days).reverse();
  }

  const supabase = await createClient();
  if (!supabase) return mockMindCheckLogs(days).reverse();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const { data, error } = await supabase
    .from("mind_check_logs")
    .select("*")
    .eq("member_id", memberId)
    .gte("logged_date", since.toISOString().slice(0, 10))
    .order("logged_date", { ascending: false });

  if (error) {
    console.warn("[mind] recent logs read failed", error.message);
    return [];
  }
  return (data ?? []) as MindCheckLog[];
}

/**
 * Has the member logged a mind-check today (UTC)?
 */
export async function hasMindCheckToday(memberId: string): Promise<boolean> {
  const logs = await getRecentMindCheckLogs(memberId, 1);
  const today = new Date().toISOString().slice(0, 10);
  return logs.some((l) => l.logged_date === today);
}
