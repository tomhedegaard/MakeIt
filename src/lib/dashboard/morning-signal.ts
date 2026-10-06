import type { ReadinessBucket } from "@/lib/hrv/types";
import { weightDirection } from "@/lib/health/body-rules";

/**
 * I dag som kort (spec 2026-09-27 B, plan F.3): one card per domain,
 * each answering one question with one number, a why-line and a bit of
 * data ink. Facts only, never a score; no status colours.
 * Pure: the dashboard page gathers the input, the component renders.
 * Today's session is its own card above these. The body weight card is
 * opt-in (spec §S) and shows a 7-day average and a direction, never a
 * distance to the pejlemærke. With numbers hidden, Food shows protein and
 * the weight card is gone.
 */

export type MorningSignalDomain = "heart" | "mind" | "food" | "body";

export type MorningSignalValueKey =
  | "belowBand"
  | "inBand"
  | "aboveBand"
  | "measured"
  | "connect"
  | "checkIn"
  | "energy"
  | "logWeight"
  | "down"
  | "up"
  | "stable";

export type MorningSignalUnitKey = "ms" | "kcal" | "kcalOf" | "scale" | "kg" | "protein" | "proteinOf";

export type MorningSignalWhyKey =
  | "band"
  | "bandBuilding"
  | "connectWhy"
  | "checkInWhy"
  | "stress"
  | "focus"
  | "trainingDay"
  | "restDay"
  | "protein"
  | "proteinOf"
  | "logWeightWhy"
  | "average"
  | "pejlemaerke";

export interface MorningSignalInput {
  hrv: {
    latestMs: number;
    bucket: ReadinessBucket | null;
    /** The personal band, only once it is steady (14 nights). */
    band: { lowMs: number; highMs: number } | null;
    /** Recent nights, oldest first. */
    nightsMs: number[];
  } | null;
  mind: { energy: number; stress: number; focus: number } | null;
  intake: {
    consumedKcal: number;
    targetKcal: number | null;
    consumedProtein: number;
    targetProtein: number | null;
  };
  /** A session is planned today. The target is the same either way; this is only the label. */
  trainingDay: boolean;
  /** "Vis ikke kalorier og vægt" (spec §S). */
  hideNumbers?: boolean;
  /** The opt-in weight card; null when it is off. Averages oldest first. */
  weight?: { averages: number[]; pejlemaerkeKg: number | null } | null;
}

export type MorningSignalInk =
  | { kind: "spark"; data: number[] }
  | { kind: "bar"; ratio: number }
  | { kind: "ticks"; values: number[] };

export interface MorningSignalWhy {
  key: MorningSignalWhyKey;
  values?: Record<string, number>;
}

export interface MorningSignalCard {
  domain: MorningSignalDomain;
  href: string;
  /** Whole number; the component formats it for the locale (2.740). Absent = an action instead. */
  value?: number;
  unit?: MorningSignalUnitKey;
  of?: number;
  valueKey?: MorningSignalValueKey;
  why: MorningSignalWhy[];
  ink: MorningSignalInk | null;
}

const NIGHTS = 14;

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

function heartCard(hrv: MorningSignalInput["hrv"]): MorningSignalCard {
  if (!hrv) {
    return { domain: "heart", href: "/hrv", valueKey: "connect", why: [{ key: "connectWhy" }], ink: null };
  }
  const nights = hrv.nightsMs.slice(-NIGHTS).map(Math.round);
  return {
    domain: "heart",
    href: "/hrv",
    value: Math.round(hrv.latestMs),
    unit: "ms",
    valueKey: bandKey(hrv.bucket),
    why: hrv.band
      ? [{ key: "band", values: { low: Math.round(hrv.band.lowMs), high: Math.round(hrv.band.highMs) } }]
      : [{ key: "bandBuilding" }],
    ink: nights.length >= 2 ? { kind: "spark", data: nights } : null,
  };
}

function mindCard(mind: MorningSignalInput["mind"]): MorningSignalCard {
  if (!mind) {
    return { domain: "mind", href: "/mind/check", valueKey: "checkIn", why: [{ key: "checkInWhy" }], ink: null };
  }
  return {
    domain: "mind",
    href: "/mind/check",
    value: mind.energy,
    unit: "scale",
    valueKey: "energy",
    why: [
      { key: "stress", values: { value: mind.stress } },
      { key: "focus", values: { value: mind.focus } },
    ],
    ink: { kind: "ticks", values: [mind.energy, mind.stress, mind.focus] },
  };
}

/**
 * "Spist af dagens mål", never "tilbage": remaining invites saving up.
 * Over the target the bar is simply full, without a warning.
 */
function foodCard(intake: MorningSignalInput["intake"], trainingDay: boolean, hideNumbers: boolean): MorningSignalCard {
  const day = { key: trainingDay ? ("trainingDay" as const) : ("restDay" as const) };
  if (hideNumbers) {
    const protein = Math.round(intake.consumedProtein);
    const target = intake.targetProtein !== null ? Math.round(intake.targetProtein) : null;
    return {
      domain: "food",
      href: "/nutrition",
      value: protein,
      ...(target !== null ? { unit: "proteinOf" as const, of: target } : { unit: "protein" as const }),
      why: [day],
      ink: target ? { kind: "bar", ratio: Math.min(1, protein / target) } : null,
    };
  }
  const kcal = Math.round(intake.consumedKcal);
  const target = intake.targetKcal !== null ? Math.round(intake.targetKcal) : null;
  const protein = Math.round(intake.consumedProtein);
  return {
    domain: "food",
    href: "/nutrition",
    value: kcal,
    ...(target !== null ? { unit: "kcalOf" as const, of: target } : { unit: "kcal" as const }),
    why: [
      day,
      intake.targetProtein !== null
        ? { key: "proteinOf", values: { value: protein, of: Math.round(intake.targetProtein) } }
        : { key: "protein", values: { value: protein } },
    ],
    ink: target ? { kind: "bar", ratio: Math.min(1, kcal / target) } : null,
  };
}

function weightCard(weight: { averages: number[]; pejlemaerkeKg: number | null }): MorningSignalCard {
  const latest = weight.averages[weight.averages.length - 1];
  if (latest === undefined) {
    return { domain: "body", href: "/nutrition", valueKey: "logWeight", why: [{ key: "logWeightWhy" }], ink: null };
  }
  const direction = weightDirection(weight.averages);
  return {
    domain: "body",
    href: "/nutrition",
    value: latest,
    unit: "kg",
    ...(direction ? { valueKey: direction } : {}),
    why: [
      { key: "average" },
      // Only that a pejlemærke is set: two kg numbers side by side invite counting down.
      ...(weight.pejlemaerkeKg !== null ? [{ key: "pejlemaerke" as const }] : []),
    ],
    ink: weight.averages.length >= 2 ? { kind: "spark", data: weight.averages } : null,
  };
}

export function buildMorningSignal(input: MorningSignalInput): MorningSignalCard[] {
  const hide = input.hideNumbers ?? false;
  const cards = [heartCard(input.hrv), foodCard(input.intake, input.trainingDay, hide), mindCard(input.mind)];
  if (input.weight && !hide) cards.push(weightCard(input.weight));
  return cards;
}
