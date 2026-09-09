import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { intlLocaleTag, resolveLocale } from "@/i18n/config";
import {
  computeTrendChip,
  generatedSessionTitleKey,
  relativeAgoBucket,
  repsReasonMessageKey,
  seedProgramCopyPath,
} from "@/lib/i18n/member-bodycopy";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function loadJson(rel: string): Record<string, unknown> {
  return JSON.parse(read(rel)) as Record<string, unknown>;
}

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(allStrings);
  }
  return [];
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
    const prose = read("src/lib/data/today-prose.ts");
    expect(prose).toContain('getTranslations("Dashboard.todaySession.mock")');
    expect(prose).toContain('tSession("dayLabel")');
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

  it("keeps the dashboard Mind tile streak line Danish", () => {
    const daMind = loadJson("messages/da/Mind.json");
    const enMind = loadJson("messages/en/Mind.json");
    const da = daMind.tile as { streakSub: string };
    const en = enMind.tile as { streakSub: string };
    expect(da.streakSub).toMatch(/milepæl/);
    expect(da.streakSub).not.toMatch(/milestone/i);
    expect(en.streakSub).toMatch(/milestone/);
    expect(keysOf(daMind.tile).sort()).toEqual(keysOf(enMind.tile).sort());
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

describe("CDO DA/EN bodycopy — Nutrition setup", () => {
  it("keeps Nutrition.setup / preferences / logWeight keys in lockstep", () => {
    expect(keysOf(daNutrition.setup).sort()).toEqual(keysOf(enNutrition.setup).sort());
    expect(keysOf(daNutrition.preferences).sort()).toEqual(
      keysOf(enNutrition.preferences).sort(),
    );
    expect(keysOf(daNutrition.logWeight).sort()).toEqual(
      keysOf(enNutrition.logWeight).sort(),
    );
    expect(keysOf(daNutrition.page).sort()).toEqual(keysOf(enNutrition.page).sort());
  });

  it("shows Danish goal/diet chip labels, not English enums", () => {
    const da = daNutrition.setup as Record<string, string>;
    const en = enNutrition.setup as Record<string, string>;
    expect(da.goalCutTitle).toBe("Fedttab");
    expect(da.goalRecompTitle).toBe("Ombygning");
    expect(da.goalMaintainTitle).toBe("Hold");
    expect(da.goalMassTitle).toBe("Masse");
    expect(da.dietOmnivoreTitle).toBe("Alt");
    expect(da.dietPescatarianTitle).toBe("Fisk + plante");
    expect(da.dietVegetarianTitle).toBe("Vegetar");
    expect(da.dietVeganTitle).toBe("Veganer");
    expect(en.goalCutTitle).toBe("Cut");
    expect(en.goalRecompTitle).toBe("Recomp");
    expect(en.goalMaintainTitle).toBe("Maintain");
    expect(en.goalMassTitle).toBe("Mass");
    expect(en.dietOmnivoreTitle).toBe("Omnivore");
    const daBlob = allStrings(daNutrition.setup).join("\n");
    expect(daBlob).not.toMatch(/\b(CUT|RECOMP|MAINTAIN|MASS|OMNIVORE)\b/);
    expect(daBlob).not.toMatch(/\b(Omnivore|Pescatarian|Vegetarian|Maintain|Recomp)\b/);
    expect(da.cookingIntermediateTitle).toBe("Moderat");
    expect(da.cookingAdvancedTitle).toBe("Elsker det");
    expect(en.cookingAdvancedTitle).toBe("Love it");
    const daPrefs = daNutrition.preferences as Record<string, string>;
    expect(daPrefs.goalCut).toBe("Fedttab");
    expect(daPrefs.goalRecomp).toBe("Ombygning");
    expect(daPrefs.goalMass).toBe("Masse");
    expect(daPrefs.dietVegan).toBe("Veganer");
  });

  it("uses a proper DA/EN bodyweight label instead of BODYWEIGHT KG", () => {
    const da = daNutrition.setup as Record<string, string>;
    const en = enNutrition.setup as Record<string, string>;
    expect(da.weightFieldLabel).toBe("Kropsvægt (kg)");
    expect(en.weightFieldLabel).toBe("Bodyweight (kg)");
    expect(da.weightFieldLabel).not.toMatch(/bodyweight/i);
    const daLog = daNutrition.logWeight as { eyebrow: string };
    expect(daLog.eyebrow).toBe("Kropsvægt");
    expect(daLog.eyebrow).not.toMatch(/bodyweight/i);
  });

  it("keeps the Sunday batch-cook line in one locale", () => {
    const da = daNutrition.preferences as {
      mealPrepCheckbox: string;
      mealPrepLabel: string;
      mealPrepHint: string;
    };
    const en = enNutrition.preferences as { mealPrepCheckbox: string };
    expect(da.mealPrepLabel).toBe("Samlet madlavning");
    expect(da.mealPrepHint).not.toMatch(/\b(meals|prep|Sunday|batch-cook)\b/i);
    expect(da.mealPrepCheckbox).toBe(
      "Genbrug måltider og lav dem samlet om søndagen",
    );
    expect(en.mealPrepCheckbox).toBe("Reuse meals for a Sunday batch-cook");
    expect(da.mealPrepCheckbox).not.toMatch(/Sunday|batch-cook/i);
    expect(en.mealPrepCheckbox).not.toMatch(/Genbrug|måltider/);
  });

  it("wires setup chips and bodyweight from Nutrition.setup keys, not raw enums", () => {
    const wizard = read("src/app/(app)/nutrition/setup/SetupWizardClient.tsx");
    expect(wizard).toContain('t("goalCutTitle")');
    expect(wizard).toContain('t("goalRecompTitle")');
    expect(wizard).toContain('t("goalMaintainTitle")');
    expect(wizard).toContain('t("goalMassTitle")');
    expect(wizard).toContain('t("dietOmnivoreTitle")');
    expect(wizard).toContain('t("weightFieldLabel")');
    expect(wizard).toContain('name="goal"');
    expect(wizard).toContain('id: "cut"');
    expect(wizard).not.toContain("toUpperCase()");
    expect(wizard).not.toContain("BODYWEIGHT");
    const prefs = read("src/app/(app)/nutrition/preferences/page.tsx");
    expect(prefs).toContain('t("mealPrepCheckbox")');
    expect(prefs).not.toContain("Sunday batch-cook");
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

  it("maps seed program codes to Coaching.library.mock paths", () => {
    expect(seedProgramCopyPath("STR-12")).toBe("library.mock.STR-12");
    expect(seedProgramCopyPath("HYP-08")).toBe("library.mock.HYP-08");
    expect(seedProgramCopyPath("PWR-10")).toBe("library.mock.PWR-10");
    expect(seedProgramCopyPath("DL-06")).toBe("library.mock.DL-06");
    expect(seedProgramCopyPath("ADAPT-01")).toBeNull();
  });

  it("maps the known Franglais generator title to a locale key", () => {
    expect(generatedSessionTitleKey("Squat fokus + posterior chain")).toBe(
      "generated.squatFocus",
    );
    expect(generatedSessionTitleKey("Squat-fokus og bagside")).toBe(
      "generated.squatFocus",
    );
    expect(generatedSessionTitleKey("Squat — Top set @ RPE 8, 3×3 backoff")).toBeNull();
  });
});

describe("CDO DA/EN bodycopy — seed / demo catalog fixtures", () => {
  const TESTY_FRANGLAIS = [
    /Volumen-fokuseret blok med bro-split/i,
    /bro-split logik/i,
    /Pause-pulls/,
    /peak-protokol/i,
    /50\/50 strength/i,
    /top-sets/,
    /accessory-arbejde/i,
    /accessory til/i,
    /Early access til/i,
    /Custom strap-farve/i,
    /VIP til IRL-meets/i,
    /head coach/i,
    /StrapIt-strap/i,
    /posterior chain/i,
    /squat, bench og DL/i,
    /Limited drops i navnet/i,
    /Limited drop med/i,
  ];

  it("keeps DA coaching blurbs and reps shop/perks free of Testy Franglais", () => {
    const daLib = (daCoaching.library as { mock: unknown }).mock;
    const daShop = (daReps.shop as { mock: unknown }).mock;
    const daTiers = (daReps.tiers as { list: unknown }).list;
    const daGen = (daCoaching.today as { generated: unknown }).generated;
    const blob = [
      ...allStrings(daLib),
      ...allStrings(daShop),
      ...allStrings(daTiers),
      ...allStrings(daGen),
    ].join("\n");
    for (const re of TESTY_FRANGLAIS) {
      expect(blob).not.toMatch(re);
    }
  });

  it("keeps EN catalog strings as full English sentences, not DA fragments", () => {
    const enLib = (enCoaching.library as { mock: unknown }).mock;
    const enShop = (enReps.shop as { mock: unknown }).mock;
    const enTiers = (enReps.tiers as { list: unknown }).list;
    const blob = [
      ...allStrings(enLib),
      ...allStrings(enShop),
      ...allStrings(enTiers),
    ].join("\n");
    expect(blob).not.toMatch(/til drops/);
    expect(blob).not.toMatch(/strap-farve/);
    expect(blob).not.toMatch(/IRL-meets/);
    expect(blob).not.toMatch(/StrapIt-strap/);
    expect(blob).not.toMatch(/head coach/i);
    expect(blob).not.toMatch(/bro-split/);
    expect(blob).toMatch(/Volume block split across legs/);
    expect(blob).toMatch(/Embroidered StrapIt/);
    expect(blob).toMatch(/Early access to drops/);
  });

  it("rewrites DA program blurbs into full-sentence Danish", () => {
    const mock = (daCoaching.library as { mock: Record<string, { description: string }> }).mock;
    expect(mock["STR-12"].description).toBe(
      "Klassisk linær periodisering med RPE. Bygget til nye PR'er i Squat, Bench og Deadlift.",
    );
    expect(mock["HYP-08"].description).toBe(
      "Volumenblok med split på ben, ryg og skuldre. Flest gentagelser, mest masse.",
    );
    expect(mock["PWR-10"].description).toBe(
      "Halv styrke og halv hypertrofi. Tunge topsæt på de store løft, støtteøvelser til æstetikken.",
    );
    expect(mock["DL-06"].description).toBe(
      "Seks uger kun på dødløft. Træk med pause, træk fra underskud, og en topuge der sigter efter ny 1RM.",
    );
  });

  it("rewrites DA reps perks and shop lines into one locale", () => {
    const lifter = (daReps.tiers as { list: { Lifter: { perks: string[] } } }).list.Lifter;
    const athlete = (daReps.tiers as { list: { Athlete: { perks: string[] } } }).list.Athlete;
    const beast = (daReps.tiers as { list: { Beast: { perks: string[] } } }).list.Beast;
    const legend = (daReps.tiers as { list: { Legend: { perks: string[] } } }).list.Legend;
    const enLegend = (enReps.tiers as { list: { Legend: { perks: string[] } } }).list.Legend;
    expect(lifter.perks).toContain("Adgang til crewets feed");
    expect(lifter.perks).not.toContain("Adgang til crew-feed");
    expect(athlete.perks).toContain("Først til drops");
    expect(beast.perks).toContain("Valgfri strap-farve (1 stk/år)");
    expect(beast.perks).toContain("VIP til træf IRL");
    expect(legend.perks).toContain("Begrænset drop med dit navn");
    expect(legend.perks.join("\n")).not.toMatch(/^Limited /m);
    expect(enLegend.perks).toContain("Limited drop with your name");
    const shop = (daReps.shop as {
      mock: Record<string, { name: string; description: string }>;
    }).mock;
    expect(shop["1on1-formcheck"].description).toBe(
      "Privat videosession på 30 minutter med coach Mikael Munk.",
    );
    expect(shop["custom-broderet-strap"].name).toBe("Broderet StrapIt");
    expect(shop["custom-broderet-strap"].description).toBe(
      "Få dit handle broderet på en sort StrapIt.",
    );
  });

  it("does not leave Testy Franglais in seed / demo reward / generator fixtures", () => {
    const fixtures = [
      read("supabase/seed.sql"),
      read("src/lib/data/rewards.ts"),
      read("src/lib/data/program-generator.ts"),
    ].join("\n");
    for (const re of TESTY_FRANGLAIS) {
      expect(fixtures).not.toMatch(re);
    }
  });

  it("overlays seed library + generated titles from messages on /coaching", () => {
    const page = read("src/app/(app)/coaching/page.tsx");
    expect(page).toContain("seedProgramCopyPath");
    expect(page).toContain("localizeSeedProgram");
    expect(page).toContain("generatedSessionTitleKey");
    expect(page).toContain('t(`today.${key}`)');
    expect(page).not.toContain("Volumen-fokuseret");
    expect(page).not.toContain("Pause-pulls");
    expect(page).not.toContain("accessory-arbejde");
  });

  it("overlays seed catalog copy on /program/[code] and generated titles on /dashboard", () => {
    const detail = read("src/app/(app)/program/[code]/page.tsx");
    expect(detail).toContain("seedProgramCopyPath");
    expect(detail).toContain('getTranslations("Coaching")');
    const dash = read("src/app/(app)/dashboard/page.tsx");
    expect(dash).toContain("generatedSessionTitleKey");
    expect(dash).toContain('t(`todaySession.${key}`)');
    expect(dash).not.toContain("posterior chain");
  });

  it("localizes /reps shop mocks by slug and keeps identity gloss untouched", () => {
    const repsPage = read("src/app/(app)/reps/page.tsx");
    expect(repsPage).toContain("localizeReward");
    expect(repsPage).toContain("shop.mock.");
    const daAdaptive = loadJson("messages/da/Adaptive.json");
    const gloss = (daAdaptive.strip as { gloss: string }).gloss;
    expect(gloss).toBe("Adaptive Engine tilpasser ugen — Munk er din coach");
  });
});
