import { describe, it, expect } from "vitest";
import { classifyHrvPattern } from "./buddy-pairing";
import type { ReadinessBucket } from "@/lib/hrv/types";

describe("classifyHrvPattern", () => {
  it("returns 'unknown' for fewer than 4 readings", () => {
    expect(classifyHrvPattern([])).toBe("unknown");
    expect(classifyHrvPattern(["normal", "normal", "normal"])).toBe("unknown");
  });

  it("returns 'oscillating' when three or more distinct buckets appear", () => {
    expect(
      classifyHrvPattern(["very_low", "normal", "high", "low"] as ReadinessBucket[]),
    ).toBe("oscillating");
  });

  it("returns 'flat' when buckets stay within one or two adjacent levels", () => {
    expect(
      classifyHrvPattern(["normal", "normal", "normal", "normal", "normal"]),
    ).toBe("flat");
    expect(
      classifyHrvPattern(["normal", "low", "normal", "low", "normal"]),
    ).toBe("flat");
  });

  it("returns 'improving' when the second half's mean bucket sits ≥0.5 above the first half", () => {
    expect(
      classifyHrvPattern([
        "low",
        "low",
        "low",
        "normal",
        "normal",
        "high",
      ] as ReadinessBucket[]),
    ).toBe("improving");
  });

  it("ignores null readings when counting toward the minimum-data threshold", () => {
    // 3 non-null + 2 null → still below threshold → unknown.
    expect(
      classifyHrvPattern(["normal", null, "normal", null, "normal"]),
    ).toBe("unknown");
  });

  it("preserves 'oscillating' when ≥3 distinct buckets appear without a monotonic trend", () => {
    // Bouncing across normal/low/high with no clear improvement direction
    // — the improving check fails (delta ≈ 0), distinct ≥ 3 wins.
    expect(
      classifyHrvPattern([
        "low",
        "high",
        "normal",
        "low",
        "high",
        "normal",
      ] as ReadinessBucket[]),
    ).toBe("oscillating");
  });
});
