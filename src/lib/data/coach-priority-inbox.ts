/**
 * Coach Priority Inbox — data composer (A2).
 *
 * Spec: docs/superpowers/specs/2026-09-03-coach-priority-inbox.md
 *
 * Merges existing coach fetchers. No new tables, no service-role.
 * In demo every fetcher returns its own mocks, so inbox ids resolve to
 * the same rows the case panel and the queue render.
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
    hrvAlerts: hrv.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      memberHandle: a.memberHandle,
      triggeredAt: a.triggeredAt,
    })),
    adaptive: adaptive.map((a) => ({
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
