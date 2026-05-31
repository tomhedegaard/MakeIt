import { NextResponse, type NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  awardBuddyInteractionStreak,
  isoWeekStartUtc,
  isoWeekTag,
} from "@/lib/coach-school/reps-awards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Crew Coaching Pyramid — buddy interaction streak cron (CC-10).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §10
 *
 * Schedule: Mondays 07:00 UTC — runs AFTER coach-quality-score (06:00)
 * and the morning report (05:00), so a single morning's vercel logs
 * tell Munk the whole story for the prior week.
 *
 * For each member with ≥3 `buddy_interactions.from_member = X` in
 * the PRIOR ISO week, award +5 Reps via the
 * `buddy_interaction_streak` reference_type. Idempotent: the helper
 * dedupes on (member_id, 'buddy_interaction_streak', week_iso) so
 * a re-run inside the same week is a no-op (cosmic-ray retry safe).
 *
 * The +5 award is small by design — the spec uses streaks as a
 * gentle nudge, not a Reps farm. Real promotions to Athlete tier
 * come from the larger PRs + sessions awards.
 *
 * v0 simplification: counts only OUTGOING interactions
 * (from_member). The spec says "member sent ≥3 interactions" so
 * incoming reactions/nudges don't count toward the sender's streak
 * — they count toward the SENDER, who'll be on a different row.
 * (Symmetric: both members of a chatty pair can earn the streak.)
 */

interface StreakSummary {
  memberId: string;
  interactionCount: number;
  awarded: boolean;
  skipped: boolean;
  reason?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();
  // We want the PRIOR week — the just-finished one. Subtract 7d
  // and snap to the ISO week of that point.
  const lastWeekRef = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const weekStart = isoWeekStartUtc(lastWeekRef);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 3_600_000);
  const weekIso = isoWeekTag(lastWeekRef);

  // Pull every interaction in the window — bounded by the week so
  // we don't overscan, and grouped client-side per from_member.
  const { data: interactions, error: ixErr } = await svc
    .from("buddy_interactions")
    .select("from_member")
    .gte("created_at", weekStart.toISOString())
    .lt("created_at", weekEnd.toISOString());
  if (ixErr) {
    console.error(
      `[cron/buddy-streak-weekly] interactions fetch failed: ${ixErr.message}`,
    );
    return NextResponse.json(
      { ok: false, reason: "interactions-fetch-failed" },
      { status: 500 },
    );
  }

  const perMember = new Map<string, number>();
  for (const r of interactions ?? []) {
    const id = r.from_member as string;
    perMember.set(id, (perMember.get(id) ?? 0) + 1);
  }

  const STREAK_THRESHOLD = 3;
  const summary: StreakSummary[] = [];
  let awardedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const [memberId, count] of perMember.entries()) {
    if (count < STREAK_THRESHOLD) {
      summary.push({
        memberId,
        interactionCount: count,
        awarded: false,
        skipped: true,
        reason: "below-threshold",
      });
      skippedCount += 1;
      continue;
    }

    const res = await awardBuddyInteractionStreak(svc, { memberId, weekIso });
    summary.push({
      memberId,
      interactionCount: count,
      awarded: res.ok && !res.skipped,
      skipped: !!res.skipped,
      reason: res.reason,
    });
    if (!res.ok) failedCount += 1;
    else if (res.skipped) skippedCount += 1;
    else awardedCount += 1;
  }

  console.log(
    `[cron/buddy-streak-weekly] week=${weekIso} candidates=${perMember.size} awarded=${awardedCount} skipped=${skippedCount} failed=${failedCount}`,
  );

  return NextResponse.json({
    ok: failedCount === 0,
    week_iso: weekIso,
    totals: {
      candidates: perMember.size,
      awarded: awardedCount,
      skipped: skippedCount,
      failed: failedCount,
    },
    by_member: summary,
  });
}
