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

/** Seed / demo library codes whose blurbs live in Coaching.library.mock.* */
export const SEED_PROGRAM_CODES = ["STR-12", "HYP-08", "PWR-10", "DL-06"] as const;

export type SeedProgramCode = (typeof SEED_PROGRAM_CODES)[number];

export function seedProgramCopyPath(
  code: string,
): `library.mock.${SeedProgramCode}` | null {
  if (!(SEED_PROGRAM_CODES as readonly string[]).includes(code)) return null;
  return `library.mock.${code as SeedProgramCode}`;
}

/**
 * Stored generator titles that used to ship as Franglais. Display
 * resolves Coaching.today.generated.* / Dashboard.todaySession.generated.*
 * so DA and EN each get a full-sentence variant.
 */
export const GENERATED_SESSION_TITLE_ALIASES: Record<
  string,
  "generated.squatFocus"
> = {
  "Squat fokus + posterior chain": "generated.squatFocus",
  "Squat-fokus og bagside": "generated.squatFocus",
};

export function generatedSessionTitleKey(
  title: string,
): "generated.squatFocus" | null {
  return GENERATED_SESSION_TITLE_ALIASES[title] ?? null;
}
