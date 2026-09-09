import { describe, expect, it } from "vitest";
import {
  copenhagenIsoMonday,
  copenhagenTodayIso,
  isoMondayOf,
  isoPlusDays,
} from "./copenhagen";

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

describe("isoMondayOf / copenhagenIsoMonday", () => {
  it("returns the Monday of the week that contains the date", () => {
    expect(isoMondayOf("2026-09-07")).toBe("2026-09-07");
    expect(isoMondayOf("2026-09-08")).toBe("2026-09-07");
    expect(isoMondayOf("2026-09-09")).toBe("2026-09-07");
    expect(isoMondayOf("2026-09-06")).toBe("2026-08-31");
    expect(isoPlusDays("2026-09-07", 6)).toBe("2026-09-13");
  });

  it("uses Copenhagen Monday, not UTC, just after local midnight", () => {
    // 22:30 UTC Sun 6 Sep = 00:30 CEST Mon 7 Sep.
    const justAfterCphMonday = new Date("2026-09-06T22:30:00.000Z");
    expect(copenhagenTodayIso(justAfterCphMonday)).toBe("2026-09-07");
    expect(copenhagenIsoMonday(justAfterCphMonday)).toBe("2026-09-07");
  });
});
