/**
 * Coach Priority Inbox — data composer (A2).
 *
 * Spec: docs/superpowers/specs/2026-09-03-coach-priority-inbox.md
 *
 * Merges existing coach fetchers. No new tables, no service-role.
 * Demo HRV + adaptive mocks live here only so Queue/Safety stay
 * honest-empty. Form-checks and at-risk already have demo rows.
 */

import { mergePriorityInbox, type PriorityInboxItem } from "@/lib/coach/priority-inbox";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

import { getMemberHealth } from "./coach-analytics";
import {
  getOpenAdaptiveAlerts,
  getOpenHrvAlerts,
  getPendingFormChecks,
} from "./coach";
import { getMentalSafetyMetrics } from "./mind";

export type CoachPriorityInbox = {
  items: PriorityInboxItem[];
  mode: "demo" | "live";
  safetyReadable: boolean;
};

const DEMO_HRV = [
  {
    id: "hrv-demo-1",
    memberId: "m-nina",
    memberHandle: "nina_dl",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "hrv-demo-2",
    memberId: "m-tobias",
    memberHandle: "tobias",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

const DEMO_ADAPTIVE = [
  {
    alertId: "ad-demo-1",
    memberId: "m-kasper",
    memberHandle: "kasper_s",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    action: "escalate_to_coach",
  },
];

export async function getCoachPriorityInbox(): Promise<CoachPriorityInbox> {
  const [safety, hrv, adaptive, formChecks, health] = await Promise.all([
    getMentalSafetyMetrics(7),
    getOpenHrvAlerts(50),
    getOpenAdaptiveAlerts(50),
    getPendingFormChecks(50),
    getMemberHealth(),
  ]);

  const demo = !SUPABASE_ENABLED;

  const items = mergePriorityInbox({
    mentalSafety: safety.alertsReadable
      ? safety.openAlerts.map((a) => ({
          id: a.id,
          memberId: a.member_id,
          memberHandle: a.member_handle,
          createdAt: a.created_at,
        }))
      : [],
    hrvAlerts: demo
      ? DEMO_HRV
      : hrv.map((a) => ({
          id: a.id,
          memberId: a.memberId,
          memberHandle: a.memberHandle,
          triggeredAt: a.triggeredAt,
        })),
    adaptive: demo
      ? DEMO_ADAPTIVE
      : adaptive.map((a) => ({
          alertId: a.alertId,
          memberId: a.memberId,
          memberHandle: a.memberHandle,
          triggeredAt: a.triggeredAt,
          action: a.action,
        })),
    formChecks: formChecks.map((f) => ({
      id: f.id,
      memberId: f.memberId,
      memberHandle: f.memberHandle,
      createdAt: f.createdAt,
      exerciseName: f.exerciseName,
    })),
    stale: health.atRisk.map((m) => ({
      id: m.id,
      handle: m.handle,
      daysSinceLastSession: m.daysSinceLastSession,
      bucket: m.bucket,
    })),
  });

  return {
    items,
    mode: demo ? "demo" : "live",
    safetyReadable: safety.alertsReadable,
  };
}
