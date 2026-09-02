import { describe, it, expect } from "vitest";
import { buildTrendChartModel, type ChartReading } from "./trend-chart";

function reading(day: number, lnRmssd: number, extra: Partial<ChartReading> = {}): ChartReading {
  return {
    measuredAt: `2026-05-${String(day).padStart(2, "0")}T06:00:00.000Z`,
    lnRmssd,
    rolling7dMeanLnRmssd: lnRmssd,
    baseline60dMeanLnRmssd: lnRmssd,
    baseline60dSwc: 0.1,
    readinessBucket: null,
    isSick: false,
    ...extra,
  };
}

describe("buildTrendChartModel", () => {
  it("returns an empty model for no readings", () => {
    const m = buildTrendChartModel([], { width: 600, height: 200 });
    expect(m.points).toEqual([]);
    expect(m.isEmpty).toBe(true);
  });

  it("maps each reading to a point inside the viewport", () => {
    const readings = [reading(1, 3.4), reading(2, 3.6), reading(3, 3.5)];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.points).toHaveLength(3);
    for (const p of m.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(600);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(200);
    }
  });

  it("places a higher lnRMSSD higher on the chart (smaller y)", () => {
    const readings = [reading(1, 3.0), reading(2, 4.0)];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.points[1].y).toBeLessThan(m.points[0].y);
  });

  it("produces a baseline band with top above bottom", () => {
    const readings = [reading(1, 3.5), reading(2, 3.6), reading(3, 3.4)];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.baselineBand).not.toBeNull();
    expect(m.baselineBand!.topY).toBeLessThan(m.baselineBand!.bottomY);
  });

  it("flags sick readings on their points", () => {
    const readings = [reading(1, 3.5), reading(2, 3.4, { isSick: true })];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.points[1].isSick).toBe(true);
  });

  it("exposes ms-valued y-axis ticks (inverse log of lnRMSSD)", () => {
    const m = buildTrendChartModel([reading(1, 3.5), reading(2, 3.7)], { width: 600, height: 200 });
    expect(m.yTicks.length).toBeGreaterThan(0);
    for (const t of m.yTicks) {
      expect(t.label).toMatch(/ms$/);
    }
  });

  it("smooths the 7-day mean with cubics and breaks on a null mean", () => {
    const readings = [
      reading(1, 3.4),
      reading(2, 3.5),
      reading(3, 3.6),
      reading(4, 3.5, { rolling7dMeanLnRmssd: null }),
      reading(5, 3.7),
      reading(6, 3.6),
      reading(7, 3.8),
    ];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.meanLinePath).toContain("C ");
    expect(m.meanLinePath).toContain("S ");
    expect(m.meanLinePath.match(/M /g) ?? []).toHaveLength(2);
    expect(m.meanLinePath).not.toMatch(/ L /);
    expect(m.meanLinePath).not.toMatch(/NaN/);
  });
});
