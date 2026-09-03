/**
 * Adaptive Engine reason strip — the "Hvorfor" steps on today's session.
 *
 * Pure: turns the signals the Motor actually read into 3–6 attributed
 * steps. No face, no personality label, no token/cost. Copy keys are
 * resolved in the UI via messages/{da,en}/Adaptive.json.
 */
import type { EngineInput, RuleReasonCode } from "./types";

export type StripDomain = "mind" | "heart" | "body" | "food";

export type StripStepKey =
  | "hrvLow"
  | "hrvVeryLow"
  | "hrvInBand"
  | "sessionToday"
  | "lowSleep"
  | "alcohol"
  | "lowFeeling"
  | "rpeOvershoot"
  | "rpeDrift"
  | "mentalLoad"
  | "formCheck"
  | "missed"
  | "noAlcohol"
  | "mindUnread";

export type EngineStripStep = {
  domain: StripDomain;
  key: StripStepKey;
};

export type EngineStripModel = {
  steps: EngineStripStep[];
  /** Optional one-line Munk note. Empty string = slot hidden. */
  munkNote: string;
};

const REASON_TO_STEP: Partial<
  Record<RuleReasonCode, EngineStripStep>
> = {
  hrv_low: { domain: "heart", key: "hrvLow" },
  hrv_very_low: { domain: "heart", key: "hrvVeryLow" },
  low_sleep: { domain: "mind", key: "lowSleep" },
  recent_alcohol: { domain: "food", key: "alcohol" },
  low_feeling: { domain: "mind", key: "lowFeeling" },
  rpe_overshoot: { domain: "body", key: "rpeOvershoot" },
  rpe_drift_rising: { domain: "body", key: "rpeDrift" },
  mental_state_low_energy_or_high_stress: { domain: "mind", key: "mentalLoad" },
  form_check_concern: { domain: "body", key: "formCheck" },
  missed_sessions: { domain: "body", key: "missed" },
};

const MIN_STEPS = 3;
const MAX_STEPS = 6;

function uniqueSteps(steps: EngineStripStep[]): EngineStripStep[] {
  const seen = new Set<string>();
  const out: EngineStripStep[] = [];
  for (const step of steps) {
    const id = `${step.domain}:${step.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(step);
  }
  return out;
}

/**
 * Build 3–6 reason steps from an engine input + the reason codes that
 * fired (or an empty list when the Motor only *read* signals).
 */
export function buildEngineStrip(
  input: Pick<EngineInput, "latestReading" | "lifestyle" | "recentSessions"> & {
    nextSession?: EngineInput["nextSession"] | null;
    reasons?: Array<RuleReasonCode | string>;
  },
  munkNote = "",
): EngineStripModel {
  const steps: EngineStripStep[] = [];
  const reasons = input.reasons ?? [];

  for (const code of reasons) {
    const mapped = REASON_TO_STEP[code as RuleReasonCode];
    if (mapped) steps.push(mapped);
  }

  const bucket = input.latestReading?.readinessBucket ?? null;
  if (bucket === "low" && !steps.some((s) => s.key === "hrvLow")) {
    steps.push({ domain: "heart", key: "hrvLow" });
  } else if (bucket === "very_low" && !steps.some((s) => s.key === "hrvVeryLow")) {
    steps.push({ domain: "heart", key: "hrvVeryLow" });
  } else if (bucket === "normal" && !steps.some((s) => s.domain === "heart")) {
    steps.push({ domain: "heart", key: "hrvInBand" });
  }

  if (input.nextSession) {
    steps.push({ domain: "body", key: "sessionToday" });
  }

  if (input.lifestyle.sleepHoursAvg2d != null && input.lifestyle.sleepHoursAvg2d < 6.5) {
    if (!steps.some((s) => s.key === "lowSleep")) {
      steps.push({ domain: "mind", key: "lowSleep" });
    }
  }

  if (input.lifestyle.alcoholLast2d && !steps.some((s) => s.key === "alcohol")) {
    steps.push({ domain: "food", key: "alcohol" });
  }

  if (
    input.lifestyle.feelingLast3d === "tired" &&
    !steps.some((s) => s.key === "lowFeeling")
  ) {
    steps.push({ domain: "mind", key: "lowFeeling" });
  }

  const filled = uniqueSteps(steps);

  const hasAnySignal =
    !!input.latestReading ||
    !!input.nextSession ||
    input.lifestyle.sleepHoursAvg2d != null ||
    input.lifestyle.alcoholLast2d ||
    input.lifestyle.feelingLast3d != null ||
    reasons.length > 0;

  // Empty new member: hide the strip. Do not invent a WHY narrative.
  if (!hasAnySignal) {
    return { steps: [], munkNote };
  }

  // Pad to the 3-step floor with honest "what was read" fallbacks so the
  // strip never looks empty when the Motor ran.
  if (filled.length < MIN_STEPS) {
    if (input.latestReading && !filled.some((s) => s.domain === "heart")) {
      filled.push({ domain: "heart", key: "hrvInBand" });
    }
    if (input.nextSession && !filled.some((s) => s.key === "sessionToday")) {
      filled.push({ domain: "body", key: "sessionToday" });
    }
    // Only claim "no alcohol" when lifestyle was actually observed
    // (sleep logged). An empty new member has alcoholLast2d=false by
    // default — that is absence of data, not a food signal.
    if (
      !input.lifestyle.alcoholLast2d &&
      input.lifestyle.sleepHoursAvg2d != null &&
      !filled.some((s) => s.domain === "food")
    ) {
      filled.push({ domain: "food", key: "noAlcohol" });
    }
    if (!filled.some((s) => s.domain === "mind")) {
      filled.push({ domain: "mind", key: "mindUnread" });
    }
  }

  return {
    steps: filled.slice(0, MAX_STEPS),
    munkNote,
  };
}

/**
 * Demo fixture that looks like a real low-HRV morning. Used when
 * Supabase is off — the surface Munk demos on.
 */
export function demoEngineStrip(): EngineStripModel {
  return {
    steps: [
      { domain: "heart", key: "hrvLow" },
      { domain: "body", key: "sessionToday" },
      { domain: "mind", key: "lowFeeling" },
      { domain: "body", key: "rpeOvershoot" },
      { domain: "food", key: "noAlcohol" },
    ],
    munkNote: "",
  };
}
