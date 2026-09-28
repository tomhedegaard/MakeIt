import { describe, expect, it } from "vitest";
import {
  contiguousSegments,
  smoothAreaPath,
  smoothLinePath,
  smoothSegmentPath,
  type PathPoint,
} from "./smooth-path";

const p = (x: number, y: number): PathPoint => ({ x, y });

describe("contiguousSegments", () => {
  it("keeps one run when every sample is present", () => {
    expect(contiguousSegments([p(0, 1), p(1, 2), p(2, 1)])).toHaveLength(1);
  });

  it("breaks on null, undefined, and non-finite points", () => {
    const segs = contiguousSegments([
      p(0, 1),
      p(1, 2),
      null,
      p(3, 1),
      undefined,
      p(5, 2),
      { x: Number.NaN, y: 1 },
      p(7, 3),
      p(8, 3),
    ]);
    expect(segs).toEqual([
      [p(0, 1), p(1, 2)],
      [p(3, 1)],
      [p(5, 2)],
      [p(7, 3), p(8, 3)],
    ]);
  });
});

describe("smoothSegmentPath", () => {
  it("emits a move for a single point", () => {
    expect(smoothSegmentPath([p(10, 20)])).toBe("M 10.0 20.0");
  });

  it("uses C for two points and C+S for three or more", () => {
    const two = smoothSegmentPath([p(0, 0), p(10, 10)]);
    expect(two.startsWith("M 0.0 0.0 C ")).toBe(true);
    expect(two).toContain(" 10.0 10.0");
    expect(two).not.toMatch(/ L /);

    const many = smoothSegmentPath([p(0, 4), p(10, 2), p(20, 6), p(30, 3)]);
    expect(many).toMatch(/^M 0\.0 4\.0 C /);
    expect(many).toContain(" S ");
    expect((many.match(/ C /g) ?? []).length).toBe(1);
    expect((many.match(/ S /g) ?? []).length).toBe(2);
    expect(many).not.toMatch(/ L /);
  });

  it("never emits NaN even when a control tangent is extreme", () => {
    const d = smoothSegmentPath([p(0, 0), p(1, 1e8), p(2, -1e8), p(3, 0)]);
    expect(d).not.toMatch(/NaN|Infinity/i);
  });
});

describe("smoothLinePath", () => {
  it("does not interpolate across a missing day", () => {
    const d = smoothLinePath([
      p(0, 4),
      p(10, 3),
      null,
      p(30, 2),
      p(40, 5),
    ]);
    const moves = d.match(/M /g) ?? [];
    expect(moves).toHaveLength(2);
    expect(d).toContain("C ");
    expect(d).not.toMatch(/NaN/);
    // The gap at x=20 is not a vertex.
    expect(d).not.toContain(" 20.0 ");
  });

  it("returns an empty string for no finite points", () => {
    expect(smoothLinePath([])).toBe("");
    expect(smoothLinePath([null, { x: Number.NaN, y: 1 }])).toBe("");
  });
});

describe("smoothAreaPath", () => {
  it("closes each run down to the baseline and skips single points", () => {
    const d = smoothAreaPath(
      [p(0, 4), p(10, 2), null, p(30, 3), p(40, 1), null, p(60, 5)],
      20,
    );
    expect(d).toContain(" Z");
    expect((d.match(/ Z/g) ?? []).length).toBe(2);
    expect(d).toContain("L 10.0 20.0 L 0.0 20.0 Z");
    expect(d).toContain("L 40.0 20.0 L 30.0 20.0 Z");
    expect(d).not.toContain("60.0");
    expect(d).not.toMatch(/NaN/);
  });
});
