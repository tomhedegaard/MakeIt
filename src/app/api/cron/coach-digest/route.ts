/**
 * Weekly coach adherence digest — cron-triggered route.
 *
 * Scheduled via `vercel.json` for Mondays at 06:00 UTC (≈ 7-8 CET).
 * Vercel signs the request with `Authorization: Bearer <CRON_SECRET>`
 * which we verify before doing any work.
 *
 * For each coach (members.is_coach = true, has email, notif_digest
 * enabled), we compute the crew-wide adherence digest once and send
 * each coach their copy. The digest snapshot is identical across
 * coaches in v1 (single-coach world) — we re-compute per coach only
 * if/when we add coach<>crew partitioning.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { getCrewAdherenceDigest } from "@/lib/data/coach-adherence-digest";
import { sendCoachAdherenceDigestEmail } from "@/lib/email/templates/coach-adherence-digest";

// Coach digest aggregation hits ~3 queries per member. Bump the
// function timeout so 50+ members don't trip the 10s default.
export const maxDuration = 60;

type CoachRow = {
  id: string;
  handle: string;
  email: string | null;
  notif_digest: boolean | null;
};

export async function GET(request: Request) {
  // Vercel Cron auth — drops unauthenticated requests at the door.
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

  // We need to read members across RLS as a service-level job. Use
  // the service-role client (NOT the cookie-aware server client —
  // cron has no user session).
  const admin = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Coaches who should receive the digest.
  const { data: coachRows, error: coachErr } = await admin
    .from("members")
    .select("id, handle, email, notif_digest")
    .eq("is_coach", true)
    .not("email", "is", null);

  if (coachErr) {
    return NextResponse.json(
      { error: "Failed to fetch coaches", detail: coachErr.message },
      { status: 500 },
    );
  }

  const coaches = ((coachRows ?? []) as CoachRow[]).filter(
    (c) => c.email && c.notif_digest !== false,
  );

  if (coaches.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: 0,
      reason: "no coaches with digest enabled",
    });
  }

  // 2. One digest snapshot — same view for every coach in v1.
  const digest = await getCrewAdherenceDigest();

  // 3. Send each coach their copy. baseUrl from request headers so
  // we get the right host on preview vs prod.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "makeit.tomhedegaard.dk";
  const baseUrl = `${proto}://${host}`;

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const coach of coaches) {
    if (!coach.email) {
      skipped++;
      continue;
    }
    try {
      const res = await sendCoachAdherenceDigestEmail({
        to: coach.email,
        recipientHandle: coach.handle,
        digest,
        baseUrl,
      });
      if (res.ok) sent++;
      else if (res.skipped) skipped++;
      else errors.push(`@${coach.handle}: send failed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/coach-digest] @${coach.handle} failed:`, err);
      errors.push(`@${coach.handle}: ${msg}`);
    }
  }

  // Single summary line per run — Vercel runtime logs surface this.
  console.log(
    `[cron/coach-digest] sent=${sent} skipped=${skipped} errors=${errors.length} crew=${digest.totalMembers} atRisk=${digest.atRisk.length} strong=${digest.strong.length}`,
  );

  return NextResponse.json({
    ok: errors.length === 0,
    sent,
    skipped,
    crewSize: digest.totalMembers,
    atRiskCount: digest.atRisk.length,
    strongCount: digest.strong.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
