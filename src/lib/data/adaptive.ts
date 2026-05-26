import "server-only";

import type { ActiveAdaptation } from "@/lib/adaptive/explanation";
import type { AdaptiveAction } from "@/lib/adaptive/types";
import type { ReadinessBucket } from "@/lib/hrv/types";
import { createClient } from "@/lib/supabase/server";

const MS_PER_DAY = 86_400_000;

/**
 * One row in the "Tidligere tilpasninger" section on /hrv. Joins the
 * `adaptive_outcomes_v0` view (modifier + outcome metrics) with the
 * matching session's title so the row can render with member-facing
 * context without N+1 queries per row.
 *
 * Drives the AdaptationHistory component (Søjle 2 OB-6).
 */
export interface AdaptationHistoryItem {
  modifierId: string;
  modifierType: AdaptiveAction;
  createdAt: string;
  acceptedByMember: boolean | null;
  reviewedBy: string | null;
  sessionStatus: "scheduled" | "active" | "completed" | "skipped" | null;
  sessionTitle: string | null;
  sessionDayLabel: string | null;
  topSetRpeDelta: number | null;
  completionRatio: number | null;
  nextDayReadiness: ReadinessBucket | null;
}

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
  /**
   * True when the consent card should show. Gated on warmUpState=
   * 'active' + has active wearable + flag NOT yet enabled.
   */
  eligible: boolean;
  /**
   * True when adaptive_program_enabled is currently true — the member
   * has already opted in. Drives whether the history section shows
   * (we hide history for members who haven't opted in to avoid
   * competing with the consent card).
   */
  enabled: boolean;
}

export async function getAdaptiveConsentEligibility(
  memberId: string
): Promise<AdaptiveConsentEligibility> {
  const supabase = await createClient();
  if (!supabase) return { eligible: false, enabled: false };

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
  if (enabled) return { eligible: false, enabled: true };

  const warmUpActive = latestReading?.warm_up_state === "active";
  const connected = (activeConnCount ?? 0) > 0;

  return { eligible: warmUpActive && connected, enabled: false };
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

/**
 * Fetch the member's recent adaptive_v0 history for the "Tidligere
 * tilpasninger" surface on /hrv. Joins the outcomes view with session
 * titles in two queries (PostgREST doesn't auto-detect view→table
 * relationships, and a single batch query for titles is cheaper than
 * altering the view).
 *
 * Returns rows in reverse chronological order (newest first), limited
 * to `days` days back. Demo mode → empty array.
 */
export async function getRecentAdaptations(
  memberId: string,
  days = 30
): Promise<AdaptationHistoryItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();

  const { data: rows, error } = await supabase
    .from("adaptive_outcomes_v0")
    .select(
      "modifier_id, modifier_type, adapted_at, accepted_by_member, reviewed_by, session_status, session_id, top_set_rpe_delta, completion_ratio, next_day_readiness"
    )
    .eq("member_id", memberId)
    .gte("adapted_at", since)
    .order("adapted_at", { ascending: false });

  if (error) {
    console.error(
      "[data/adaptive] getRecentAdaptations outcomes:",
      error.message
    );
    return [];
  }
  if (!rows || rows.length === 0) return [];

  // Batch fetch session titles for all referenced sessions.
  const sessionIds = rows
    .map((r) => r.session_id as string | null)
    .filter((id): id is string => id !== null);
  const sessionTitles = new Map<
    string,
    { title: string | null; day_label: string | null }
  >();
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, title, day_label")
      .in("id", sessionIds);
    for (const s of sessions ?? []) {
      sessionTitles.set(s.id as string, {
        title: (s.title as string | null) ?? null,
        day_label: (s.day_label as string | null) ?? null,
      });
    }
  }

  return rows.map((r) => {
    const sessionInfo = r.session_id
      ? sessionTitles.get(r.session_id as string)
      : null;
    return {
      modifierId: r.modifier_id as string,
      modifierType: r.modifier_type as AdaptiveAction,
      createdAt: r.adapted_at as string,
      acceptedByMember: (r.accepted_by_member as boolean | null) ?? null,
      reviewedBy: (r.reviewed_by as string | null) ?? null,
      sessionStatus:
        (r.session_status as AdaptationHistoryItem["sessionStatus"]) ?? null,
      sessionTitle: sessionInfo?.title ?? null,
      sessionDayLabel: sessionInfo?.day_label ?? null,
      topSetRpeDelta:
        typeof r.top_set_rpe_delta === "number" ? r.top_set_rpe_delta : null,
      completionRatio:
        typeof r.completion_ratio === "number" ? r.completion_ratio : null,
      nextDayReadiness:
        (r.next_day_readiness as ReadinessBucket | null) ?? null,
    };
  });
}
