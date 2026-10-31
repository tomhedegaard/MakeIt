import { describe, expect, it } from "vitest";
import { frameIndexFor, frameUrl, loadOrder, progressThrough } from "./scroll-sequence";

describe("progressThrough", () => {
  it("is 0 when the block's top sits at the viewport's bottom edge", () => {
    expect(progressThrough(900, 600, 900)).toBe(0);
  });

  it("is 1 when the block's bottom has left the top edge", () => {
    expect(progressThrough(-600, 600, 900)).toBe(1);
  });

  it("is 0.5 half way through", () => {
    expect(progressThrough(150, 600, 900)).toBeCloseTo(0.5);
  });

  it("clamps outside the viewport", () => {
    expect(progressThrough(5000, 600, 900)).toBe(0);
    expect(progressThrough(-5000, 600, 900)).toBe(1);
  });

  it("does not divide by zero", () => {
    expect(progressThrough(0, 0, 0)).toBe(0);
  });
});

describe("frameIndexFor", () => {
  it("holds the first frame until the range starts", () => {
    expect(frameIndexFor(0, 120)).toBe(0);
    expect(frameIndexFor(0.2, 120)).toBe(0);
  });

  it("reaches the last frame exactly at the range end", () => {
    expect(frameIndexFor(0.8, 120)).toBe(119);
    expect(frameIndexFor(1, 120)).toBe(119);
  });

  it("is linear inside the range", () => {
    expect(frameIndexFor(0.5, 121)).toBe(60);
  });

  it("accepts a custom range", () => {
    expect(frameIndexFor(0.5, 11, { start: 0, end: 1 })).toBe(5);
  });

  it("returns 0 for a one-frame sequence", () => {
    expect(frameIndexFor(0.9, 1)).toBe(0);
  });
});

describe("frameUrl", () => {
  it("pads to three digits and starts at 001", () => {
    expect(frameUrl("/landing/a1/a1-squat-frame", 0)).toBe("/landing/a1/a1-squat-frame-001.webp");
    expect(frameUrl("/landing/a1/a1-squat-frame", 119)).toBe("/landing/a1/a1-squat-frame-120.webp");
  });
});

describe("loadOrder", () => {
  it("fetches every eighth frame first, then the rest", () => {
    const order = loadOrder(17, 8);
    expect(order.slice(0, 3)).toEqual([0, 8, 16]);
    expect(order).toHaveLength(17);
    expect(new Set(order).size).toBe(17);
  });
});
