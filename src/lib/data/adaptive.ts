import "server-only";

import type { ActiveAdaptation } from "@/lib/adaptive/explanation";
import type { AdaptiveAction } from "@/lib/adaptive/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Eligibility for the Adaptive Program Engine consent card. The card
 * shows when the member has a mature baseline (warmUpState='active'),
 * has the flag turned off, and has at least one active wearable
 * connection. Returns `eligible=false` for any other state — caller
 * renders nothing.
 *
 * Demo / no Supabase → `eligible=false`.
 */
export interface AdaptiveConsentEligibility {
  eligible: boolean;
}

export async function getAdaptiveConsentEligibility(
  memberId: string
): Promise<AdaptiveConsentEligibility> {
  const supabase = await createClient();
  if (!supabase) return { eligible: false };

  const [
    { data: settings },
    { data: latestReading },
    { count: activeConnCount },
  ] = await Promise.all([
    supabase
      .from("hrv_settings")
      .select("adaptive_program_enabled")
      .eq("member_id", memberId)
      .maybeSingle(),
    supabase
      .from("hrv_readings")
      .select("warm_up_state")
      .eq("member_id", memberId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hrv_wearable_connections")
      .select("id", { head: true, count: "exact" })
      .eq("member_id", memberId)
      .eq("status", "active"),
  ]);

  const enabled = settings?.adaptive_program_enabled === true;
  if (enabled) return { eligible: false };

  const warmUpActive = latestReading?.warm_up_state === "active";
  const connected = (activeConnCount ?? 0) > 0;

  return { eligible: warmUpActive && connected };
}

/**
 * Return the active adaptive_v0 modifier for one (member, session)
 * pair, or null when no adaptation applies. The session-flow page
 * mounts the AdaptationCard from this — null means no card.
 *
 * Demo mode / no Supabase → null (same shape as
 * getTodaysReadinessNudge).
 *
 * At most one row exists per (member, session, reason='adaptive_v0')
 * by virtue of the persistence layer's idempotency check. We `.limit(1)
 * .maybeSingle()` defensively in case the invariant ever breaks — the
 * card shows the most recent row.
 */
export async function getActiveAdaptationForSession(
  memberId: string,
  sessionId: string
): Promise<ActiveAdaptation | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("hrv_session_modifiers")
    .select(
      "id, modifier_type, explanation_da, reviewed_by, accepted_by_member, applied_value, input_snapshot, rule_decision, reasoning_output, reasoning_revealed_at, created_at"
    )
    .eq("member_id", memberId)
    .eq("session_id", sessionId)
    .eq("reason", "adaptive_v0")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[data/adaptive] getActiveAdaptationForSession:",
      error.message
    );
    return null;
  }
  if (!data) return null;
  if (!data.explanation_da) return null;

  // applied_value is jsonb, typed as Json by Supabase-generated types.
  // It's either null or an object — we narrow to a record for the
  // apply layer.
  const params = narrowJsonObject(data.applied_value);
  const ruleDecision = narrowRuleDecision(data.rule_decision);
  const reasoningOutput = narrowReasoningOutput(data.reasoning_output);
  const inputSnapshot = data.input_snapshot ?? null;
  const recentFormCheckCount =
    typeof inputSnapshot === "object" &&
    inputSnapshot !== null &&
    !Array.isArray(inputSnapshot)
      ? typeof (inputSnapshot as { recent_form_check_count?: unknown })
          .recent_form_check_count === "number"
        ? ((inputSnapshot as { recent_form_check_count: number })
            .recent_form_check_count)
        : 0
      : 0;

  return {
    modifierId: data.id as string,
    modifierType: data.modifier_type as AdaptiveAction,
    explanationDa: data.explanation_da,
    reviewedBy: (data.reviewed_by as string | null) ?? null,
    acceptedByMember: (data.accepted_by_member as boolean | null) ?? null,
    params,
    inputSnapshot,
    ruleDecision,
    reasoningOutput,
    reasoningRevealedAt:
      (data.reasoning_revealed_at as string | null) ?? null,
    createdAt: data.created_at as string,
    recentFormCheckCount,
  };
}

/** Narrow a jsonb cell to a flat record. Arrays + scalars → empty. */
function narrowJsonObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

/**
 * Narrow `rule_decision` jsonb (written by persist.ts) to the shape
 * AdaptationCard / ReasoningDetailPanel consume. Returns undefined
 * (not null) when the blob is missing or malformed — the optional
 * field on ActiveAdaptation distinguishes "absent" from "present
 * but null" cleanly.
 */
function narrowRuleDecision(
  v: unknown
): ActiveAdaptation["ruleDecision"] | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const obj = v as Record<string, unknown>;
  if (typeof obj.action !== "string") return undefined;
  return {
    action: obj.action as AdaptiveAction,
    reasons: Array.isArray(obj.reasons)
      ? (obj.reasons as unknown[]).filter(
          (r): r is string => typeof r === "string"
        )
      : [],
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    params: narrowJsonObject(obj.params),
  };
}

/**
 * Narrow `reasoning_output` jsonb (Claude's raw output stored
 * verbatim by persist.ts) to just the fields the reasoning panel
 * needs. Returns null when the blob is null/missing (rule-only
 * decision). Returns the narrowed shape otherwise.
 */
function narrowReasoningOutput(
  v: unknown
): ActiveAdaptation["reasoningOutput"] {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const obj = v as Record<string, unknown>;
  if (typeof obj.final_action !== "string") return null;
  return {
    finalAction: obj.final_action as AdaptiveAction,
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
  };
}
