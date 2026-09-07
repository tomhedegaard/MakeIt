import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { intlLocaleTag, resolveLocale } from "@/i18n/config";
import {
  computeTrendChip,
  relativeAgoBucket,
  repsReasonMessageKey,
} from "@/lib/i18n/member-bodycopy";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function loadJson(rel: string): Record<string, unknown> {
  return JSON.parse(read(rel)) as Record<string, unknown>;
}

function keysOf(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? keysOf(v, path)
      : [path];
  });
}

const daDashboard = loadJson("messages/da/Dashboard.json");
const enDashboard = loadJson("messages/en/Dashboard.json");
const daCoaching = loadJson("messages/da/Coaching.json");
const enCoaching = loadJson("messages/en/Coaching.json");
const daReps = loadJson("messages/da/Reps.json");
const enReps = loadJson("messages/en/Reps.json");
const daNutrition = loadJson("messages/da/Nutrition.json");
const enNutrition = loadJson("messages/en/Nutrition.json");

describe("CDO DA/EN bodycopy — Today / Train / Reps", () => {
  it("keeps Dashboard / Coaching / Reps keys in lockstep", () => {
    expect(keysOf(daDashboard).sort()).toEqual(keysOf(enDashboard).sort());
    expect(keysOf(daCoaching).sort()).toEqual(keysOf(enCoaching).sort());
    expect(keysOf(daReps).sort()).toEqual(keysOf(enReps).sort());
  });

  it("keeps Danish Today session CTA and demo labels as Danish", () => {
    const da = daDashboard.todaySession as {
      start: string;
      mock: { dayLabel: string; title: string };
    };
    const en = enDashboard.todaySession as {
      start: string;
      mock: { dayLabel: string; title: string };
    };
    expect(da.start).toBe("Start pas →");
    expect(en.start).toBe("Start session →");
    expect(da.mock.dayLabel).toBe("Dag A — Squat");
    expect(en.mock.dayLabel).toBe("Day A — Squat");
  });

  it("wires /dashboard session + minutes + HRV unit from Dashboard keys", () => {
    const page = read("src/app/(app)/dashboard/page.tsx");
    expect(page).toContain('t("todaySession.start")');
    expect(page).toContain('t("todaySession.mock.dayLabel")');
    expect(page).toContain('t("todaySession.mock.title")');
    expect(page).toContain('t("todaySession.minuteUnit")');
    expect(page).toContain('t("todaySession.minutes"');
    expect(page).toContain('t("hrvChip.unit")');
    expect(page).not.toMatch(/<span className="text-fg-dim text-sm">m<\/span>/);
    expect(page).not.toMatch(/estimatedMinutes\}m/);
    expect(page).not.toMatch(/ml-1">ms<\/span>/);
  });

  it("keeps Train trend / 1:1 spots / library mock in both locales", () => {
    const daToday = daCoaching.today as { start: string };
    const enToday = enCoaching.today as { start: string };
    expect(daToday.start).toBe("Start pas →");
    expect(enToday.start).toBe("Start session →");
    const daTrend = daCoaching.trend as { new: string };
    const enTrend = enCoaching.trend as { new: string };
    expect(daTrend.new).toBe("↑ ny");
    expect(enTrend.new).toBe("↑ new");
    const daActive = daCoaching.active as { streak: string };
    expect(daActive.streak).toBe("Stribe");
    const daOne = daCoaching.oneOnOne as { body: string };
    const enOne = enCoaching.oneOnOne as { body: string };
    expect(daOne.body).toContain("{count} pladser");
    expect(enOne.body).toContain("{count} spots");
    expect(daOne.body).not.toContain("{spots}");
  });

  it("renders /coaching bodycopy from Coaching keys, not hardcoded DA", () => {
    const page = read("src/app/(app)/coaching/page.tsx");
    expect(page).toContain('t("trend.new")');
    expect(page).toContain("computeTrendChip");
    expect(page).toContain('t("oneOnOne.body", { count: pricing.oneOnOne.spots })');
    expect(page).toContain('t("library.mock.STR-12.type")');
    expect(page).toContain('t("today.mock.dayLabel")');
    expect(page).not.toContain('"↑ ny"');
    expect(page).not.toContain("8 pladser");
    expect(page).not.toMatch(/type:\s*"Strength"/);
    expect(page).not.toMatch(/level:\s*"All levels"/);
  });

  it("keeps /reps history + status + shop leftovers translated in DA", () => {
    const daTx = daReps.transactions as Record<string, string>;
    const enTx = enReps.transactions as Record<string, string>;
    expect(daTx.eyebrow).toBe("Seneste Reps");
    expect(enTx.eyebrow).toBe("Latest Reps");
    expect(daTx.empty).toMatch(/ingen Reps/);
    expect(enTx.empty).toMatch(/No Reps/);
    const daShop = daReps.shop as { eyebrow: string };
    const enShop = enReps.shop as { eyebrow: string };
    expect(daShop.eyebrow).toBe("Belønninger");
    expect(enShop.eyebrow).toBe("Reward shop");
    const daStatus = daReps.status as Record<string, string>;
    const enStatus = enReps.status as Record<string, string>;
    expect(Object.keys(daStatus)).toEqual(Object.keys(enStatus));
    expect(daStatus.pending).toBe("Afventer");
    expect(enStatus.pending).toBe("Pending");
    const daReasons = daReps.reasons as Record<string, string>;
    const enReasons = enReps.reasons as Record<string, string>;
    expect(Object.keys(daReasons).sort()).toEqual(Object.keys(enReasons).sort());
    expect(daReasons.session_completed).toBe("Session gennemført");
    expect(enReasons.session_completed).toBe("Session completed");
  });

  it("wires /reps history section from Reps keys, not hardcoded Danish", () => {
    const page = read("src/app/(app)/reps/page.tsx");
    expect(page).toContain('t("transactions.eyebrow")');
    expect(page).toContain('t("transactions.empty")');
    expect(page).toContain("repsReasonMessageKey");
    expect(page).toContain("relativeAgoBucket");
    expect(page).toContain("intlLocaleTag");
    expect(page).not.toContain("Seneste Reps");
    expect(page).not.toContain("min siden");
    expect(page).not.toContain("toLocaleString(\"da-DK\")");
    const rewards = read("src/lib/data/rewards.ts");
    expect(rewards).not.toContain("Afventer");
    expect(rewards).not.toContain("function statusLabel");
  });

  it("translates dashboard nutrition check-in leftovers in DA", () => {
    const da = daNutrition.checkIn as Record<string, string>;
    const en = enNutrition.checkIn as Record<string, string>;
    expect(da.eyebrow).toBe("Dagligt check-in");
    expect(en.eyebrow).toBe("Daily check-in");
    expect(da.streak).toBe("stribe");
    expect(en.streak).toBe("streak");
    expect(keysOf(daNutrition.checkIn).sort()).toEqual(
      keysOf(enNutrition.checkIn).sort(),
    );
  });
});

describe("CDO DA/EN bodycopy — locale helpers", () => {
  it("lets members.locale beat a leftover en cookie", () => {
    expect(resolveLocale({ cookie: "en", memberLocale: "da" })).toBe("da");
    expect(resolveLocale({ cookie: "da", memberLocale: "en" })).toBe("en");
    expect(intlLocaleTag("da")).toBe("da-DK");
    expect(intlLocaleTag("en")).toBe("en-GB");
  });

  it("maps ledger reference_type to Reps.reasons keys", () => {
    expect(repsReasonMessageKey("session_completed")).toBe(
      "reasons.session_completed",
    );
    expect(repsReasonMessageKey("session")).toBe("reasons.session");
    expect(repsReasonMessageKey("cooking_streak_7")).toBe("reasons.cooking_streak");
    expect(repsReasonMessageKey("hrv_sync_streak_30")).toBe(
      "reasons.hrv_sync_streak",
    );
    expect(repsReasonMessageKey("unknown_event")).toBeNull();
    expect(repsReasonMessageKey(null)).toBeNull();
  });

  it("buckets relative timestamps without baking in a language", () => {
    const now = Date.parse("2026-09-07T12:00:00Z");
    expect(relativeAgoBucket("2026-09-07T11:40:00Z", now)).toEqual({
      key: "minutes",
      count: 20,
    });
    expect(relativeAgoBucket("2026-09-07T10:00:00Z", now)).toEqual({
      key: "hours",
      count: 2,
    });
    expect(relativeAgoBucket("2026-09-05T12:00:00Z", now)).toEqual({
      key: "days",
      count: 2,
    });
  });

  it("uses the caller-supplied new-activity label for first-period trends", () => {
    expect(computeTrendChip(10, 0, "↑ new")).toEqual({
      direction: "up",
      label: "↑ new",
    });
    expect(computeTrendChip(10, 0, "↑ ny")).toEqual({
      direction: "up",
      label: "↑ ny",
    });
    expect(computeTrendChip(0, 0, "↑ ny")).toBeNull();
    expect(computeTrendChip(110, 100, "↑ ny")?.label).toBe("↑ 10%");
  });

  it("stores 1:1 spots as a number, not Danish copy", () => {
    const pricing = read("src/lib/pricing.ts");
    expect(pricing).toMatch(/spots:\s*8/);
    expect(pricing).not.toContain("8 pladser");
  });
});
