import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runScienceFeed } from "@/lib/science/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Science feed — daily pipeline cron.
 *
 * Spec: docs/science/MakeIt_Science_Sektion_Teknisk_Spec.md §9 (Mønster B).
 * Brief: docs/science/MakeIt_Science_ClaudeCode_Brief.md §5.
 *
 * Schedule: 05:30 UTC daily (vercel.json). Fetches Europe PMC, gates + scores,
 * writes a verified Danish summary, and upserts BOTH published and rejected
 * studies into `science_items` (audit/open-brain). Idempotent on source_id, so
 * re-runs on the same day are safe.
 *
 * The realistic daily volume (3 fast fetches + a handful of Haiku summaries for
 * the 2-5 studies that pass the gate) fits comfortably inside maxDuration. For
 * heavier source expansion, move to the GitHub Action runner that drives the
 * same scripts/science-feed.ts (see brief §5, Mønster A).
 *
 * Vercel signs the request with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  try {
    const svc = createServiceClient();
    const result = await runScienceFeed({
      db: svc,
      live: true,
      log: (msg) => console.info(`[science/cron] ${msg}`),
    });

    const summary = {
      ok: true,
      source: result.source,
      published: result.published.length,
      rejected: result.rejected.length,
    };
    console.info("[science/cron] done", summary);
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[science/cron] failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
