import { NextResponse, type NextRequest } from "next/server";
import { assertCronAuth } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  evaluateAlertConditions,
  type AlertReading,
  type AlertLog,
} from "@/lib/hrv/alert";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Trailing window of HRV history fed to the alert engine (spec §7). */
const WINDOW_DAYS = 60;

/** Lifestyle-log window passed to the engine (spec §7). */
const LIFESTYLE_WINDOW_DAYS = 7;

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/**
 * HRV alert-detect cron.
 *
 * Triggered by Vercel Cron. For every coach-shared member (those with
 * `hrv_settings.share_to_coach = true`) it loads the primary
 * `hrv_wearable_connections` row, pulls the trailing 60 days of readings
 * (scoped to the connection) plus the member's last 7 days of lifestyle
 * logs, runs the pure alert engine, and — if `triggered` — inserts a new
 * `hrv_alerts` row with `conditions_met`. Members already carrying an open
 * alert are skipped so coaches aren't flooded with duplicates. Each member
 * is processed in its own try/catch so one failure cannot abort the batch.
 *
 * Note: `hrv_settings` and `hrv_wearable_connections` are both member-keyed
 * but have no foreign-key relationship, so PostgREST embedded joins aren't
 * available — the opt-in list and the connection list are loaded as two
 * sequential queries.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  // --- Step 2: service-role client (RLS bypass for background work). ---
  const supabase = createServiceClient();

  // --- Step 3: window cutoffs. ---
  const now = new Date();
  const cutoff60 = new Date(
    now.getTime() - WINDOW_DAYS * MS_PER_DAY,
  ).toISOString();
  const cutoff7Date = new Date(
    now.getTime() - LIFESTYLE_WINDOW_DAYS * MS_PER_DAY,
  )
    .toISOString()
    .slice(0, 10);

  // --- Step 4a: members who have opted in to share with their coach. ---
  const { data: optedRows, error: optedErr } = await supabase
    .from("hrv_settings")
    .select("member_id")
    .eq("share_to_coach", true);
  if (optedErr) {
    console.error("[cron/hrv-alert-detect] opt-in query:", optedErr.message);
    return new NextResponse("query failed", { status: 500 });
  }
  const optedInIds = (optedRows ?? []).map((r) => r.member_id as string);
  if (optedInIds.length === 0) {
    return NextResponse.json({
      ok: true,
      connections: 0,
      created: 0,
      skipped: 0,
      notTriggered: 0,
    });
  }

  // --- Step 4b: their primary wearable connections. ---
  const { data: connectionRows, error: connError } = await supabase
    .from("hrv_wearable_connections")
    .select("id, member_id")
    .eq("is_primary", true)
    .in("member_id", optedInIds);
  if (connError) {
    console.error(
      "[cron/hrv-alert-detect] connections query:",
      connError.message,
    );
    return new NextResponse("query failed", { status: 500 });
  }
  const connections = connectionRows ?? [];

  let created = 0;
  let skipped = 0;
  let notTriggered = 0;

  // --- Step 5: process each connection in isolation. ---
  for (const conn of connections) {
    try {
      // Step 5a: skip if an open alert already exists for this member.
      // Use `.limit(1).maybeSingle()` rather than bare `.maybeSingle()` —
      // nothing in the schema enforces "at most one open alert per member",
      // and a stray duplicate would make `.maybeSingle()` error out and
      // break that member's processing on every cron run.
      const { data: existing } = await supabase
        .from("hrv_alerts")
        .select("id")
        .eq("member_id", conn.member_id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      if (existing) {
        skipped += 1;
        continue;
      }

      // Step 5b: readings scoped to THIS connection, chronological.
      const { data: readingRows, error: rErr } = await supabase
        .from("hrv_readings")
        .select(
          "measured_at, warm_up_state, rolling_7d_mean_lnrmssd, baseline_60d_mean_lnrmssd, baseline_60d_swc, resting_hr_bpm",
        )
        .eq("connection_id", conn.id)
        .gte("measured_at", cutoff60)
        .order("measured_at", { ascending: true });
      if (rErr) {
        throw new Error(`readings query: ${rErr.message}`);
      }
      const readings: AlertReading[] = (readingRows ?? []).map((r) => ({
        date: (r.measured_at as string).slice(0, 10),
        warmUpState: r.warm_up_state as AlertReading["warmUpState"],
        rolling7dMeanLnRmssd: r.rolling_7d_mean_lnrmssd as number | null,
        baseline60dMeanLnRmssd: r.baseline_60d_mean_lnrmssd as number | null,
        baseline60dSwc: r.baseline_60d_swc as number | null,
        restingHrBpm: r.resting_hr_bpm as number | null,
      }));

      // Step 5c: lifestyle logs are member-scoped (not connection-scoped).
      const { data: logRows, error: lErr } = await supabase
        .from("hrv_lifestyle_logs")
        .select("logged_for_date, event_type, value")
        .eq("member_id", conn.member_id)
        .gte("logged_for_date", cutoff7Date);
      if (lErr) {
        throw new Error(`lifestyle logs query: ${lErr.message}`);
      }
      const lifestyleLogs: AlertLog[] = (logRows ?? []).map((l) => ({
        date: l.logged_for_date as string,
        eventType: l.event_type as string,
        value: l.value,
      }));

      // Step 5d: run the pure alert engine.
      const ev = evaluateAlertConditions({ readings, lifestyleLogs, now });
      if (!ev.triggered) {
        notTriggered += 1;
        continue;
      }

      // Step 5e: insert the alert (status defaults to 'open').
      // `triggered_at: now.toISOString()` is explicit even though the
      // column has `default now()` — keeps determinism in tests / replays.
      // The `as unknown as Json` cast mirrors the V2.2 cron's pattern for
      // jsonb columns: the generated column type is `Json`; the engine's
      // `AlertConditionsMet` is a structural superset.
      const { error: insErr } = await supabase.from("hrv_alerts").insert({
        member_id: conn.member_id,
        conditions_met: ev.conditions_met as unknown as Json,
        triggered_at: now.toISOString(),
      });
      if (insErr) {
        throw new Error(`alert insert: ${insErr.message}`);
      }
      created += 1;
    } catch (error) {
      // One member's failure must not abort the rest of the batch.
      console.error(
        `[cron/hrv-alert-detect] connection ${conn.id} failed:`,
        error,
      );
    }
  }

  // --- Step 6: batch summary. ---
  return NextResponse.json({
    ok: true,
    connections: connections.length,
    created,
    skipped,
    notTriggered,
  });
}
