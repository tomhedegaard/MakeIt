import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import da from "../../../../messages/da/index";
import { DEVICE_PHOTOS } from "./devices";

describe("device photos gate", () => {
  it("has one slot per listed device", () => {
    expect(DEVICE_PHOTOS).toHaveLength((da.Marketing.landing.chapters.heart.devices as string[]).length);
  });

  it("only points at photos that exist, each credited", () => {
    for (const photo of DEVICE_PHOTOS) {
      if (photo === null) continue;
      expect(existsSync(new URL(`../../../../public${photo.src}`, import.meta.url))).toBe(true);
      expect(photo.credit.length).toBeGreaterThan(0);
    }
  });
});
