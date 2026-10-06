/**
 * Copy gate for spec 2026-09-27 §S across the I dag cards, Krop settings,
 * the soft question and the coach's early-sign copy: describe, never judge,
 * never count down to a weight, and no verdict colours on the cards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_DA, FORBIDDEN_EN } from "./forbidden-words";

const msg = (lang: string, ns: string) =>
  JSON.parse(readFileSync(new URL(`../../../messages/${lang}/${ns}.json`, import.meta.url), "utf8"));
const src = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const surfaces = (lang: string) => ({
  cards: msg(lang, "Dashboard").morningSignal,
  body: msg(lang, "Settings").body,
  intake: msg(lang, "Nutrition").intake,
  offPlan: msg(lang, "Nutrition").offPlan,
  softQuestion: msg(lang, "Mind").foodQuestion,
  coach: {
    chip: msg(lang, "Coach").inbox.chipFoodRelationship,
    panel: msg(lang, "Coach").inbox.panelFood,
    signals: msg(lang, "Coach").inbox.foodSignals,
  },
});

describe("food and body copy describes, never judges (spec §S)", () => {
  for (const [lang, forbidden] of [["da", FORBIDDEN_DA], ["en", FORBIDDEN_EN]] as const) {
    for (const [name, copy] of Object.entries(surfaces(lang))) {
      it(`${lang}: ${name}`, () => {
        expect(copy).toBeTruthy();
        expect(JSON.stringify(copy)).not.toMatch(forbidden);
      });
    }
  }

  it("calls it a pejlemærke, never a target weight", () => {
    const da = msg("da", "Settings").body;
    expect(da.pejlemaerkeTitle).toBe("Pejlemærke");
    expect(da.pejlemaerkeSub).toMatch(/aldrig ned/);
  });

  it("puts no verdict colour or score on the cards, the sheet or the soft question", () => {
    for (const file of [
      "components/dashboard/MorningSignal.tsx",
      "components/mind/FoodSoftQuestion.tsx",
      "components/settings/BodySettingsSection.tsx",
      "app/(app)/nutrition/OffPlanLogButton.tsx",
    ]) {
      expect(src(file), file).not.toMatch(/\bscore\b|text-(danger|ok|warn|success)|bg-(danger|ok|warn|success)/);
    }
  });

  it("keeps the crisis line and LMS in the soft question", () => {
    expect(msg("da", "Mind").foodQuestion.livslinien).toBe("Livslinien 70 201 201");
    expect(msg("da", "Mind").foodQuestion.lms).toMatch(/Landsforeningen mod spiseforstyrrelser og selvskade/);
    expect(src("components/mind/FoodSoftQuestion.tsx")).toContain('href="tel:70201201"');
  });
});
