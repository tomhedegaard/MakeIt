import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex, relativeLuminance } from "./contrast";

describe("contrast", () => {
  it("parses 6-digit hex with or without #", () => {
    expect(parseHex("#FF0000")).toEqual([255, 0, 0]);
    expect(parseHex("00ff00")).toEqual([0, 255, 0]);
  });

  it("rejects anything that is not 6-digit hex", () => {
    expect(() => parseHex("#FFF")).toThrow();
    expect(() => parseHex("rgba(0,0,0,.1)")).toThrow();
  });

  it("gives black and white their WCAG luminance", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("matches WCAG reference ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    // Kalk fg-dim on bg, computed in the spec: 6.77
    expect(contrastRatio("#4A4F57", "#E7E9EB")).toBeCloseTo(6.77, 1);
  });
});
