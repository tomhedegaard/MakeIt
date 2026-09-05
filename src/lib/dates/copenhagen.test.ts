import { describe, expect, it } from "vitest";
import { copenhagenTodayIso } from "./copenhagen";

describe("copenhagenTodayIso", () => {
  it("uses Europe/Copenhagen, not UTC, around midnight", () => {
    // 23:30 UTC on 2 Sep = 01:30 CEST on 3 Sep.
    expect(copenhagenTodayIso(new Date("2026-09-02T23:30:00.000Z"))).toBe(
      "2026-09-03",
    );
    expect(copenhagenTodayIso(new Date("2026-09-03T00:00:00.000Z"))).toBe(
      "2026-09-03",
    );
  });
});
