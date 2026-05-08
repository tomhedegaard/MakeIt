import { createClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------- *
 * Types
 * ---------------------------------------------------------------- */

export type ActivityBucket = "active" | "slowing" | "atRisk" | "inactive";

export type ActivityBuckets = {
  active: number;   // trained ≤ 7d
  slowing: number;  // 8–14d
  atRisk: number;   // 15–28d
  inactive: number; // 29+d or never trained
  total: number;
};

export type AtRiskMember = {
  id: string;
  handle: string;
  tier: string;
  daysSinceLastSession: number | null; // null = never trained
  programCode: string | null;
  bucket: ActivityBucket;
};

export type TierSlice = {
  tier: "Lifter" | "Athlete" | "Beast" | "Legend";
  count: number;
  pct: number; // 0–100, rounded
};

export type SignupBucket = {
  weekIso: string;       // ISO Monday of week, "YYYY-MM-DD"
  weekLabel: string;     // "Uge 19"
  count: number;
};

export type OnboardingStats = {
  total: number;
  onboarded: number;
  pct: number; // 0–100
};

export type MemberHealthSnapshot = {
  buckets: ActivityBuckets;
  atRisk: AtRiskMember[];
  tiers: TierSlice[];
  signups: SignupBucket[];
  onboarding: OnboardingStats;
  noProgramCount: number; // members with no active program assignment
};

/* ---------------------------------------------------------------- *
 * Mock fallback — used in demo mode (no supabase client)
 * ---------------------------------------------------------------- */

const MOCK_SNAPSHOT: MemberHealthSnapshot = {
  buckets: { active: 18, slowing: 6, atRisk: 4, inactive: 3, total: 31 },
  atRisk: [
    { id: "m-anders",   handle: "anders",   tier: "Lifter",  daysSinceLastSession: 22, programCode: null,     bucket: "atRisk" },
    { id: "m-oliver",   handle: "oliver",   tier: "Lifter",  daysSinceLastSession: 18, programCode: "STR-12", bucket: "atRisk" },
    { id: "m-jens",     handle: "jens",     tier: "Athlete", daysSinceLastSession: 17, programCode: "HYP-08", bucket: "atRisk" },
    { id: "m-frederik", handle: "frederik", tier: "Lifter",  daysSinceLastSession: 12, programCode: "HYP-08", bucket: "slowing" },
    { id: "m-signe",    handle: "signe",    tier: "Athlete", daysSinceLastSession: 10, programCode: "PWR-10", bucket: "slowing" },
  ],
  tiers: [
    { tier: "Lifter",  count: 14, pct: 45 },
    { tier: "Athlete", count: 11, pct: 35 },
    { tier: "Beast",   count: 5,  pct: 16 },
    { tier: "Legend",  count: 1,  pct: 3  },
  ],
  signups: [
    { weekIso: "2026-03-09", weekLabel: "Uge 11", count: 2 },
    { weekIso: "2026-03-16", weekLabel: "Uge 12", count: 4 },
    { weekIso: "2026-03-23", weekLabel: "Uge 13", count: 3 },
    { weekIso: "2026-03-30", weekLabel: "Uge 14", count: 5 },
    { weekIso: "2026-04-06", weekLabel: "Uge 15", count: 3 },
    { weekIso: "2026-04-13", weekLabel: "Uge 16", count: 6 },
    { weekIso: "2026-04-20", weekLabel: "Uge 17", count: 4 },
    { weekIso: "2026-04-27", weekLabel: "Uge 18", count: 4 },
  ],
  onboarding: { total: 31, onboarded: 27, pct: 87 },
  noProgramCount: 5,
};

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

/**
 * Member-health snapshot for the coach analytics page. One round-trip
 * worth of queries pulled apart into a single object so the page can
 * lay out its cards from a single fetch. Falls back to a fixed mock
 * shape when supabase isn't configured (demo mode).
 */
export async function getMemberHealth(): Promise<MemberHealthSnapshot> {
  const supabase = await createClient();
  if (!supabase) return MOCK_SNAPSHOT;

  // All members + their active program (if any).
  const { data: members } = await supabase
    .from("members")
    .select(`
      id, handle, tier, joined_at, onboarded_at,
      program_assignments!program_assignments_member_id_fkey (
        status,
        programs:programs (code)
      )
    `);

  // All completed sessions, ordered desc — one pass to build a
  // last-seen map per member.
  const { data: sessions } = await supabase
    .from("sessions")
    .select("member_id, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const lastByMember = new Map<string, Date>();
  for (const s of sessions ?? []) {
    if (!s.member_id || !s.completed_at) continue;
    if (!lastByMember.has(s.member_id)) {
      lastByMember.set(s.member_id, new Date(s.completed_at));
    }
  }

  const list = members ?? [];
  const total = list.length;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const buckets: ActivityBuckets = { active: 0, slowing: 0, atRisk: 0, inactive: 0, total };
  const tierCounts = new Map<string, number>();
  const atRiskRows: AtRiskMember[] = [];
  let onboardedCount = 0;
  let noProgramCount = 0;

  for (const m of list) {
    const last = lastByMember.get(m.id) ?? null;
    const days = last ? Math.floor((now - last.getTime()) / dayMs) : null;
    const bucket = bucketFor(days);
    buckets[bucket] += 1;

    tierCounts.set(m.tier, (tierCounts.get(m.tier) ?? 0) + 1);

    if (m.onboarded_at) onboardedCount += 1;

    const pa = (m.program_assignments as Array<{ status: string; programs: { code: string } | { code: string }[] | null }> | null) ?? [];
    const active = pa.find((p) => p.status === "active");
    const program = active ? (Array.isArray(active.programs) ? active.programs[0] : active.programs) : null;
    if (!active) noProgramCount += 1;

    // At-risk surface = slowing + atRisk + inactive-but-was-active members.
    // Members who have never trained get included only if they joined >7d ago.
    const includeNeverTrained = !last && m.joined_at
      ? (now - new Date(m.joined_at).getTime()) > 7 * dayMs
      : false;
    if (bucket === "slowing" || bucket === "atRisk" || (bucket === "inactive" && (last || includeNeverTrained))) {
      atRiskRows.push({
        id: m.id,
        handle: m.handle,
        tier: m.tier,
        daysSinceLastSession: days,
        programCode: program?.code ?? null,
        bucket,
      });
    }
  }

  // Sort at-risk: nulls (never trained) last, otherwise highest days first.
  atRiskRows.sort((a, b) => {
    if (a.daysSinceLastSession === null && b.daysSinceLastSession === null) return 0;
    if (a.daysSinceLastSession === null) return 1;
    if (b.daysSinceLastSession === null) return -1;
    return b.daysSinceLastSession - a.daysSinceLastSession;
  });

  const tierOrder: TierSlice["tier"][] = ["Lifter", "Athlete", "Beast", "Legend"];
  const tiers: TierSlice[] = tierOrder.map((tier) => {
    const count = tierCounts.get(tier) ?? 0;
    return { tier, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });

  // Signup trend — last 8 ISO weeks. Bucket by ISO Monday.
  const signups = computeSignupTrend(list.map((m) => m.joined_at as string | null), 8);

  return {
    buckets,
    atRisk: atRiskRows.slice(0, 12),
    tiers,
    signups,
    onboarding: {
      total,
      onboarded: onboardedCount,
      pct: total > 0 ? Math.round((onboardedCount / total) * 100) : 0,
    },
    noProgramCount,
  };
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function bucketFor(days: number | null): ActivityBucket {
  if (days === null) return "inactive";
  if (days <= 7) return "active";
  if (days <= 14) return "slowing";
  if (days <= 28) return "atRisk";
  return "inactive";
}

/**
 * Group a list of joined_at timestamps into the last `count` ISO weeks
 * (Monday-anchored). Always returns `count` buckets, oldest first, so
 * the chart has stable axes even if no signups happened that week.
 */
function computeSignupTrend(joinedAts: Array<string | null>, count: number): SignupBucket[] {
  const weeks: SignupBucket[] = [];
  const now = new Date();
  const monday = isoMonday(now);

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(start.getDate() - i * 7);
    weeks.push({
      weekIso: start.toISOString().slice(0, 10),
      weekLabel: `Uge ${isoWeekNumber(start)}`,
      count: 0,
    });
  }

  const earliest = new Date(weeks[0].weekIso + "T00:00:00Z").getTime();
  const weekIndex = new Map(weeks.map((w, i) => [w.weekIso, i]));

  for (const iso of joinedAts) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (t < earliest) continue;
    const w = isoMonday(new Date(iso)).toISOString().slice(0, 10);
    const idx = weekIndex.get(w);
    if (idx !== undefined) weeks[idx].count += 1;
  }

  return weeks;
}

function isoMonday(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = out.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}
