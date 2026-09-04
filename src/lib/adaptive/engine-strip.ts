/**
 * Adaptive Engine reason strip — the "Hvorfor" steps on today's session.
 *
 * Pure: turns the signals the Motor actually read into attributed steps.
 * Fail closed: absent HRV / mind / RPE / alcohol is empty, not invented
 * "no alcohol" or "mind unread" padding. Demo mode uses `demoEngineStrip`.
 * Copy keys are resolved in the UI via messages/{da,en}/Adaptive.json.
 */
import type { ReadinessBucket } from "@/lib/hrv/types";
import type {
  EngineInput,
  LifestyleAggregate,
  RuleReasonCode,
} from "./types";

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

const MAX_STEPS = 6;

const EMPTY_LIFESTYLE: LifestyleAggregate = {
  sleepHoursAvg2d: null,
  alcoholLast2d: false,
  feelingLast3d: null,
};

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
 * Build reason steps from an engine input + the reason codes that
 * fired. Absent signals stay absent — no padding that claims
 * HRV / mind / RPE / alcohol when those were never observed.
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

  return {
    steps: uniqueSteps(steps).slice(0, MAX_STEPS),
    munkNote,
  };
}

/** Connected first-run / no-signal strip — AdaptiveReasonStrip hides. */
export function emptyEngineStrip(): EngineStripModel {
  return { steps: [], munkNote: "" };
}

/**
 * Honest strip from signals the Today / Træn surfaces already have.
 * Does not invent lifestyle, RPE, or mind drivers.
 */
export function stripFromAvailableSignals(opts: {
  hasHrv: boolean;
  readinessBucket: ReadinessBucket | null;
  hasSession: boolean;
}): EngineStripModel {
  return buildEngineStrip({
    latestReading: opts.hasHrv
      ? {
          measuredAt: "",
          warmUpState: "active",
          readinessBucket: opts.readinessBucket ?? null,
          isSick: false,
        }
      : null,
    lifestyle: EMPTY_LIFESTYLE,
    nextSession: opts.hasSession
      ? {
          sessionId: "available",
          scheduledFor: "",
          title: "",
          week: null,
          exercises: [],
        }
      : null,
    recentSessions: [],
    reasons: [],
  });
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
