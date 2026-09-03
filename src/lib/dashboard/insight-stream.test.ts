import { describe, expect, it } from "vitest";
import {
  buildTodayInsightStream,
  cardGrammarOk,
  demoInsightStream,
} from "./insight-stream";

const SESSION = "/session/sess-2026-05-05";

describe("card grammar", () => {
  it("requires ≥2 distinct domains, a CTA, a deep-dive, and moreAbout in domains", () => {
    expect(
      cardGrammarOk({
        id: "heart_body_low",
        domains: ["heart", "body"],
        moreAbout: "heart",
        ctaHref: SESSION,
        moreHref: "/hrv/trends#band",
      }),
    ).toBe(true);

    expect(
      cardGrammarOk({
        id: "heart_body_low",
        domains: ["heart"],
        moreAbout: "heart",
        ctaHref: SESSION,
        moreHref: "/hrv/trends#band",
      }),
    ).toBe(false);

    expect(
      cardGrammarOk({
        id: "heart_body_low",
        domains: ["heart", "heart"],
        moreAbout: "heart",
        ctaHref: SESSION,
        moreHref: "/hrv/trends#band",
      }),
    ).toBe(false);
  });
});

describe("buildTodayInsightStream", () => {
  it("leads with Heart→Body when morning HRV is Lav", () => {
    const cards = buildTodayInsightStream({
      sessionHref: SESSION,
      hasHrv: true,
      qualitative: "lav",
      outOfBand: true,
      mindCheckedToday: false,
    });
    expect(cards[0].id).toBe("heart_body_low");
    expect(cards[0].domains).toEqual(["heart", "body"]);
    expect(cards[0].ctaHref).toBe(SESSION);
    expect(cards[0].moreHref).toContain("/hrv");
    expect(cards.every(cardGrammarOk)).toBe(true);
  });

  it("falls back to Mind→Body when there is no HRV yet", () => {
    const cards = buildTodayInsightStream({
      sessionHref: SESSION,
      hasHrv: false,
      qualitative: null,
      outOfBand: false,
      mindCheckedToday: false,
    });
    expect(cards[0].id).toBe("mind_body_check");
    expect(cards[0].domains).toContain("mind");
    expect(cards[0].domains).toContain("body");
    expect(cards.every(cardGrammarOk)).toBe(true);
  });

  it("stays empty on a connected first-run with no session and no HRV", () => {
    const cards = buildTodayInsightStream({
      sessionHref: "/coaching",
      hasHrv: false,
      qualitative: null,
      outOfBand: false,
      mindCheckedToday: true,
      hasSession: false,
    });
    expect(cards).toEqual([]);
  });

  it("does not invent squat-day / pas-venter cards without a session", () => {
    const cards = buildTodayInsightStream({
      sessionHref: "/coaching",
      hasHrv: false,
      qualitative: null,
      outOfBand: false,
      mindCheckedToday: false,
      hasSession: false,
    });
    expect(cards.some((c) => c.id === "body_food_session")).toBe(false);
    expect(cards.some((c) => c.id === "mind_body_check")).toBe(false);
  });

  it("demo stream is Heart-first and routes the more-chip to an existing surface", () => {
    const cards = demoInsightStream(SESSION);
    expect(cards[0].id).toBe("heart_body_low");
    expect(cards.some((c) => c.moreHref.startsWith("/mind"))).toBe(true);
    expect(cards.some((c) => c.moreHref.startsWith("/nutrition"))).toBe(true);
    expect(cards.every(cardGrammarOk)).toBe(true);
  });
});
