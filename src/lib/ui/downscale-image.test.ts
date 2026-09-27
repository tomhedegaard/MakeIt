import { describe, expect, it } from "vitest";
import { fitWithin, MAX_SIDE } from "./downscale-image";

describe("fitWithin", () => {
  it("shrinks the longest side to the max and keeps the aspect", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_SIDE, height: 960 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 960, height: MAX_SIDE });
  });

  it("never upscales a small photo", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
