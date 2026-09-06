import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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

const daHrv = loadJson("messages/da/Hrv.json");
const enHrv = loadJson("messages/en/Hrv.json");
const daMind = loadJson("messages/da/Mind.json");
const enMind = loadJson("messages/en/Mind.json");
const daCoaching = loadJson("messages/da/Coaching.json");
const enCoaching = loadJson("messages/en/Coaching.json");

describe("CDO DA/EN chrome — HRV subnav", () => {
  it("keeps Hrv.subNav keys in lockstep and Danish as source", () => {
    expect(keysOf(daHrv.subNav)).toEqual(keysOf(enHrv.subNav));
    const da = daHrv.subNav as Record<string, string>;
    const en = enHrv.subNav as Record<string, string>;
    expect(da).toMatchObject({
      today: "I dag",
      trends: "Forløb",
      insights: "Indsigt",
      learn: "Lær",
    });
    expect(en).toMatchObject({
      today: "Today",
      trends: "Trend",
      insights: "Insight",
      learn: "Learn",
    });
  });

  it("resolves shared HrvSubNav labels from Hrv.subNav, not hardcoded EN", () => {
    const nav = read("src/components/hrv/HrvSubNav.tsx");
    expect(nav).toContain('useTranslations("Hrv.subNav")');
    expect(nav).toContain('key: "today"');
    expect(nav).toContain('key: "trends"');
    expect(nav).toContain('key: "insights"');
    expect(nav).toContain('key: "learn"');
    expect(nav).not.toMatch(/"(TODAY|Today|TREND|Trend|INSIGHT|LEARN)"/);
    for (const page of [
      "src/app/(app)/hrv/page.tsx",
      "src/app/(app)/hrv/trends/page.tsx",
      "src/app/(app)/hrv/insights/page.tsx",
      "src/app/(app)/hrv/learn/page.tsx",
    ]) {
      expect(read(page)).toContain("HrvSubNav");
    }
  });

  it("reads /hrv/learn chrome from Hrv.learn (no Recovery/Lær leftovers)", () => {
    expect(keysOf(daHrv.learn)).toEqual(keysOf(enHrv.learn));
    const da = daHrv.learn as Record<string, string>;
    const en = enHrv.learn as Record<string, string>;
    expect(da.title).toBe("Lær");
    expect(da.eyebrow).toBe("Restitution");
    expect(en.title).toBe("Learn");
    expect(en.eyebrow).toBe("Recovery");
    const page = read("src/app/(app)/hrv/learn/page.tsx");
    expect(page).toContain('getTranslations("Hrv.learn")');
    expect(page).toContain('t("eyebrow")');
    expect(page).toContain('t("title")');
    expect(page).not.toMatch(/eyebrow="Recovery"/);
    expect(page).not.toMatch(/title="Lær"/);
  });
});

describe("CDO DA/EN chrome — Mind-check", () => {
  it("keeps Mind.check title/slider keys in lockstep", () => {
    const da = daMind.check as Record<string, string>;
    const en = enMind.check as Record<string, string>;
    expect(da.titleNew).toBe("Mind-check — 60 sek.");
    expect(en.titleNew).toBe("Mind-check — 60 sec.");
    expect(da.subtitleNew).toMatch(/^Tre sliders/);
    expect(en.subtitleNew).toMatch(/^Three sliders/);
    expect(da.energy).toBe("Energi");
    expect(da.focus).toBe("Fokus");
    expect(en.energy).toBe("Energy");
    expect(en.focus).toBe("Focus");
    expect(da.streakCurrent).toBe("dages stribe");
    expect(en.streakCurrent).toBe("day streak");
  });

  it("wires /mind header + sliders + streak from Mind.check", () => {
    const page = read("src/app/(app)/mind/page.tsx");
    expect(page).toContain('getTranslations("Mind.check")');
    expect(page).toContain('t("titleNew")');
    expect(page).toContain('t("subtitleNew")');
    expect(page).toContain('t("streakCurrent")');
    expect(page).not.toMatch(/title="MIND-CHECK/);
    expect(page).not.toMatch(/Three sliders/);
    const form = read("src/components/mind/MindCheckForm.tsx");
    expect(form).toContain('useTranslations("Mind.check")');
    expect(form).toContain('t("energy")');
    expect(form).toContain('t("focus")');
    expect(form).not.toMatch(/label:\s*"(Energy|Energi)"/);
  });

  it("resolves Mind tour skip/next from Mind.tour", () => {
    expect(keysOf(daMind.tour)).toEqual(keysOf(enMind.tour));
    const da = daMind.tour as {
      skip: string;
      next: string;
      begin: string;
    };
    const en = enMind.tour as {
      skip: string;
      next: string;
      begin: string;
    };
    expect(da.skip).toBe("Spring over");
    expect(da.next).toBe("Næste →");
    expect(en.skip).toBe("Skip");
    expect(en.next).toBe("Next →");
    const tour = read("src/components/mind/MindFirstTimeTour.tsx");
    expect(tour).toContain('useTranslations("Mind.tour")');
    expect(tour).toContain('t("skip")');
    expect(tour).toContain('t("next")');
    expect(tour).not.toMatch(/^\s*Spring over\s*$/m);
    expect(tour).not.toMatch(/"Næste →"/);
  });
});

describe("CDO DA/EN chrome — coaching day chips", () => {
  it("keeps Coaching.week.days + rest in lockstep; Danish chips are Man/Tir/…/Hvile", () => {
    const da = daCoaching.week as {
      rest: string;
      days: Record<string, string>;
    };
    const en = enCoaching.week as {
      rest: string;
      days: Record<string, string>;
    };
    expect(Object.keys(da.days)).toEqual(Object.keys(en.days));
    expect(da.days).toEqual({
      mon: "Man",
      tue: "Tir",
      wed: "Ons",
      thu: "Tor",
      fri: "Fre",
      sat: "Lør",
      sun: "Søn",
    });
    expect(da.rest).toBe("Hvile");
    expect(en.rest).toBe("Rest");
  });

  it("renders week chips from Coaching.week keys, not hardcoded DA_DAYS", () => {
    const page = read("src/app/(app)/coaching/page.tsx");
    expect(page).toContain("week.days.${day.dayKey}");
    expect(page).toContain('t("week.rest")');
    expect(page).not.toMatch(/\{day\.label\}/);
    const data = read("src/lib/data/coaching.ts");
    expect(data).toContain("WEEK_DAY_KEYS");
    expect(data).not.toContain('["Man", "Tir", "Ons"');
    expect(data).toMatch(/Exercise names stay as program\/exercise proper labels/);
  });
});
