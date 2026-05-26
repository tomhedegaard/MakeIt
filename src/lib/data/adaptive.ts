import "server-only";

import type { ActiveAdaptation } from "@/lib/adaptive/explanation";
import type { AdaptiveAction } from "@/lib/adaptive/types";
import { createClient } from "@/lib/supabase/server";

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
      "id, modifier_type, explanation_da, reviewed_by, accepted_by_member, applied_value"
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
  const params =
    data.applied_value && typeof data.applied_value === "object" && !Array.isArray(data.applied_value)
      ? (data.applied_value as Record<string, unknown>)
      : {};

  return {
    modifierId: data.id as string,
    modifierType: data.modifier_type as AdaptiveAction,
    explanationDa: data.explanation_da,
    reviewedBy: (data.reviewed_by as string | null) ?? null,
    acceptedByMember: (data.accepted_by_member as boolean | null) ?? null,
    params,
  };
}
