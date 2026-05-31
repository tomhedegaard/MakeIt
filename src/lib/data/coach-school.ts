/**
 * Crew Coaching Pyramid — sandbox data layer (CC-4).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Reads the hrv_alerts Munk has already decided + filters out the ones
 * the current sandbox coach has already reviewed. Service-role client
 * because the sandbox surface intentionally reads across all members
 * (Beasts in training see the same queue Munk saw), and the page-level
 * tier gate enforces coach_tier ∈ {beast_sandbox, beast_live, munk}.
 *
 * v0 simplification: only sources hrv_alerts. The schema's
 * source_type also supports 'form_check' and 'adaptation' — those
 * sandbox modes ship in a follow-up once the agreement-derivation
 * for those source types is settled.
 */
import "server-only";

import { getSession } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  CoachDecision,
} from "@/lib/coach-school/agreement";
import { deriveMunkDecisionFromAlert } from "@/lib/coach-school/agreement";

export type SandboxTier = "beast_sandbox" | "beast_live" | "munk";

/** Returns the current user's coach_tier when it qualifies for the
 *  sandbox surface; null otherwise. Server-side gate for the page. */
export async function getSandboxTier(): Promise<SandboxTier | null> {
  const member = await getSession();
  if (!member) return null;
  if (!SUPABASE_ENABLED) {
    // Demo mode — Munk session always passes; lets the page render mocks.
    return member.handle.toLowerCase() === "munk" ? "munk" : null;
  }
  const svc = createServiceClient();
  const { data } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", member.id)
    .single();
  const tier = data?.coach_tier;
  if (tier === "beast_sandbox" || tier === "beast_live" || tier === "munk") {
    return tier;
  }
  return null;
}

/** One sandbox case the Beast hasn't yet reviewed. */
export interface SandboxCase {
  alertId: string;
  triggeredAt: string;
  memberHandle: string;
  conditionsMet: Record<string, unknown>;
  /** Munk's derived decision (hidden from the Beast until they submit). */
  munkDecisionHidden: CoachDecision;
  /** Status string preserved for later schema refinement. */
  alertStatus: string;
}

const MOCK_CASES: SandboxCase[] = [
  {
    alertId: "demo-alert-1",
    triggeredAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
    memberHandle: "nina_dl",
    conditionsMet: {
      readiness_bucket: "very_low",
      rolling_low_days: 2,
      hr_delta: "+8 bpm vs baseline",
    },
    munkDecisionHidden: "modify",
    alertStatus: "reviewed_actioned",
  },
  {
    alertId: "demo-alert-2",
    triggeredAt: new Date(Date.now() - 54 * 3_600_000).toISOString(),
    memberHandle: "maria.lift",
    conditionsMet: {
      readiness_bucket: "low",
      rolling_low_days: 1,
      sleep_hours_avg2d: 6.2,
    },
    munkDecisionHidden: "approve",
    alertStatus: "reviewed_noted",
  },
  {
    alertId: "demo-alert-3",
    triggeredAt: new Date(Date.now() - 72 * 3_600_000).toISOString(),
    memberHandle: "kasper_s",
    conditionsMet: {
      readiness_bucket: "very_low",
      rolling_low_days: 3,
      alcohol_last_2d: true,
    },
    munkDecisionHidden: "modify",
    alertStatus: "reviewed_actioned",
  },
];

/**
 * Sandbox cases for the current Beast: decided hrv_alerts where the
 * Beast hasn't yet submitted a coach_reviews row. Newest first; capped
 * so the page stays scannable.
 */
export async function getPendingSandboxCases(
  limit: number = 12,
): Promise<SandboxCase[]> {
  const member = await getSession();
  if (!member) return [];
  if (!SUPABASE_ENABLED) return MOCK_CASES;

  const svc = createServiceClient();

  // 1) Decided alerts.
  const { data: alertRows, error: alertErr } = await svc
    .from("hrv_alerts")
    .select(
      "id, triggered_at, status, conditions_met, member:members!inner(handle)",
    )
    .in("status", ["reviewed_actioned", "reviewed_noted"])
    .order("triggered_at", { ascending: false })
    .limit(limit * 3); // overshoot so we still have N after filtering
  if (alertErr) throw new Error(`alerts: ${alertErr.message}`);

  // 2) Beast's prior reviews on hrv_alert sources — to filter out.
  const { data: reviewedRows, error: revErr } = await svc
    .from("coach_reviews")
    .select("source_id")
    .eq("reviewer_id", member.id)
    .eq("source_type", "hrv_alert");
  if (revErr) throw new Error(`reviews: ${revErr.message}`);
  const reviewed = new Set(
    (reviewedRows ?? []).map((r) => r.source_id as string),
  );

  const cases: SandboxCase[] = [];
  for (const a of alertRows ?? []) {
    const id = a.id as string;
    if (reviewed.has(id)) continue;

    const munkDerived = deriveMunkDecisionFromAlert(a.status as string);
    if (!munkDerived) continue; // safety: only decided alerts qualify

    const m = Array.isArray(a.member) ? a.member[0] : a.member;
    cases.push({
      alertId: id,
      triggeredAt: a.triggered_at as string,
      memberHandle: (m?.handle as string) ?? "—",
      conditionsMet:
        (a.conditions_met as Record<string, unknown> | null) ?? {},
      munkDecisionHidden: munkDerived,
      alertStatus: a.status as string,
    });
    if (cases.length >= limit) break;
  }
  return cases;
}

/* ================================================================== *
 * CC-5 — live cases for a promoted co-coach
 * ================================================================== */

/** One open hrv_alert assigned to the current co-coach for live review. */
export interface LiveCase {
  alertId: string;
  triggeredAt: string;
  memberId: string;
  memberHandle: string;
  conditionsMet: Record<string, unknown>;
}

const MOCK_LIVE_CASES: LiveCase[] = [
  {
    alertId: "demo-live-1",
    triggeredAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
    memberId: "m-nina",
    memberHandle: "nina_dl",
    conditionsMet: {
      readiness_bucket: "very_low",
      rolling_low_days: 2,
      sleep_hours_avg2d: 5.4,
    },
  },
  {
    alertId: "demo-live-2",
    triggeredAt: new Date(Date.now() - 9 * 3_600_000).toISOString(),
    memberId: "m-frederik",
    memberHandle: "frederik",
    conditionsMet: {
      readiness_bucket: "low",
      hr_delta: "+6 bpm vs baseline",
    },
  },
];

/**
 * Open hrv_alerts for the members currently assigned to the caller as
 * a live co-coach. Newest first. Demo mode returns a 2-case mock so
 * the page is exercisable without real co_coach_assignments rows.
 */
export async function getOpenLiveCases(limit: number = 20): Promise<LiveCase[]> {
  const member = await getSession();
  if (!member) return [];
  if (!SUPABASE_ENABLED) return MOCK_LIVE_CASES;

  const svc = createServiceClient();

  // The co-coach's current member assignments.
  const { data: assignRows, error: assignErr } = await svc
    .from("co_coach_assignments")
    .select("assigned_member_id")
    .eq("coach_member_id", member.id)
    .is("ended_at", null);
  if (assignErr) throw new Error(`assignments: ${assignErr.message}`);
  const memberIds = (assignRows ?? []).map((r) => r.assigned_member_id as string);
  if (memberIds.length === 0) return [];

  // Open alerts for those members.
  const { data: alertRows, error: alertErr } = await svc
    .from("hrv_alerts")
    .select(
      "id, triggered_at, conditions_met, member:members!inner(id, handle)",
    )
    .eq("status", "open")
    .in("member_id", memberIds)
    .order("triggered_at", { ascending: false })
    .limit(limit);
  if (alertErr) throw new Error(`alerts: ${alertErr.message}`);

  return (alertRows ?? []).map<LiveCase>((a) => {
    const m = Array.isArray(a.member) ? a.member[0] : a.member;
    return {
      alertId: a.id as string,
      triggeredAt: a.triggered_at as string,
      memberId: (m?.id as string) ?? "",
      memberHandle: (m?.handle as string) ?? "—",
      conditionsMet:
        (a.conditions_met as Record<string, unknown> | null) ?? {},
    };
  });
}

/* ================================================================== *
 * CC-7 — Munks ops-view: Beasts-in-training agreement stats
 * ================================================================== */

/**
 * Rolling window for agreement-score averages on the co-coach surface.
 *
 * Matches the gate documented in src/lib/coach-school/agreement.ts:
 * "the rolling mean of the last 50 scores drives the promotion gate
 * (CC-7's /coach/co-coaches view, threshold = 0.80)."
 */
export const PROMOTE_THRESHOLD = 0.8;
export const ROLLING_WINDOW = 50;

/** One sandbox-Beast row for the /coach/co-coaches surface. */
export interface BeastInTraining {
  memberId: string;
  handle: string;
  /** Avg agreement_score over the last ROLLING_WINDOW sandbox reviews. */
  rollingAgreement: number | null;
  /** Total sandbox reviews submitted (used as a "have we enough data" hint). */
  sandboxReviewCount: number;
  /** Timestamp of the most recent sandbox review, ISO. */
  lastReviewAt: string | null;
  /** True iff rollingAgreement ≥ PROMOTE_THRESHOLD with ≥ROLLING_WINDOW reviews. */
  liveReady: boolean;
}

const MOCK_BEASTS: BeastInTraining[] = [
  {
    memberId: "demo-beast-1",
    handle: "nina_dl",
    rollingAgreement: 0.87,
    sandboxReviewCount: 52,
    lastReviewAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    liveReady: true,
  },
  {
    memberId: "demo-beast-2",
    handle: "kasper_s",
    rollingAgreement: 0.74,
    sandboxReviewCount: 41,
    lastReviewAt: new Date(Date.now() - 20 * 3_600_000).toISOString(),
    liveReady: false,
  },
  {
    memberId: "demo-beast-3",
    handle: "maria.lift",
    rollingAgreement: 0.92,
    sandboxReviewCount: 63,
    lastReviewAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    liveReady: true,
  },
  {
    memberId: "demo-beast-4",
    handle: "frederik",
    rollingAgreement: null,
    sandboxReviewCount: 3,
    lastReviewAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
    liveReady: false,
  },
];

/**
 * All members currently in coach_tier='beast_sandbox', enriched with
 * the rolling-average agreement_score over the last ROLLING_WINDOW
 * sandbox reviews each Beast submitted.
 *
 * Service-role client — page-level Munk-only gate keeps this surface
 * private (caller is /coach/co-coaches, gated by getSandboxTier()==='munk').
 *
 * v0 aggregation pulls the last ROLLING_WINDOW rows per Beast in a
 * single round-trip then averages in-memory: a window-function query
 * would scale better but the sandbox cohort is small (<50 Beasts) and
 * keeping the SQL boring trumps premature optimization here.
 *
 * `rollingAgreement` is null when the Beast has submitted zero reviews
 * (avoids a misleading "0% agreement" badge on someone who hasn't
 * started). `liveReady` requires ≥ROLLING_WINDOW reviews so Munk
 * doesn't promote on a 3-sample 1.0 fluke.
 */
export async function getBeastsInTraining(): Promise<BeastInTraining[]> {
  if (!SUPABASE_ENABLED) return MOCK_BEASTS;

  const svc = createServiceClient();

  const { data: beastRows, error: beastErr } = await svc
    .from("members")
    .select("id, handle")
    .eq("coach_tier", "beast_sandbox");
  if (beastErr) throw new Error(`beasts: ${beastErr.message}`);
  const beasts = beastRows ?? [];
  if (beasts.length === 0) return [];

  const beastIds = beasts.map((b) => b.id as string);

  // One query: every sandbox review for every Beast, newest first. We
  // then take the first ROLLING_WINDOW per reviewer in JS. Smaller and
  // more predictable than a per-Beast window query at this cohort size.
  const { data: reviewRows, error: revErr } = await svc
    .from("coach_reviews")
    .select("reviewer_id, agreement_score, submitted_at")
    .eq("mode", "sandbox")
    .in("reviewer_id", beastIds)
    .order("submitted_at", { ascending: false });
  if (revErr) throw new Error(`reviews: ${revErr.message}`);

  // Group → first N per reviewer → avg of non-null scores.
  const perBeast = new Map<
    string,
    { scores: number[]; total: number; lastAt: string | null }
  >();
  for (const r of reviewRows ?? []) {
    const id = r.reviewer_id as string;
    const bucket =
      perBeast.get(id) ?? { scores: [], total: 0, lastAt: null };
    bucket.total += 1;
    if (bucket.lastAt === null) bucket.lastAt = r.submitted_at as string;
    if (
      bucket.scores.length < ROLLING_WINDOW &&
      r.agreement_score !== null
    ) {
      bucket.scores.push(r.agreement_score as number);
    }
    perBeast.set(id, bucket);
  }

  return beasts.map<BeastInTraining>((b) => {
    const id = b.id as string;
    const bucket = perBeast.get(id);
    const scores = bucket?.scores ?? [];
    const avg =
      scores.length > 0
        ? scores.reduce((acc, s) => acc + s, 0) / scores.length
        : null;
    const liveReady =
      avg !== null && avg >= PROMOTE_THRESHOLD && scores.length >= ROLLING_WINDOW;
    return {
      memberId: id,
      handle: (b.handle as string) ?? "—",
      rollingAgreement: avg,
      sandboxReviewCount: bucket?.total ?? 0,
      lastReviewAt: bucket?.lastAt ?? null,
      liveReady,
    };
  });
}
