/**
 * Health gate for the HQ meal estimate (spec 2026-09-27 §S). What the
 * member reads must describe, never judge: no score, no "remaining",
 * no moral words about food, no exercise as payment. The prompts are
 * checked for the same rule written as an instruction to Claude.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import da from "../../../messages/da/Nutrition.json";
import en from "../../../messages/en/Nutrition.json";

const FORBIDDEN_DA = /\b(snyd|synd|cheat|fortjent|brænd\w* (det|den) af|usund|dårlig mad|god mad|tilbage i dag|kcal tilbage|slank|tab dig|forbudt)\b/i;
const FORBIDDEN_EN = /\b(cheat|sinful|guilt|earn(ed)? it|burn it off|junk|bad food|good food|remaining|calories left|slim|lose weight|forbidden)\b/i;

const sheet = readFileSync(new URL("../../app/(app)/nutrition/OffPlanLogButton.tsx", import.meta.url), "utf8");
const wrapper = readFileSync(new URL("./nutrition-estimate-claude.ts", import.meta.url), "utf8");

describe("HQ estimate copy describes, never judges (spec §S)", () => {
  it("has no judging words in the Danish sheet copy", () => {
    expect(JSON.stringify(da.offPlan)).not.toMatch(FORBIDDEN_DA);
  });

  it("has no judging words in the English sheet copy", () => {
    expect(JSON.stringify(en.offPlan)).not.toMatch(FORBIDDEN_EN);
  });

  it("labels the numbers as an HQ estimate and puts the interval on the approve button", () => {
    expect(da.offPlan.estimateLabel).toMatch(/HQ-estimat/);
    expect(da.offPlan.approve).toMatch(/\{low\}.*\{high\}/);
    expect(en.offPlan.approve).toMatch(/\{low\}.*\{high\}/);
  });

  it("never shows a score, a verdict colour or a 'remaining' framing in the sheet", () => {
    // Code only: the doc comment is allowed to name what the sheet avoids.
    const code = sheet.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/matchScore|score|text-danger|text-ok|bg-danger|bg-ok/);
  });

  it("tells Claude the same rules", () => {
    expect(wrapper).toMatch(/vurderer aldrig måltidet/);
    expect(wrapper).toMatch(/kommenterer aldrig krop, vægt eller udseende/);
  });
});
