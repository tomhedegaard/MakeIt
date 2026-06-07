import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mindDb } from "@/lib/data/mind";
import { sendPushToMember } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mental Health Pillar (Søjle 5) — buddy mental weekly check-in nudge (MH-8).
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §10
 *
 * Schedule: Mondays 07:00 UTC.
 *
 * For each active buddy_pair where BOTH members have:
 *   - buddy_share_enabled = true
 *   - notif_buddy_mental_alert = true
 *   - no buddy_interactions row between them in the last 7 days
 * Send a gentle push to both:
 *   "Spørg X hvordan ugen ligger — det er noget af det stærkeste I har."
 *
 * Idempotent within a Monday — the no-interactions-in-7-days check
 * means a manual rerun the same day still only fires when truly needed.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const svc = createServiceClient();
  const db = mindDb(svc);

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: pairs, error: pairsErr } = await db
    .from("buddy_pairs")
    .select("id, member_a, member_b")
    .is("unpaired_at", null);

  if (pairsErr) {
    console.error("[mind/buddy-checkin] pairs read failed", pairsErr.message);
    return NextResponse.json({ ok: false, error: pairsErr.message }, { status: 500 });
  }

  const allPairs = (pairs ?? []) as { id: string; member_a: string; member_b: string }[];
  if (allPairs.length === 0) {
    return NextResponse.json({ ok: true, pairs: 0, nudged_pairs: 0 });
  }

  const memberIds = Array.from(
    new Set(allPairs.flatMap((p) => [p.member_a, p.member_b])),
  );

  const { data: settings } = await db
    .from("mental_settings")
    .select("member_id, buddy_share_enabled, notif_buddy_mental_alert")
    .in("member_id", memberIds);
  const settingsMap = new Map(
    ((settings ?? []) as {
      member_id: string;
      buddy_share_enabled: boolean;
      notif_buddy_mental_alert: boolean;
    }[]).map((s) => [s.member_id, s]),
  );

  // Pre-load member handles for the push body.
  const { data: members } = await db
    .from("members")
    .select("id, handle")
    .in("id", memberIds);
  const handleMap = new Map(
    ((members ?? []) as { id: string; handle: string }[]).map((m) => [m.id, m.handle]),
  );

  let nudgedPairs = 0;
  let skipped = 0;

  for (const pair of allPairs) {
    const sa = settingsMap.get(pair.member_a);
    const sb = settingsMap.get(pair.member_b);
    const bothShare = !!sa?.buddy_share_enabled && !!sb?.buddy_share_enabled;
    const bothNotif = !!sa?.notif_buddy_mental_alert && !!sb?.notif_buddy_mental_alert;
    if (!bothShare || !bothNotif) {
      skipped++;
      continue;
    }

    // Any interaction between the two in the last 7 days? If yes, skip.
    const { data: recent, error: recentErr } = await db
      .from("buddy_interactions")
      .select("id")
      .eq("pair_id", pair.id)
      .gte("created_at", sevenDaysAgoIso)
      .limit(1);

    if (recentErr) {
      console.warn("[mind/buddy-checkin] recent interactions read failed", recentErr.message);
      skipped++;
      continue;
    }
    if ((recent ?? []).length > 0) {
      skipped++;
      continue;
    }

    const handleA = handleMap.get(pair.member_a) ?? "din buddy";
    const handleB = handleMap.get(pair.member_b) ?? "din buddy";

    try {
      await sendPushToMember(pair.member_a, {
        title: "Buddy-tjek",
        body: `Spørg ${handleB} hvordan ugen ligger — det er noget af det stærkeste I har.`,
        url: "/buddy",
        tag: "buddy-mental-checkin",
      });
      await sendPushToMember(pair.member_b, {
        title: "Buddy-tjek",
        body: `Spørg ${handleA} hvordan ugen ligger — det er noget af det stærkeste I har.`,
        url: "/buddy",
        tag: "buddy-mental-checkin",
      });
      nudgedPairs++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[mind/buddy-checkin] push failed", msg);
    }
  }

  console.info("[mind/buddy-checkin] cron done", {
    pairs: allPairs.length,
    nudged_pairs: nudgedPairs,
    skipped,
  });

  return NextResponse.json({
    ok: true,
    pairs: allPairs.length,
    nudged_pairs: nudgedPairs,
    skipped,
  });
}
