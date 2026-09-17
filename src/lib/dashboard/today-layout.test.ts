import { describe, expect, it } from "vitest";
import { TODAY_LAYOUT } from "./today-layout";

describe("TODAY_LAYOUT", () => {
  it("puts today's session first after the greeting, then the morning signal", () => {
    expect(TODAY_LAYOUT.slice(0, 4)).toEqual(["greeting", "todaySession", "morningSignal", "munkNote"]);
  });

  it("keeps the rest below the fold in a fixed order and drops the decorative body map", () => {
    expect(TODAY_LAYOUT).toEqual([
      "greeting", "todaySession", "morningSignal", "munkNote",
      "prose", "upcoming", "stats", "crew", "tierBanner", "installHint",
    ]);
    expect(TODAY_LAYOUT).not.toContain("bodyMap");
  });
});
