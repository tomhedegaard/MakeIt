/**
 * MakeIt Ung, del 2 — the youth product (spec afsnit 3).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import da from "../../../messages/da/Youth.json";
import en from "../../../messages/en/Youth.json";
import { navFor } from "@/components/app/AppShell";
import { tabsFor } from "@/components/app/MobileTabBar";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const PROGRAM = read("../../../supabase/migrations/0064_makeit_ung_program.sql");

describe("UNG-01 (0064)", () => {
  it("is a youth programme and the adult catalogue stays adult by default", () => {
    expect(PROGRAM).toMatch(/add column if not exists audience text not null default 'adult'/);
    expect(PROGRAM).toMatch(/'UNG-01',[\s\S]*?'youth'\s*\)/);
  });

  it("prescribes no kilos at all and no RPE above 7", () => {
    const sets = [...PROGRAM.matchAll(/'(\[\{.*?\}\])'::jsonb/g)].map((m) => JSON.parse(m[1].replace(/''/g, "'")) as { weight: unknown; rpe: number | null }[]);
    expect(sets.length).toBe(15);
    for (const exercise of sets) {
      for (const set of exercise) {
        expect(set.weight).toBeNull();
        if (set.rpe != null) expect(set.rpe).toBeLessThanOrEqual(7);
      }
    }
  });

  it("has no max attempts in the programme itself (the header comment may name them)", () => {
    const seed = PROGRAM.slice(PROGRAM.indexOf("do $$"));
    expect(seed).not.toMatch(/1RM|AMRAP|max(imal)? (test|forsøg)/i);
    expect(seed).toContain("Ingen maksforsøg.");
  });
});

describe("youth navigation", () => {
  const youth = { youth: true, mind: false };

  it("shows only youth routes, with Mad pointing at the number-free page", () => {
    const hrefs = navFor(youth).map((i) => i.href);
    expect(hrefs).toContain("/ung/mad");
    expect(hrefs).not.toContain("/nutrition");
    for (const closed of ["/community", "/messages", "/reps", "/science", "/hrv", "/mind"]) expect(hrefs).not.toContain(closed);
    expect(tabsFor(youth).map((t) => t.href)).toEqual(["/dashboard", "/coaching", "/ung/mad"]);
  });

  it("adds Mind only with consent", () => {
    expect(tabsFor({ youth: true, mind: true }).map((t) => t.href)).toContain("/mind");
  });

  it("leaves the adult navigation untouched", () => {
    expect(navFor(null).map((i) => i.href)).toContain("/nutrition");
  });
});

describe("youth copy (spec §S)", () => {
  const forbidden = /kcal|kalorie(?!r,)|calorie(?!s,)|kropsvægt|body weight|slank|tab(e|t) dig|lose weight|BMI|makro|macro|snyd|cheat|fortjent|earn it/i;
  it.each([["da", da], ["en", en]] as const)("%s: I dag and Mad carry no numbers about food or body", (_l, msgs) => {
    const text = JSON.stringify({ today: msgs.today, food: msgs.food });
    // "Ingen tal"/"No numbers" and the invitation's own promise are the only mentions.
    expect(text.replace(/uden kalorier|without calories|Ingen tal|No numbers/gi, "")).not.toMatch(forbidden);
  });
});

describe("no filming for Munk from a young account", () => {
  it("hides the film button and the sheet in the session, and refuses on the server", () => {
    const session = read("../../app/(app)/session/[id]/SessionClient.tsx");
    expect(session).toMatch(/\{youth \? null : \(\s*<button\s+type="button"\s+data-form-film-cta=""/);
    expect(session).toMatch(/\{youth \? null : \(\s*<FormCheckSheet/);
    expect(read("../../app/(app)/form-check/actions.ts")).toMatch(/isYouthAccount\(member\.id\)\)\) \{\s*return \{ ok: false/);
  });
});
