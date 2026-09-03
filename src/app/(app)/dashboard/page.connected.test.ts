import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("dashboard connected first-run", () => {
  it("does not call the member seeder", () => {
    expect(page).not.toMatch(/ensureMemberStarter/);
    expect(page).not.toMatch(/seed-member/);
  });

  it("does not fall back to the mock STR-12 card in connected mode", () => {
    expect(page).toContain("todayCardForSurface");
    expect(page).not.toMatch(/today\s*=\s*t\s*\?\?\s*todayCardFromMock/);
  });

  it("builds WHY / dots from live signals when connected", () => {
    expect(page).toContain("stripFromAvailableSignals");
    expect(page).toContain("buildTodayInsightStream");
    expect(page).toContain("hasSession: today != null");
    expect(page).toMatch(/connected\s*\?\s*stripFromAvailableSignals/);
    expect(page).toMatch(/connected\s*\?\s*buildTodayInsightStream/);
  });

  it("renders an honest empty today card", () => {
    expect(page).toContain("data-today-empty");
    expect(page).toContain("todaySession.emptyCta");
  });
});
