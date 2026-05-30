import { NextResponse, type NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { loadFeaturesForTier } from "@/lib/data/buddy-pairing";
import {
  assignBuddiesForTier,
  type BuddyTier,
} from "@/lib/pairing/match";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Crew Coaching Pyramid — weekly buddy rematch cron (CC-2).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §5
 *
 * Schedule: Sundays 19:00 UTC (≈ 20:00 CET / 21:00 CEST) — the
 * window when last week's training is logged and the upcoming week's
 * sessions aren't yet scheduled, so feature vectors are stable.
 *
 * For each tier (athlete, beast, legend):
 *   1. Load feature vectors for unpaired members at that tier.
 *   2. Run the pure matcher (greedy complementarity scoring).
 *   3. Insert new buddy_pairs rows for the resulting proposals.
 *
 * v0 simplification: this cron pairs only currently-unpaired members.
 * The spec's re-pair criteria (0 interactions in 14d OR satisfaction
 * ≤2/5 → end existing pair + rejoin pool) ship in a follow-up once
 * the buddy_interactions surface and the satisfaction prompt exist
 * (CC-3 and beyond). Until then, existing pairs persist.
 *
 * Idempotent insert: the buddy_pairs_distinct (member_a < member_b)
 * + buddy_pairs_unique_active_a/_b constraints prevent double-pairs.
 * The feature-vector fetcher also filters out actively-paired members.
 */
const TIERS: BuddyTier[] = ["athlete", "beast", "legend"];

interface TierSummary {
  pool: number;
  proposed: number;
  inserted: number;
  failed: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const summary: Record<BuddyTier, TierSummary> = {
    athlete: { pool: 0, proposed: 0, inserted: 0, failed: 0 },
    beast: { pool: 0, proposed: 0, inserted: 0, failed: 0 },
    legend: { pool: 0, proposed: 0, inserted: 0, failed: 0 },
  };

  for (const tier of TIERS) {
    try {
      const features = await loadFeaturesForTier(supabase, tier, now);
      summary[tier].pool = features.length;
      if (features.length < 2) continue;

      const proposals = assignBuddiesForTier(features);
      summary[tier].proposed = proposals.length;
      if (proposals.length === 0) continue;

      const { error: insErr } = await supabase
        .from("buddy_pairs")
        .insert(
          proposals.map((p) => ({
            member_a: p.memberA,
            member_b: p.memberB,
            pairing_reason: p.pairingReason as unknown as Json,
          })),
        );
      if (insErr) {
        summary[tier].failed = proposals.length;
        console.error(
          `[cron/buddy-rematch-weekly] insert ${tier} failed:`,
          insErr.message,
        );
      } else {
        summary[tier].inserted = proposals.length;
      }
    } catch (err) {
      summary[tier].failed += 1;
      console.error(`[cron/buddy-rematch-weekly] ${tier} threw:`, err);
    }
  }

  const totals = TIERS.reduce(
    (acc, t) => {
      acc.pool += summary[t].pool;
      acc.proposed += summary[t].proposed;
      acc.inserted += summary[t].inserted;
      acc.failed += summary[t].failed;
      return acc;
    },
    { pool: 0, proposed: 0, inserted: 0, failed: 0 },
  );

  console.log(
    `[cron/buddy-rematch-weekly] pool=${totals.pool} proposed=${totals.proposed} inserted=${totals.inserted} failed=${totals.failed}`,
  );

  return NextResponse.json({
    ok: totals.failed === 0,
    by_tier: summary,
    totals,
  });
}
