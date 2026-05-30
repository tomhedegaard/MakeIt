"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  computeAgreementScore,
  deriveMunkDecisionFromAlert,
  isCoachDecision,
  type CoachDecision,
} from "@/lib/coach-school/agreement";

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
