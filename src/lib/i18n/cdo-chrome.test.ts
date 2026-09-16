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
const daCommunity = loadJson("messages/da/Community.json");
const enCommunity = loadJson("messages/en/Community.json");
const daProfile = loadJson("messages/da/Profile.json");
const enProfile = loadJson("messages/en/Profile.json");

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(allStrings);
  }
  return [];
}

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
    expect(page).toContain('getTranslations("Mind.graph")');
    expect(page).toContain("tGraph(");
    const graphSrc = read("src/components/mind/MentalGraph.tsx");
    expect(graphSrc).not.toContain("Mental graf — sidste 30 dage");
    expect(graphSrc).toContain("copy.title");
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
    expect(en.days).toEqual(da.days);
    expect(en.rest).toBe("Hvile");
  });

  it("renders week chips from Coaching.week keys, not hardcoded DA_DAYS", () => {
    const page = read("src/app/(app)/coaching/page.tsx");
    expect(page).toContain("week.days.${day.dayKey}");
    expect(page).toContain('t("week.rest")');
    expect(page).not.toMatch(/\{day\.label\}/);
    const data = read("src/lib/data/coaching.ts");
    const strip = read("src/lib/dashboard/week-strip.ts");
    expect(data).toContain("WEEK_DAY_KEYS");
    expect(data).not.toContain('["Man", "Tir", "Ons"');
    expect(strip).toMatch(/Exercise names stay as program\/exercise proper labels/);
  });
});

describe("CDO DA/EN chrome — locale resolution", () => {
  it("lets members.locale beat a leftover en cookie", async () => {
    const { resolveLocale } = await import("@/i18n/config");
    expect(resolveLocale({ cookie: "en", memberLocale: "da" })).toBe("da");
    expect(resolveLocale({ cookie: "da", memberLocale: "en" })).toBe("en");
    expect(resolveLocale({ cookie: "en", memberLocale: null })).toBe("en");
    expect(resolveLocale({ cookie: undefined, memberLocale: null })).toBe("da");
  });

  it("reads member locale in getRequestConfig and re-seeds on password login", () => {
    const request = read("src/i18n/request.ts");
    expect(request).toContain("resolveLocale");
    expect(request).toContain("readMemberLocale");
    expect(request).toContain('.select("locale")');
    const login = read("src/app/login/actions.ts");
    expect(login).toContain("select(\"id, locale\")");
    expect(login).toContain("LOCALE_COOKIE");
    expect(login).toContain("member.locale");
  });
});

describe("CDO DA/EN chrome — Crew / HRV / Mig empty surfaces", () => {
  it("keeps Community.page + realtime keys in lockstep; Danish chrome is Danish", () => {
    expect(keysOf(daCommunity.page)).toEqual(keysOf(enCommunity.page));
    expect(keysOf(daCommunity.realtime)).toEqual(keysOf(enCommunity.realtime));
    const da = daCommunity.page as Record<string, string>;
    const en = enCommunity.page as Record<string, string>;
    expect(da.title).toBe("Live-feed.");
    expect(da.feedEyebrow).toBe("Live-feed");
    expect(da.feedCount).toBe("{count} opslag");
    expect(da.leaderboardEyebrow).toBe("Rangliste");
    expect(da.meetEmptyEyebrow).toBe("IRL-møde");
    expect(da.meetEmptyTitle).toBe("Ingen planlagt IRL-møde.");
    expect(da.meetEyebrow).toBe("Næste IRL-møde");
    expect(en.title).toBe("Live feed.");
    expect(en.feedEyebrow).toBe("Live feed");
    expect(en.feedCount).toBe("{count} posts");
    expect(en.leaderboardEyebrow).toBe("Leaderboard");
    expect(en.meetEmptyEyebrow).toBe("IRL meet");

    const daBlob = allStrings(daCommunity).join("\n");
    expect(daBlob).not.toMatch(/\bLIVE FEED\b/i);
    expect(daBlob).not.toMatch(/\bLive feed\b/);
    expect(daBlob).not.toMatch(/\bLEADERBOARD\b/i);
    expect(daBlob).not.toMatch(/\bLeaderboard\b/);
    expect(daBlob).not.toMatch(/\{count\} posts/);
    expect(daBlob).not.toMatch(/\bposts\b/);
    expect(daBlob).not.toMatch(/\bIRL-meet\b/);
    expect(daBlob).not.toMatch(/planlagt meet/);

    const enBlob = allStrings(enCommunity).join("\n");
    expect(enBlob).not.toMatch(/\bopslag\b/);
    expect(enBlob).not.toMatch(/\bRangliste\b/);
    expect(enBlob).not.toMatch(/\bIRL-møde\b/);
  });

  it("wires /crew empty chrome from Community.page, not hardcoded EN", () => {
    const page = read("src/app/(app)/community/page.tsx");
    expect(page).toContain('getTranslations("Community.page")');
    expect(page).toContain('t("title")');
    expect(page).toContain('t("feedEyebrow")');
    expect(page).toContain('t("feedCount"');
    expect(page).toContain('t("leaderboardEyebrow")');
    expect(page).toContain('t("meetEmptyEyebrow")');
    expect(page).toContain('t("meetEmptyTitle")');
    expect(page).not.toMatch(/"LIVE FEED/);
    expect(page).not.toMatch(/"LEADERBOARD"/);
    expect(page).not.toMatch(/"0 posts"/);
    expect(page).not.toMatch(/"IRL-MEET"/);
  });

  it("keeps Hrv.page onboarding keys in lockstep; Danish drops raw EN chrome", () => {
    expect(keysOf(daHrv.page)).toEqual(keysOf(enHrv.page));
    const da = daHrv.page as Record<string, string>;
    const en = enHrv.page as Record<string, string>;
    expect(da.connectStep1Title).toBe("Forbind din wearable-enhed");
    expect(da.connectCta).toBe("Forbind din wearable-enhed");
    expect(da.connectStep3Body).toMatch(/HRV-klarhed/);
    expect(da.connectAppleNote).toBe(
      "Apple Watch-understøttelse kommer med MakeIt-appen til iPhone.",
    );
    expect(en.connectStep3Body).toMatch(/HRV readiness/);
    expect(en.connectAppleNote).toBe(
      "Apple Watch support arrives with the MakeIt iPhone app.",
    );

    const daBlob = [da.connectBody, da.connectStep1Title, da.connectStep1Body, da.connectStep3Body, da.connectCta, da.connectAppleNote].join("\n");
    expect(daBlob).not.toMatch(/APPLE WATCH-SUPPORT/i);
    expect(daBlob).not.toMatch(/Apple Watch-support/);
    expect(daBlob).not.toMatch(/\breadiness\b/);
    expect(daBlob).not.toMatch(/Forbind dit wearable$/m);

    const enBlob = [en.connectBody, en.connectCta, en.connectAppleNote].join("\n");
    expect(enBlob).not.toMatch(/understøttelse/);
    expect(enBlob).not.toMatch(/wearable-enhed/);
    expect(enBlob).not.toMatch(/HRV-klarhed/);
  });

  it("wires /hrv empty onboarding from Hrv.page", () => {
    const page = read("src/app/(app)/hrv/page.tsx");
    expect(page).toContain('getTranslations("Hrv.page")');
    expect(page).toContain('t("connectStep1Title")');
    expect(page).toContain('t("connectCta")');
    expect(page).toContain('t("connectAppleNote")');
    expect(page).not.toMatch(/APPLE WATCH-SUPPORT/);
    expect(page).not.toMatch(/Apple Watch-support kommer/);
  });

  it("keeps Hrv.connectSheet in lockstep and reuses the Apple Watch note", () => {
    expect(keysOf(daHrv.connectSheet)).toEqual(keysOf(enHrv.connectSheet));
    const da = daHrv.connectSheet as Record<string, string>;
    const en = enHrv.connectSheet as Record<string, string>;
    expect(da.title).toBe("Forbind din wearable-enhed.");
    expect(da.meta).toBe("HRV · søvn · restitution");
    expect(en.title).toBe("Connect your wearable.");
    expect(en.meta).toBe("HRV · sleep · recovery");
    const sheet = read("src/components/hrv/WearableConnectSheet.tsx");
    expect(sheet).toContain('useTranslations("Hrv.connectSheet")');
    expect(sheet).toContain('tPage("connectAppleNote")');
    expect(sheet).not.toMatch(/Apple Watch-support/);
    expect(sheet).not.toMatch(/Forbind din wearable\./);
    expect(sheet).not.toMatch(/HRV · søvn · recovery/);
  });

  it("keeps Profile keys in lockstep; Danish Mig chrome is Danish", () => {
    expect(keysOf(daProfile)).toEqual(keysOf(enProfile));
    const daHeader = daProfile.header as Record<string, string>;
    const enHeader = enProfile.header as Record<string, string>;
    const daBilling = daProfile.billing as Record<string, string>;
    const enBilling = enProfile.billing as Record<string, string>;
    const daForm = daProfile.formChecks as Record<string, string>;
    const enForm = enProfile.formChecks as Record<string, string>;
    const daLifts = daProfile.lifts as Record<string, string>;
    const daSettings = daProfile.settings as Record<string, string>;
    const enSettings = enProfile.settings as Record<string, string>;

    expect(daHeader.subtitle).toBe("Niveau: {tier} · Medlem siden {date}");
    expect(enHeader.subtitle).toBe("Tier: {tier} · Member since {date}");
    expect(daLifts.title).toBe("Dine løft");
    expect(daBilling.description).toBe(
      "Administrér dit Crew-medlemskab og 1:1-tillæg. Sikker betaling via Stripe.",
    );
    expect(enBilling.description).toMatch(/1:1 add-on/);
    expect(daForm.emptyHint).toMatch(/^Åbn “Form-check med AI”/);
    expect(enForm.emptyHint).toMatch(/^Open “Form check with AI”/);
    expect(daSettings).not.toHaveProperty("languageChange");
    expect(enSettings).not.toHaveProperty("languageChange");

    const daBlob = allStrings(daProfile).join("\n");
    expect(daBlob).not.toMatch(/\bTier:/);
    expect(daBlob).not.toMatch(/\badd-on\b/);
    expect(daBlob).not.toMatch(/\bcheckout\b/i);
    expect(daBlob).not.toMatch(/\bTap “Form-check/);
    expect(daBlob).not.toMatch(/Skift på Indstillinger/);
    expect(daBlob).not.toMatch(/Lifts på record/);

    const enBlob = allStrings(enProfile).join("\n");
    expect(enBlob).not.toMatch(/\bNiveau:/);
    expect(enBlob).not.toMatch(/\btillæg\b/);
    expect(enBlob).not.toMatch(/^Åbn /m);
    expect(enBlob).not.toMatch(/\bTap “Form check/);
  });

  it("renders /profile language as a real control, not circular settings copy", () => {
    const page = read("src/app/(app)/profile/page.tsx");
    expect(page).toContain("LanguageSelector");
    expect(page).toContain('t("header.subtitle"');
    expect(page).toContain('t("billing.description")');
    expect(page).toContain('t("formChecks.emptyHint")');
    expect(page).toContain('t("lifts.title")');
    expect(page).not.toContain("languageChange");
    expect(page).not.toContain("Skift på Indstillinger");
    expect(page).not.toContain("Change in Settings");
  });
});
