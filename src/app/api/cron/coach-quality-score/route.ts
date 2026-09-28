import { NextResponse, type NextRequest } from "next/server";

import { assertCronAuth } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  demoteCoach,
  getLiveCoachesMetrics,
  insertQualitySnapshot,
} from "@/lib/data/coach-school-quality";
import {
  DEFAULT_DEMOTE_AGREEMENT_FLOOR,
  decideQualityStatus,
} from "@/lib/coach-school/quality-score";
import {
  sendDemotionEmailToCoach,
  sendDemotionEmailToMunk,
} from "@/lib/email/templates/coach-demotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Crew Coaching Pyramid — weekly quality-score cron (CC-8).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Schedule: Mondays 06:00 UTC (≈ 07:00 CET / 08:00 CEST) — same
 * morning Munk gets the coach-morning-report, so the week starts
 * with a complete picture: who's healthy, who's on watch, who got
 * auto-demoted overnight.
 *
 * For every live co-coach (coach_tier in {beast_live, legend_live}):
 *   1. Pull rolling-50 sandbox agreement + last-7d live interventions.
 *   2. decideQualityStatus → status ∈ {healthy, watch, demoted}.
 *   3. Insert coach_quality_scores snapshot row.
 *   4. On 'demoted': flip coach_tier → 'beast_sandbox', end open
 *      co_coach_assignments, send email to coach + Munk.
 *
 * v0 simplifications (see coach-school-quality.ts jsdoc):
 *   - agreement uses sandbox history (live spot-checks land in CC-9)
 *   - satisfaction always null in v0 → 'watch' never trips yet
 *
 * Resilient: a per-coach failure logs + continues to the next coach
 * so one bad row doesn't poison the week's run for the rest.
 */

interface CoachSummary {
  handle: string;
  status: "healthy" | "watch" | "demoted";
  reason: string;
  rollingAgreement: number | null;
  reviewSampleSize: number;
  emailSent: { coach: boolean; munk: boolean } | null;
  error?: string;
}

const MUNK_EMAIL =
  process.env.RESEND_REPLY_TO ?? "munk@nowmakeit.eu";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  // baseUrl from request headers — correct host on preview vs prod.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "https://app.nowmakeit.eu";

  const svc = createServiceClient();

  let coaches;
  try {
    coaches = await getLiveCoachesMetrics(svc);
  } catch (err) {
    console.error("[cron/coach-quality-score] metrics fetch failed:", err);
    return NextResponse.json(
      { ok: false, reason: "metrics-fetch-failed" },
      { status: 500 },
    );
  }

  const summaries: CoachSummary[] = [];
  let demotedCount = 0;
  let watchCount = 0;
  let healthyCount = 0;
  let snapshotInsertFailed = 0;

  for (const c of coaches) {
    const decision = decideQualityStatus({
      rollingAgreement: c.rollingAgreement,
      reviewSampleSize: c.reviewSampleSize,
      memberSatisfaction: c.memberSatisfaction,
      satisfactionSampleSize: c.satisfactionSampleSize,
    });

    const summary: CoachSummary = {
      handle: c.handle,
      status: decision.status,
      reason: decision.reason,
      rollingAgreement: c.rollingAgreement,
      reviewSampleSize: c.reviewSampleSize,
      emailSent: null,
    };

    // Always write the snapshot — even healthy ones, so Munk has a
    // trail for week-over-week trend analysis (CC-9 follow-up).
    const snap = await insertQualitySnapshot(
      {
        coachMemberId: c.memberId,
        agreementWithMunk: c.rollingAgreement,
        memberSatisfaction: c.memberSatisfaction,
        responseTimeP50Minutes: null,
        interventionCountWeek: c.interventionCountWeek,
        status: decision.status,
        notes: null,
      },
      svc,
    );
    if (!snap.ok) {
      snapshotInsertFailed += 1;
      summary.error = `snapshot: ${snap.reason ?? "unknown"}`;
    }

    if (decision.shouldDemote) {
      const dem = await demoteCoach(c.memberId, svc);
      if (!dem.ok) {
        summary.error = `${summary.error ?? ""}; demote: ${dem.reason ?? "unknown"}`;
      } else {
        // Notify — both sends are independent; a Resend hiccup on one
        // shouldn't suppress the other.
        const [toCoach, toMunk] = await Promise.all([
          c.email
            ? sendDemotionEmailToCoach({
                toEmail: c.email,
                handle: c.handle,
                rollingAgreement: c.rollingAgreement,
                reviewSampleSize: c.reviewSampleSize,
                agreementFloor: DEFAULT_DEMOTE_AGREEMENT_FLOOR,
                baseUrl,
              })
            : Promise.resolve({ ok: false, skipped: true }),
          sendDemotionEmailToMunk({
            toEmail: MUNK_EMAIL,
            handle: c.handle,
            rollingAgreement: c.rollingAgreement,
            reviewSampleSize: c.reviewSampleSize,
            agreementFloor: DEFAULT_DEMOTE_AGREEMENT_FLOOR,
            baseUrl,
            assignmentsEnded: dem.assignmentsEnded,
          }),
        ]);
        summary.emailSent = {
          coach: !!toCoach.ok && !toCoach.skipped,
          munk: !!toMunk.ok && !toMunk.skipped,
        };
      }
    }

    summaries.push(summary);
    if (decision.status === "demoted") demotedCount += 1;
    else if (decision.status === "watch") watchCount += 1;
    else healthyCount += 1;
  }

  console.log(
    `[cron/coach-quality-score] live=${coaches.length} healthy=${healthyCount} watch=${watchCount} demoted=${demotedCount} snapshot_failed=${snapshotInsertFailed}`,
  );

  return NextResponse.json({
    ok: snapshotInsertFailed === 0,
    totals: {
      live: coaches.length,
      healthy: healthyCount,
      watch: watchCount,
      demoted: demotedCount,
      snapshot_failed: snapshotInsertFailed,
    },
    by_coach: summaries,
  });
}
