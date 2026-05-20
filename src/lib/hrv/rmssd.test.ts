import { describe, it, expect } from "vitest";
import { filterEctopic, computeRmssd, computeLnRmssd, computeMeanHr } from "./rmssd";

describe("filterEctopic", () => {
  it("keeps a clean R-R series unchanged", () => {
    const rr = [850, 860, 855, 865, 858, 862];
    const { clean, ectopicPct } = filterEctopic(rr);
    expect(clean).toEqual(rr);
    expect(ectopicPct).toBe(0);
  });

  it("drops an interval >25% from the moving median of the previous 5", () => {
    const rr = [850, 860, 855, 865, 858, 1300, 861]; // 1300 is ectopic
    const { clean, ectopicPct } = filterEctopic(rr);
    expect(clean).not.toContain(1300);
    expect(ectopicPct).toBeGreaterThan(0);
  });
});

describe("computeRmssd", () => {
  it("returns 0 for a perfectly constant series", () => {
    expect(computeRmssd([800, 800, 800, 800])).toBe(0);
  });

  it("computes the root mean square of successive differences", () => {
    // diffs: 10, -10, 10 -> squares: 100,100,100 -> mean 100 -> sqrt 10
    expect(computeRmssd([800, 810, 800, 810])).toBeCloseTo(10, 5);
  });

  it("throws on a series shorter than 2 intervals", () => {
    expect(() => computeRmssd([800])).toThrow();
  });
});

describe("computeLnRmssd", () => {
  it("is the natural log of RMSSD", () => {
    expect(computeLnRmssd(20)).toBeCloseTo(Math.log(20), 5);
  });
});

describe("computeMeanHr", () => {
  it("converts mean R-R to bpm", () => {
    // mean R-R 1000ms -> 60 bpm
    expect(computeMeanHr([1000, 1000, 1000])).toBeCloseTo(60, 5);
  });
});
