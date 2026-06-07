import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mindDb } from "@/lib/data/mind";
import { sendPushToMember } from "@/lib/push";
import { buildCoachContext, computeMentalSignal } from "@/lib/mind/coach-context";
import { generateMentalCoachOutput } from "@/lib/mind/coach-claude";
import { buildFallbackCoachOutput } from "@/lib/mind/coach-fallback";
import type { MindCheckLog } from "@/lib/mind/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mental Health Pillar (Søjle 5) — daily AI mental coach cron (MH-7).
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §8
 *
 * Schedule: 04:30 UTC daily (≈ 06:30 Danish summer / 05:30 winter).
 *
 * For every member with ai_coach_enabled=true AND a mind-check in the
 * last 48h: generate a 200-400 word Danish reflection via Claude,
 * persist to mental_coach_outputs, push notification at 06:30 local.
 *
 * Members without a recent mind-check get the "missing-data" nudge
 * instead of a generated reflection.
 *
 * Idempotency: mental_coach_outputs has UNIQUE (member_id, for_date),
 * so re-runs on the same day silently skip via the maybeSingle check.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const svc = createServiceClient();
  const db = mindDb(svc);
  const today = new Date().toISOString().slice(0, 10);

  const { data: optedIn, error: optedInErr } = await db
    .from("mental_settings")
    .select("member_id, notif_ai_coach_morning")
    .eq("ai_coach_enabled", true);

  if (optedInErr) {
    console.error("[mind/coach] opted-in read failed", optedInErr.message);
    return NextResponse.json(
      { ok: false, error: optedInErr.message },
      { status: 500 },
    );
  }

  const optedInRows = (optedIn ?? []) as { member_id: string; notif_ai_coach_morning: boolean }[];
  if (optedInRows.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, fallback: 0, nudged: 0 });
  }

  // Pre-fetch members' handles + tiers so we can build the context
  // without per-member round-trips.
  const memberIds = optedInRows.map((r) => r.member_id);
  const { data: members } = await db
    .from("members")
    .select("id, handle, tier")
    .in("id", memberIds);
  const memberMap = new Map(
    ((members ?? []) as { id: string; handle: string; tier: string }[]).map((m) => [m.id, m]),
  );

  // Pre-fetch which members already have today's output (idempotency).
  const { data: existing } = await db
    .from("mental_coach_outputs")
    .select("member_id")
    .in("member_id", memberIds)
    .eq("for_date", today);
  const existingSet = new Set(
    ((existing ?? []) as { member_id: string }[]).map((r) => r.member_id),
  );

  let generated = 0;
  let fallback = 0;
  let nudged = 0;
  let skipped = 0;
  const failures: { memberId: string; reason: string }[] = [];

  for (const row of optedInRows) {
    const memberId = row.member_id;
    if (existingSet.has(memberId)) {
      skipped++;
      continue;
    }
    const m = memberMap.get(memberId);
    if (!m) {
      skipped++;
      continue;
    }

    try {
      const { data: logs } = await db
        .from("mind_check_logs")
        .select("*")
        .eq("member_id", memberId)
        .gte("logged_date", isoDateNDaysAgo(7))
        .order("logged_date", { ascending: false });

      const allLogs = (logs ?? []) as unknown as MindCheckLog[];
      const todayLog =
        allLogs.find((l) => l.logged_date === today) ?? null;

      // No mind-check in last 48h → push "missing data" nudge instead.
      const recentEnough = allLogs.some(
        (l) => l.logged_date >= isoDateNDaysAgo(2),
      );
      if (!recentEnough) {
        if (row.notif_ai_coach_morning) {
          await sendPushToMember(memberId, {
            title: "Mind-coach venter",
            body: "Vi mangler dit mind-check for at give dig dagens refleksion.",
            url: "/mind/check",
            tag: "mind-coach-missing-data",
          });
        }
        nudged++;
        continue;
      }

      const signal = computeMentalSignal(allLogs);
      const ctx = buildCoachContext({
        member: { handle: m.handle, tier: m.tier },
        mindToday: todayLog
          ? {
              energy: todayLog.energy,
              stress: todayLog.stress,
              focus: todayLog.focus,
              note: todayLog.note,
            }
          : null,
        signal,
        hrv: {
          week_mean_rmssd_ms: null,
          prior_week_mean_rmssd_ms: null,
          week_reading_count: 0,
        },
        training: {
          sessions_completed_7d: 0,
          sessions_planned_7d: 0,
          last_session_rpe: null,
          last_session_was: null,
        },
        forDate: today,
      });

      const result = await generateMentalCoachOutput(ctx);
      const bodyMd = result?.bodyMd ?? buildFallbackCoachOutput(ctx);
      const usedClaude = !!result;
      if (usedClaude) generated++;
      else fallback++;

      // Persist via the typed mindDb wrapper (service-role bypasses RLS).
      const { error: upsertErr } = await db
        .from("mental_coach_outputs")
        .upsert(
          {
            member_id: memberId,
            for_date: today,
            body_md: bodyMd,
            prompt_seed: { source: usedClaude ? "claude" : "fallback" },
            moderation_status: "clean",
          },
          { onConflict: "member_id,for_date" },
        );

      if (upsertErr) {
        failures.push({ memberId, reason: upsertErr.message });
        continue;
      }

      if (row.notif_ai_coach_morning) {
        await sendPushToMember(memberId, {
          title: "Mind-coach",
          body: "Dagens refleksion er klar.",
          url: "/mind/today",
          tag: "mind-coach-daily",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ memberId, reason: msg });
    }
  }

  console.info("[mind/coach] cron done", {
    candidates: optedInRows.length,
    generated,
    fallback,
    nudged,
    skipped,
    failed: failures.length,
  });

  return NextResponse.json({
    ok: true,
    candidates: optedInRows.length,
    generated,
    fallback,
    nudged,
    skipped,
    failed: failures.length,
  });
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
