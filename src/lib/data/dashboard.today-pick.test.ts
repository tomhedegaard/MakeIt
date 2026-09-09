import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(
  join(process.cwd(), "src/lib/data/dashboard.ts"),
  "utf8",
);
const coaching = readFileSync(
  join(process.cwd(), "src/lib/data/coaching.ts"),
  "utf8",
);
const todayProse = readFileSync(
  join(process.cwd(), "src/lib/data/today-prose.ts"),
  "utf8",
);

describe("Today surfaces share one session pick", () => {
  it("dashboard card + prose signal both call pickDashboardTodaySession", () => {
    expect(dashboard).toContain("pickDashboardTodaySession");
    expect(dashboard).toContain("todayProseSessionFromPick");
    expect(dashboard).toContain("loadTodayPickRows");
    expect(dashboard).toContain("resolveTodayPick");
    expect(dashboard).toMatch(
      /export async function getTodaySessionSignal[\s\S]*resolveTodayPick/,
    );
    expect(dashboard).toMatch(
      /export async function getTodayCard[\s\S]*resolveTodayPick/,
    );
    expect(dashboard).not.toMatch(
      /\.eq\("scheduled_for", today\)[\s\S]{0,200}\.maybeSingle/,
    );
  });

  it("week strip builds from the shared pick, not a UTC ISO-week clamp", () => {
    expect(coaching).toContain("buildWeekStrip");
    expect(coaching).toContain("copenhagenTodayIso");
    expect(coaching).not.toMatch(/function todayIso\(/);
    expect(coaching).not.toMatch(/currentIsoMonday/);
    expect(coaching).not.toMatch(/gte\("scheduled_for", monday\)/);
  });

  it("Today-prose composer still reads getTodaySessionSignal", () => {
    expect(todayProse).toContain("getTodaySessionSignal");
  });
});
