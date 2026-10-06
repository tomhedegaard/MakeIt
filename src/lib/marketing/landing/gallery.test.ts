import { describe, expect, it } from "vitest";
import { galleryEnabled, galleryTravel } from "./gallery";

describe("galleryTravel", () => {
  it("is the overflow of the track past the stage", () => {
    expect(galleryTravel(3480, 1296)).toBe(2184);
  });

  it("is zero when the track fits", () => {
    expect(galleryTravel(1200, 1296)).toBe(0);
  });

  it("rounds to whole pixels", () => {
    expect(galleryTravel(3480.6, 1296.2)).toBe(2184);
  });
});

describe("galleryEnabled", () => {
  const ok = { wide: true, tall: true, motionOk: true, viewTimelines: true };

  it("runs only when every condition holds", () => {
    expect(galleryEnabled(ok)).toBe(true);
    for (const key of Object.keys(ok) as (keyof typeof ok)[]) {
      expect(galleryEnabled({ ...ok, [key]: false }), key).toBe(false);
    }
  });
});
