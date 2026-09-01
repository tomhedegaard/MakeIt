import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";

import { assertCronAuth } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { aggregateMorningReportInputs } from "@/lib/data/coach-morning-report";
import {
  assessMorningUrgency,
  buildMorningHeadline,
  buildMorningReportPayload,
} from "@/lib/coach/morning-report";
import { sendCoachMorningReportEmail } from "@/lib/email/templates/morning-report";
import { isLocale, type Locale } from "@/i18n/config";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Roster-wide aggregation runs a handful of batched queries; bump the
// timeout above the 10s default to stay safe as the roster grows.
export const maxDuration = 60;

/**
 * Munk Multiplier — coach morning-report cron (MM-7).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-1), §8
 *
 * Schedule: daily ~05:00 UTC (≈ 06:00–07:00 CET/CEST) so the report —
 * and its optional email — lands before Munk's morning. For each coach:
 *   1. Materialise today's coach_morning_reports row (idempotent upsert
 *      on coach_id+report_date; sent_email_at preserved on conflict).
 *   2. If the coach opted in (notif_morning_report) and hasn't been
 *      emailed today, send the Resend morning-report email and stamp
 *      sent_email_at. Resend-disabled / failed sends are left unstamped
 *      so a later run retries.
 *
 * The payload snapshot is roster-wide and identical across coaches in
 * v0 (Munk is the only coach) — re-compute per coach when we add
 * coach↔roster partitioning.
 */
type CoachRow = {
  id: string;
  handle: string;
  email: string | null;
  notif_morning_report: boolean | null;
  locale: string | null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClient();
  const now = new Date();
  const reportDate = now.toISOString().slice(0, 10);

  // 1. One roster-wide snapshot → persisted payload + headline.
  const inputs = await aggregateMorningReportInputs(supabase, now);
  const payload = buildMorningReportPayload(inputs);
  const urgency = assessMorningUrgency(payload);
  const headline = buildMorningHeadline(payload, urgency);

  // 2. Coaches who should receive the report.
  const { data: coachRows, error: coachErr } = await supabase
    .from("members")
    .select("id, handle, email, notif_morning_report, locale")
    .eq("is_coach", true);
  if (coachErr) {
    console.error("[cron/coach-morning-report] coaches:", coachErr.message);
    return NextResponse.json({ error: "coach query failed" }, { status: 500 });
  }
  const coaches = (coachRows ?? []) as CoachRow[];

  // baseUrl from request headers — correct host on preview vs prod.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "makeit.tomhedegaard.dk";
  const baseUrl = `${proto}://${host}`;

  let written = 0;
  let emailed = 0;
  let skipped = 0;
  let failed = 0;

  for (const coach of coaches) {
    try {
      // Idempotent: upsert today's row. Omitting sent_email_at from the
      // values preserves a prior send stamp on conflict.
      const { data: row, error: upErr } = await supabase
        .from("coach_morning_reports")
        .upsert(
          {
            coach_id: coach.id,
            report_date: reportDate,
            payload: payload as unknown as Json,
          },
          { onConflict: "coach_id,report_date" },
        )
        .select("sent_email_at")
        .single();
      if (upErr) throw new Error(`upsert: ${upErr.message}`);
      written += 1;

      const alreadyEmailed = !!row?.sent_email_at;
      const wantsEmail = coach.notif_morning_report !== false && !!coach.email;
      if (!wantsEmail || alreadyEmailed) {
        skipped += 1;
        continue;
      }

      const locale: Locale = isLocale(coach.locale) ? coach.locale : "da";
      const res = await sendCoachMorningReportEmail({
        to: coach.email as string,
        recipientHandle: coach.handle,
        reportDate,
        payload,
        headline,
        urgency,
        baseUrl,
        locale,
      });
      if (res.ok) {
        await supabase
          .from("coach_morning_reports")
          .update({ sent_email_at: new Date().toISOString() })
          .eq("coach_id", coach.id)
          .eq("report_date", reportDate);
        emailed += 1;
      } else {
        // Resend disabled (skipped) or a transient failure — leave
        // sent_email_at null so the next run retries the send.
        skipped += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`[cron/coach-morning-report] @${coach.handle} failed:`, err);
    }
  }

  console.log(
    `[cron/coach-morning-report] date=${reportDate} urgency=${urgency} patterns=${payload.patterns.length} coaches=${coaches.length} written=${written} emailed=${emailed} skipped=${skipped} failed=${failed}`,
  );

  return NextResponse.json({
    ok: failed === 0,
    report_date: reportDate,
    urgency,
    patterns: payload.patterns.length,
    coaches: coaches.length,
    written,
    emailed,
    skipped,
    failed,
  });
}
