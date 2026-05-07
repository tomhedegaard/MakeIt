import { createClient } from "@/lib/supabase/server";

export type RewardKind = "drop" | "experience" | "digital" | "physical";

export type Reward = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  costReps: number;
  kind: RewardKind;
  stock: number | null; // null = unlimited
  isAvailable: boolean; // computed: active && (drop_at is null or in past) && stock != 0
};

export type Redemption = {
  id: string;
  rewardName: string;
  costReps: number;
  status: "pending" | "approved" | "shipped" | "fulfilled" | "cancelled";
  redeemedAt: string;
  fulfilledAt: string | null;
};

const STATUS_LABELS: Record<Redemption["status"], string> = {
  pending: "Afventer",
  approved: "Godkendt",
  shipped: "Sendt",
  fulfilled: "Modtaget",
  cancelled: "Annulleret",
};

export function statusLabel(s: Redemption["status"]) {
  return STATUS_LABELS[s] ?? s;
}

/* ---------------------------------------------------------------- *
 * Demo-mode mocks
 * ---------------------------------------------------------------- */
const MOCK_REWARDS: Reward[] = [
  {
    id: "demo-cuff",
    slug: "limited-cuff-olive",
    name: "Limited Cuff — Olive",
    description:
      "Olive-grøn HookIt cuff. Kun 80 stk lavet i denne farve. Sendes med GLS.",
    costReps: 1200,
    kind: "drop",
    stock: 47,
    isAvailable: true,
  },
  {
    id: "demo-1on1",
    slug: "1on1-formcheck",
    name: "1:1 Form-check med Mikael",
    description:
      "Privat 30-minutters videosession med head coach Mikael Munk.",
    costReps: 2000,
    kind: "experience",
    stock: null,
    isAvailable: true,
  },
  {
    id: "demo-strap",
    slug: "custom-broderet-strap",
    name: "Custom-broderet strap",
    description: "Få dit handle broderet på en sort StrapIt-strap.",
    costReps: 3500,
    kind: "physical",
    stock: null,
    isAvailable: true,
  },
  {
    id: "demo-vip",
    slug: "open-house-vip",
    name: "Open House VIP-pakke",
    description: "Træning + middag på Amagerbro 24/05 · 12 pladser.",
    costReps: 8000,
    kind: "experience",
    stock: 5,
    isAvailable: true,
  },
];

const MOCK_REDEMPTIONS: Redemption[] = [
  {
    id: "rd-1",
    rewardName: "Limited Cuff — Olive",
    costReps: 1200,
    status: "shipped",
    redeemedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    fulfilledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
];

const MOCK_BALANCE = 1420;

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export async function getRewardCatalog(): Promise<Reward[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_REWARDS;

  const { data } = await supabase
    .from("rewards")
    .select("id, slug, name, description, cost_reps, kind, stock, drop_at, is_active")
    .eq("is_active", true)
    .order("cost_reps", { ascending: true });

  if (!data) return [];

  const now = Date.now();
  return data.map((r) => {
    const dropAt = r.drop_at ? new Date(r.drop_at).getTime() : null;
    const isAvailable =
      r.is_active &&
      (dropAt === null || dropAt <= now) &&
      (r.stock === null || r.stock > 0);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      costReps: r.cost_reps,
      kind: r.kind as RewardKind,
      stock: r.stock,
      isAvailable,
    };
  });
}

export async function getMyRedemptions(memberId: string, limit = 20): Promise<Redemption[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_REDEMPTIONS;

  const { data } = await supabase
    .from("reward_redemptions")
    .select("id, reward_name_snapshot, cost_reps, status, redeemed_at, fulfilled_at")
    .eq("member_id", memberId)
    .order("redeemed_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    rewardName: r.reward_name_snapshot,
    costReps: r.cost_reps,
    status: r.status as Redemption["status"],
    redeemedAt: r.redeemed_at,
    fulfilledAt: r.fulfilled_at,
  }));
}

export async function getRepsBalance(memberId: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return MOCK_BALANCE;

  const { data } = await supabase
    .from("member_reps_balance")
    .select("balance")
    .eq("member_id", memberId)
    .maybeSingle();

  return data?.balance ?? 0;
}
