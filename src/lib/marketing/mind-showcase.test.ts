import { describe, expect, it } from "vitest";
import {
  SHOWCASE_MIND_SERIES,
  SHOWCASE_SPARK_LAYOUT,
  getShowcaseMindDay,
  sparkAreaPath,
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
  it("builds a smooth 14-point cubic and inverts stress so low sits high", () => {
    const energy = SHOWCASE_MIND_SERIES.map((p) => p.energy);
    const stress = SHOWCASE_MIND_SERIES.map((p) => p.stress);
    const d = sparkPath(energy, SHOWCASE_SPARK_LAYOUT);
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain("C ");
    expect(d).toContain("S ");
    expect(d).not.toMatch(/ L /);
    expect((d.match(/ S /g) ?? []).length).toBe(12);

    const rawLow = sparkY(2, SHOWCASE_SPARK_LAYOUT);
    const invertedLow = sparkY(2, SHOWCASE_SPARK_LAYOUT, true);
    expect(invertedLow).toBeLessThan(rawLow);
    expect(sparkY(2, SHOWCASE_SPARK_LAYOUT, true)).toBe(
      sparkY(4, SHOWCASE_SPARK_LAYOUT),
    );

    const inverted = sparkPath(stress, SHOWCASE_SPARK_LAYOUT, true);
    expect(inverted).not.toBe(sparkPath(stress, SHOWCASE_SPARK_LAYOUT));
  });

  it("drops a closed area to the sparkline baseline", () => {
    const energy = SHOWCASE_MIND_SERIES.map((p) => p.energy);
    const area = sparkAreaPath(energy, SHOWCASE_SPARK_LAYOUT);
    const baseline = SHOWCASE_SPARK_LAYOUT.h - SHOWCASE_SPARK_LAYOUT.padB;
    expect(area).toContain("C ");
    expect(area.endsWith(" Z")).toBe(true);
    expect(area).toContain(` ${baseline.toFixed(1)} Z`);
    expect(area).not.toMatch(/NaN/);
  });
});
