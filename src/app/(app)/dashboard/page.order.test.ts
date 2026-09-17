import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("dashboard renders today first", () => {
  it("renders the session card before the morning signal and everything else", () => {
    const at = (s: string) => page.indexOf(s);
    expect(at('data-dashboard="todaySession"')).toBeGreaterThan(-1);
    expect(at('data-dashboard="todaySession"')).toBeLessThan(at("<MorningSignal"));
    expect(at("<MorningSignal")).toBeLessThan(at("<TodayProse"));
    expect(at("<TodayProse")).toBeLessThan(at('data-dashboard="upcoming"'));
  });

  it("uses the new primitives and Behold original", () => {
    expect(page).toContain("<Card");
    expect(page).toContain("<KeepOriginal");
    expect(page).toContain("getTodayAdaptation(");
    expect(page).not.toContain("<BodyMap");
    expect(page).not.toContain("<HrvChip");
    expect(page).not.toContain("<MindTile");
  });
});
