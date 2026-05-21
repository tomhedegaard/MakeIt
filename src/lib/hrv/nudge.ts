/**
 * Pure decision logic for the V2.4 session readiness nudge.
 *
 * The data-layer wrapper (`getTodaysReadinessNudge` in
 * `src/lib/data/hrv.ts`) fetches the three inputs from Supabase and
 * hands them here. Keeping this pure means the 5 trigger conditions
 * (spec §3) live in one well-tested place.
 */

export type ReadinessBucket =
  | "very_low"
  | "low"
  | "normal"
  | "high"
  | "very_high";

export type WarmUpState = "discovery" | "provisional" | "active";

export type EvaluateNudgeInput = {
  /**
   * `hrv_settings.session_suggestion_enabled` for the member.
   * `null` means "no row exists" — default-on per the column DDL.
   */
  sessionSuggestionEnabled: boolean | null;
  /**
   * True iff the member has at least one `hrv_wearable_connections`
   * row with `status = 'active'`.
   */
  hasActiveConnection: boolean;
  /**
   * The member's most recent `hrv_readings` row, or `null` if they
   * have none.
   */
  reading: {
    warmUpState: WarmUpState;
    readinessBucket: ReadinessBucket | null;
    measuredAt: string; // ISO timestamp
  } | null;
  /** Injected so tests can pin the clock. */
  now: Date;
};

export type NudgeResult = { bucket: "low" | "very_low" } | null;

const MAX_READING_AGE_MS = 36 * 60 * 60 * 1000; // 36 hours — spec §3 cond. 4

export function evaluateNudge(input: EvaluateNudgeInput): NudgeResult {
  // Condition 5 — member-level opt-out. Null = default-on.
  if (input.sessionSuggestionEnabled === false) return null;

  // Condition 1 — active wearable connection.
  if (!input.hasActiveConnection) return null;

  // No reading at all → no nudge.
  if (!input.reading) return null;

  // Condition 2 — warm-up state is active (baseline is real).
  if (input.reading.warmUpState !== "active") return null;

  // Condition 3 — readiness bucket is low or very_low.
  const bucket = input.reading.readinessBucket;
  if (bucket !== "low" && bucket !== "very_low") return null;

  // Condition 4 — reading is at most 36h old.
  const ageMs = input.now.getTime() - new Date(input.reading.measuredAt).getTime();
  if (ageMs > MAX_READING_AGE_MS) return null;
  if (ageMs < 0) return null; // pin future timestamps to "no nudge"

  return { bucket };
}

/** Stable route constant — the component imports this rather than hard-
 *  coding "/hrv" so the test in this file catches a route move. */
export const NUDGE_HREF = "/hrv";

/** Danish copy variants by bucket. Pure — testable without rendering. */
export function nudgeCopy(
  bucket: "low" | "very_low",
): { eyebrow: string; body: string } {
  if (bucket === "very_low") {
    return {
      eyebrow: "HRV MEGET LAV I DAG",
      body:
        "Din readiness er klart under dit normalområde. Gå let i dag eller spring sessionen helt over.",
    };
  }
  return {
    eyebrow: "HRV LAV I DAG",
    body:
      "Din readiness er under dit normalområde. Overvej at gå let — drop top-sættene eller stop tidligt hvis kroppen siger fra.",
  };
}
