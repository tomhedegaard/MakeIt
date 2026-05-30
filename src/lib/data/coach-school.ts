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
