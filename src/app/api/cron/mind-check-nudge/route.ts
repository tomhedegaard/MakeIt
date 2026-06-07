import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mindDb } from "@/lib/data/mind";
import { sendPushToMember } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mental Health Pillar (Søjle 5) — evening mind-check nudge cron (MH-2).
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §5
 *
 * Schedule: 18:00 UTC daily (≈ 20:00 Danish summer / 19:00 winter).
 *
 * For every member with notif_mind_check_evening=true who has NOT
 * already logged today's mind-check, sends a single push:
 *   "Tag 60 sek på dit mind-check inden dagen er slut."
 *
 * Idempotent within a day: we check today's mind_check_logs for each
 * candidate; if a row exists, we skip. So a manual re-run of the cron
 * doesn't double-nudge.
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
    .select("member_id")
    .eq("notif_mind_check_evening", true);

  if (optedInErr) {
    console.error("[mind] nudge: opted-in read failed", optedInErr.message);
    return NextResponse.json({ ok: false, error: optedInErr.message }, { status: 500 });
  }

  const memberIds = ((optedIn ?? []) as { member_id: string }[]).map((r) => r.member_id);
  if (memberIds.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, nudged: 0 });
  }

  const { data: loggedToday, error: loggedErr } = await db
    .from("mind_check_logs")
    .select("member_id")
    .in("member_id", memberIds)
    .eq("logged_date", today);

  if (loggedErr) {
    console.error("[mind] nudge: today-logs read failed", loggedErr.message);
    return NextResponse.json({ ok: false, error: loggedErr.message }, { status: 500 });
  }

  const loggedSet = new Set(
    ((loggedToday ?? []) as { member_id: string }[]).map((r) => r.member_id),
  );
  const toNudge = memberIds.filter((id) => !loggedSet.has(id));

  let nudged = 0;
  const failures: { memberId: string; reason: string }[] = [];

  for (const memberId of toNudge) {
    try {
      await sendPushToMember(memberId, {
        title: "Mind-check",
        body: "Tag 60 sek på dit mind-check inden dagen er slut.",
        url: "/mind/check",
        tag: "mind-check-nudge",
      });
      nudged++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ memberId, reason: msg });
    }
  }

  console.info("[mind] nudge cron done", {
    candidates: memberIds.length,
    alreadyLogged: loggedSet.size,
    nudged,
    failed: failures.length,
  });

  return NextResponse.json({
    ok: true,
    candidates: memberIds.length,
    alreadyLogged: loggedSet.size,
    nudged,
    failed: failures.length,
  });
}
