import { NextResponse, type NextRequest } from "next/server";
import { assertCronAuth } from "@/lib/cron/auth";
import { runYouthSignalCheck } from "@/lib/youth/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * MakeIt Ung, del 3 — daily check for signs of a strained relationship
 * with training (spec 2026-09-27-makeit-ung-design.md, afsnit 4 og 5).
 *
 * Schedule: 16:00 UTC daily (≈ 18:00 Danish summer / 17:00 winter), so
 * a guardian reads the e-mail in the afternoon, not at five in the
 * morning. The window is the 14 days before today, so the hour does
 * not change what is counted.
 *
 * Idempotent: every sign has a 14-day cooldown per young member
 * (src/lib/youth/signals.ts), so a manual re-run sends nothing new.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await runYouthSignalCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[youth] signal check failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
