import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FAQ_ITEM_KEYS } from "./faq-items";
import { MUNK_PORTRAIT_SRC } from "./munk";
import {
  PUBLIC_APP_STORE_HREF,
  PUBLIC_LEARN_HREF,
  PUBLIC_LOGIN_HREF,
  PUBLIC_WAITLIST_HREF,
} from "./public-cta";

const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const daCoach = JSON.parse(
  readFileSync(new URL("../../../messages/da/CoachSchool.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const enCoach = JSON.parse(
  readFileSync(new URL("../../../messages/en/CoachSchool.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const daNutrition = JSON.parse(
  readFileSync(new URL("../../../messages/da/Nutrition.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const enNutrition = JSON.parse(
  readFileSync(new URL("../../../messages/en/Nutrition.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const daLegal = JSON.parse(
  readFileSync(new URL("../../../messages/da/Legal.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const daLogin = JSON.parse(
  readFileSync(new URL("../../../messages/da/Login.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const enLogin = JSON.parse(
  readFileSync(new URL("../../../messages/en/Login.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

function keysOf(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keysOf(v, prefix ? `${prefix}.${k}` : k),
  );
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  return Object.values(value).flatMap(collectStrings);
}

const kalkSrc = (file: string) =>
  readFileSync(new URL(`../../components/marketing/kalk/${file}`, import.meta.url), "utf8");
const heroSrc = kalkSrc("KalkHero.tsx");
const navSrc = kalkSrc("KalkNav.tsx");
const faqSrc = kalkSrc("KalkFaq.tsx");
const faqListSrc = readFileSync(
  new URL("../../components/marketing/FaqList.tsx", import.meta.url),
  "utf8",
);
const loginSrc = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");

const daKalk = da.kalk as Record<string, Record<string, unknown>>;
const enKalk = en.kalk as Record<string, Record<string, unknown>>;

describe("public trust — FAQ count", () => {
  it("derives the show-all count from the live item list", () => {
    const faq = da.faq as { items: Record<string, unknown>; showAll: string };
    const enFaq = en.faq as { items: Record<string, unknown>; showAll: string };
    expect(FAQ_ITEM_KEYS).toHaveLength(Object.keys(faq.items).length);
    expect(Object.keys(faq.items)).toEqual(expect.arrayContaining([...FAQ_ITEM_KEYS]));
    expect(faq.showAll).toContain("{count}");
    expect(enFaq.showAll).toContain("{count}");
    expect(faqSrc).toMatch(/showAll[\s\S]*count:\s*ITEMS\.length/);
    expect(faqListSrc).not.toMatch(/hiddenCount/);
    expect(faq.showAll).not.toMatch(/\((10|8|6)\)/);
  });
});

describe("public trust — locale lockstep", () => {
  it("keeps da and en Marketing keys in lockstep", () => {
    expect(keysOf(da).sort()).toEqual(keysOf(en).sort());
  });
});

describe("public trust — Munk presence", () => {
  it("keeps da/en Munk keys in lockstep and stays within known facts", () => {
    expect(keysOf(daKalk.munk)).toEqual(keysOf(enKalk.munk));
    const munk = daKalk.munk as { sub: string; portraitAlt: string; card: { draftLabel: string } };
    const enMunk = enKalk.munk as { sub: string };
    expect(munk.sub).toMatch(/Mikael Munk/);
    expect(munk.sub).toMatch(/hovedcoach/i);
    expect(enMunk.sub).toMatch(/head coach/i);
    expect(munk.portraitAlt).toMatch(/Mikael Munk/);
    expect(munk.card.draftLabel).toMatch(/AI/);
    const invented = /år i branchen|world champion|olympi|certificeret|phd|tidligere landshold/i;
    expect(collectStrings(daKalk.munk).join(" ")).not.toMatch(invented);
    expect(collectStrings(enKalk.munk).join(" ")).not.toMatch(invented);
    expect(MUNK_PORTRAIT_SRC).toBeNull();
  });
});

describe("public trust — jargon first use", () => {
  it("glosses the engine and reps where the landing first uses them", () => {
    const daHero = daKalk.hero as { sub: string };
    const enHero = enKalk.hero as { sub: string };
    expect(daHero.sub).toMatch(/^HQ, appens hjerne, læser/);
    expect(enHero.sub).toMatch(/^HQ, the app's brain, reads/);

    const daCrew = daKalk.crew as { sub: string };
    const enCrew = enKalk.crew as { sub: string };
    expect(daCrew.sub).toMatch(/^Reps optjenes ved/);
    expect(enCrew.sub).toMatch(/^Reps are earned by/);
  });
});

describe("public trust — no vendor names in marketing / school / nutrition", () => {
  it("drops Claude from user-facing marketing, Coach School and nutrition", () => {
    const vendor = /Claude|Anthropic/i;
    expect(collectStrings(da).join("\n")).not.toMatch(vendor);
    expect(collectStrings(en).join("\n")).not.toMatch(vendor);
    expect(collectStrings(daCoach).join("\n")).not.toMatch(vendor);
    expect(collectStrings(enCoach).join("\n")).not.toMatch(vendor);
    expect(collectStrings(daNutrition).join("\n")).not.toMatch(vendor);
    expect(collectStrings(enNutrition).join("\n")).not.toMatch(vendor);
  });

  it("leaves legal processor naming in place", () => {
    expect(JSON.stringify(daLegal)).toMatch(/Anthropic/);
  });
});

describe("public trust — primary CTA", () => {
  it("points access CTAs at the waitlist and keeps login secondary", () => {
    expect(PUBLIC_WAITLIST_HREF).toBe("/#waitlist");
    expect(PUBLIC_LEARN_HREF).toBe("/#crew");
    expect(PUBLIC_LOGIN_HREF).toBe("/login");
    expect(PUBLIC_APP_STORE_HREF).toBeNull();

    expect(heroSrc).toContain("PUBLIC_WAITLIST_HREF");
    expect(heroSrc).not.toMatch(/PUBLIC_LOGIN_HREF|href=["']\/login["']/);

    expect(navSrc).toContain("PUBLIC_WAITLIST_HREF");
    expect(navSrc).toContain("PUBLIC_LOGIN_HREF");
    expect(navSrc).toMatch(/href=\{PUBLIC_WAITLIST_HREF\}[^>]*btn-primary/);

    expect(loginSrc).toMatch(/\/#waitlist/);
    expect(daLogin.waitlistLink).toMatch(/venteliste/i);
    expect(enLogin.waitlistLink).toMatch(/waitlist/i);
  });
});
