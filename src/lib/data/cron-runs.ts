/**
 * Cron run log — data access (B3).
 *
 * Spec: docs/superpowers/specs/2026-09-03-cron-health-alerting.md
 *
 * Writes go through the service-role client from watched cron routes.
 * Reads go through the user-scoped SSR client (coach RLS). Demo mode
 * returns an honest empty snapshot — no fake alerts.
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  evaluateCronHealth,
  extractRunStats,
  WATCHED_CRONS,
  type CronHealthRow,
  type CronRunRecord,
  type CronRunStats,
  type WatchedCronId,
} from "@/lib/cron/health";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const RECENT_LIMIT = 80;

export type CronHealthOverview = {
  mode: "demo" | "connected";
  collectedAt: string;
  anyAlert: boolean;
  crons: CronHealthRow[];
};

export async function recordCronRun(
  supabase: SupabaseClient<Database>,
  stats: CronRunStats,
): Promise<void> {
  try {
    const { error } = await supabase.from("cron_run_log").insert({
      cron: stats.cron,
      ok: stats.ok,
      generated: stats.generated,
      failed: stats.failed,
      candidates: stats.candidates,
    });
    if (error) {
      console.error("[cron-runs] insert failed", error.message);
    }
  } catch (err) {
    console.error("[cron-runs] insert threw", err);
  }
}

/** Map a watched cron's JSON and persist. Never throws. */
export async function recordWatchedCronRun(
  supabase: SupabaseClient<Database>,
  cron: WatchedCronId,
  body: Record<string, unknown>,
): Promise<void> {
  await recordCronRun(supabase, extractRunStats(cron, body));
}

function demoOverview(collectedAt: string): CronHealthOverview {
  return {
    mode: "demo",
    collectedAt,
    anyAlert: false,
    crons: WATCHED_CRONS.map((cron) => ({
      cron,
      status: "none",
      emptyStreak: 0,
      alert: false,
      lastRun: null,
    })),
  };
}

function mapRow(row: {
  cron: string;
  ok: boolean;
  generated: number;
  failed: number;
  candidates: number;
  ran_at: string;
}): CronRunRecord | null {
  if (!WATCHED_CRONS.includes(row.cron as WatchedCronId)) return null;
  return {
    cron: row.cron as WatchedCronId,
    ok: row.ok,
    generated: row.generated,
    failed: row.failed,
    candidates: row.candidates,
    at: row.ran_at,
  };
}

export async function getCronHealth(): Promise<CronHealthOverview> {
  const collectedAt = new Date().toISOString();
  const supabase = await createClient();
  if (!supabase) return demoOverview(collectedAt);

  const { data, error } = await supabase
    .from("cron_run_log")
    .select("cron, ok, generated, failed, candidates, ran_at")
    .in("cron", [...WATCHED_CRONS])
    .order("ran_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error || !data) {
    if (error) {
      console.error("[cron-runs] read failed", error.message);
    }
    return {
      mode: "connected",
      collectedAt,
      anyAlert: false,
      crons: WATCHED_CRONS.map((cron) => ({
        cron,
        status: "none",
        emptyStreak: 0,
        alert: false,
        lastRun: null,
      })),
    };
  }

  const runs = data
    .map(mapRow)
    .filter((r): r is CronRunRecord => r !== null);

  const crons = WATCHED_CRONS.map((cron) => evaluateCronHealth(cron, runs));
  return {
    mode: "connected",
    collectedAt,
    anyAlert: crons.some((c) => c.alert),
    crons,
  };
}
