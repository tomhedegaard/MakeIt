import { describe, expect, it } from "vitest";
import { portraitFilter, reachesBottom } from "../../../scripts/make-portrait-demo.mjs";

const W = 1936;
const H = 1072;

describe("portraitFilter", () => {
  it("crops at full height when the subject fits a 9:16 crop", () => {
    const f = portraitFilter({ x0: 800, x1: 1100 }, W, H);
    expect(f.simple).toBe("crop=604:1072:648:0,scale=406:720,fps=30");
    expect(f.complex).toBeUndefined();
  });

  it("fits a wide subject and fills above and below, centred", () => {
    const f = portraitFilter({ x0: 400, x1: 1500 }, W, H);
    expect(f.simple).toBeUndefined();
    expect(f.complex).toContain("split=3");
    expect(f.complex).toContain("scale=406:396[fg]");
    expect(f.complex).toContain("scale=406:162[top]");
    expect(f.complex).toContain("scale=406:162[bot]");
    expect(f.complex).toContain("[top][fg][bot]vstack=inputs=3");
  });

  it("anchors a wide subject to the bottom when it reaches the bottom edge: all fill goes on top", () => {
    const f = portraitFilter({ x0: 400, x1: 1500, anchorBottom: true }, W, H);
    expect(f.complex).toContain("split=2");
    expect(f.complex).toContain("scale=406:396[fg]");
    expect(f.complex).toContain("scale=406:324[top]");
    expect(f.complex).not.toContain("[bot]");
    expect(f.complex).toContain("[top][fg]vstack=inputs=2");
  });

  it("ignores the anchor when a plain crop is enough", () => {
    const f = portraitFilter({ x0: 800, x1: 1100, anchorBottom: true }, W, H);
    expect(f.simple).toBe("crop=604:1072:648:0,scale=406:720,fps=30");
  });
});

describe("reachesBottom", () => {
  const SW = 40;
  const SH = 30;
  const span = { x0: (10 / SW) * W, x1: (30 / SW) * W };

  /** One grey frame: backdrop 230, with a dark block painted at the given columns and rows. */
  function frame(block?: { x0: number; x1: number; y0: number; y1: number }) {
    const f = new Uint8Array(SW * SH).fill(230);
    if (block) {
      for (let y = block.y0; y < block.y1; y++) for (let x = block.x0; x < block.x1; x++) f[y * SW + x] = 60;
    }
    return f;
  }

  it("is false for a clean floor", () => {
    expect(reachesBottom([frame(), frame()], SW, SH, span, W)).toBe(false);
  });

  it("is true when part of the subject sits in the bottom rows", () => {
    const foot = { x0: 18, x1: 23, y0: 24, y1: 30 };
    expect(reachesBottom([frame(foot), frame(foot)], SW, SH, span, W)).toBe(true);
  });

  it("is false when the subject ends above the bottom rows", () => {
    const body = { x0: 18, x1: 23, y0: 5, y1: 27 };
    expect(reachesBottom([frame(body), frame(body)], SW, SH, span, W)).toBe(false);
  });

  it("ignores what lies outside the subject's span", () => {
    const outside = { x0: 0, x1: 6, y0: 24, y1: 30 };
    expect(reachesBottom([frame(outside), frame(outside)], SW, SH, span, W)).toBe(false);
  });

  it("is not triggered by a single noisy column", () => {
    const speck = { x0: 20, x1: 21, y0: 28, y1: 30 };
    expect(reachesBottom([frame(speck), frame(speck)], SW, SH, span, W)).toBe(false);
  });
});
