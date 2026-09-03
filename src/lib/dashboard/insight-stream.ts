/**
 * Today connect-the-dots stream — ranked insight cards.
 *
 * Each card names ≥2 domains, carries one linking sentence (copy key),
 * a primary CTA, and a "Sig mere om X" chip that routes to an existing
 * deep-dive with a query/hash. No chat backend.
 *
 * Morning priority: Heart → Body leads when an HRV reading exists.
 */
import type { QualitativeBand } from "@/lib/hrv/band";

export type InsightDomain = "mind" | "heart" | "body" | "food";

export type InsightCardId =
  | "heart_body_low"
  | "heart_body_ro"
  | "heart_mind_tired"
  | "body_food_session"
  | "mind_body_check";

export type InsightCardModel = {
  id: InsightCardId;
  domains: InsightDomain[];
  moreAbout: InsightDomain;
  ctaHref: string;
  moreHref: string;
};

export type InsightStreamInput = {
  /** Today's session route, e.g. /session/sess-2026-05-05 */
  sessionHref: string;
  hasHrv: boolean;
  qualitative: QualitativeBand | null;
  outOfBand: boolean;
  mindCheckedToday: boolean;
};

const CARD_GRAMMAR_MIN_DOMAINS = 2;

/**
 * A card is grammatically valid when it links ≥2 domains, has a
 * primary CTA route, and a secondary deep-dive chip.
 */
export function cardGrammarOk(card: InsightCardModel): boolean {
  return (
    card.domains.length >= CARD_GRAMMAR_MIN_DOMAINS &&
    new Set(card.domains).size >= CARD_GRAMMAR_MIN_DOMAINS &&
    card.ctaHref.length > 0 &&
    card.moreHref.length > 0 &&
    card.domains.includes(card.moreAbout)
  );
}

/**
 * Rank today's insight cards. Heart→Body leads when HRV data exists
 * and the morning is out of band (or recovered). Demo callers pass
 * the fixture flags below.
 */
export function buildTodayInsightStream(
  input: InsightStreamInput,
): InsightCardModel[] {
  const cards: InsightCardModel[] = [];

  if (input.hasHrv && input.outOfBand && input.qualitative === "lav") {
    cards.push({
      id: "heart_body_low",
      domains: ["heart", "body"],
      moreAbout: "heart",
      ctaHref: input.sessionHref,
      moreHref: "/hrv/trends#band",
    });
  } else if (input.hasHrv && input.qualitative === "ro") {
    cards.push({
      id: "heart_body_ro",
      domains: ["heart", "body"],
      moreAbout: "heart",
      ctaHref: input.sessionHref,
      moreHref: "/hrv/trends#band",
    });
  } else if (input.hasHrv) {
    cards.push({
      id: "heart_body_low",
      domains: ["heart", "body"],
      moreAbout: "body",
      ctaHref: input.sessionHref,
      moreHref: "/hrv/learn/adaptive?q=hjerte-krop",
    });
  }

  if (input.hasHrv && !input.mindCheckedToday) {
    cards.push({
      id: "heart_mind_tired",
      domains: ["heart", "mind"],
      moreAbout: "mind",
      ctaHref: "/mind?q=hrv+restitution",
      moreHref: "/mind/check",
    });
  } else if (!input.mindCheckedToday) {
    cards.push({
      id: "mind_body_check",
      domains: ["mind", "body"],
      moreAbout: "mind",
      ctaHref: "/mind?q=dagens+pas",
      moreHref: "/mind/check",
    });
  }

  cards.push({
    id: "body_food_session",
    domains: ["body", "food"],
    moreAbout: "food",
    ctaHref: "/nutrition?q=squat-dag",
    moreHref: "/nutrition",
  });

  return cards.filter(cardGrammarOk);
}

/** Demo stream — Heart data exists, morning is Lav, mind-check not done. */
export function demoInsightStream(sessionHref: string): InsightCardModel[] {
  return buildTodayInsightStream({
    sessionHref,
    hasHrv: true,
    qualitative: "lav",
    outOfBand: true,
    mindCheckedToday: false,
  });
}
