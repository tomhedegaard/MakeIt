import { describe, expect, it } from "vitest";
import {
  ApprovedSchema,
  EstimateSchema,
  IdentifySchema,
  finalizeEstimate,
  mealEstimateEnabled,
  roundKcal,
  scaleEstimate,
  type RawEstimate,
} from "./nutrition-estimate";

const cobb: RawEstimate = {
  assumption: "Standard Cobb salad, ca. 450 g i alt.",
  confidence: "medium",
  confidenceReason: "Portionen er svær at se på billedet.",
  items: [
    { name: "Kylling", grams: 120, kcal: 198, proteinG: 37.2, carbsG: 0, fatG: 4.3 },
    { name: "Bacon", grams: 30, kcal: 161, proteinG: 11, carbsG: 0.4, fatG: 12.6 },
    { name: "Æg", grams: 50, kcal: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 },
    { name: "Avocado", grams: 70, kcal: 112, proteinG: 1.4, carbsG: 6, fatG: 10.3 },
    { name: "Salat og tomat", grams: 150, kcal: 30, proteinG: 1.5, carbsG: 5, fatG: 0.3 },
  ],
  kcalRange: { low: 450, high: 750 },
};

describe("finalizeEstimate", () => {
  it("recomputes the totals from the items, so the model never states a total", () => {
    const est = finalizeEstimate(cobb)!;
    expect(est.totals).toEqual({ kcal: 573, proteinG: 57, carbsG: 11, fatG: 32 });
  });

  it("rounds every item to whole numbers", () => {
    const est = finalizeEstimate(cobb)!;
    expect(est.items[0]).toMatchObject({ proteinG: 37, fatG: 4 });
  });

  it("rejects an interval that does not contain the total", () => {
    expect(finalizeEstimate({ ...cobb, kcalRange: { low: 600, high: 800 } })).toBeNull();
    expect(finalizeEstimate({ ...cobb, kcalRange: { low: 300, high: 500 } })).toBeNull();
  });

  it("rejects an upside-down interval and an empty meal", () => {
    expect(finalizeEstimate({ ...cobb, kcalRange: { low: 750, high: 450 } })).toBeNull();
    expect(
      finalizeEstimate({ ...cobb, items: [{ name: "Vand", grams: 300, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }], kcalRange: { low: 0, high: 0 } }),
    ).toBeNull();
  });
});

describe("scaleEstimate", () => {
  it("scales items, totals and the interval together", () => {
    const est = finalizeEstimate(cobb)!;
    const half = scaleEstimate(est, 0.5);
    expect(half.kcalRange).toEqual({ low: 225, high: 375 });
    expect(half.items[0].grams).toBe(60);
    expect(half.totals.kcal).toBe(half.items.reduce((s, i) => s + i.kcal, 0));
  });

  it("is the identity at portion 1", () => {
    const est = finalizeEstimate(cobb)!;
    expect(scaleEstimate(est, 1)).toBe(est);
  });
});

describe("schemas", () => {
  it("accepts a clean identify answer and caps questions at three", () => {
    const q = { id: "1", prompt: "Hvad er den brune sauce?", options: ["Soya", "Teriyaki"], box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, where: null };
    expect(IdentifySchema.safeParse({ foodVisible: true, questions: [q] }).success).toBe(true);
    expect(IdentifySchema.safeParse({ foodVisible: true, questions: [q, q, q, q] }).success).toBe(false);
  });

  it("rejects a box outside the photo", () => {
    const q = { id: "1", prompt: "Hvad er det?", options: [], box: { x: 1.2, y: 0, w: 0.1, h: 0.1 }, where: null };
    expect(IdentifySchema.safeParse({ foodVisible: true, questions: [q] }).success).toBe(false);
  });

  it("keeps the estimate free of scores and verdicts", () => {
    const keys = Object.keys(EstimateSchema.shape).join(" ");
    expect(keys).not.toMatch(/score|grade|verdict|remaining|good|bad/i);
  });

  it("validates the approved numbers the client sends back", () => {
    const ok = { source: "hq_photo", label: "Cobb salad", kcal: 570, proteinG: 57, carbsG: 11, fatG: 32, confidence: "medium", kcalLow: 450, kcalHigh: 750, items: cobb.items, edited: false };
    expect(ApprovedSchema.safeParse(ok).success).toBe(true);
    expect(ApprovedSchema.safeParse({ ...ok, kcal: 0 }).success).toBe(false);
    expect(ApprovedSchema.safeParse({ ...ok, source: "member" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("rounds kcal to the nearest 10 for display", () => {
    expect(roundKcal(573)).toBe(570);
    expect(roundKcal(575)).toBe(580);
  });

});

describe("mealEstimateEnabled", () => {
  it("is on for coaches before launch and for everyone once the flag is set", () => {
    expect(mealEstimateEnabled(undefined, false)).toBe(false);
    expect(mealEstimateEnabled(undefined, true)).toBe(true);
    expect(mealEstimateEnabled("1", false)).toBe(true);
    expect(mealEstimateEnabled("0", false)).toBe(false);
  });
});
