# Kalk-landingen: motoren live · implementeringsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landingens hero bliver en levende motor: den besøgende trækker i søvn, HRV og stress, og dagens pas skrives om af `evaluateAdaptation`, den samme rene funktion som kører i appen.

**Architecture:**
- Al regel-logik bliver i `src/lib/adaptive/engine.ts`. Landingen tilføjer **ét** rent modul, `src/lib/marketing/kalk/engine-demo.ts`, som oversætter tre skyder-værdier til et `EngineInput` og kalder motoren. Ingen kopi af regler, ingen serverkald.
- Selve riggen er én klientkomponent, `EngineDemo.tsx`. Den holder tre tal i state, kalder det rene modul og tegner telefonen. Alt andet på siden forbliver server-renderet.
- Bevis-sektionen og løftet i de øvrige sektioner er ren markup og CSS. Bevægelse er `IntersectionObserver` plus CSS-overgange, som `MotorStoryRig` allerede gør det.

**Tech Stack:** Next.js 16.2 App Router (læs `node_modules/next/dist/docs/` før du rører Next-API'er), next-intl, Tailwind v4, vitest (node-miljø, `renderToStaticMarkup`, helper `src/components/marketing/test-render.tsx`).

**Spec:** [`../specs/2026-09-18-kalk-landing-motor-design.md`](../specs/2026-09-18-kalk-landing-motor-design.md)
**Mockup (retning C):** https://claude.ai/artifact/UucnFEHaMd7ExMn8b67yGs
**Branch:** `claude/kalk-landing-motor` fra `main` @ `5dc9923`. Worktree: `.worktrees/kalk-motor`.
**Commits:** små og atomare, conventional med dansk tekst.

---

## Verificeret i koden (2026-09-18)

| Fakta | Kilde |
|---|---|
| `evaluateAdaptation(input): CandidateDecision` har kun type-imports | `src/lib/adaptive/engine.ts:29-65` |
| `CandidateDecision` = `{ action, confidence, reasons[], params, humanReviewRecommended, explanationDa }` | `types.ts:197-217` |
| `params.percent` er `5 \| 10 \| 15` og valgfri. Motoren sætter i dag altid 10 ved topsæt-sænkning | `types.ts:37-43`, `engine.ts:242` |
| `params.accessorySetsDropped` er `1 \| 2 \| 3` | `types.ts:38` |
| `explainerScenarioInput()` giver et komplet, testlåst `EngineInput` med `now` 07:00 og måling 05:30 | `src/lib/adaptive/mock-scenarios.ts:36` |
| Basisscenariets historik udløser ingen regel: `veryLowDaysLast5: 1` (tærskel 3), `rpeDriftLast14d: 0.3` (tærskel 1,5), RPE-afvigelse 0,5 (tærskel 1,0) | `mock-scenarios.ts`, `engine.ts:36-51` |
| Lav søvn er under 5,5 t; `stressed` og `tired` tæller som livsstilssignal | `engine.ts:38,53` |
| `reason-narratives.ts` har `labelForReason`, `formatReadinessBucket`, `formatSleepHours`, `formatFeelingState`; sidstnævnte giver `"-"` for `null` | `src/lib/adaptive/reason-narratives.ts:119-168` |
| Hero ligger i `KalkHero.tsx` med H1, sub, CTA og en højre kolonne med rack-linjer, skive-tal og `DashboardScreen` | `src/components/marketing/kalk/KalkHero.tsx` |
| `MotorStoryRig` er mønsteret for "klient-ø med IntersectionObserver, server-renderede børn" | `MotorStoryRig.tsx` |
| Landingens copy ligger under `Marketing.kalk` med nøglerne `nav, hero, engine, systems, munk, crew, voices, access, faq, footer, screens` | `messages/da/Marketing.json` |
| `kalk/copy.test.ts` kræver: samme nøgler i da og en, ingen tankestreger, højst tre eyebrows, ingen leverandørnavne | `src/lib/marketing/kalk/copy.test.ts` |
| `DemoLoop` sætter selv `mix-blend-multiply`, `preload="metadata"` → `auto` i syne, og `className` rammer kun yderelementet | `src/components/marketing/DemoLoop.tsx:114-124` |
| Bentoen har tre lyse celler og én `data-theme="nat"` hjerte-celle | `SystemsBento.tsx:72,104,125,154` |

---

## Filstruktur

| Fil | Ansvar | Ny/ændret |
|---|---|---|
| `src/lib/marketing/kalk/engine-demo.ts` | Rent modul: skyder-værdier → `EngineInput` → `CandidateDecision` + visningsdata | **ny** |
| `src/lib/marketing/kalk/engine-demo.test.ts` | Bro-test, beslutnings-test, paritetsport | **ny** |
| `src/components/marketing/kalk/EngineDemo.tsx` | Klient-ø: tre skydere, telefon, `aria-live` | **ny** |
| `src/components/marketing/kalk/EngineDemo.test.tsx` | Render-test af de fire tilstande | **ny** |
| `src/components/marketing/kalk/KalkHero.tsx` | Højre kolonne bliver riggen | ændret |
| `src/components/marketing/kalk/MotorStory.tsx` | Bevis: nattens kurve og motorens grænser | ændret |
| `src/components/marketing/kalk/NightCurve.tsx` | SVG-kurve der tegner sig i syne | **ny** |
| `src/components/marketing/DemoLoop.tsx` | Valgfrit tint-lag (spec E4) | ændret |
| `src/components/marketing/kalk/SystemsBento.tsx` | Klip i de tre lyse celler | ændret |
| `src/components/marketing/kalk/KalkFaq.tsx` | Ét nyt spørgsmål | ændret |
| `messages/{da,en}/Marketing.json` | Nye nøgler under `kalk.demo`, `kalk.engine`, `kalk.faq` | ændret |
| `src/lib/marketing/kalk/copy.test.ts` | Porten udvides | ændret |

---

## Chunk 1: Motoren i browseren

### Task 1: Broen fra tre tal til `EngineInput`

**Files:**
- Create: `src/lib/marketing/kalk/engine-demo.ts`
- Create: `src/lib/marketing/kalk/engine-demo.test.ts`

- [ ] **Step 1: Skriv den fejlende test.**

```ts
// src/lib/marketing/kalk/engine-demo.test.ts
import { describe, expect, it } from "vitest";
import { DEMO_DEFAULTS, HRV_RANGE, bucketFor, buildDemoInput } from "./engine-demo";

describe("demo-båndet (spec §3.3)", () => {
  it("dækker kun de tre buckets skyderen kan nå", () => {
    expect(bucketFor(42)).toBe("low");
    expect(bucketFor(51)).toBe("low");
    expect(bucketFor(52)).toBe("normal");
    expect(bucketFor(74)).toBe("normal");
    expect(bucketFor(75)).toBe("high");
    expect(bucketFor(86)).toBe("high");
  });

  it("kan ikke nå very_low, fordi skyderen starter ved 42", () => {
    expect(HRV_RANGE.min).toBe(42);
    expect(HRV_RANGE.max).toBe(86);
  });
});

describe("buildDemoInput (spec §3.2)", () => {
  it("overskriver præcis tre felter og lader resten stå", () => {
    const base = buildDemoInput(DEMO_DEFAULTS);
    expect(base.latestReading?.readinessBucket).toBe("low");
    expect(base.lifestyle.sleepHoursAvg2d).toBe(5);
    expect(base.lifestyle.feelingLast3d).toBe("stressed");
    // Scenariets egne værdier står urørt: målingen er frisk i forhold til now.
    expect(base.latestReading?.measuredAt).toBe("2026-05-25T05:30:00.000Z");
    expect(base.now.toISOString()).toBe("2026-05-25T07:00:00.000Z");
    expect(base.veryLowDaysLast5).toBe(1);
  });

  it("oversætter stress til feelingLast3d", () => {
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 5 }).lifestyle.feelingLast3d).toBe("stressed");
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 4 }).lifestyle.feelingLast3d).toBe("stressed");
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 3 }).lifestyle.feelingLast3d).toBeNull();
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 1 }).lifestyle.feelingLast3d).toBeNull();
  });
});
```

- [ ] **Step 2: Kør og se den fejle.**
Run: `npx vitest run src/lib/marketing/kalk/engine-demo.test.ts`
Expected: FAIL, "Cannot find module './engine-demo'".

- [ ] **Step 3: Implementér modulet.**

```ts
// src/lib/marketing/kalk/engine-demo.ts
import type { EngineInput } from "@/lib/adaptive/types";
// ReadinessBucket bor i hrv-typerne. adaptive/types re-eksporterer den ikke.
import type { ReadinessBucket } from "@/lib/hrv/types";
import { explainerScenarioInput } from "@/lib/adaptive/mock-scenarios";

/**
 * Landingens bro til den rigtige motor (spec 2026-09-18 §3).
 *
 * Reglerne bor i `@/lib/adaptive/engine`. Her oversættes kun tre
 * skyder-værdier til et `EngineInput`. Grundlaget er det testlåste
 * scenarie fra `/hrv/learn/adaptive`, og præcis tre felter overskrives.
 * Rør ikke `measuredAt` eller `now`: scenariets par (05:30 og 07:00)
 * holder målingen frisk. Sættes `measuredAt` til rigtig nutid, bliver
 * alderen negativ, og motoren svarer `stale_reading` ved hver eneste
 * skyder-position.
 */
export type DemoSliders = {
  /** Timer, 3,0-9,0 i spring på 0,5. */
  sleep: number;
  /** Millisekunder, 42-86. Se HRV_RANGE. */
  hrv: number;
  /** 1-5. */
  stress: number;
};

export const HRV_RANGE = { min: 42, max: 86 } as const;
export const SLEEP_RANGE = { min: 3, max: 9, step: 0.5 } as const;

/** Standardtilstanden giver en sænkning, så første indtryk ikke er en tom skærm. */
export const DEMO_DEFAULTS: DemoSliders = { sleep: 5, hrv: 46, stress: 4 };

/**
 * Demo-bånd. Appen har ingen absolutte ms-grænser: `classifyReadiness`
 * måler dit eget snit mod din egen baseline. Det her er landingens
 * fiktion, så et tal fra et ur kan bruges. `very_low` og `very_high`
 * er uden for skyderens rækkevidde (spec §3.3).
 */
export function bucketFor(hrv: number): ReadinessBucket {
  if (hrv < 52) return "low";
  if (hrv <= 74) return "normal";
  return "high";
}

export function buildDemoInput(sliders: DemoSliders): EngineInput {
  const base = explainerScenarioInput();
  return {
    ...base,
    latestReading: base.latestReading
      ? { ...base.latestReading, readinessBucket: bucketFor(sliders.hrv) }
      : base.latestReading,
    lifestyle: {
      ...base.lifestyle,
      sleepHoursAvg2d: sliders.sleep,
      feelingLast3d: sliders.stress >= 4 ? "stressed" : null,
    },
  };
}
```

- [ ] **Step 4: Kør testen.**
Run: `npx vitest run src/lib/marketing/kalk/engine-demo.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/marketing/kalk/engine-demo.ts src/lib/marketing/kalk/engine-demo.test.ts
git commit -m "feat(landing): bro fra skyder-værdier til motorens EngineInput"
```

### Task 2: Beslutningen og visningsdata

**Files:**
- Modify: `src/lib/marketing/kalk/engine-demo.ts`
- Modify: `src/lib/marketing/kalk/engine-demo.test.ts`

- [ ] **Step 1: Skriv de fejlende tests.** Tilføj i testfilen:

```ts
import { DEMO_TOP_SET_KG, runDemo } from "./engine-demo";

describe("runDemo (spec §3.5)", () => {
  it("standardtilstanden sænker topsættet", () => {
    const r = runDemo(DEMO_DEFAULTS);
    expect(r.decision.action).toBe("top_set_reduction");
    expect(r.topSetKg).toBeLessThan(DEMO_TOP_SET_KG);
    expect(r.changed).toBe(true);
    expect(r.decision.explanationDa.length).toBeGreaterThan(0);
  });

  it("lav HRV uden livsstilssignaler sænker volumen i stedet", () => {
    const r = runDemo({ sleep: 7.5, hrv: 46, stress: 2 });
    expect(r.decision.action).toBe("volume_reduction");
    expect(r.topSetKg).toBe(DEMO_TOP_SET_KG);
    expect(r.accessorySetsDropped).toBe(2);
  });

  it("normal HRV lader passet stå, uanset søvn og stress", () => {
    const r = runDemo({ sleep: 3, hrv: 60, stress: 5 });
    expect(r.decision.action).toBe("no_change");
    expect(r.changed).toBe(false);
  });

  it("regner vægten ud af motorens procent og falder tilbage til 10", () => {
    const r = runDemo(DEMO_DEFAULTS);
    const percent = r.decision.params.percent ?? 10;
    expect(r.topSetKg).toBe(Math.round(DEMO_TOP_SET_KG * (1 - percent / 100)));
  });
});

describe("motor-paritet (spec §8)", () => {
  const src = readFileSync(new URL("./engine-demo.ts", import.meta.url), "utf8");

  it("importerer appens motor i stedet for at kopiere den", () => {
    expect(src).toMatch(/from "@\/lib\/adaptive\/engine"/);
  });

  it("gentager ingen af motorens navngivne tærskler", () => {
    for (const t of [/\b5\.5\b/, /\b1\.5\b/, /\b1\.0\b/, /\b36\b/]) {
      expect(src).not.toMatch(t);
    }
  });
});
```

Husk `import { readFileSync } from "node:fs";` øverst.

- [ ] **Step 2: Kør og se dem fejle.**
Run: `npx vitest run src/lib/marketing/kalk/engine-demo.test.ts`
Expected: FAIL på `runDemo` og `DEMO_TOP_SET_KG`.

- [ ] **Step 3: Implementér.** Tilføj i `engine-demo.ts`:

```ts
import { evaluateAdaptation } from "@/lib/adaptive/engine";
import type { CandidateDecision } from "@/lib/adaptive/types";

/**
 * Topsættets vægt er landingens egen visning: motoren har intet
 * vægtfelt (`NextSessionExerciseInfo`), kun en handling og en procent.
 */
export const DEMO_TOP_SET_KG = 150;

/** Motoren sætter i dag altid 10 %, men feltet er valgfrit i typen. */
const FALLBACK_PERCENT = 10;

export type DemoResult = {
  decision: CandidateDecision;
  /** Vægten telefonen viser efter motorens svar. */
  topSetKg: number;
  /** Sandt når topsættet faktisk er ændret, så 150 kan streges ud. */
  changed: boolean;
  /** Kun sat ved volume_reduction. */
  accessorySetsDropped: number | null;
};

export function runDemo(sliders: DemoSliders): DemoResult {
  const decision = evaluateAdaptation(buildDemoInput(sliders));
  const reduced = decision.action === "top_set_reduction";
  const percent = decision.params.percent ?? FALLBACK_PERCENT;
  return {
    decision,
    topSetKg: reduced ? Math.round(DEMO_TOP_SET_KG * (1 - percent / 100)) : DEMO_TOP_SET_KG,
    changed: reduced,
    accessorySetsDropped:
      decision.action === "volume_reduction" ? decision.params.accessorySetsDropped ?? null : null,
  };
}
```

- [ ] **Step 4: Kør hele filen.**
Run: `npx vitest run src/lib/marketing/kalk/engine-demo.test.ts`
Expected: PASS. Hvis "lav HRV uden livsstilssignaler" ikke giver `volume_reduction`, så **stop og rapportér**: motorens regler har ændret sig siden specen, og planen skal justeres, ikke testen.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/marketing/kalk/engine-demo.ts src/lib/marketing/kalk/engine-demo.test.ts
git commit -m "feat(landing): landingen kører appens motor og regner vægten ud af procenten"
```

### Task 3: Porten mod nye runtime-afhængigheder

**Files:**
- Modify: `src/lib/marketing/kalk/engine-demo.test.ts`

- [ ] **Step 1: Skriv testen.** Den vandrer statisk gennem demoens importgraf og kræver, at alt uden for `node_modules` enten er type-only eller selv er rent.

```ts
describe("klientgrafen holdes ren (spec §9)", () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

  it.each([
    ["engine-demo.ts", "./engine-demo.ts"],
    ["engine.ts", "../../adaptive/engine.ts"],
    ["reason-narratives.ts", "../../adaptive/reason-narratives.ts"],
    ["mock-scenarios.ts", "../../adaptive/mock-scenarios.ts"],
    ["hrv/types.ts", "../../hrv/types.ts"],
  ])("%s trækker intet server-only eller node-indbygget med", (_name, rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/from "server-only"/);
    expect(src).not.toMatch(/from "node:/);
    expect(src).not.toMatch(/from "@\/lib\/supabase/);
  });
});
```

- [ ] **Step 2: Kør.** `npx vitest run src/lib/marketing/kalk/engine-demo.test.ts` → PASS (hvis en af filerne fejler, er specens forudsætning brudt: rapportér i stedet for at slække porten).

- [ ] **Step 3: Commit.**
```bash
git add src/lib/marketing/kalk/engine-demo.test.ts
git commit -m "test(landing): porten fanger nye runtime-afhængigheder i demoens graf"
```

---

## Chunk 2: Riggen i hero

### Task 4: Copy til demoen

**Files:**
- Modify: `messages/da/Marketing.json`, `messages/en/Marketing.json` (objektet `kalk`)
- Modify: `src/lib/marketing/kalk/copy.test.ts`

- [ ] **Step 1: Skriv den fejlende test.** Tilføj i `copy.test.ts`:

```ts
  it("har copy til motor-demoen", () => {
    const demo = da.demo as Record<string, string>;
    expect(demo.sleepLabel).toBeTruthy();
    expect(demo.hrvLabel).toBeTruthy();
    expect(demo.stressLabel).toBeTruthy();
    expect(demo.bandNote).toMatch(/demo/i);
    expect(demo.keepOriginal).toBeTruthy();
  });

  it("siger at demo-båndet er et eksempel, ikke et løfte", () => {
    expect((da.demo as Record<string, string>).bandNote).toMatch(/dit eget|din egen/i);
  });
```

- [ ] **Step 2: Kør.** `npx vitest run src/lib/marketing/kalk/copy.test.ts` → FAIL.

- [ ] **Step 3: Skriv copy.** Under `kalk` i **begge** sprogfiler, nøgle for nøgle (dansk vist; engelsk oversættes i samme tone som resten af `en/Marketing.json`). Ingen tankestreger.

**Ingen `eyebrow`-nøgle.** `kalk` har allerede præcis tre (`engine`, `crew`, `access`), og copy-porten tillader højst tre (`copy.test.ts:32`). Demoen får ingen.

```json
"demo": {
  "sleepLabel": "Søvn",
  "hrvLabel": "HRV",
  "stressLabel": "Stress",
  "hrvUnit": "ms",
  "stressUnit": "/5",
  "bandNote": "Demo-bånd. I appen bliver båndet dit eget, målt mod din egen baseline.",
  "sessionTitle": "Back squat",
  "topSetLabel": "Topsæt",
  "keepOriginal": "Behold original",
  "liveRegionPrefix": "Dagens pas opdateret:",
  "whySleep": "Søvn {hours}",
  "whyHrv": "HRV {ms} ms",
  "accessoryDropped": "{count} accessory-sæt droppet",
  "unchanged": "Passet står uændret."
}
```

Copy-porten kræver samme nøgler i `en`. Kør den efter hver fil.

- [ ] **Step 4: Kør.** `npx vitest run src/lib/marketing/kalk` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add messages/da/Marketing.json messages/en/Marketing.json src/lib/marketing/kalk/copy.test.ts
git commit -m "feat(copy): tekst til motor-demoen på landingen"
```

### Task 5: `EngineDemo`, klient-øen

**Files:**
- Create: `src/components/marketing/kalk/EngineDemo.tsx`
- Create: `src/components/marketing/kalk/EngineDemo.test.tsx`

- [ ] **Step 1: Skriv den fejlende render-test.** Brug `render` fra `@/components/marketing/test-render`.

```tsx
// src/components/marketing/kalk/EngineDemo.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@/components/marketing/test-render";
import EngineDemo from "./EngineDemo";

describe("EngineDemo", () => {
  const html = render(<EngineDemo />);

  it("viser standardtilstandens sænkning", () => {
    expect(html).toContain("135");
    expect(html).toContain("150");
  });

  it("har tre skydere med labels og tastaturvenlige felter", () => {
    expect((html.match(/<input[^>]+type="range"/g) ?? []).length).toBe(3);
    expect(html).toMatch(/<label[^>]+for="demo-sleep"/);
    expect(html).toMatch(/<label[^>]+for="demo-hrv"/);
    expect(html).toMatch(/<label[^>]+for="demo-stress"/);
  });

  it("annoncerer ændringen til skærmlæsere", () => {
    expect(html).toMatch(/aria-live="polite"/);
  });

  it("siger at båndet er et demo-bånd", () => {
    expect(html).toMatch(/Demo-bånd/);
  });
});
```

- [ ] **Step 2: Kør.** `npx vitest run src/components/marketing/kalk/EngineDemo.test.tsx` → FAIL.

- [ ] **Step 3: Implementér.** Komponenten er `"use client"`, holder `DemoSliders` i state og kalder `runDemo` ved hver render (ren funktion, ingen effekt).

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEMO_DEFAULTS, DEMO_TOP_SET_KG, HRV_RANGE, SLEEP_RANGE, runDemo, type DemoSliders } from "@/lib/marketing/kalk/engine-demo";

/**
 * Motor-demoen i hero (spec 2026-09-18 §3). Tre skydere, ét kald til
 * appens rigtige regelfunktion, én telefon. Ingen netværk: tallene
 * forlader aldrig browseren.
 */
export default function EngineDemo() {
  const t = useTranslations("Marketing.kalk.demo");
  const [sliders, setSliders] = useState<DemoSliders>(DEMO_DEFAULTS);
  const result = runDemo(sliders);
  const set = (patch: Partial<DemoSliders>) => setSliders((s) => ({ ...s, ...patch }));
  const hours = `${Math.floor(sliders.sleep)} t ${sliders.sleep % 1 === 0 ? "00" : "30"} m`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex w-full flex-col gap-5 lg:max-w-[320px]">
        {/* Søvn */}
        <div>
          <div className="flex items-baseline justify-between">
            {/* Ikke klassen "eyebrow": KalkHero.test.tsx kræver, at heroen ikke har en. */}
            <label htmlFor="demo-sleep" className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim">{t("sleepLabel")}</label>
            <span className="font-display text-3xl">{hours}</span>
          </div>
          <input
            id="demo-sleep"
            type="range"
            min={SLEEP_RANGE.min}
            max={SLEEP_RANGE.max}
            step={SLEEP_RANGE.step}
            value={sliders.sleep}
            onChange={(e) => set({ sleep: Number(e.target.value) })}
            className="mt-3 w-full"
          />
        </div>
        {/* HRV og stress følger samme mønster: label + værdi + input */}
        …
        <p className="font-mono text-[11px] leading-relaxed text-fg-faint">{t("bandNote")}</p>
      </div>

      <div aria-live="polite" className="w-full max-w-[300px] rounded-[44px] bg-fg p-2.5">
        <div className="overflow-hidden rounded-[36px] bg-bg">
          <div className="border-b border-line px-5 pb-3 pt-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">{t("liveRegionPrefix")}</p>
            <p className="font-display mt-1.5 text-3xl">{t("sessionTitle")}</p>
          </div>
          <div className="flex flex-col gap-3.5 px-5 pb-6 pt-4">
            <div className="rounded-[14px] border border-line-strong bg-bg-2 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">{t("topSetLabel")}</p>
              <p className="mt-2 flex items-baseline gap-2.5">
                {result.changed ? (
                  <span className="strike-signal font-display text-3xl text-fg-faint">{DEMO_TOP_SET_KG}</span>
                ) : null}
                <span className="font-display text-5xl">{result.topSetKg}</span>
                <span className="font-mono text-xs text-fg-dim">kg</span>
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-fg-dim">{result.decision.explanationDa}</p>
            </div>

            {result.accessorySetsDropped ? (
              <p className="text-[13px] text-fg-dim">{t("accessoryDropped", { count: result.accessorySetsDropped })}</p>
            ) : null}
            {result.decision.action === "no_change" ? (
              <p className="text-[13px] text-fg-dim">{t("unchanged")}</p>
            ) : null}

            <div className="flex gap-2">
              <span className="rounded-full border border-line-strong px-2.5 py-1.5 font-mono text-[9px] tracking-[0.08em] text-fg-dim">{t("whySleep", { hours })}</span>
              <span className="rounded-full border border-line-strong px-2.5 py-1.5 font-mono text-[9px] tracking-[0.08em] text-fg-dim">{t("whyHrv", { ms: sliders.hrv })}</span>
            </div>

            <p className="rounded-full border border-line-strong px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.1em]">{t("keepOriginal")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Krav, som testen og specen låser:
- **Brug ikke klassen `eyebrow` nogen steder i komponenten.** Heroen skal fortsat kunne bestå `KalkHero.test.tsx:26` (`expect(html).not.toContain("eyebrow")`).
- Skyderne har `min`, `max`, `step` fra modulet, aldrig hardkodede tal.
- Hvert `<input>` har `id` og et `<label htmlFor>`; målfladen er mindst 44 px (styl tommelfingeren i `globals.css` sammen med resten af Kalk, ikke inline).
- Telefonpanelet ligger i `aria-live="polite"` og starter med `t("liveRegionPrefix")`, så en skærmlæser hører hvad der ændrede sig.
- Ved `changed` vises 150 med klassen `strike-signal` (findes allerede i `globals.css`) og den nye vægt i `--fg`.
- "Behold original" er **tekst, ikke en knap**: den findes i appen, men gør intet på landingen, og en død knap er værre end en linje.
- Ved `volume_reduction` vises `t("accessoryDropped", { count })`.
- Ved `no_change` vises `t("unchanged")`.
- Forklaringen er `result.decision.explanationDa`. Skriv **ikke** ny forklarings-copy.
- Chips: søvn og HRV altid; `feelingLast3d` bruges ikke som chip, fordi den er `null` ved stress 3 og derunder.

- [ ] **Step 4: Kør.** `npx vitest run src/components/marketing/kalk` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/kalk/EngineDemo.tsx src/components/marketing/kalk/EngineDemo.test.tsx
git commit -m "feat(landing): motor-demoen som klient-ø i hero"
```

### Task 6: Riggen ind i heroen

**Files:**
- Modify: `src/components/marketing/kalk/KalkHero.tsx`
- Modify: `src/components/marketing/kalk/KalkHero.test.tsx`

- [ ] **Step 1: Ret hero-testen.** Tre eksisterende tests beskriver skive-tallene og skal **fjernes**, fordi det, de beskriver, ikke længere findes: "strikes 150 in signal and sets 135 beside it" (`:18`), "shows the dashboard phone" (`:23`) og "stacks the plate numbers above the phone until 1280 px" (`:33`). Behold "has no eyebrow and no stats band". Tilføj derefter:

```tsx
  it("beholder H1 og den ene sætning", () => {
    expect(html).toContain("Bygget til dem der løfter.");
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });

  it("har erstattet skive-tallene med demoen", () => {
    expect((html.match(/<input[^>]+type="range"/g) ?? []).length).toBe(3);
  });
```

- [ ] **Step 2: Kør** → FAIL.

- [ ] **Step 3: Implementér.** Venstre kolonne (H1, sub, CTA, tekstlink) står uændret. Højre kolonne: fjern `STAGE_LINES`, skive-tallene og `DashboardScreen`, og indsæt `<EngineDemo />`. Behold kolonnens ramme (`border-l`, højde, padding), så hero-rytmen er den samme.

**Slet kun `phoneCaption`.** `plateOld`, `plateNew` og `plateUnit` bruges stadig af `Rule.tsx:12`, `SystemsBento.tsx:45`, `phone/screens/SessionScreen.tsx:13,38` og `phone/screens/DashboardScreen.tsx:38-40`. Grep før du sletter noget som helst: `grep -rn "plateOld\|plateNew\|plateUnit\|phoneCaption" src/`.

- [ ] **Step 4: Kør.** `npx vitest run src/components/marketing src/lib/marketing` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/kalk/KalkHero.tsx src/components/marketing/kalk/KalkHero.test.tsx messages
git commit -m "feat(landing): heroens højre side er nu den levende motor"
```

---

## Chunk 3: Beviset i motor-sektionen

### Task 7: Nattens kurve

**Files:**
- Create: `src/components/marketing/kalk/NightCurve.tsx`
- Create: `src/components/marketing/kalk/NightCurve.test.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Test.** Kurven skal have tre aflæsninger, et statisk slutbillede ved reduceret bevægelse og ingen hardkodede farver.

```tsx
it("tegner tre aflæsninger og bruger tokens", () => {
  const html = render(<NightCurve />);
  expect((html.match(/<circle/g) ?? []).length).toBe(3);
  expect(html).not.toMatch(/#[0-9a-f]{6}/i);
});
```

Plus en CSS-test i `src/lib/design/kalk-theme.test.ts`:

```ts
it("nattens kurve har et statisk slutbillede ved reduceret bevægelse", () => {
  // Ankret til ÉN blok: [^}]* krydser ikke en afsluttende klammer, så
  // reglen skal ligge inde i reduced-motion-blokken for at testen består.
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\.night-curve__path\s*\{[^}]*stroke-dashoffset:\s*0/);
});
```

- [ ] **Step 2: Kør** → FAIL.

**Vigtigt:** `MotorStory.tsx:203-247` har allerede en `NightStrip` med tre `<circle>` og copy under `engine.night.*`. `NightCurve` **erstatter** den. Genbrug copy-nøglerne, flyt dem ikke, og slet `NightStrip`, så siden ikke får to nattegrafer.

- [ ] **Step 3: Implementér.** `NightCurve` er en serverkomponent med én `<path>` og tre `<circle>` (23:40, 05:30, 06:45). Animationen er ren CSS: `stroke-dasharray`/`stroke-dashoffset` på `.night-curve__path`, som kører, når `MotorStory` sætter `data-in-view="true"` på blokken. Genbrug `IntersectionObserver`-mønsteret fra `MotorStoryRig` frem for at skrive et nyt. Ved `prefers-reduced-motion: reduce` sættes `stroke-dashoffset: 0` og ingen overgang.

- [ ] **Step 4: Kør.** `npx vitest run src/components/marketing/kalk src/lib/design` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/kalk/NightCurve.tsx src/components/marketing/kalk/NightCurve.test.tsx src/app/globals.css src/lib/design/kalk-theme.test.ts
git commit -m "feat(landing): nattens kurve tegner sig, når den kommer i syne"
```

### Task 8: Motorens grænser

**Files:**
- Modify: `src/components/marketing/kalk/MotorStory.tsx`
- Modify: `messages/{da,en}/Marketing.json` (`kalk.engine`)

- [ ] **Step 1: Test.** Fire grænser, og "Behold original" nævnt som medlemmets ret.

"Behold original" står der allerede (`MotorStory.tsx:116`, testet i `MotorStory.test.tsx:25,47`), så den påstand er grøn i forvejen. Test det nye:

```tsx
it("viser motorens fire grænser", () => {
  const html = render(<MotorStory />);
  expect((html.match(/data-bound/g) ?? []).length).toBe(4);
});

it("siger at pause og deload går til Munk først", () => {
  expect(render(<MotorStory />)).toMatch(/Munk/);
});
```

- [ ] **Step 2: Kør** → FAIL.

- [ ] **Step 3: Implementér.** Under kurven kommer fire linjer med `data-bound`: motoren må sænke topsæt, sænke volumen, foreslå en lettere variant og afkorte. Under dem én linje om, at pause og deload går til Munk først, og én om "Behold original". Al copy i `kalk.engine`, ingen tankestreger. Nattens kurve indsættes øverst i sektionen.

- [ ] **Step 4: Kør.** `npx vitest run src/components/marketing/kalk src/lib/marketing` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/kalk/MotorStory.tsx messages
git commit -m "feat(landing): motorens grænser står sort på hvidt"
```

---

## Chunk 4: Håndværksløft i de øvrige sektioner

### Task 9: `DemoLoop` får et valgfrit tint-lag

**Files:**
- Modify: `src/components/marketing/DemoLoop.tsx`
- Modify: `src/components/marketing/DemoLoop.test.tsx`

- [ ] **Step 1: Test.** `tint` er valgfri og ændrer intet, når den ikke er sat.

`DemoLoop` kræver `src`, `label`, `pauseLabel` og `playLabel` (`DemoLoop.tsx:16-32`), og den eksisterende testfil kalder `renderToStaticMarkup` direkte. Følg det mønster:

```tsx
const props = {
  src: "/exercise-demos/back-squat.webm",
  label: "Back squat",
  pauseLabel: "Pause",
  playLabel: "Afspil",
};

it("er uændret uden tint", () => {
  expect(renderToStaticMarkup(<DemoLoop {...props} />)).not.toMatch(/data-tint/);
});

it("lægger et tokenbaseret tint-lag over klippet med tint", () => {
  const html = renderToStaticMarkup(<DemoLoop {...props} tint="body" />);
  expect(html).toMatch(/data-tint="body"/);
  expect(html).not.toMatch(/#[0-9a-f]{6}/i);
});
```

- [ ] **Step 2: Kør** → FAIL. **Step 3:** tilføj prop'en `tint?: "body" | "food" | "mind"`, som lægger et `absolute inset-0`-lag med `bg-domain-tint` og `data-domain={tint}` over videoen. `mix-blend-multiply` på selve videoen bevares. **Step 4:** kør `npx vitest run src/components/marketing/DemoLoop.test.tsx` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/DemoLoop.tsx src/components/marketing/DemoLoop.test.tsx
git commit -m "feat(ui): DemoLoop kan tone et klip i en domænefarve"
```

### Task 10: Klip i bentoens tre lyse celler

**Files:**
- Modify: `src/components/marketing/kalk/SystemsBento.tsx`
- Modify: `src/components/marketing/kalk/SystemsBento.test.tsx`

- [ ] **Step 1: Test.** Præcis tre klip, og hjerte-cellen uden.

```tsx
it("giver de tre lyse celler et klip og lader den mørke være", () => {
  const html = render(<SystemsBento />);
  expect((html.match(/<video/g) ?? []).length).toBe(3);
  const heart = html.slice(html.indexOf('data-theme="nat"'));
  expect(heart.slice(0, 400)).not.toMatch(/<video/);
});
```

- [ ] **Step 2: Kør** → FAIL. **Step 3:** indsæt `DemoLoop` med `tint` svarende til cellens domæne i Krop, Mad og Sind. Vælg klip fra `public/exercise-demos/` (fx `back-squat`, `barbell-curl`). Hjerte-cellen beholder sin graf. **Step 4:** kør `npx vitest run src/components/marketing/kalk` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/kalk/SystemsBento.tsx src/components/marketing/kalk/SystemsBento.test.tsx
git commit -m "feat(landing): MoveKit-klip i bentoens lyse celler"
```

### Task 11: FAQ om demoen

**Files:**
- Modify: `src/components/marketing/kalk/KalkFaq.tsx` (Kalks FAQ samles her af `Marketing.kalk.faq.*` plus genbrugte nøgler fra `Marketing.faq.items`. `src/lib/marketing/faq-items.ts` bruges **ikke** af Kalk)
- Modify: `messages/{da,en}/Marketing.json`

- [ ] **Step 1: Test.** Spørgsmålet findes, og svaret siger, at intet sendes.

```ts
it("svarer på om demoen er den rigtige motor", () => {
  const faq = da.faq as Record<string, unknown>;
  const blob = JSON.stringify(faq);
  expect(blob).toMatch(/samme motor|den rigtige motor/i);
  expect(blob).toMatch(/forlader aldrig|sendes ikke/i);
});
```

- [ ] **Step 2: Kør** → FAIL. **Step 3:** tilføj spørgsmålet i begge sprog og render det i FAQ-listen. **Step 4:** `npx vitest run src/lib/marketing src/components/marketing/kalk` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/components/marketing/kalk/KalkFaq.tsx messages
git commit -m "feat(copy): FAQ forklarer at demoen er den rigtige motor"
```

---

## Chunk 5: Porte og overlevering

### Task 12: Browser-verifikation

Protokol: `docs/PLATFORM_OVERVIEW.md` §8. Landingen kræver **ikke** login, men den kræver `LANDING_VARIANT=kalk`.

- [ ] **Step 1:** `mv .env.local .env.local.bak`, start `(nohup env PORT=3002 LANDING_VARIANT=kalk npm run dev &)`, vent 15 s, bekræft at loggen ikke siger `Environments: .env.local`.
- [ ] **Step 2:** På 390 px og 1440 px: træk i hver skyder, og bekræft de tre svar fra §3.5. Tjek at 150 streges ud, at forklaringen skifter, og at der ingen vandret scroll er.
- [ ] **Step 3:** Tastatur: tab til hver skyder, brug piletaster, og bekræft at værdien ændrer sig og at telefonen følger med.
- [ ] **Step 4:** Reduceret bevægelse: sæt `prefers-reduced-motion` i browserens indstillinger, genindlæs, og bekræft at kurven står tegnet og at klippene står stille.
- [ ] **Step 5:** `console errors === 0` på begge bredder. Screenshot af hero og motor-sektion i begge bredder.
- [ ] **Step 6:** `pkill -f "next dev"` og `mv .env.local.bak .env.local`.

### Task 13: Porte, status og PR

- [ ] **Step 1: Kør alt.**
```bash
npm test
npm run lint
npm run build
npx tsc --noEmit 2>&1 | grep -c "error TS"   # baseline er 7, alle i gamle testfiler. Stiger tallet, er det en regression
```

- [ ] **Step 2: Opdatér specen** med et Status-afsnit: hvad der er leveret, og at E4 (tint-laget) er implementeret.

- [ ] **Step 3: Commit.**
```bash
git add docs
git commit -m "docs(spec): motoren live leveret"
```

- [ ] **Step 4: Push og PR** mod `main`. PR-beskrivelsen skal nævne:
- at landingen nu kører appens rigtige motorfunktion i browseren, og at en ændring i motorens regler derfor ændrer forsiden,
- at demo-båndet i ms er landingens fiktion, fordi appen bruger relative bånd,
- at skyderen ikke kan nå `very_low`, fordi den ville foreslå en pause, som kræver Munk,
- at intet forlader browseren.

**Merge kræver Toms udtrykkelige ok i chatten.**
