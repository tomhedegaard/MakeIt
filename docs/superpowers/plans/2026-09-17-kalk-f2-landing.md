# Kalk F2 · Landing implementeringsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byg den nye 8-sektions Kalk-landing (spec §5) ved siden af den nuværende og slå den til med én miljøvariabel.

**Architecture:**
- `src/app/page.tsx` vælger variant via `getLandingVariant()`, som læser `LANDING_VARIANT` server-side. Den gamle landing er default. Kalk slås til på Vercel Preview først og i Production efter Toms godkendelse.
- Kalk-landingen ligger i `src/components/marketing/kalk/` og består af server components med små klient-øer (motor-historie, skærm-rack, demo-loop, venteliste).
- Al tekst ligger i `Marketing.kalk.*`. Øvelsesvisuals er MoveKit-loops (spec §3.4).

**Tech Stack:** Next.js 16.2 App Router (server components med `useTranslations` fra `next-intl`, **ikke** async og ikke `getTranslations`, så de kan render-testes med `renderToStaticMarkup`. Kun `page.tsx` er async), Tailwind v4 med Kalk-tokens fra F1, vitest (node, `renderToStaticMarkup`), IntersectionObserver, CSS scroll-snap.

**Spec:** [`../specs/2026-09-17-kalk-redesign-design.md`](../specs/2026-09-17-kalk-redesign-design.md) §3.4, §4, §5, §8
**Designreference:** [`docs/design/kalk/concept-b-kalk.html`](../../design/kalk/concept-b-kalk.html) er basis. A1 (morgenrapport-rig) kommer fra [`concept-a-morgenrapport.html`](../../design/kalk/concept-a-morgenrapport.html) (`.rr-grid`, `.rig`, `.state`, script nederst). C2 (nattens graf) og C3 (Munk-flow) kommer fra [`concept-c-puls.html`](../../design/kalk/concept-c-puls.html) (`.strip`, `.reads`, `.decide`, `.flow`). Referencerne er statisk HTML. Oversæt klasserne til Tailwind og tokens, og kopier ikke hardcodede farver: brug `--bg`, `--bg-2`, `--fg`, `--signal` osv.
**Branch:** `claude/kalk-f2-landing` fra `main` efter merge af PR #100 (ellers fra `claude/kalk-redesign`).
**Besluttet:** D4 (dansk H1, engelsk slogan i footer), D5 (ingen medlemstal). D6 (citater) er åben, så Stemmer-sektionen er skjult, indtil `Marketing.kalk.voices.enabled` er `"true"`.

---

## Faste regler for alle tasks

1. **Nul tankestreger** (`—` og `–`) i `Marketing.kalk`. Task 2 håndhæver det.
2. **Ingen hardcodede farver** i `src/components/marketing/kalk/**`. Kun tokens (`bg-bg`, `text-fg`, `var(--signal)`) er tilladt. `data-theme="nat"`-blokken bruger også tokens. Task 11 håndhæver det.
3. **Knapper er monokrome.** Primær er `.btn .btn-primary`, sekundær er et tekstlink. Orange (`--signal`) er kun grafik: overstregning, progress og aktiv markering.
4. **Eyebrows:** højst 3 på hele siden. Ingen sektionsnumre.
5. **Bevægelse:** hver animation har et statisk slutbillede under `prefers-reduced-motion`, og der bruges ingen scroll-listeners til animation.
6. **Anker-ID'er:** `#engine`, `#crew`, `#tiers`, `#waitlist` og `#faq` findes i Kalk-landingen. `PUBLIC_WAITLIST_HREF` (`/#waitlist`) virker uændret.
7. **Ingen løfter uden dækning:** ingen medlemstal og ingen pris. Munk-portræt vises kun, hvis `MUNK_PORTRAIT_SRC` er sat.
8. **Commits:** conventional med dansk tekst og trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Stage eksplicitte stier.
9. **Komponenter er ikke async.** Alle Kalk-sektioner og -skærme bruger `useTranslations` (virker i server components). Arrays læses med `t.raw("…") as T[]`, som i `src/app/(app)/reps/page.tsx:120`.
10. **Hex-porten:** skriv aldrig `#123`-agtige referencer (fx "PR #100") i kommentarer i `kalk/` eller `phone/`.
11. **Imports:** `PUBLIC_WAITLIST_HREF` og `PUBLIC_LOGIN_HREF` kommer fra `@/lib/marketing/public-cta`, og `SUPPORT_MAILTO` fra `@/lib/company`.
12. **Verifikation:** hver task kører `npx vitest run <egne tests>`, `npx eslint <egne filer>` og `npx tsc --noEmit 2>&1 | grep -c "error TS"` (skal være 7).

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/lib/marketing/landing-variant.ts` (+test) | `getLandingVariant(env)` giver `"kalk"` eller `"classic"` |
| `src/lib/marketing/tiers.ts` (+test) | Én kilde til reps-grænser, som `RepsSimulator`, `TierJourney` og Kalk bruger |
| `src/lib/marketing/kalk/motor-story.ts` (+test) | De 4 rapport-trin og deres data samt `activeStepFrom()` |
| `src/lib/marketing/kalk/copy.test.ts` | Copy-port for `Marketing.kalk` |
| `src/components/marketing/kalk/KalkLanding.tsx` | Sammensætter de 8 sektioner i `ThemeScope kalk` |
| `…/kalk/KalkNav.tsx` | Nav med højst 4 links og "Få adgang" |
| `…/kalk/KalkHero.tsx` | H1, sætning, CTA og vægtskive-tal (150 overstreget, 135) samt dashboard-telefon |
| `…/kalk/MotorStory.tsx` + `MotorStoryRig.tsx` (client) | C2-graf og A1 sticky rig |
| `…/kalk/SystemsBento.tsx` | 4 celler. Hjerte-cellen er `data-theme="nat"` |
| `…/kalk/ScreenRack.tsx` (client) | Scroll-snap-række med 5 skærme og knapper |
| `…/kalk/KalkMunk.tsx` | Ordmærke, C3-flow, form-check-kort og A4-signatur |
| `…/kalk/CrewPlates.tsx` | Vægtskiver, C4-markører og reps-måler |
| `…/kalk/Voices.tsx` | A3: 1 stort og 2 små citater, skjult bag flag |
| `…/kalk/AccessPanel.tsx` + `WaitlistForm.tsx` (client) | Nat-blok med ventelisteformular (`joinWaitlistAction`) |
| `…/kalk/KalkFaq.tsx` | 6 spørgsmål, genbruger `FaqList` |
| `…/kalk/KalkFooter.tsx` | Ordmærke, slogan og juridiske links |
| `…/kalk/Rule.tsx` | Kg-linealen (rack-grid) |
| `src/components/marketing/phone/PhoneFrame.tsx` | Ramme, statuslinje, dynamic island og tab-bar |
| `src/components/marketing/phone/screens/*.tsx` | `DashboardScreen`, `SessionScreen`, `HrvScreen`, `FoodScreen`, `MindScreen`, `FormCheckScreen`, `DecisionScreen`, `SleepScreen`, `MindCheckedScreen` |
| `src/components/marketing/DemoLoop.tsx` (client, +test) | MoveKit-loop: afspiller kun i syne, respekterer reduceret bevægelse, har pause-knap og multiply-blend |
| `src/components/marketing/kalk/*.test.tsx` | Render-tests pr. sektion |
| `messages/{da,en}/Marketing.json` | Ny `kalk`-gruppe |
| `src/app/page.tsx` | Variantvalg |
| `src/app/globals.css` | Få Kalk-hjælpeklasser: `.kalk-rule`, `.plate`, `.strike-signal` |

---

## Chunk 1: Fundament for landingen

### Task 1: Variantvalg og skal

**Files:**
- Create: `src/lib/marketing/landing-variant.ts`, `src/lib/marketing/landing-variant.test.ts`
- Create: `src/components/marketing/kalk/KalkLanding.tsx`, `src/components/marketing/kalk/KalkLanding.test.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Fejlende test for variantvalg**

```ts
// src/lib/marketing/landing-variant.test.ts
import { describe, expect, it } from "vitest";
import { getLandingVariant } from "./landing-variant";

describe("getLandingVariant", () => {
  it("defaults to the classic landing", () => {
    expect(getLandingVariant({})).toBe("classic");
    expect(getLandingVariant({ LANDING_VARIANT: "" })).toBe("classic");
  });

  it("switches to Kalk only on the exact value", () => {
    expect(getLandingVariant({ LANDING_VARIANT: "kalk" })).toBe("kalk");
    expect(getLandingVariant({ LANDING_VARIANT: " KALK " })).toBe("kalk");
    expect(getLandingVariant({ LANDING_VARIANT: "kalkx" })).toBe("classic");
  });
});
```

Run: `npx vitest run src/lib/marketing/landing-variant.test.ts`. Expected: FAIL, modulet findes ikke.

- [ ] **Step 2: Implementér**

```ts
// src/lib/marketing/landing-variant.ts
/**
 * Which landing `/` renders. Server-only env, read per request so a
 * Vercel Preview can run Kalk while Production stays classic
 * (spec 2026-09-17 §5, plan F2). Remove with the classic landing.
 */
export type LandingVariant = "classic" | "kalk";

export function getLandingVariant(
  env: Record<string, string | undefined> = process.env,
): LandingVariant {
  return env.LANDING_VARIANT?.trim().toLowerCase() === "kalk" ? "kalk" : "classic";
}
```

Run testen igen. Expected: PASS (2).

- [ ] **Step 3: Fejlende test for skallen**

```ts
// src/components/marketing/kalk/KalkLanding.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync(new URL("./KalkLanding.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../../app/page.tsx", import.meta.url), "utf8");

describe("KalkLanding shell", () => {
  it("is a Kalk page scope", () => {
    expect(src).toContain('<ThemeScope theme="kalk"');
  });

  it("renders the eight sections in spec order", () => {
    const order = [
      "<KalkHero", "<MotorStory", "<SystemsBento", "<KalkMunk",
      "<CrewPlates", "<Voices", "<AccessPanel", "<KalkFaq",
    ];
    const at = order.map((tag) => src.indexOf(tag));
    at.forEach((i, n) => expect(i, order[n]).toBeGreaterThan(-1));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("is selected by the variant helper on /", () => {
    expect(page).toContain("getLandingVariant()");
    expect(page).toContain("<KalkLanding");
  });
});
```

Run: `npx vitest run src/components/marketing/kalk/KalkLanding.test.ts`. Expected: FAIL.

- [ ] **Step 4: Opret skallen med stub-sektioner**

Opret hver sektionsfil (også `KalkNav` og `KalkFooter`) som en minimal, ikke-async server component. Sektionerne returnerer `<section id="…" aria-labelledby="…">` med en statisk `<h2>` (sektionens navn, **uden** `t()`, fordi nøglerne først kommer i Task 2). `KalkNav` returnerer `<header />`, og `KalkFooter` returnerer `<footer />`. Sektionerne udfyldes i de senere tasks. Id'er:
- `KalkHero`: ingen id
- `MotorStory`: `engine`
- `SystemsBento`: `systems`
- `KalkMunk`: `munk`
- `CrewPlates`: `crew` (plus `<span id="tiers" />` som alias)
- `Voices`: `voices`
- `AccessPanel`: `waitlist`
- `KalkFaq`: `faq`

```tsx
// src/components/marketing/kalk/KalkLanding.tsx
import ThemeScope from "@/components/ui/ThemeScope";
import KalkNav from "./KalkNav";
import KalkHero from "./KalkHero";
import MotorStory from "./MotorStory";
import SystemsBento from "./SystemsBento";
import KalkMunk from "./KalkMunk";
import CrewPlates from "./CrewPlates";
import Voices from "./Voices";
import AccessPanel from "./AccessPanel";
import KalkFaq from "./KalkFaq";
import KalkFooter from "./KalkFooter";

/** Kalk landing (spec 2026-09-17 §5). Eight sections, one job each. */
export default function KalkLanding() {
  return (
    <ThemeScope theme="kalk" className="flex-1 flex flex-col">
      <KalkNav />
      <main className="relative z-10 flex-1">
        <KalkHero />
        <MotorStory />
        <SystemsBento />
        <KalkMunk />
        <CrewPlates />
        <Voices />
        <AccessPanel />
        <KalkFaq />
      </main>
      <KalkFooter />
    </ThemeScope>
  );
}
```

I `src/app/page.tsx`: behold den nuværende krop i en lokal funktion `ClassicLanding()`, og lad `Home` vælge variant:

```tsx
import { getLandingVariant } from "@/lib/marketing/landing-variant";
import KalkLanding from "@/components/marketing/kalk/KalkLanding";
// …eksisterende imports…

export default async function Home() {
  if (getLandingVariant() === "kalk") return <KalkLanding />;
  return <ClassicLanding />;
}
```

`ClassicLanding` er den nuværende `Home`, uændret og async. `RevealObserver` bliver i Classic. Kalk bruger ikke `data-reveal`.

`export const viewport` i `page.tsx` må ikke sættes, fordi Classic skal forblive mørk. Kalk-landingen får lys `theme-color` via `generateViewport`:

```tsx
import type { Viewport } from "next";
export function generateViewport(): Viewport {
  return getLandingVariant() === "kalk"
    ? { themeColor: "#E7E9EB", colorScheme: "light" }
    : {};
}
```

- [ ] **Step 5: Verificér**

Run: `npx vitest run src/lib/marketing src/components/marketing src/app` og `npx eslint src/app/page.tsx src/components/marketing/kalk src/lib/marketing/landing-variant.ts`, samt tsc. Expected: grønt. `page.landing-loop.test.ts` skal stadig passere, fordi Classic-kroppen er uændret.

- [ ] **Step 6: Commit**

```bash
git add src/lib/marketing/landing-variant.ts src/lib/marketing/landing-variant.test.ts src/components/marketing/kalk src/app/page.tsx
git commit -m "feat(landing): Kalk-landing bag LANDING_VARIANT med 8 sektionsskaller"
```

---

### Task 2: Copy og copy-port

**Files:**
- Modify: `messages/da/Marketing.json`, `messages/en/Marketing.json` (ny top-level nøgle `kalk`)
- Create: `src/lib/marketing/kalk/copy.test.ts`

- [ ] **Step 1: Fejlende copy-port**

```ts
// src/lib/marketing/kalk/copy.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (l: string) =>
  JSON.parse(readFileSync(new URL(`../../../../messages/${l}/Marketing.json`, import.meta.url), "utf8"));
const da = read("da").kalk as Record<string, unknown>;
const en = read("en").kalk as Record<string, unknown>;

function paths(v: unknown, p = ""): string[] {
  if (typeof v === "string") return [p];
  if (!v || typeof v !== "object") return [];
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => paths(x, p ? `${p}.${k}` : k));
}
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (!v || typeof v !== "object") return [];
  return Object.values(v as Record<string, unknown>).flatMap(strings);
}

describe("Marketing.kalk copy gate (spec §5, §8)", () => {
  it("exists in both locales with identical keys", () => {
    expect(da).toBeTruthy();
    expect(paths(da).sort()).toEqual(paths(en).sort());
  });

  it("has no em or en dashes", () => {
    for (const s of [...strings(da), ...strings(en)]) expect(s).not.toMatch(/[–—]/);
  });

  it("uses at most three eyebrows", () => {
    expect(paths(da).filter((k) => k.endsWith(".eyebrow")).length).toBeLessThanOrEqual(3);
  });

  it("makes no member-count or price claims and names no vendor", () => {
    const blob = [...strings(da), ...strings(en)].join("\n");
    expect(blob).not.toMatch(/\b412\b|aktive medlemmer|active members/i);
    expect(blob).not.toMatch(/kr\.?\s?\d|DKK|€|\$\d/i);
    expect(blob).not.toMatch(/Claude|Anthropic|MoveKit/i);
  });

  it("keeps the Danish H1 and the English slogan (D4)", () => {
    const hero = da.hero as { heading: string };
    const footer = da.footer as { slogan: string };
    expect(hero.heading).toBe("Bygget til dem der løfter.");
    expect(footer.slogan).toBe("Made for those who lift.");
  });

  it("uses one CTA label for the access intent", () => {
    const d = da as Record<string, Record<string, string>>;
    expect(d.nav.cta).toBe(d.hero.cta);
    expect(d.hero.cta).toBe("Få adgang");
  });
});
```

Run: expected FAIL (`kalk` findes ikke).

- [ ] **Step 2: Tilføj `kalk`-gruppen i da**

Brug denne struktur. Teksterne er udgangspunktet. De er skrevet i husets tone og uden tankestreger, og de genbruger fakta fra appens egne tekster (spec §3.4, konceptets copy):

```json
"kalk": {
  "nav": { "engine": "Motoren", "systems": "Systemer", "munk": "Munk", "crew": "Crew", "login": "Log ind", "cta": "Få adgang" },
  "hero": {
    "heading": "Bygget til dem der løfter.",
    "sub": "Motoren læser din nat og skriver dagens pas om, før du står under stangen.",
    "cta": "Få adgang",
    "link": "Se hvordan motoren virker",
    "plateOld": "150", "plateNew": "135", "plateUnit": "kg",
    "phoneCaption": "I dag. Motoren har skrevet passet om."
  },
  "engine": {
    "eyebrow": "Hver morgen",
    "heading": "Passet bliver skrevet om, mens du sover.",
    "sub": "Motoren læser nattens HRV, søvn, mind-check og dine seneste pas. Så justerer den vægt og volumen.",
    "night": { "label": "I nat", "sample": "Eksempeldata", "t0": "23:40", "t1": "02:00", "t2": "05:30", "t3": "06:45", "legendHrv": "HRV, ms", "legendSleep": "Søvnfaser", "legendBand": "Dit bånd" },
    "steps": {
      "sleep": { "time": "05:30:02", "source": "Oura", "label": "Søvn", "value": "5 t 12 m", "note": "2 t 18 m under dit mål. Vågen to gange efter kl. 03." },
      "hrv": { "time": "05:30:04", "source": "WHOOP", "label": "HRV", "value": "48", "unit": "ms", "note": "Under dit bånd på 54 til 68 ms. Tredje dag i træk med fald." },
      "stress": { "time": "05:30:05", "source": "Mind-check i går 21:40", "label": "Stress", "value": "4", "unit": "/5", "note": "Dobbelt så højt som din normale uge." },
      "decision": { "time": "05:30:07", "source": "Motoren", "label": "Beslutning", "value": "Topsæt ned", "lift": "Back squat", "from": "150 kg", "to": "135 kg", "note": "Samme øvelser, samme uge. Lettere topsæt, så du kan komme igen i morgen." }
    },
    "keepOriginal": "Behold original",
    "keepOriginalNote": "Du ser altid hvorfor, og du kan altid beholde den oprindelige plan.",
    "disclaimer": "HRV er et restitutionssignal, ikke en diagnose."
  },
  "systems": {
    "heading": "Fire systemer. Ét pas.",
    "sub": "Krop, mad, hjerte og sind taler sammen. Det der sker ét sted, flytter noget et andet sted.",
    "body": { "kicker": "Krop", "heading": "Programmet flytter sig med dig.", "text": "Blokke på fire uger. Topsæt, backoff og hvil sat af motoren hver morgen.", "stat": "16", "statLabel": "Sæt i dag" },
    "food": { "kicker": "Mad", "heading": "Brændstof.", "quote": "Olivenolie og smør, ikke rapsolie. Skyr og hytteost, ikke proteinbarer.", "macro": "2.740 kcal · 182 g protein", "p": "Protein", "c": "Kulhydrat", "f": "Fedt" },
    "heart": { "kicker": "Hjerte", "heading": "Dit bånd, ikke et gennemsnit.", "now": "HRV i morges", "avg": "Dit snit", "disclaimer": "HRV er et restitutionssignal, ikke en diagnose." },
    "mind": { "kicker": "Sind", "heading": "Hovedet er en del af passet.", "text": "60 sekunder. Hvordan har hovedet det i dag?", "energy": "Energi", "stress": "Stress", "focus": "Fokus" },
    "rack": { "heading": "Appen, i dagslys.", "sub": "Swipe, scroll eller brug piletasterne.", "sample": "Eksempeldata", "prev": "Forrige skærm", "next": "Næste skærm", "listLabel": "Fem app-skærme" }
  },
  "munk": {
    "heading": "Et menneske skriver under.",
    "sub": "Mikael Munk er hovedcoach. Han læser dine løft.",
    "flow": [
      { "t": "+0 t", "label": "Du optager sættet i appen" },
      { "t": "+4 min", "label": "AI skriver et udkast" },
      { "t": "+6 t", "label": "Munk retter og skriver under" },
      { "t": "Maks", "label": "24 timer, hver gang" }
    ],
    "card": { "kicker": "Form-check", "lift": "Back squat · sæt 3", "draftLabel": "AI-udkast", "draft": "Der ses let valgus i knæleddet under den excentriske fase.", "final": "Knæene falder ind i bunden. Tænk: skub gulvet fra hinanden.", "signed": "Munk", "answered": "svaret på 6 t", "reference": "Reference", "yours": "Din optagelse" }
  },
  "crew": {
    "eyebrow": "Crewet",
    "heading": "Læs på, en skive ad gangen.",
    "sub": "Reps optjenes ved at træne, sende form-checks, sætte PR'er og hjælpe andre.",
    "here": "Du er her",
    "coachSchool": "Coach School åbner",
    "tiers": {
      "lifter": "Du er med. Hvert pas tæller.",
      "athlete": "Form-checks og PR'er giver flest reps.",
      "beast": "Coach School åbner. Du lærer at svare andre.",
      "legend": "Toppen af crewet."
    },
    "meterLabel": "Athlete · 1.240 af 5.000 reps",
    "meterNote": "Eksempel",
    "earnHeading": "Sådan optjenes reps",
    "earn": { "sessions": "Pas", "formChecks": "Form-checks", "prs": "PR'er", "help": "Hjælp til andre" }
  },
  "voices": { "enabled": "false", "heading": "Fra crewet." },
  "access": {
    "eyebrow": "Adgang",
    "heading": "Skriv dig på listen.",
    "sub": "Invite-only. Pladser åbnes i små hold.",
    "worksWith": "Virker med WHOOP, Oura, Polar og Apple Watch via iPhone-appen.",
    "emailLabel": "Din email", "emailPlaceholder": "navn@domæne.dk",
    "cta": "Skriv mig op", "pending": "Et øjeblik…",
    "done": "Du står på listen. Vi skriver, når næste hold åbner.",
    "error": "Det virkede ikke. Tjek emailen og prøv igen.",
    "fine": "Kun invites. Ingen nyhedsbreve."
  },
  "faq": {
    "heading": "Spørgsmål.",
    "sub": "Mangler du et svar, så skriv til Munk.",
    "inviteOnly": { "q": "Hvorfor er det invite-only?", "a": "Fordi Munk selv skriver under på svarene. Derfor åbner vi i små hold." }
  },
  "footer": { "slogan": "Made for those who lift.", "privacy": "Privatliv", "terms": "Vilkår", "sample": "Tal og skærme på siden er eksempeldata." }
}
```

Oversæt til en med samme nøgler i `messages/en/Marketing.json`. Engelsk H1 er "Built for those who lift.", og sloganet er uændret. `voices.enabled` er `"false"` i begge sprog.

- [ ] **Step 3: Verificér og commit**

Run: `npx vitest run src/lib/marketing` (inkl. `public-landing.test.ts`, som forbyder "Claude" i al marketing-copy). Expected: PASS.

```bash
git add messages/da/Marketing.json messages/en/Marketing.json src/lib/marketing/kalk/copy.test.ts
git commit -m "feat(landing): Kalk-copy på dansk og engelsk med copy-port"
```

---

### Task 3: Én kilde til tiers, og motor-historiens data

**Files:**
- Create: `src/lib/marketing/tiers.ts`, `src/lib/marketing/tiers.test.ts`
- Modify: `src/components/marketing/RepsSimulator.tsx:28-30`, `src/components/marketing/TierJourney.tsx` (brug konstanterne til `range`)
- Create: `src/lib/marketing/kalk/motor-story.ts`, `src/lib/marketing/kalk/motor-story.test.ts`

- [ ] **Step 1: Fejlende tests**

```ts
// src/lib/marketing/tiers.test.ts
import { describe, expect, it } from "vitest";
import { TIERS, tierForReps, progressToNext } from "./tiers";

describe("marketing tiers", () => {
  it("lists the four tiers with their reps floors", () => {
    expect(TIERS.map((t) => [t.key, t.from])).toEqual([
      ["lifter", 0], ["athlete", 1000], ["beast", 5000], ["legend", 15000],
    ]);
  });

  it("maps reps to a tier on the floor boundaries", () => {
    expect(tierForReps(0).key).toBe("lifter");
    expect(tierForReps(999).key).toBe("lifter");
    expect(tierForReps(1000).key).toBe("athlete");
    expect(tierForReps(14999).key).toBe("beast");
    expect(tierForReps(15000).key).toBe("legend");
  });

  it("reports progress toward the next tier, and null at the top", () => {
    expect(progressToNext(1240)).toEqual({ next: "beast", at: 5000, ratio: 0.248 });
    expect(progressToNext(20000)).toBeNull();
  });
});
```

```ts
// src/lib/marketing/kalk/motor-story.test.ts
import { describe, expect, it } from "vitest";
import { MOTOR_STEPS, activeStepFrom } from "./motor-story";

describe("motor story", () => {
  it("tells the engine's order: sleep, hrv, stress, decision", () => {
    expect(MOTOR_STEPS.map((s) => s.key)).toEqual(["sleep", "hrv", "stress", "decision"]);
    expect(MOTOR_STEPS.map((s) => s.domain)).toEqual(["mind", "heart", "mind", "body"]);
  });

  it("shows the decision when nothing intersects (no-JS / reduced motion fallback)", () => {
    expect(activeStepFrom([])).toBe("decision");
  });

  it("picks the intersecting step closest to the viewport centre", () => {
    expect(
      activeStepFrom([
        { key: "hrv", distanceToCentre: 120 },
        { key: "stress", distanceToCentre: 40 },
      ]),
    ).toBe("stress");
  });
});
```

Run begge. Expected: FAIL.

- [ ] **Step 2: Implementér**

```ts
// src/lib/marketing/tiers.ts
/**
 * Public Reps tiers. Single source for the marketing surfaces
 * (RepsSimulator, TierJourney, Kalk CrewPlates). Member tier itself
 * is stored on members.tier; these floors are the published ladder.
 */
export const TIERS = [
  { key: "lifter", name: "Lifter", from: 0 },
  { key: "athlete", name: "Athlete", from: 1000 },
  { key: "beast", name: "Beast", from: 5000 },
  { key: "legend", name: "Legend", from: 15000 },
] as const;

export type TierKey = (typeof TIERS)[number]["key"];

export function tierForReps(reps: number) {
  return [...TIERS].reverse().find((t) => reps >= t.from) ?? TIERS[0];
}

export function progressToNext(reps: number): { next: TierKey; at: number; ratio: number } | null {
  const i = TIERS.findIndex((t) => t.key === tierForReps(reps).key);
  const next = TIERS[i + 1];
  if (!next) return null;
  return { next: next.key, at: next.from, ratio: Math.round((reps / next.from) * 1000) / 1000 };
}
```

```ts
// src/lib/marketing/kalk/motor-story.ts
/** The four morning-report lines, in the order the engine reads them (spec §4 A1). */
export const MOTOR_STEPS = [
  { key: "sleep", domain: "mind" },
  { key: "hrv", domain: "heart" },
  { key: "stress", domain: "mind" },
  { key: "decision", domain: "body" },
] as const;

export type MotorStepKey = (typeof MOTOR_STEPS)[number]["key"];

/**
 * Which phone state to show. With nothing intersecting (no JS,
 * reduced motion, first paint) the rig shows the decision, which is
 * the point of the story.
 */
export function activeStepFrom(
  visible: { key: MotorStepKey; distanceToCentre: number }[],
): MotorStepKey {
  if (visible.length === 0) return "decision";
  return [...visible].sort((a, b) => a.distanceToCentre - b.distanceToCentre)[0].key;
}
```

I `RepsSimulator.tsx` findes allerede en lokal `const TIERS` (l. 27, brugt l. 119). Importér derfor med alias, så den lokale liste bliver udledt:

```ts
import { TIERS as LADDER } from "@/lib/marketing/tiers";
const TIERS = LADDER.slice(1).map((t) => ({ key: t.key, name: t.name, at: t.from }));
```

I `TierJourney.tsx` bygges `range`-strengene ud fra `TIERS` med præcis det nuværende format (dansk tusindtalsseparator, tankestreg med mellemrum som i dag, sidste tier med `+`):

```ts
const fmt = (n: number) => n.toLocaleString("da-DK");
const rangeOf = (i: number) =>
  TIERS[i + 1] ? `${fmt(TIERS[i].from)} – ${fmt(TIERS[i + 1].from - 1)}` : `${fmt(TIERS[i].from)}+`;
```

Intet andet ændres. Eksisterende tests skal passere uændret. Classic-landingen er ikke omfattet af tankestreg-reglen, fordi den erstattes i Task 13.

- [ ] **Step 3: Verificér og commit**

Run: `npx vitest run src/lib/marketing src/components/marketing`. Expected: PASS.

```bash
git add src/lib/marketing/tiers.ts src/lib/marketing/tiers.test.ts src/lib/marketing/kalk/motor-story.ts src/lib/marketing/kalk/motor-story.test.ts src/components/marketing/RepsSimulator.tsx src/components/marketing/TierJourney.tsx
git commit -m "refactor(landing): én kilde til reps-tiers og motor-historiens trin"
```

---

### Task 4: `DemoLoop`

**Files:**
- Create: `src/components/marketing/DemoLoop.tsx`, `src/components/marketing/DemoLoop.test.tsx`
- Create: `src/lib/marketing/demo-loop.ts`, `src/lib/marketing/demo-loop.test.ts`

- [ ] **Step 1: Fejlende tests**

```ts
// src/lib/marketing/demo-loop.test.ts
import { describe, expect, it } from "vitest";
import { shouldPlay } from "./demo-loop";

describe("shouldPlay", () => {
  const base = { inView: true, reducedMotion: false, userPaused: false, ready: true };
  it("plays only when visible, ready, not paused and motion allowed", () => {
    expect(shouldPlay(base)).toBe(true);
    expect(shouldPlay({ ...base, inView: false })).toBe(false);
    expect(shouldPlay({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldPlay({ ...base, userPaused: true })).toBe(false);
    expect(shouldPlay({ ...base, ready: false })).toBe(false);
  });
});
```

```tsx
// src/components/marketing/DemoLoop.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DemoLoop from "./DemoLoop";

describe("DemoLoop", () => {
  const html = renderToStaticMarkup(
    <DemoLoop src="/exercise-demos/back-squat.webm" label="Back squat" pauseLabel="Pause" playLabel="Afspil" />,
  );

  it("derives webm, mp4 and poster from one URL and never autoplays from markup", () => {
    expect(html).toContain('poster="/exercise-demos/back-squat-poster.jpg"');
    expect(html).toContain('type="video/webm"');
    expect(html).toContain('type="video/mp4"');
    expect(html).not.toContain("autoplay");
    expect(html).toContain("muted");
    expect(html).toMatch(/playsinline/i); // React 19 SSR renders playsInline
  });

  it("blends into Kalk and exposes an accessible pause control", () => {
    expect(html).toContain("mix-blend-multiply");
    expect(html).toContain('aria-label="Back squat"');
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Pause<\/button>/);
  });
});
```

Run. Expected: FAIL.

- [ ] **Step 2: Implementér**

```ts
// src/lib/marketing/demo-loop.ts
export function shouldPlay(s: {
  inView: boolean;
  reducedMotion: boolean;
  userPaused: boolean;
  ready: boolean;
}): boolean {
  return s.inView && s.ready && !s.reducedMotion && !s.userPaused;
}
```

`DemoLoop.tsx` (`"use client"`) har denne kontrakt:
- **Props:** `src`, `label`, `pauseLabel`, `playLabel`, `className?`, `tag?: string`, hvor `tag` er en valgfri overlay-etiket som "Reference".
- **Assets:** `resolveDemoAssets(src)` fra `@/lib/data/demo-assets` giver `<video muted loop playsInline preload="metadata" poster={poster} aria-label={label} className="absolute inset-0 h-full w-full object-cover mix-blend-multiply">` med `<source type="video/webm">` og `<source type="video/mp4">`.
- **Afspilning:** en `useEffect` opretter en IntersectionObserver (threshold 0.35) og lytter på `matchMedia("(prefers-reduced-motion: reduce)")` og `canplay`. `video.play()` og `video.pause()` styres af `shouldPlay`. Returnér cleanup.
- **Pause-knap:** `<button type="button" aria-pressed={userPaused} className="btn btn-sm absolute right-3 top-3">`. Den toggler `userPaused`, og teksten skifter mellem `pauseLabel` og `playLabel`.
- **Wrapper:** `relative overflow-hidden rounded-[14px] bg-bg-2`.

Følg `src/components/exercise/ExerciseDemo.tsx` som mønster for `<video>` og `resolveDemoAssets`. `autoPlay` må ikke bruges. Afspilning startes kun fra effekten.

- [ ] **Step 3: Verificér og commit**

Run: `npx vitest run src/lib/marketing/demo-loop.test.ts src/components/marketing/DemoLoop.test.tsx` og eslint. Expected: PASS.

```bash
git add src/lib/marketing/demo-loop.ts src/lib/marketing/demo-loop.test.ts src/components/marketing/DemoLoop.tsx src/components/marketing/DemoLoop.test.tsx
git commit -m "feat(landing): DemoLoop spiller MoveKit-loops kun i syne"
```

---

### Task 5: `PhoneFrame` og skærmene

**Files:**
- Create: `src/components/marketing/phone/PhoneFrame.tsx`
- Create: `src/components/marketing/phone/screens/{Dashboard,Session,Hrv,Food,Mind,FormCheck,Decision,Sleep,MindChecked}Screen.tsx`
- Create: `src/components/marketing/phone/screens.test.tsx`

**Designkilde:** reference B, klasserne `.phone`, `.screen`, `.island`, `.sbar`, `.ab`, `.tabbar` og alle skærm-blokke. Tilstandsskærmene Sleep, MindChecked og Decision kommer fra reference A (`state 1-4`).

**Regler:**
- Skærmene er server components uden state.
- Tekst hentes fra `Marketing.kalk` eller fra appens egne nøgler (`Dashboard.todaySession.*`, `Session.*`, `Hrv.band.*`), så appen og landingen siger det samme.
- Hver skærm er `role="img"` med en beskrivende `aria-label`. Indholdet er `aria-hidden`.
- Ikoner er små inline SVG-glyffer i tab-baren (de eneste tilladte, jf. reference B's `symbol`-sæt). Øvelsesvideo leveres af `DemoLoop`, aldrig af en figur.

`PhoneFrame` har props `{ label: string; tab?: "today"|"train"|"food"|"mind"|"crew"; dark?: boolean; width?: number; children }`. Med `dark` wrappes skærmen i `data-theme="nat"` uden `.theme-root` (spec §2, F1-note). Session-skærmen bruger altid `dark`.

- [ ] **Step 1: Test-hjælper og fejlende render-test**

```tsx
// src/components/marketing/test-render.tsx (test-only helper, shared by F2 render tests)
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import da from "../../../messages/da/index";

export function render(el: ReactElement): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="da" timeZone="Europe/Copenhagen" messages={da}>
      {el}
    </NextIntlClientProvider>,
  );
}
```

```tsx
// src/components/marketing/phone/screens.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import DashboardScreen from "./screens/DashboardScreen";
import SessionScreen from "./screens/SessionScreen";
import FormCheckScreen from "./screens/FormCheckScreen";
import DecisionScreen from "./screens/DecisionScreen";

describe("marketing phone screens", () => {
  it("dashboard shows the rewritten top set as an image with a description", () => {
    const html = render(<DashboardScreen />);
    expect(html).toContain('role="img"');
    expect(html).toMatch(/aria-label="[^"]*150[^"]*135[^"]*"/);
  });

  it("session screen is always Nat", () => {
    expect(render(<SessionScreen />)).toContain('data-theme="nat"');
  });

  it("form-check shows the member's own recording and a MoveKit reference, no drawn figure", () => {
    const html = render(<FormCheckScreen />);
    expect(html).toContain("/exercise-demos/back-squat");
    expect(html).toContain("Din optagelse");
    expect(html).toContain("<video"); // exercise visual is a real MoveKit loop
  });

  it("decision offers Behold original and the why-chips (A2, C1)", () => {
    const html = render(<DecisionScreen />);
    expect(html).toContain("Behold original");
    expect(html).toMatch(/Søvn[\s\S]*HRV[\s\S]*Stress/);
  });
});
```

`messages/da/index.ts` default-eksporterer alle namespaces (inkl. Marketing, Dashboard, Session og Hrv). Skærmene bruger `useTranslations` (ikke async). Sektionstests i Chunk 2 bruger den samme `render`-hjælper. Læg den i `src/components/marketing/test-render.tsx`, og importér den.

Run. Expected: FAIL.

- [ ] **Step 2: Byg `PhoneFrame` og de 9 skærme efter referencerne**

Følg reglerne ovenfor. Mål og indhold står i referencerne. Find blokkene via HTML-kommentarerne i referencen:
- Dashboard: B, `.hero-phone` under `<!-- HERO -->`
- Session: B, `<!-- Session (dark) -->`
- Hrv: B, `<!-- HRV -->`
- Food: B, `<!-- Mad -->`
- Mind: B, `<!-- Sind -->`
- FormCheck: B, `<!-- Form-check -->` (brug `DemoLoop` med `tag="Reference"` og `yours`-rækken)
- Decision: A `state 4`
- Sleep: A `state 1`
- MindChecked: A `state 3`

Tallene er eksempeldata og kommer fra copy'en.

- [ ] **Step 3: Verificér og commit**

Run: testen, eslint og tsc. Expected: PASS.

```bash
git add src/components/marketing/phone
git commit -m "feat(landing): telefonramme og ni app-skærme til Kalk-landingen"
```

---

## Chunk 2: Sektionerne

Hver task herunder følger samme mønster:
1. Skriv en render-test (`<Section>.test.tsx`) inden for `NextIntlClientProvider` som i Task 5, og se den fejle.
2. Byg sektionen efter referencen.
3. Kør test, eslint og tsc.
4. Commit.

Assertionerne står i hver task og er de bindende krav.

### Task 6: `KalkNav`, `KalkHero` og `Rule`

**Reference:** B, `<header class="hdr">` og `<!-- HERO -->`, samt CSS `.hdr`, `.hero`, `.stage`, `.plate-nums` og `.pn`.

**Assertions:**
- Nav har højst 4 sektionslinks (`#engine`, `#systems`, `#munk`, `#crew`), "Log ind" til `PUBLIC_LOGIN_HREF` og "Få adgang" til `PUBLIC_WAITLIST_HREF`. Nav er én linje ved 1024 px, og links under 1024 px ligger i en `<details>`-menu uden JS.
- `h1` indeholder "Bygget til dem der løfter.".
- Hero har præcis én `.btn-primary`.
- "150" står i et element med klassen `strike-signal`, og "135" står ved siden af.
- `DashboardScreen` er med.
- Hero har ingen eyebrow og intet stats-bånd.

**CSS i `globals.css`, scoped under `[data-theme="kalk"]`:**
- `.strike-signal`: en orange (`var(--signal)`) skrå streg via `::after`, animeret med `scaleX` og statisk under reduceret bevægelse.
- `.kalk-rule`: kg-linealen fra reference B `.rule`.

**Commit:** `feat(landing): Kalk-nav og hero med vægtskive-tal`

### Task 7: `MotorStory`

**Reference:**
- C `.strip` og `.reads` til nattens graf.
- A `.rr-grid`, `.rig`, `.state`, `.rig-ticks` og scriptet nederst til den sticky telefon.
- C `.decide` til beslutningslinjen.

**Opbygning:**
- `MotorStory.tsx` (server) renderer overskrift og sub. Nattens graf er inline SVG, og kun data-blækket har domænefarve. Derefter følger de fire rapportlinjer som `<article data-step="…" data-domain="…">`, og til sidst `<MotorStoryRig>`.
- `MotorStoryRig.tsx` (client) observerer artiklerne, beregner det aktive trin med `activeStepFrom` og sætter `data-active` på riggen. Alle fire tilstande (Sleep, Hrv, MindChecked, Decision) ligger i DOM'en, og kun den aktive har `opacity: 1`.

**Assertions:**
- Server-markup har `data-active="decision"` som default (statisk fallback).
- Alle fire skærme er i markup.
- Beslutningsskærmen indeholder "Behold original".
- Sektionen har id `engine`.
- Sektionen har eyebrow nr. 1 af 3.

**Mobil:** linjer og skærme stables, og der er ingen sticky telefon under 1024 px.

**Commit:** `feat(landing): morgenrapport med nattens graf og sticky telefon`

### Task 8: `SystemsBento` og `ScreenRack`

**Reference:** B, `<!-- SYSTEMS -->` til og med rack-`</ul>` (`.bento`, `.cell`, `.rack`, `.track`), samt scriptet nederst.

**Assertions:**
- Bentoen har præcis 4 celler.
- Hjerte-cellen har `data-theme="nat"` og ingen `.theme-root`.
- Hver celle har en `data-domain`-kicker.
- Racket er en `<ul>` med `tabIndex={0}`, `aria-label` og 5 `<li>` (Session, Hrv, Food, Mind, FormCheck).
- De to knapper har `aria-controls` og `aria-label`.

**Opførsel:**
- `ScreenRack` (client) scroller én skærm pr. klik og med piletaster, og knapperne deaktiveres ved enderne.
- Under reduceret bevægelse bruges `behavior: "auto"`.

**Commit:** `feat(landing): fire systemer som bento og swipebar skærmrække`

### Task 9: `KalkMunk` og `CrewPlates`

**Reference:**
- B, `<!-- MUNK -->` og `<!-- CREW -->` (`.munk-type`, `.mono-plate`, `.fc`, `.plates`, `.tiers`, `.repsbox`).
- C `.flow` til C3.
- A `.fc-sig` til signatur-SVG'en.

**Assertions for Munk:**
- Flowet har 4 punkter med tidsstempler fra copy, læst med `t.raw("munk.flow") as { t: string; label: string }[]`.
- Kortet har overstreget AI-udkast og det endelige svar.
- Kortet har signatur-SVG med `role="img"` og `aria-label="Underskrift, Mikael Munk"`.
- `DemoLoop` bruges med `tag="Reference"`.
- Portrættet vises kun, når `MUNK_PORTRAIT_SRC !== null` (test med den nuværende `null`: ingen `<img>`).

**Assertions for Crew:**
- Der er 4 skiver fra `TIERS`, og "Du er her" står ved Athlete.
- "Coach School åbner" står ved Beast.
- Måleren er `role="img"` med en `aria-label`, der indeholder "1.240", og bredden kommer fra `progressToNext(1240).ratio`.
- Crew-sektionen har id `crew`, og `id="tiers"` findes.
- Eyebrow nr. 2 af 3 står i Crew.

**Commit:** `feat(landing): Munk med signatur og crew-skiver med markører`

### Task 10: `Voices`, `AccessPanel`, `KalkFaq` og `KalkFooter`

**Voices** (A `.voices`: 1 stort og 2 små citater):
- Rendrer `null`, når `t("voices.enabled") !== "true"` (D6).
- Testen verificerer, at den er `null` med den nuværende copy.
- Når flaget slås til, læses citaterne fra `kalk.voices.items`. Nøglerne tilføjes først, når Tom har leveret ægte citater.

**AccessPanel** (B `.access-panel`):
- Wrapper i `data-theme="nat"` uden `.theme-root`.
- `WaitlistForm` (client) genbruger `joinWaitlistAction` med samme honeypot-felt `company` som `WaitlistSection.tsx`.
- Formularen har en label over feltet, `type="email"`, `autoComplete="email"` og `inputMode="email"`, og statusbeskeden ligger i `aria-live="polite"`.
- Knappen er en lys pille (`.btn .btn-primary` i Nat-scope), ikke orange.
- `id="waitlist"`.
- Eyebrow: `access.eyebrow` (nr. 3 af 3).

**KalkFaq:**
- Seks punkter: `inviteOnly` (ny) plus disse eksisterende `Marketing.faq.items`-nøgler: `advanced`, `wearables`, `optOutAdaptive`, `responseTime` og `hrvScore`.
- Genbrug `FaqList` med `initialCount={6}` og `showAllLabel` (påkrævet), fx `Marketing.faq.showAll` med `count`.
- `id="faq"`.

**KalkFooter:**
- Ordmærke, sloganet "Made for those who lift.", links til `/privacy` og `/terms` samt `SUPPORT_MAILTO`.
- Linjen om eksempeldata står i footeren.
- Eyebrow nr. 3 af 3 er `access.eyebrow` i AccessPanel. Footer og FAQ har ingen eyebrow.

**Commit:** `feat(landing): adgang, FAQ, footer og skjulte stemmer`

---

## Chunk 3: Porte og udrulning

### Task 11: Kilde-porte

**Create:** `src/components/marketing/kalk/kalk-gates.test.ts`

```ts
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("./", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") && !f.includes(".test."));
const sources = files.map((f) => [f, readFileSync(new URL(f, dir), "utf8")] as const);
const phoneDir = new URL("../phone/screens/", import.meta.url);
const screens = [
  ...readdirSync(phoneDir).map((f) => [f, readFileSync(new URL(f, phoneDir), "utf8")] as const),
  ["PhoneFrame.tsx", readFileSync(new URL("../phone/PhoneFrame.tsx", import.meta.url), "utf8")] as const,
];

describe("Kalk landing source gates (plan F2 regler)", () => {
  it.each([...sources, ...screens])("%s has no hardcoded colours", (_f, src) => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/rgba?\(/);
    expect(src).not.toMatch(/\b(bg|text|border)-(white|black|red|blue|green|orange|gray|zinc|slate)-?\d*/);
  });

  it.each(sources)("%s uses no drawn exercise figures", (_f, src) => {
    expect(src).not.toMatch(/\bstick-?figure\b|pindefigur/i);
  });

  it("spends at most three eyebrows on the page", () => {
    const count = sources.reduce((n, [, s]) => n + (s.match(/className="[^"]*\beyebrow\b/g)?.length ?? 0), 0);
    expect(count).toBeLessThanOrEqual(3);
  });

  it("has no custom cursor, spotlight or marquee", () => {
    const all = sources.map(([, s]) => s).join("\n");
    expect(all).not.toMatch(/CustomCursor|Spotlight|Marquee/);
  });
});
```

Run. Den skal passere. Hvis den ikke gør, rettes sektionerne, ikke porten.

**Commit:** `test(landing): kildeporte for Kalk-landingen`

### Task 12: Browser-verifikation og Preview

1. **Demo-tilstand.** Tilføj `LANDING_VARIANT=kalk` midlertidigt i shell-miljøet og brug protokollen fra PLATFORM_OVERVIEW §8:

   ```bash
   lsof -ti:3002 | xargs kill -9 2>/dev/null || true
   mv .env.local .env.local.bak
   nohup env PORT=3002 LANDING_VARIANT=kalk npm run dev > /tmp/kalk-f2.log 2>&1 &
   until grep -q "Ready" /tmp/kalk-f2.log; do sleep 1; done
   ```

   `.env.local.bak` skal flyttes tilbage, også hvis et tjek fejler.

2. **Tjek på 390×844 og 1440×900:**
   - Højden er ≤ 10.000 px ved 1440 og ≤ 15.000 px ved 390 (`document.body.scrollHeight`).
   - Ingen vandret scroll.
   - Hero med CTA er synlig over folden.
   - Nav er én linje ved 1024 px.
   - Motor-riggen skifter tilstand ved scroll på desktop og er stablet på mobil.
   - Demo-loops spiller kun i syne og holder pause under reduceret bevægelse (DevTools-emulering).
   - Rack-knapper og piletaster virker.
   - Ventelisten viser "Du står på listen" i demo-tilstand.
   - Konsol: 0 fejl, bortset fra den kendte service worker-fejl.
   - `/#waitlist` fra `/login` lander på formularen.

3. **Regression:** uden `LANDING_VARIANT` er `/` uændret Classic.

4. **Samlet kørsel:** `npm test && npm run lint && npm run build`. tsc skal give 7.

5. **Vercel:** sæt `LANDING_VARIANT=kalk` **kun for Preview-miljøet**. Det er en ændring i projektets miljøvariabler, så **spørg Tom først**. Push branchen, åbn PR, og send Preview-linket til Tom.

6. **Commit:** `docs(plan): F2 Kalk-landing leveret`, med opdatering af status i hovedplanen.

### Task 13 (efter Toms godkendelse): Skift og oprydning

Egen PR.
- Sæt `LANDING_VARIANT=kalk` i Production, eller gør `kalk` til default i `getLandingVariant`.
- Slet `ClassicLanding` og de gamle landingskomponenter, der ikke bruges andre steder. Tjek med `grep`, før noget slettes:
  - `Hero`, `DomainIndexSection`, `GiveForwardSection`, `WorksWith`, `CrewSection`, `MunkSection`, `AdaptivePlaygroundPublic`, `ValueSection`, `PillarsSection`, `TierJourney`, `LandingLoop`, `AppShowcase`, `Testimonials`, `WaitlistSection`, `FAQ`, `MarketingNav`, `Footer`, `RevealObserver`, `SmoothScroll`, `CustomCursor`, `Spotlight`, `Marquee`, `CountUp`.
  - Slet også deres tests og ubrugte `Marketing.*`-nøgler. Behold `faq.items`, der genbruges.
  - `public-anchors.test.ts`, `page.landing-loop.test.ts` og dele af `public-landing.test.ts` peger på de gamle filer. Omskriv dem til Kalk-ækvivalenterne, eller slet dem med en begrundelse i commit-beskeden.
- Fjern `SmoothScroll` og `CustomCursor` fra `src/app/layout.tsx`.

---

## Status

- [x] Task 1 Variant og skal
- [x] Task 2 Copy og port
- [x] Task 3 Tiers og motor-data
- [x] Task 4 DemoLoop
- [x] Task 5 Telefon og skærme
- [x] Task 6 Nav og hero
- [x] Task 7 MotorStory
- [x] Task 8 Bento og rack
- [x] Task 9 Munk og crew
- [x] Task 10 Adgang, FAQ, footer, stemmer
- [x] Task 11 Kildeporte
- [x] Task 12 Verifikation (demo og produktions-build, 2026-09-17). Vercel Preview-env afventer Tom.
- [ ] Task 13 Skift (efter godkendelse)
