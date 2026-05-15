/**
 * Crew-wide adherence digest for the weekly coach email.
 *
 * Fans out getMemberAdherence() across every onboarded non-coach
 * member and buckets them into:
 *
 *  - atRisk    (adherence < 50%  OR  |weightDelta| > 1.0 kg/week)
 *  - strong    (adherence >= 85%)
 *  - steady    (everyone else)
 *
 * The email focuses on atRisk + strong — the two buckets that need a
 * coach response (outreach vs. praise). Steady members are summarized
 * as a count only.
 *
 * Scale note: ~50 members × 3-4 queries each = 200ish queries in
 * parallel. Fine for closed beta. Refactor to a single aggregate
 * query when we cross ~100 members.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getMemberAdherence,
  type AdherenceDigest,
} from "./nutrition-adherence";

export type CrewMemberDigest = AdherenceDigest & {
  memberId: string;
  handle: string;
  displayName: string | null;
  bucket: "atRisk" | "strong" | "steady";
};

export type CrewAdherenceDigest = {
  rangeFrom: string;
  rangeTo: string;
  totalMembers: number;
  totalActive: number;
  averageAdherence: number;
  atRisk: CrewMemberDigest[];
  strong: CrewMemberDigest[];
  steadyCount: number;
};

const WINDOW_DAYS = 7;

export async function getCrewAdherenceDigest(): Promise<CrewAdherenceDigest> {
  const rangeTo = isoDate(new Date());
  const rangeFromDate = new Date();
  rangeFromDate.setDate(rangeFromDate.getDate() - WINDOW_DAYS);
  const rangeFrom = isoDate(rangeFromDate);

  const supabase = await createClient();
  if (!supabase) return emptyDigest(rangeFrom, rangeTo);

  // All onboarded non-coach members. The is_coach column flags coaches
  // (typically just @munk in v1); we exclude them from the crew roll-up.
  const { data: rows } = await supabase
    .from("members")
    .select("id, handle, display_name, is_coach, onboarded_at")
    .not("onboarded_at", "is", null)
    .neq("is_coach", true);

  const members = (rows ?? []) as Array<{
    id: string;
    handle: string;
    display_name: string | null;
    is_coach: boolean | null;
    onboarded_at: string | null;
  }>;

  if (members.length === 0) return emptyDigest(rangeFrom, rangeTo);

  // Fan out adherence per member in parallel.
  const digests = await Promise.all(
    members.map(async (m) => {
      const ad = await getMemberAdherence(m.id, WINDOW_DAYS);
      return {
        ...ad,
        memberId: m.id,
        handle: m.handle,
        displayName: m.display_name,
        bucket: bucketFor(ad),
      } satisfies CrewMemberDigest;
    }),
  );

  const totalMembers = digests.length;
  const totalActive = digests.filter((d) => d.mealsLogged > 0).length;
  const averageAdherence =
    totalMembers > 0
      ? Math.round(
          digests.reduce((sum, d) => sum + d.adherencePct, 0) / totalMembers,
        )
      : 0;

  // Surface the most-actionable members per bucket. Within atRisk,
  // sort by lowest adherence first (most urgent). Within strong, sort
  // by highest (best to acknowledge). Cap each list at 8 to keep the
  // email scannable.
  const atRisk = digests
    .filter((d) => d.bucket === "atRisk")
    .sort((a, b) => a.adherencePct - b.adherencePct)
    .slice(0, 8);

  const strong = digests
    .filter((d) => d.bucket === "strong")
    .sort((a, b) => b.adherencePct - a.adherencePct)
    .slice(0, 8);

  const steadyCount = digests.filter((d) => d.bucket === "steady").length;

  return {
    rangeFrom,
    rangeTo,
    totalMembers,
    totalActive,
    averageAdherence,
    atRisk,
    strong,
    steadyCount,
  };
}

function bucketFor(d: AdherenceDigest): "atRisk" | "strong" | "steady" {
  // Members with no plan / zero planned-meals aren't actionable yet —
  // park them as steady so the digest doesn't yell about inactive
  // tier members who haven't run the meal-planner setup.
  if (d.mealsPlanned === 0) return "steady";

  const lowAdherence = d.adherencePct < 50;
  const bigWeightShift =
    d.weightDeltaKg !== null && Math.abs(d.weightDeltaKg) > 1.0;
  if (lowAdherence || bigWeightShift) return "atRisk";

  if (d.adherencePct >= 85) return "strong";
  return "steady";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function emptyDigest(rangeFrom: string, rangeTo: string): CrewAdherenceDigest {
  return {
    rangeFrom,
    rangeTo,
    totalMembers: 0,
    totalActive: 0,
    averageAdherence: 0,
    atRisk: [],
    strong: [],
    steadyCount: 0,
  };
}
