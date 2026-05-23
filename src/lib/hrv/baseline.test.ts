import { describe, it, expect } from "vitest";
import {
  rollingMean,
  withinSubjectSd,
  computeSwc,
  warmUpStateForCount,
  classifyReadiness,
  computeBaseline,
} from "./baseline";

describe("warmUpStateForCount", () => {
  it("is discovery below 7 readings", () => {
    expect(warmUpStateForCount(6)).toBe("discovery");
  });
  it("is provisional from 7 to 13 readings", () => {
    expect(warmUpStateForCount(7)).toBe("provisional");
    expect(warmUpStateForCount(13)).toBe("provisional");
  });
  it("is active from 14 readings", () => {
    expect(warmUpStateForCount(14)).toBe("active");
  });
});

describe("rollingMean", () => {
  it("averages the most recent N values", () => {
    expect(rollingMean([1, 2, 3, 4, 5], 3)).toBeCloseTo(4, 5); // (3+4+5)/3
  });
});

describe("computeSwc", () => {
  it("is half the within-subject SD", () => {
    const series = [10, 12, 14, 16, 18];
    expect(computeSwc(series)).toBeCloseTo(withinSubjectSd(series) * 0.5, 5);
  });
});

describe("classifyReadiness", () => {
  // baseline 4.0, swc 0.1 -> normal band [3.9, 4.1]
  it("classifies within ±SWC as normal", () => {
    expect(classifyReadiness(4.05, 4.0, 0.1)).toBe("normal");
  });
  it("classifies between -SWC and -2*SWC as low", () => {
    expect(classifyReadiness(3.85, 4.0, 0.1)).toBe("low");
  });
  it("classifies below -2*SWC as very_low", () => {
    expect(classifyReadiness(3.7, 4.0, 0.1)).toBe("very_low");
  });
  it("classifies above +2*SWC as very_high", () => {
    expect(classifyReadiness(4.3, 4.0, 0.1)).toBe("very_high");
  });
});

describe("computeBaseline", () => {
  it("returns all five keys Task 9 depends on", () => {
    // This assertion is the TDD contract for the submitHrvReading consumer.
    const lnSeries = Array.from({ length: 20 }, () => 4.0);
    const result = computeBaseline(lnSeries);
    expect(result).toHaveProperty("rolling7dMean");
    expect(result).toHaveProperty("baseline60dMean");
    expect(result).toHaveProperty("swc");
    expect(result).toHaveProperty("warmUpState");
    expect(result).toHaveProperty("readinessBucket");
    expect(typeof result.rolling7dMean).toBe("number");
    expect(typeof result.baseline60dMean).toBe("number");
    expect(typeof result.swc).toBe("number");
  });

  it("returns no readiness bucket while in discovery", () => {
    const lnSeries = [4.0, 4.1, 3.9]; // 3 readings
    const result = computeBaseline(lnSeries);
    expect(result.warmUpState).toBe("discovery");
    expect(result.readinessBucket).toBeNull();
  });

  it("returns a readiness bucket once active", () => {
    const lnSeries = Array.from({ length: 20 }, () => 4.0);
    const result = computeBaseline(lnSeries);
    expect(result.warmUpState).toBe("active");
    expect(result.readinessBucket).toBe("normal");
  });

  it("produces plausible values on a realistic lnRMSSD series", () => {
    // Synthetic-but-realistic: 24 morning lnRMSSD readings modelling a real
    // person's day-to-day variation, values roughly in the 3.5-4.5 range.
    // A real PhysioNet / HRV4Training vector can be substituted later.
    const lnSeries = [
      4.12, 3.98, 4.21, 3.87, 4.05, 4.33, 3.76, 4.18, 4.02, 3.91, 4.27, 4.09,
      3.84, 4.15, 4.41, 3.95, 4.07, 3.79, 4.23, 4.11, 3.88, 4.16, 4.0, 4.29,
    ];
    const result = computeBaseline(lnSeries);
    const min = Math.min(...lnSeries);
    const max = Math.max(...lnSeries);

    expect(result.warmUpState).toBe("active");
    expect(result.baseline60dMean).toBeGreaterThanOrEqual(min);
    expect(result.baseline60dMean).toBeLessThanOrEqual(max);
    expect(result.swc).toBeGreaterThan(0);
  });
});
