import "server-only";

import { getActiveAdaptationForSession } from "@/lib/data/adaptive";
import type { ActiveAdaptation } from "@/lib/adaptive/explanation";
import {
  EXPLAINER_EXPLANATION_DA,
  explainerScenarioDecision,
} from "@/lib/adaptive/mock-scenarios";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

/**
 * Today's adaptation for the dashboard's session card.
 *
 * - No session today → null.
 * - Connected → the persisted adaptive_v0 modifier for that session.
 * - Demo → the explainer scenario, so "Behold original" can be shown
 *   without a backend. The session page itself still shows no
 *   adaptation in demo (known deviation, unchanged in F3).
 */
export async function getTodayAdaptation(
  memberId: string,
  sessionId: string | null,
): Promise<ActiveAdaptation | null> {
  if (!sessionId) return null;
  if (SUPABASE_ENABLED) {
    return getActiveAdaptationForSession(memberId, sessionId);
  }
  const decision = explainerScenarioDecision();
  const params = { ...decision.params };
  return {
    modifierId: "demo-explainer",
    modifierType: decision.action,
    params,
    ruleDecision: {
      action: decision.action,
      reasons: [...decision.reasons],
      confidence: decision.confidence,
      params,
    },
    explanationDa: EXPLAINER_EXPLANATION_DA,
    reviewedBy: null,
    acceptedByMember: null,
  };
}
