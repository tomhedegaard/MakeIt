"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  computeAgreementScore,
  deriveMunkDecisionFromAlert,
  isCoachDecision,
  type CoachDecision,
} from "@/lib/coach-school/agreement";
import { pickMembersForCoCoach } from "@/lib/coach-school/assignment";

/**
 * CC-4 — submit one sandbox review on an hrv_alert.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Beast picks a decision (approve/modify/escalate/reject) and optional
 * reasoning. We derive Munk's actual decision from the alert status,
 * compute an agreement score against it, and insert a coach_reviews
 * row. The score + Munk's decision come back in the response so the
 * UI can reveal the comparison side-by-side.
 *
 * RLS: coach_reviews_own_insert (migration 0045) accepts the insert
 * when reviewer_id = auth.uid(). Reading hrv_alerts to derive Munk's
 * decision goes through coach_manages_alerts (is_current_user_coach())
 * — sandbox/live coaches must have is_coach=true alongside coach_tier.
 */
export interface SandboxSubmitResult {
  ok: boolean;
  reason?: string;
  agreementScore?: number;
  munkDecision?: CoachDecision;
}

export async function submitSandboxReviewAction(input: {
  alertId: string;
  decision: string;
  reasoning?: string | null;
}): Promise<SandboxSubmitResult> {
  if (!isCoachDecision(input.decision)) {
    return { ok: false, reason: "invalid-decision" };
  }
  const beastDecision: CoachDecision = input.decision;

  if (!SUPABASE_ENABLED) {
    // Demo mode: optimistic path. The page rendered against MOCK_CASES,
    // so callers handle the "what Munk decided" reveal client-side.
    return { ok: true, agreementScore: 1.0, munkDecision: beastDecision };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: alert, error: alertErr } = await supabase
    .from("hrv_alerts")
    .select("status")
    .eq("id", input.alertId)
    .single();
  if (alertErr || !alert) return { ok: false, reason: "alert-not-found" };

  const munkDecision = deriveMunkDecisionFromAlert(alert.status as string);
  if (!munkDecision) return { ok: false, reason: "alert-not-decided" };

  const agreementScore = computeAgreementScore(beastDecision, munkDecision);
  const reasoning =
    (input.reasoning ?? "").slice(0, 1000).trim() || null;

  const { error: insErr } = await supabase
    .from("coach_reviews")
    .insert({
      reviewer_id: user.id,
      mode: "sandbox",
      source_type: "hrv_alert",
      source_id: input.alertId,
      decision: beastDecision,
      reasoning,
      munk_decision: munkDecision,
      agreement_score: agreementScore,
    });
  if (insErr) {
    console.warn("[coach-school] sandbox review insert failed:", insErr.message);
    return { ok: false, reason: "insert-failed" };
  }

  revalidatePath("/coach-school/sandbox");
  return { ok: true, agreementScore, munkDecision };
}

/**
 * CC-5 — Munk-only "Promote to live" action.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Flips a Beast from coach_tier='beast_sandbox' to 'beast_live' and
 * auto-creates up to 3 co_coach_assignments via the pure picker.
 *
 * Guards:
 *   - The caller must be Munk (coach_tier='munk'). Privileged role check
 *     happens against the service-role client; the caller's identity is
 *     resolved through the cookie-aware client first.
 *   - The Beast must currently be in 'beast_sandbox' — promoting an
 *     already-live or non-sandbox member is rejected so accidental
 *     double-promotions are explicit (caller sees the reason).
 *
 * v0 assignment is random-but-deterministic (see pickMembersForCoCoach
 * jsdoc). Complementarity-scored picks ship in CC-5b.
 */
export interface PromoteToLiveResult {
  ok: boolean;
  reason?: string;
  /** member_ids the freshly-promoted co-coach is now assigned to review. */
  assignedMemberIds?: string[];
}

const PROMOTE_PICK_COUNT = 3;

export async function promoteToLiveAction(input: {
  beastMemberId: string;
}): Promise<PromoteToLiveResult> {
  if (!SUPABASE_ENABLED) {
    // Demo mode — no-op success so CC-7's surface stays exercisable.
    return { ok: true, assignedMemberIds: [] };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // All privileged reads/writes go through the service-role client —
  // the action mutates members.coach_tier (no member-write RLS) and
  // inserts co_coach_assignments (Munk-only RLS that we verify above).
  const svc = createServiceClient();

  // Caller must be Munk.
  const { data: callerRow, error: callerErr } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", user.id)
    .single();
  if (callerErr) return { ok: false, reason: "caller-lookup-failed" };
  if (callerRow?.coach_tier !== "munk") {
    return { ok: false, reason: "not-munk" };
  }

  // Beast must currently be in sandbox.
  const { data: beastRow, error: beastErr } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", input.beastMemberId)
    .single();
  if (beastErr || !beastRow) return { ok: false, reason: "beast-not-found" };
  if (beastRow.coach_tier !== "beast_sandbox") {
    return { ok: false, reason: "beast-not-in-sandbox" };
  }

  // Roster of candidate assigned members + active assignments.
  const [rosterRes, activeRes] = await Promise.all([
    svc.from("members").select("id").eq("is_coach", false),
    svc.from("co_coach_assignments").select("assigned_member_id").is("ended_at", null),
  ]);
  if (rosterRes.error) return { ok: false, reason: "roster-lookup-failed" };
  if (activeRes.error) return { ok: false, reason: "assignments-lookup-failed" };

  const roster = (rosterRes.data ?? []).map((r) => r.id as string);
  const alreadyAssigned = new Set(
    (activeRes.data ?? []).map((r) => r.assigned_member_id as string),
  );
  const picks = pickMembersForCoCoach({
    roster,
    beastId: input.beastMemberId,
    alreadyAssigned,
    count: PROMOTE_PICK_COUNT,
  });

  // Promote first so a partial assignment-insert below still leaves the
  // tier flipped (CC-7 surface will show "live but no assignments yet"
  // — easier to recover than the inverse).
  const { error: tierErr } = await svc
    .from("members")
    .update({ coach_tier: "beast_live" })
    .eq("id", input.beastMemberId);
  if (tierErr) return { ok: false, reason: "tier-update-failed" };

  if (picks.length > 0) {
    const { error: insErr } = await svc.from("co_coach_assignments").insert(
      picks.map((memberId) => ({
        coach_member_id: input.beastMemberId,
        assigned_member_id: memberId,
        assigned_by: user.id,
      })),
    );
    if (insErr) {
      console.warn("[coach-school] assignment insert failed:", insErr.message);
      // Tier already flipped — surface partial state to caller.
      return {
        ok: false,
        reason: "assignment-insert-failed",
        assignedMemberIds: [],
      };
    }
  }

  revalidatePath("/coach/co-coaches");
  revalidatePath("/coach-school/live");
  return { ok: true, assignedMemberIds: picks };
}

/**
 * CC-5 — submit one LIVE review on an hrv_alert (co-coach decides
 * inline; closes the alert).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Co-coach picks a decision; we insert a coach_reviews row with
 * mode='live' (no Munk comparison stored at write-time — quality cron
 * CC-8 spot-checks live decisions) AND update the alert's status so
 * it leaves the queue.
 *
 * Status mapping mirrors the existing hrv_alert review actions:
 *   - approve  → 'reviewed_noted'      (acknowledged, no action)
 *   - modify / escalate / reject → 'reviewed_actioned'   (took action)
 *
 * RLS: coach_reviews insert is gated by reviewer_id = auth.uid().
 * hrv_alerts update relies on the existing coach_manages_alerts policy
 * (is_current_user_coach()) — co-coaches must have is_coach=true
 * alongside coach_tier (set by promoteToLiveAction).
 */
export interface SubmitLiveResult {
  ok: boolean;
  reason?: string;
}

export async function submitLiveReviewAction(input: {
  alertId: string;
  decision: string;
  reasoning?: string | null;
}): Promise<SubmitLiveResult> {
  if (!isCoachDecision(input.decision)) {
    return { ok: false, reason: "invalid-decision" };
  }
  const decision: CoachDecision = input.decision;

  if (!SUPABASE_ENABLED) {
    // Demo mode — optimistic no-op.
    return { ok: true };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const reasoning = (input.reasoning ?? "").slice(0, 1000).trim() || null;

  const { error: insErr } = await supabase
    .from("coach_reviews")
    .insert({
      reviewer_id: user.id,
      mode: "live",
      source_type: "hrv_alert",
      source_id: input.alertId,
      decision,
      reasoning,
    });
  if (insErr) {
    console.warn("[coach-school] live review insert failed:", insErr.message);
    return { ok: false, reason: "insert-failed" };
  }

  const nextStatus = decision === "approve" ? "reviewed_noted" : "reviewed_actioned";
  const { error: updErr } = await supabase
    .from("hrv_alerts")
    .update({
      status: nextStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.alertId)
    .eq("status", "open");
  if (updErr) {
    // Review row already inserted — surface partial state so the
    // co-coach knows their call landed even if the queue didn't clear.
    console.warn("[coach-school] live alert close failed:", updErr.message);
    return { ok: false, reason: "alert-close-failed" };
  }

  revalidatePath("/coach-school/live");
  return { ok: true };
}
