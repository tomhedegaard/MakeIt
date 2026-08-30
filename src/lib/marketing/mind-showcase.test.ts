import { describe, expect, it } from "vitest";
import {
  SHOWCASE_MIND_SERIES,
  SHOWCASE_SPARK_LAYOUT,
  getShowcaseMindDay,
  sparkPath,
  sparkY,
} from "./mind-showcase";

function inScale(v: number) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

describe("getShowcaseMindDay", () => {
  it("exposes 14 days of 1–5 energy / stress / focus", () => {
    const day = getShowcaseMindDay();
    expect(day.days).toBe(14);
    expect(day.series).toHaveLength(14);
    expect(day.series).toEqual(SHOWCASE_MIND_SERIES);
    for (const p of day.series) {
      expect(inScale(p.energy)).toBe(true);
      expect(inScale(p.stress)).toBe(true);
      expect(inScale(p.focus)).toBe(true);
    }
  });

  it("uses the last point as today's check", () => {
    const day = getShowcaseMindDay();
    expect(day.today).toEqual(SHOWCASE_MIND_SERIES[13]);
    expect(day.today).toEqual({ energy: 4, stress: 2, focus: 4 });
  });
});

describe("sparkPath", () => {
  it("builds a 14-point path and inverts stress so low sits high", () => {
    const energy = SHOWCASE_MIND_SERIES.map((p) => p.energy);
    const stress = SHOWCASE_MIND_SERIES.map((p) => p.stress);
    const d = sparkPath(energy, SHOWCASE_SPARK_LAYOUT);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.split(" L ")).toHaveLength(14);

    const rawLow = sparkY(2, SHOWCASE_SPARK_LAYOUT);
    const invertedLow = sparkY(2, SHOWCASE_SPARK_LAYOUT, true);
    expect(invertedLow).toBeLessThan(rawLow);
    expect(sparkY(2, SHOWCASE_SPARK_LAYOUT, true)).toBe(
      sparkY(4, SHOWCASE_SPARK_LAYOUT),
    );

    const inverted = sparkPath(stress, SHOWCASE_SPARK_LAYOUT, true);
    expect(inverted).not.toBe(sparkPath(stress, SHOWCASE_SPARK_LAYOUT));
  });
});
