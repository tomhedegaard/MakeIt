/**
 * Mental Health Pillar (Søjle 5) — data layer.
 *
 * Demo-mode safe: every read returns mock data when Supabase isn't
 * configured. Demo writes (e.g. disclaimer ack) go to a cookie.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md
 *
 * NOTE on typing: migration 0046 adds new tables that `database.types.ts`
 * doesn't know about until `npm run db:types` is re-run against the
 * post-0046 live DB. Until then we use the `mindDb()` wrapper below
 * which loosens the `from(table)` signature to accept the new table
 * names. The wrapper still preserves chainable query semantics. Delete
 * once db:types is regenerated.
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  DEFAULT_MENTAL_SETTINGS,
  type MentalSettings,
  type MindCheckLog,
} from "@/lib/mind/types";
import { mockMentalSettings, mockMindCheckLogs } from "@/lib/mind/mock";

export const MIND_DISCLAIMER_COOKIE = "mi_mind_disclaimer_ack";

type MaybeClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

interface UntypedTable {
  select: (columns?: string) => UntypedTable;
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => UntypedTable;
  upsert: (
    row: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string },
  ) => UntypedTable;
  update: (row: Record<string, unknown>) => UntypedTable;
  delete: () => UntypedTable;
  eq: (col: string, value: unknown) => UntypedTable;
  in: (col: string, value: unknown[]) => UntypedTable;
  gte: (col: string, value: unknown) => UntypedTable;
  is: (col: string, value: unknown) => UntypedTable;
  order: (col: string, options?: { ascending?: boolean }) => UntypedTable;
  limit: (n: number) => UntypedTable;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  then: <T>(
    onfulfilled?: (value: { data: Record<string, unknown>[] | null; error: { message: string } | null }) => T,
  ) => Promise<T>;
}

interface UntypedClient {
  from: (table: string) => UntypedTable;
}

/**
 * Cast the typed Supabase client to an untyped accessor for tables
 * the generated types don't know about yet (migration 0046).
 */
export function mindDb(supabase: MaybeClient | ReturnType<typeof createServiceClient>): UntypedClient {
  return supabase as unknown as UntypedClient;
}

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
  const row = data as { acknowledged_mental_disclaimer_at?: string | null } | null;
  return !!row?.acknowledged_mental_disclaimer_at;
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

  const { error } = await mindDb(supabase)
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

  const db = mindDb(supabase);

  const { data: existing } = await db
    .from("mental_settings")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (existing) return existing as unknown as MentalSettings;

  const { data: inserted, error } = await db
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
  return inserted as unknown as MentalSettings;
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

  const { data, error } = await mindDb(supabase)
    .from("mind_check_logs")
    .select("*")
    .eq("member_id", memberId)
    .gte("logged_date", since.toISOString().slice(0, 10))
    .order("logged_date", { ascending: false });

  if (error) {
    console.warn("[mind] recent logs read failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as MindCheckLog[];
}

/**
 * Has the member logged a mind-check today (UTC)?
 */
export async function hasMindCheckToday(memberId: string): Promise<boolean> {
  const logs = await getRecentMindCheckLogs(memberId, 1);
  const today = new Date().toISOString().slice(0, 10);
  return logs.some((l) => l.logged_date === today);
}

/**
 * Today's mind-check, if any. For pre-filling the form on resubmit.
 */
export async function getTodayMindCheck(memberId: string): Promise<MindCheckLog | null> {
  const today = new Date().toISOString().slice(0, 10);
  const logs = await getRecentMindCheckLogs(memberId, 1);
  return logs.find((l) => l.logged_date === today) ?? null;
}

/**
 * Upsert a mind-check for today. Idempotent on (member_id, logged_date)
 * unique index — same-day resubmit replaces the existing row's values.
 *
 * Demo mode is a soft no-op: we don't persist, but we don't error.
 * The UI reflects the value via the form's local state until refresh.
 */
export async function submitMindCheck(
  memberId: string,
  input: {
    energy: number;
    stress: number;
    focus: number;
    note: string | null;
    source: "manual" | "morning_nudge" | "evening_nudge" | "post_session";
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SUPABASE_ENABLED) {
    console.info("[mind] demo-mode submitMindCheck (no persist)", { memberId, input });
    return { ok: true };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };

  const db = mindDb(supabase);
  const todayDate = new Date().toISOString().slice(0, 10);

  const { error } = await db.from("mind_check_logs").upsert(
    {
      member_id: memberId,
      logged_date: todayDate,
      energy: input.energy,
      stress: input.stress,
      focus: input.focus,
      note: input.note,
      source: input.source,
    },
    { onConflict: "member_id,logged_date" },
  );

  if (error) {
    console.warn("[mind] submitMindCheck failed", error.message);
    return { ok: false, error: error.message };
  }

  // Recompute streak from the source of truth (logs) and cache on
  // mental_settings for cheap display reads.
  const { data: logs } = await db
    .from("mind_check_logs")
    .select("logged_date")
    .eq("member_id", memberId)
    .gte("logged_date", isoDateNDaysAgo(200))
    .order("logged_date", { ascending: false });

  const { currentStreak, longestStreak } = await import("@/lib/mind/streak");
  const cur = currentStreak((logs ?? []) as unknown as { logged_date: string }[]);
  const lon = longestStreak((logs ?? []) as unknown as { logged_date: string }[]);

  await db.from("mental_settings").upsert(
    {
      member_id: memberId,
      last_mind_check_at: new Date().toISOString(),
      current_streak_days: cur,
      longest_streak_days: Math.max(lon, cur),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );

  return { ok: true };
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
