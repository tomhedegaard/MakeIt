import type { ReadinessBucket } from "@/lib/hrv/types";

/**
 * C5 "Morgenens signal": one plain fact per domain, never a score.
 * Pure: the dashboard page gathers the input, the component renders.
 */

export type MorningSignalDomain = "body" | "heart" | "mind" | "food";

export type MorningSignalValueKey =
  | "adapted"
  | "planned"
  | "noSession"
  | "belowBand"
  | "inBand"
  | "aboveBand"
  | "measured"
  | "noReading"
  | "checkIn"
  | "checkedIn"
  | "eaten";

export interface MorningSignalInput {
  /** Today's open session, or null. `getTodayCard` only returns open sessions, so there is no "done". */
  session: { adapted: boolean } | null;
  hrv: { rmssdMs: number; bucket: ReadinessBucket | null } | null;
  mindCheckedToday: boolean;
  intake: { consumedKcal: number; targetKcal: number | null };
}

export interface MorningSignalCell {
  domain: MorningSignalDomain;
  href: string;
  labelKey: MorningSignalDomain;
  valueKey: MorningSignalValueKey;
  value?: string;
  unit?: "ms" | "kcal";
  of?: string;
}

function bandKey(bucket: ReadinessBucket | null): MorningSignalValueKey {
  switch (bucket) {
    case "very_low":
    case "low":
      return "belowBand";
    case "high":
    case "very_high":
      return "aboveBand";
    case "normal":
      return "inBand";
    default:
      return "measured";
  }
}

export function buildMorningSignal(input: MorningSignalInput): MorningSignalCell[] {
  const body: MorningSignalCell = {
    domain: "body",
    href: "/coaching",
    labelKey: "body",
    valueKey: !input.session ? "noSession" : input.session.adapted ? "adapted" : "planned",
  };

  const heart: MorningSignalCell = input.hrv
    ? {
        domain: "heart",
        href: "/hrv",
        labelKey: "heart",
        valueKey: bandKey(input.hrv.bucket),
        value: String(Math.round(input.hrv.rmssdMs)),
        unit: "ms",
      }
    : { domain: "heart", href: "/hrv", labelKey: "heart", valueKey: "noReading" };

  const mind: MorningSignalCell = {
    domain: "mind",
    href: "/mind/check",
    labelKey: "mind",
    valueKey: input.mindCheckedToday ? "checkedIn" : "checkIn",
  };

  const food: MorningSignalCell = {
    domain: "food",
    href: "/nutrition",
    labelKey: "food",
    valueKey: "eaten",
    value: String(Math.round(input.intake.consumedKcal)),
    unit: "kcal",
    ...(input.intake.targetKcal !== null
      ? { of: String(Math.round(input.intake.targetKcal)) }
      : {}),
  };

  return [body, heart, mind, food];
}
