/**
 * Pure helpers for member bodycopy that used to leak a single locale
 * (hardcoded DA trend chips, relative timestamps, ledger reasons).
 * Callers resolve the actual words via next-intl; this module only
 * picks keys and shapes.
 */

export const REPS_REASON_KEYS = [
  "session",
  "session_completed",
  "journal_entry",
  "mental_session_completed",
  "mind_check_streak",
  "weekly_program",
  "mental_buddy_interaction",
  "cirkel_participation",
  "mental_milestone_30d",
  "mental_milestone_90d",
  "lesson_completed",
  "coach_review_sandbox",
  "co_coach_promotion",
  "buddy_interaction_streak",
  "hrv_first_connection",
  "nutrition_log_photo",
  "cooking_streak",
  "hrv_sync_streak",
  "reward",
] as const;

export type RepsReasonKey = (typeof REPS_REASON_KEYS)[number];

export function repsReasonMessageKey(
  referenceType: string | null | undefined,
): `reasons.${RepsReasonKey}` | null {
  if (!referenceType) return null;
  if (referenceType.startsWith("cooking_streak")) return "reasons.cooking_streak";
  if (referenceType.startsWith("hrv_sync_streak")) return "reasons.hrv_sync_streak";
  if ((REPS_REASON_KEYS as readonly string[]).includes(referenceType)) {
    return `reasons.${referenceType as RepsReasonKey}`;
  }
  return null;
}

export function relativeAgoBucket(
  iso: string,
  nowMs = Date.now(),
): { key: "minutes" | "hours" | "days"; count: number } {
  const ms = nowMs - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return { key: "minutes", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: "hours", count: hours };
  return { key: "days", count: Math.floor(hours / 24) };
}

export function computeTrendChip(
  current: number,
  previous: number,
  newLabel: string,
): { direction: "up" | "down" | "flat"; label: string } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { direction: "up", label: newLabel };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) < 3) return { direction: "flat", label: "·" };
  return {
    direction: pct > 0 ? "up" : "down",
    label: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`,
  };
}
