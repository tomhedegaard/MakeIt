import { getTranslations } from "next-intl/server";
import type { AdaptiveStripCopy } from "@/components/adaptive/AdaptiveReasonStrip";
import type { DotsCopy } from "@/components/dashboard/ConnectDotsStream";
import type { HrvBandCopy } from "@/components/hrv/HrvBandHero";
import type { StripStepKey } from "@/lib/adaptive/engine-strip";
import type { InsightCardId, InsightDomain } from "@/lib/dashboard/insight-stream";
import type { QualitativeBand } from "@/lib/hrv/band";

const STEP_KEYS: StripStepKey[] = [
  "hrvLow",
  "hrvVeryLow",
  "hrvInBand",
  "sessionToday",
  "lowSleep",
  "alcohol",
  "lowFeeling",
  "rpeOvershoot",
  "rpeDrift",
  "mentalLoad",
  "formCheck",
  "missed",
  "noAlcohol",
  "mindUnread",
];

const CARD_IDS: InsightCardId[] = [
  "heart_body_low",
  "heart_body_ro",
  "heart_mind_tired",
  "body_food_session",
  "mind_body_check",
];

const DOMAINS: InsightDomain[] = ["heart", "body", "food", "mind"];
const QUAL: QualitativeBand[] = ["ro", "midt", "lav"];

export async function loadHrvBandCopy(
  nights?: { count: number; needed: number },
): Promise<HrvBandCopy> {
  const t = await getTranslations("Hrv.band");
  const qualitative = Object.fromEntries(
    QUAL.map((k) => [k, t(`qualitative.${k}`)]),
  ) as Record<QualitativeBand, string>;

  return {
    eyebrow: t("eyebrow"),
    latest: t("latest"),
    unit: t("unit"),
    avg: t("avg"),
    qualitative,
    emptyTitle: t("empty.title"),
    emptyBody: t("empty.body"),
    buildingTitle: t("building.title"),
    buildingBody: t("building.body"),
    buildingNights: nights
      ? t("building.nights", { count: nights.count, needed: nights.needed })
      : t("building.nights", { count: 0, needed: 7 }),
    steadyEyebrow: t("steady.eyebrow"),
    engineBelow: t("engine.below"),
    engineAbove: t("engine.above"),
    disclaimer: t("disclaimer"),
    legendBand: t("legendBand"),
    legendAvg: t("legendAvg"),
    rangeLabel: t("rangeLabel"),
  };
}

export async function loadStripCopy(): Promise<AdaptiveStripCopy> {
  const t = await getTranslations("Adaptive.strip");
  const steps = Object.fromEntries(
    STEP_KEYS.map((k) => [k, t(`steps.${k}`)]),
  ) as Record<StripStepKey, string>;
  return {
    why: t("why"),
    attribution: t("attribution"),
    munkNoteLabel: t("munkNoteLabel"),
    steps,
  };
}

export async function loadDotsCopy(): Promise<DotsCopy> {
  const t = await getTranslations("Adaptive.dots");
  const domains = Object.fromEntries(
    DOMAINS.map((d) => [d, t(`domains.${d}`)]),
  ) as Record<InsightDomain, string>;
  const cards = Object.fromEntries(
    CARD_IDS.map((id) => [
      id,
      { sentence: t(`cards.${id}.sentence`), cta: t(`cards.${id}.cta`) },
    ]),
  ) as DotsCopy["cards"];

  return {
    eyebrow: t("eyebrow"),
    title: t("title"),
    moreAbout: t("moreAbout"),
    dismiss: t("dismiss"),
    snooze: t("snooze"),
    motorAttribution: t("motorAttribution"),
    domains,
    cards,
  };
}
