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

const heroSrc = readFileSync(
  new URL("../../components/marketing/Hero.tsx", import.meta.url),
  "utf8",
);
const navSrc = readFileSync(
  new URL("../../components/marketing/MarketingNav.tsx", import.meta.url),
  "utf8",
);
const faqSrc = readFileSync(
  new URL("../../components/marketing/FAQ.tsx", import.meta.url),
  "utf8",
);
const faqListSrc = readFileSync(
  new URL("../../components/marketing/FaqList.tsx", import.meta.url),
  "utf8",
);
const pageSrc = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
const loginSrc = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");
const footerSrc = readFileSync(
  new URL("../../components/marketing/Footer.tsx", import.meta.url),
  "utf8",
);
const tierSrc = readFileSync(
  new URL("../../components/marketing/TierJourney.tsx", import.meta.url),
  "utf8",
);
const munkSrc = readFileSync(
  new URL("../../components/marketing/MunkSection.tsx", import.meta.url),
  "utf8",
);

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
    expect(faq.showAll).not.toMatch(/\((10|8)\)/);
  });
});

describe("public trust — locale lockstep", () => {
  it("keeps da and en Marketing keys in lockstep", () => {
    expect(keysOf(da).sort()).toEqual(keysOf(en).sort());
  });
});

describe("public trust — Munk presence", () => {
  it("keeps da/en Munk keys in lockstep and stays within known facts", () => {
    expect(keysOf(da.munk)).toEqual(keysOf(en.munk));
    const munk = da.munk as {
      name: string;
      role: string;
      body: string;
      photoPending: string;
    };
    expect(munk.name).toBe("Mikael Munk");
    expect(munk.role).toMatch(/head coach/i);
    expect(munk.body).toMatch(/form-check/i);
    expect(munk.body).toMatch(/AI/i);
    expect(munk.photoPending).toMatch(/portræt|portrait/i);
    const invented = /år i branchen|world champion|olympi|certificeret|phd|tidligere landshold/i;
    expect(collectStrings(da.munk).join(" ")).not.toMatch(invented);
    expect(collectStrings(en.munk).join(" ")).not.toMatch(invented);
    expect(MUNK_PORTRAIT_SRC).toBeNull();
    expect(munkSrc).toMatch(/data-munk-portrait/);
    expect(pageSrc).toContain("<MunkSection");
  });
});

describe("public trust — jargon first use", () => {
  it("glosses Motor, Tiers, Reps, open brain and buddy-pod in first body copy", () => {
    const daGive = da.giveForward as {
      intro: string;
      receive: { body: string };
      coach: { body: string };
    };
    const enGive = en.giveForward as {
      intro: string;
      receive: { body: string };
      coach: { body: string };
    };
    expect(daGive.intro).toMatch(/tiers er niveauer/i);
    expect(enGive.intro).toMatch(/tiers are levels/i);
    expect(daGive.receive.body).toMatch(/regel-lag/i);
    expect(enGive.receive.body).toMatch(/rule layer/i);
    expect(daGive.coach.body).toMatch(/reps — point/i);
    expect(enGive.coach.body).toMatch(/reps — points/i);
    expect(daGive.coach.body).toMatch(/pod — en lille gruppe/i);
    expect(enGive.coach.body).toMatch(/pod — a small group/i);

    const daCrew = da.crew as { items: { internal: { v: string } } };
    const enCrew = en.crew as { items: { internal: { v: string } } };
    expect(daCrew.items.internal.v).toMatch(/^Åben hjerne:/);
    expect(enCrew.items.internal.v).toMatch(/^Open brain:/);

    const daTiers = da.tiers as {
      athlete: { unlocks: Record<string, string> };
    };
    expect(daTiers.athlete.unlocks["3"]).toMatch(/buddy-pod —/i);

    const crewAt = pageSrc.indexOf("<CrewSection");
    const marqueeAt = pageSrc.indexOf("<Marquee");
    expect(crewAt).toBeGreaterThan(-1);
    expect(marqueeAt).toBeGreaterThan(crewAt);
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
    expect(heroSrc).toContain("PUBLIC_LEARN_HREF");
    expect(heroSrc).not.toMatch(/ctaTertiary/);
    expect(heroSrc).not.toMatch(/href=["']\/login["']/);
    const heroCopy = da.hero as Record<string, unknown>;
    expect(heroCopy).not.toHaveProperty("ctaTertiary");
    expect(heroCopy).not.toHaveProperty("waitlistLink");

    expect(navSrc).toContain("PUBLIC_WAITLIST_HREF");
    expect(navSrc).toContain("PUBLIC_LOGIN_HREF");
    expect(navSrc).toMatch(/btn-primary[\s\S]*getAccess|getAccess[\s\S]*btn-primary/);

    expect(footerSrc).toContain("PUBLIC_WAITLIST_HREF");
    expect(tierSrc).toContain("PUBLIC_WAITLIST_HREF");
    expect(loginSrc).toMatch(/\/#waitlist/);
    expect(daLogin.waitlistLink).toMatch(/venteliste/i);
    expect(enLogin.waitlistLink).toMatch(/waitlist/i);
  });
});
