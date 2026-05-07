import { createClient } from "@/lib/supabase/server";

export type TierEvent = {
  id: string;
  fromTier: string;
  toTier: string;
  balanceAt: number;
  promoted: boolean;
  seenAt: string | null;
  createdAt: string;
};

const MOCK_TIER_EVENTS: TierEvent[] = [];

/**
 * The most recent unseen tier promotion for the member, if any.
 * The dashboard banner uses this; once shown, mark it seen so the
 * banner disappears.
 */
export async function getLatestUnseenPromotion(
  memberId: string
): Promise<TierEvent | null> {
  const supabase = await createClient();
  if (!supabase) {
    return MOCK_TIER_EVENTS.find((e) => e.seenAt === null && e.promoted) ?? null;
  }

  const { data } = await supabase
    .from("tier_events")
    .select("id, from_tier, to_tier, balance_at, promoted, seen_at, created_at")
    .eq("member_id", memberId)
    .is("seen_at", null)
    .eq("promoted", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    fromTier: data.from_tier,
    toTier: data.to_tier,
    balanceAt: data.balance_at,
    promoted: data.promoted,
    seenAt: data.seen_at,
    createdAt: data.created_at,
  };
}
