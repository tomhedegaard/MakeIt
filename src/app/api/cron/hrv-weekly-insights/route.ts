import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  weekStartFor,
  buildInsightData,
  buildTemplateSummary,
  type InsightReading,
  type InsightLog,
} from "@/lib/hrv/insights";
import { generateInsightSummary } from "@/lib/hrv/insights-claude";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Trailing window of HRV history fed to the correlation engine (spec §7). */
const WINDOW_DAYS = 56;

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/** Minimum distinct days of readings before insights are generated (spec §8). */
const MIN_INSIGHT_DAYS = 14;

/**
 * HRV weekly-insights cron.
 *
 * Triggered by Vercel Cron once a week. For every `is_primary`
 * `hrv_wearable_connections` row it loads the trailing 56 days of HRV
 * readings (scoped to the connection) plus the member's lifestyle logs,
 * runs the correlation engine, asks Claude for a Danish prose summary
 * (falling back to a deterministic template on any failure), and upserts a
 * `hrv_weekly_insights` row for the current week. Each connection is
 * processed in its own try/catch so one failure cannot abort the batch.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // --- Step 1: verify the Vercel Cron bearer secret. ---
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  // --- Step 2: service-role client (RLS bypass for background work). ---
  const supabase = createServiceClient();

  // --- Step 3: the week this run produces insights for. ---
  const now = new Date();
  const weekStart = weekStartFor(now);

  // --- Step 4: every primary connection. ---
  const { data: connections, error: connError } = await supabase
    .from("hrv_wearable_connections")
    .select("id, member_id")
    .eq("is_primary", true);
  if (connError) {
    console.error(
      "[cron/hrv-weekly-insights] failed to load connections:",
      connError.message,
    );
    return new NextResponse("query failed", { status: 500 });
  }

  // --- Step 5: trailing-window cutoff. ---
  const windowCutoff = new Date(
    now.getTime() - WINDOW_DAYS * MS_PER_DAY,
  ).toISOString();

  const rows = connections ?? [];
  let insights = 0;
  let skipped = 0;
  let claudeUsed = 0;
  let templateUsed = 0;

  // --- Step 6: process each connection in isolation. ---
  for (const conn of rows) {
    try {
      // Step 6a: readings scoped to THIS connection, chronological.
      const { data: readingRows, error: readingError } = await supabase
        .from("hrv_readings")
        .select("measured_at, ln_rmssd")
        .eq("connection_id", conn.id)
        .gte("measured_at", windowCutoff)
        .order("measured_at", { ascending: true });
      if (readingError) {
        throw new Error(`readings query failed: ${readingError.message}`);
      }

      const readings: InsightReading[] = (readingRows ?? []).map((r) => ({
        date: r.measured_at.slice(0, 10),
        lnRmssd: r.ln_rmssd,
      }));

      // Step 6b: gate — insights need ≥14 distinct days of data (spec §8).
      const distinctDays = new Set(readings.map((r) => r.date));
      if (distinctDays.size < MIN_INSIGHT_DAYS) {
        skipped += 1;
        continue;
      }

      // Step 6c: lifestyle logs are member-scoped (not connection-scoped).
      const { data: logRows, error: logError } = await supabase
        .from("hrv_lifestyle_logs")
        .select("logged_for_date, event_type, value")
        .eq("member_id", conn.member_id)
        .gte("logged_for_date", windowCutoff.slice(0, 10));
      if (logError) {
        throw new Error(`lifestyle logs query failed: ${logError.message}`);
      }

      const lifestyleLogs: InsightLog[] = (logRows ?? []).map((l) => ({
        date: l.logged_for_date,
        eventType: l.event_type,
        value: l.value,
      }));

      // Step 6d: run the pure correlation engine.
      const data = buildInsightData({ readings, lifestyleLogs, weekStart });

      // Step 6e: Claude prose, with deterministic template fallback.
      const claude = await generateInsightSummary(data);
      const summaryText = claude?.summaryText ?? buildTemplateSummary(data);
      const claudeModelId = claude?.modelId ?? "template-fallback";
      const tokensUsed = claude?.tokensUsed ?? null;

      // Step 6f: upsert the week's insight row.
      const { error: upsertError } = await supabase
        .from("hrv_weekly_insights")
        .upsert(
          {
            member_id: conn.member_id,
            week_start: weekStart,
            summary_text: summaryText,
            // jsonb column — supabase-js serialises the array. The generated
            // column type is `Json`; the engine's `CorrelationCard[]` is a
            // structural superset, hence the narrow cast.
            correlation_cards: data.correlationCards as unknown as Json,
            claude_model_id: claudeModelId,
            tokens_used: tokensUsed,
            generated_at: now.toISOString(),
          },
          { onConflict: "member_id,week_start" },
        );
      if (upsertError) {
        throw new Error(`insight upsert failed: ${upsertError.message}`);
      }

      insights += 1;
      if (claude) {
        claudeUsed += 1;
      } else {
        templateUsed += 1;
      }
    } catch (error) {
      // One connection's failure must not abort the rest of the batch.
      console.error(
        `[cron/hrv-weekly-insights] connection ${conn.id} failed:`,
        error,
      );
    }
  }

  // --- Step 7: batch summary. ---
  return NextResponse.json({
    ok: true,
    connections: rows.length,
    insights,
    skipped,
    claudeUsed,
    templateUsed,
  });
}
