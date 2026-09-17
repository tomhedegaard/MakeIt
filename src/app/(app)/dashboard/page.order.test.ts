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
    expect(page).not.toMatch(/<HrvChip[\s/>]/);
    expect(page).not.toContain("<MindTile");
  });

  it("fetches the independent dashboard data in one parallel batch", () => {
    const awaits = page.match(/await Promise\.all\(/g) ?? [];
    expect(page).not.toMatch(/await getMyFormChecks\(/);
    expect(page).not.toMatch(/await getLatestUnseenPromotion\(/);
    expect(page).toMatch(/Promise\.all\(\[[\s\S]*getTodayCard[\s\S]*getMyFormChecks[\s\S]*getLatestUnseenPromotion[\s\S]*getHrvChipData[\s\S]*hasMindCheckToday[\s\S]*getTodayProse[\s\S]*getDailyIntake[\s\S]*\]\)/);
    expect(awaits.length).toBeLessThanOrEqual(2);
    expect(page.match(/todayCardFromMock\(t\)/g)).toHaveLength(1);
  });
});
