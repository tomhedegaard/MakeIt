import { NextResponse, type NextRequest } from "next/server";
import { assertCronAuth } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { mindDb } from "@/lib/data/mind";
import { sendPushToMember } from "@/lib/push";
import {
  computeWeeklyInsights,
  headlineFromInsights,
} from "@/lib/mind/weekly-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mental Health Pillar (Søjle 5) — weekly insights digest cron.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §13
 *
 * Schedule: 18:00 UTC Sundays (≈ 20:00 Danish summer).
 *
 * For every member with at least one mind-check in the last 14 days,
 * compute their week-on-week summary and push a one-line headline
 * linking to /mind/weekly.
 *
 * Idempotent-ish: re-running on the same Sunday sends a second push.
 * v0 acceptable; v1 can add a sent-this-week marker if it becomes noise.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  const svc = createServiceClient();
  const db = mindDb(svc);

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 14);
  const sinceIso = since.toISOString().slice(0, 10);

  // Members with any mind-check in the last 14 days — distinct via
  // grouping client-side.
  const { data: logRows, error: logErr } = await db
    .from("mind_check_logs")
    .select("member_id, logged_date, energy, stress, focus")
    .gte("logged_date", sinceIso);

  if (logErr) {
    console.error("[mind/weekly] logs read failed", logErr.message);
    return NextResponse.json({ ok: false, error: logErr.message }, { status: 500 });
  }

  type LogRow = { member_id: string; logged_date: string; energy: number; stress: number; focus: number };
  const allLogs = (logRows ?? []) as LogRow[];
  const memberIds = Array.from(new Set(allLogs.map((r) => r.member_id)));

  if (memberIds.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, pushed: 0 });
  }

  // Pre-fetch completions + journals for everyone in one round-trip.
  const [{ data: comps }, { data: journals }] = await Promise.all([
    db
      .from("mental_session_completions")
      .select("member_id, completed_date")
      .in("member_id", memberIds)
      .gte("completed_date", sinceIso),
    db
      .from("journal_entries")
      .select("member_id, logged_date")
      .in("member_id", memberIds)
      .gte("logged_date", sinceIso),
  ]);

  type CompRow = { member_id: string; completed_date: string };
  type JournalRow = { member_id: string; logged_date: string };
  const allComps = (comps ?? []) as CompRow[];
  const allJournals = (journals ?? []) as JournalRow[];

  // Group by member for fast per-member compute.
  const logsByMember = new Map<string, LogRow[]>();
  for (const r of allLogs) {
    const arr = logsByMember.get(r.member_id);
    if (arr) arr.push(r); else logsByMember.set(r.member_id, [r]);
  }
  const compsByMember = new Map<string, CompRow[]>();
  for (const r of allComps) {
    const arr = compsByMember.get(r.member_id);
    if (arr) arr.push(r); else compsByMember.set(r.member_id, [r]);
  }
  const journalsByMember = new Map<string, JournalRow[]>();
  for (const r of allJournals) {
    const arr = journalsByMember.get(r.member_id);
    if (arr) arr.push(r); else journalsByMember.set(r.member_id, [r]);
  }

  let pushed = 0;
  let failed = 0;
  for (const memberId of memberIds) {
    try {
      const memberLogs = logsByMember.get(memberId) ?? [];
      const memberComps = compsByMember.get(memberId) ?? [];
      const memberJournals = journalsByMember.get(memberId) ?? [];
      const insights = computeWeeklyInsights(
        memberLogs.map((l) => ({
          logged_date: l.logged_date,
          energy: l.energy,
          stress: l.stress,
          focus: l.focus,
        })),
        memberComps,
        memberJournals,
      );
      if (insights.current.mindCheckDays === 0) continue;
      const headline = headlineFromInsights(insights);
      await sendPushToMember(memberId, {
        title: "Din mentale uge",
        body: headline,
        url: "/mind/weekly",
        tag: "mind-weekly-insights",
      });
      pushed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[mind/weekly] push failed", { memberId, msg });
      failed++;
    }
  }

  console.info("[mind/weekly] cron done", {
    candidates: memberIds.length,
    pushed,
    failed,
  });

  return NextResponse.json({
    ok: true,
    candidates: memberIds.length,
    pushed,
    failed,
  });
}
