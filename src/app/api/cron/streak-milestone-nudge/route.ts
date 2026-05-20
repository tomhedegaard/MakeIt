/**
 * Streak milestone nudge — cron-triggered push notification.
 *
 * Scheduled via `vercel.json` for 15:00 UTC daily (≈ 17:00 CET —
 * afternoon, before the evening meal-logging window).
 *
 * Targets members who are exactly one log away from a cooking-streak
 * milestone (streak of 2/6/13/29 → next is 3/7/14/30) and have NOT
 * logged today yet. Sends a FOMO push: "log today and the milestone
 * is yours." Members who already logged today are skipped — they've
 * either hit it or aren't one-away in the "log now" sense.
 *
 * Vercel signs the request with `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { computeStreak, COOKING_MILESTONES } from "@/lib/data/nutrition-checkin";
import { sendPushToMemberWithClient } from "@/lib/push";

// computeStreak runs one query per candidate member. Bump the
// timeout so a larger crew doesn't trip the 10s default.
export const maxDuration = 60;

/** Streak values that are exactly one log short of a milestone. */
const ONE_AWAY = new Set(COOKING_MILESTONES.map((m) => m - 1));

function copenhagenDate(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  // en-CA formats as YYYY-MM-DD; timeZone handles CET/CEST.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 500 },
    );
  }

  const admin = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const today = copenhagenDate(0);
  const yesterday = copenhagenDate(-1);

  // Candidates = members with an `eaten` log yesterday (live streak).
  const { data: yesterdayRows, error: yErr } = await admin
    .from("nutrition_logs")
    .select("member_id")
    .eq("status", "eaten")
    .eq("logged_for_date", yesterday);

  if (yErr) {
    return NextResponse.json(
      { error: "Failed to query yesterday logs", detail: yErr.message },
      { status: 500 },
    );
  }

  // Members who already logged today — skip, the nudge is moot.
  const { data: todayRows } = await admin
    .from("nutrition_logs")
    .select("member_id")
    .eq("status", "eaten")
    .eq("logged_for_date", today);

  const loggedToday = new Set(
    (todayRows ?? []).map((r) => r.member_id as string),
  );
  const candidates = Array.from(
    new Set((yesterdayRows ?? []).map((r) => r.member_id as string)),
  ).filter((id) => !loggedToday.has(id));

  let nudged = 0;
  let pushesSent = 0;
  const errors: string[] = [];

  for (const memberId of candidates) {
    try {
      // Streak as it stands ending yesterday — logging today crosses
      // the next milestone if this is one-away.
      const streak = await computeStreak(
        memberId,
        yesterday,
        admin as never,
      );
      if (!ONE_AWAY.has(streak)) continue;

      const next = streak + 1;
      const count = await sendPushToMemberWithClient(admin, memberId, {
        title: `1 dag fra din ${next}-dages streak`,
        body: `Log dagens måltid før midnat — så er den i hus. +50 Reps venter.`,
        url: "/nutrition",
        tag: "streak-nudge",
      });
      nudged++;
      pushesSent += count;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/streak-nudge] ${memberId} failed:`, err);
      errors.push(`${memberId}: ${msg}`);
    }
  }

  console.log(
    `[cron/streak-nudge] candidates=${candidates.length} nudged=${nudged} pushes=${pushesSent} errors=${errors.length}`,
  );

  return NextResponse.json({
    ok: errors.length === 0,
    candidates: candidates.length,
    nudged,
    pushesSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
