import { describe, expect, it } from "vitest";
import { magnetOffset } from "./magnet";

const box = { left: 100, top: 100, width: 200, height: 48 };

describe("magnetOffset", () => {
  it("does not move when the pointer is on the centre", () => {
    expect(magnetOffset(200, 124, box)).toEqual({ x: 0, y: 0 });
  });

  it("moves a share of the distance toward the pointer", () => {
    expect(magnetOffset(230, 134, box, 0.3)).toEqual({ x: 9, y: 3 });
  });

  it("caps the travel so a wide button stays calm", () => {
    expect(magnetOffset(300, 148, box, 0.3, 12)).toEqual({ x: 12, y: 7 });
    expect(magnetOffset(100, 100, box, 0.3, 12)).toEqual({ x: -12, y: -7 });
  });

  it("rounds to whole pixels", () => {
    const { x, y } = magnetOffset(211, 129, box, 0.3);
    expect(Number.isInteger(x)).toBe(true);
    expect(Number.isInteger(y)).toBe(true);
  });
});
