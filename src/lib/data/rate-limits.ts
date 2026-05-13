/**
 * Rate-limit helpers for member actions on the meal planner.
 *
 * Two-window enforcement (daily + weekly rolling). The 24h window
 * prevents same-day spam ("I'll just keep hitting regen until I
 * like the plan"); the 7-day window enforces commitment over the
 * week. Both must pass for the action to be allowed.
 *
 * Limits live here in code rather than in DB config because they're
 * a product decision (KISS — change a number, redeploy). When we
 * add tier differentiation (Crew vs 1:1 Coaching) the look-up will
 * key off member.tier or active subscription, still here in code.
 *
 * Counting strategy: query member_action_logs over the past 7d in
 * one round-trip, partition into daily + weekly counts in JS. Single
 * Supabase call per check, indexes (member_id, action, created_at)
 * make it cheap.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RateLimitedAction =
  | "plan_regen"
  | "meal_swap"
  | "weight_log"
  | "pref_update"
  | "kcal_adjustment";

type Limit = { daily: number; weekly: number };

/**
 * Hard limits — closed beta single tier. Tweak before stripe-tier
 * differentiation ships.
 */
export const LIMITS: Record<RateLimitedAction, Limit> = {
  plan_regen: { daily: 1, weekly: 3 },
  meal_swap: { daily: 5, weekly: 15 },
  weight_log: { daily: 1, weekly: 7 },
  pref_update: { daily: 20, weekly: 100 },
  // kcal_adjustment is an internal audit type — system-driven, not
  // user-driven. Limit prevents accidental double-fire within one
  // week but isn't surfaced in UI rate counters.
  kcal_adjustment: { daily: 2, weekly: 2 },
};

export type RateLimitStatus = {
  allowed: boolean;
  daily: { used: number; max: number };
  weekly: { used: number; max: number };
  /** ISO timestamp when the most-constraining window first frees up. */
  nextAvailableAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Check current usage for an action. Does NOT log — call
 * recordAction() AFTER the action successfully completes so failed
 * attempts don't burn quota.
 */
export async function checkLimit(
  memberId: string,
  action: RateLimitedAction,
): Promise<RateLimitStatus> {
  const limit = LIMITS[action];
  const supabase = await createClient();
  if (!supabase) {
    // Demo mode — no enforcement.
    return {
      allowed: true,
      daily: { used: 0, max: limit.daily },
      weekly: { used: 0, max: limit.weekly },
      nextAvailableAt: null,
    };
  }

  const now = Date.now();
  const weekAgoIso = new Date(now - WEEK_MS).toISOString();

  const { data } = await supabase
    .from("member_action_logs")
    .select("created_at")
    .eq("member_id", memberId)
    .eq("action", action)
    .gte("created_at", weekAgoIso)
    .order("created_at", { ascending: true });

  const entries = (data ?? []) as Array<{ created_at: string }>;
  const dayAgoMs = now - DAY_MS;

  const daily = entries.filter((r) => Date.parse(r.created_at) >= dayAgoMs).length;
  const weekly = entries.length;

  const dailyExceeded = daily >= limit.daily;
  const weeklyExceeded = weekly >= limit.weekly;
  const allowed = !dailyExceeded && !weeklyExceeded;

  // When does the user regain capacity? It's the earliest entry that
  // would have to age out to drop a counter below the threshold.
  // - If daily-exceeded: 24h after the oldest entry within last 24h
  // - If weekly-exceeded: 7d after the oldest entry within 7d
  // - If both: whichever is later
  let nextAvailableAt: string | null = null;
  if (dailyExceeded || weeklyExceeded) {
    const candidates: number[] = [];
    if (dailyExceeded) {
      const dailyEntries = entries.filter(
        (r) => Date.parse(r.created_at) >= dayAgoMs,
      );
      const oldest = dailyEntries[0];
      if (oldest) candidates.push(Date.parse(oldest.created_at) + DAY_MS);
    }
    if (weeklyExceeded) {
      const oldest = entries[0];
      if (oldest) candidates.push(Date.parse(oldest.created_at) + WEEK_MS);
    }
    if (candidates.length > 0) {
      nextAvailableAt = new Date(Math.max(...candidates)).toISOString();
    }
  }

  return {
    allowed,
    daily: { used: daily, max: limit.daily },
    weekly: { used: weekly, max: limit.weekly },
    nextAvailableAt,
  };
}

/**
 * Record a completed action. Call AFTER the underlying mutation
 * has succeeded so failures don't consume quota.
 */
export async function recordAction(
  memberId: string,
  action: RateLimitedAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("member_action_logs").insert({
    member_id: memberId,
    action,
    metadata: metadata ?? null,
  });
}

/**
 * Human-friendly relative time string for "next available at" UI.
 * Returns null when there's no constraint to display.
 */
export function describeNextAvailable(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "nu";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return days === 1 ? "i morgen" : `om ${days} dage`;
  }
  if (hours >= 1) return `om ${hours}t ${minutes}m`;
  return `om ${minutes}m`;
}
