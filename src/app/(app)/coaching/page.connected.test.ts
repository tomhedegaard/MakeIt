import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("coaching connected first-run", () => {
  it("does not use mock STR-12 / mock week as the connected fallback", () => {
    expect(page).toContain("todayCardForSurface");
    expect(page).toContain("weekStripForSurface");
    expect(page).toContain("libraryForSurface");
    expect(page).toContain("emptyWeekStrip");
    expect(page).not.toMatch(/todayCardDb\s*\?\?\s*todayCardFromMock/);
    expect(page).not.toMatch(/weekDb\s*\?\?\s*mockWeekStrip/);
    expect(page).not.toMatch(/libraryDb\s*\?\?\s*mockLibrary/);
  });

  it("hides the demo WHY strip in connected mode", () => {
    expect(page).toContain("emptyEngineStrip");
    expect(page).toMatch(/connected\s*\?\s*emptyEngineStrip\(\)\s*:\s*demoEngineStrip\(\)/);
  });

  it("renders an honest empty today card", () => {
    expect(page).toContain("data-today-empty");
    expect(page).toContain("today.emptyTitle");
  });

  it("disables Start Program when the catalog row has no days", () => {
    expect(page).toContain("hasDays={p.dayCount > 0}");
  });
});
