# Kalk F4 · App-flader implementeringsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle medlemsflader, onboarding og coach-konsollen følger Kalk-sproget (eller et eksplicit Nat-scope). Der er én typografisk stemme, ingen mørke literals, én titelskala, ingen nummererede eyebrows eller tankestreger i app-copy, og native-statusbaren følger temaet.

**Architecture:**
- Hver regel låses af en **kildeport** (vitest, der læser filerne). Porten skrives først og fejler, derefter rettes koden, til den er grøn. Det samme mønster brugte F1–F3 (`kalk-shell-gate.test.ts`, `kalk/copy.test.ts`).
- Fontene: de tre next/font-variabler hedder direkte `--font-*-stack`, og Kalk-scopet holder op med at skifte font. Inter, Archivo Black og JetBrains Mono fjernes (**besluttet af Tom 2026-09-17**).
- `/coach` får `ThemeScope theme="nat"` (**besluttet af Tom 2026-09-17**).
- Mørke særtilfælde (scrims, video-letterbox, anatomi-figur) bliver tokens i begge temaer, så ingen komponent har en hex-værdi.
- Statusbaren styres af en lille klientkomponent, der læser `color-scheme` på `<html>` efter hver navigation og kalder `window.Capacitor.Plugins.StatusBar` (samme injicerede runtime som `NativePushToggle`).

**Tech Stack:** Next.js 16.2 App Router (læs `node_modules/next/dist/docs/` før du rører metadata/viewport), next-intl, Tailwind v4, vitest (node, `renderToStaticMarkup`, helper `src/components/marketing/test-render.tsx`), Capacitor 8 (`@capacitor/status-bar` 8.0.2, allerede synket i iOS og Android).

**Spec:** [`../specs/2026-09-17-kalk-redesign-design.md`](../specs/2026-09-17-kalk-redesign-design.md) §2, §3, §6, §7 D3, §8
**Rammeplan:** [`2026-09-17-kalk-redesign.md`](2026-09-17-kalk-redesign.md) "F4 App-flader"
**Branch:** `claude/kalk-f4-surfaces` fra `main` @ `fd8a028` (F3 merget). Worktree: `.worktrees/kalk-f4`.
**Commits:** små og atomare, conventional med dansk tekst.

---

## Verificeret i koden (2026-09-17)

| Fakta | Kilde |
|---|---|
| 38 `page.tsx` under `(app)`. 17 af dem (ekskl. `/session`) har hverken `PageHeader` eller `PageTitle` og bygger selv eyebrow + `<h1 className="font-display text-[clamp(…)]">` | grep, liste i Task 8 |
| `mind/check` redirecter, `mind/onboarding` delegerer til `MindDisclaimer` (bruger allerede `PageHeader`), `nutrition/setup` delegerer til `NutritionSetupView` (egen `<h1>` l. 14) | filerne |
| `PageHeader` har sin egen titelskala `clamp(2.4rem,6vw,4.5rem)` og wrapper i `Container` | `src/components/app/PageHeader.tsx` |
| 39 eyebrows står lige over en `<h2>` i 24 app-filer (mønster i Task 9) | node-scan |
| 14 nummererede eyebrows i app-copy: 7 side-kickers (`Coaching`, `Community`, `Reps`, `Profile`, `Nutrition`, `Messages` + `Nav`s tour) og 7 tour-trin (`Nav.json` 01–04, `Mind.json` 01–03). Tourene har allerede progress-prikker | `messages/da/*.json`, `FirstTimeTour.tsx:93` |
| Ca. 230 tankestreger (–/—) i app-namespaces (da) og tilsvarende i en | grep |
| Hardcodet dansk copy i HRV og Mind: `hrv/page.tsx`, `hrv/trends`, `hrv/learn/adaptive`, `mind/settings`, `components/hrv/*` (7 filer), `components/mind/*` (4 filer) | grep, liste i Task 12 |
| Mørke literals uden for mail/coach/klassisk landing: 22 steder i 18 filer | grep, liste i Task 4 |
| `#C97B3E` (amber) bruges til sekundære muskler og aktive cues. `#4CAF7D`, `#E8703A`, `#4F86C6` er science-domænefarver fra prototypen | `ExerciseHero.tsx:21-25`, `AnatomyFigure.tsx:33-40`, `CuesList.tsx:60`, `SessionClient.tsx:639`, `lib/science/domains.ts:12-16` |
| `AnatomyFigure3D` bruges kun i `/coach/system/anatomy` (uden for scope) | grep |
| `Spotlight` bruges kun af den klassiske `marketing/Hero.tsx` (uden for scope) | grep |
| Root-layoutet indlæser 6 fonte. Kalk-fontene har `preload: false` | `src/app/layout.tsx:12-57` |
| `kalk-theme.test.ts` låser `:root --display-weight: 400` og Kalks font-override. Begge skal ændres i Task 1 | `src/lib/design/kalk-theme.test.ts:44-58` |
| `/coach/layout.tsx` har intet tema-scope og ingen viewport | fil |
| `/onboarding/layout.tsx` har intet tema-scope, så onboarding er stadig mørk | fil |
| Ingen kode styrer statusbaren. `@capacitor/status-bar` er i `Package.swift` og `capacitor.settings.gradle`. `Style.Dark = "DARK"` giver lys tekst, `Style.Light = "LIGHT"` mørk tekst | `node_modules/@capacitor/status-bar/dist/esm/definitions.d.ts:46-67` |
| `capacitor.config.ts` har `backgroundColor: "#0A0A0B"` og splash `#0A0A0B` | l. 23, 36 |
| `manifest.ts` har `background_color` og `theme_color` `#0A0A0B` | l. 19-20 |
| tsc-baseline: 7 fejl (alle i testfiler) | `npx tsc --noEmit` |

**Konsekvens, Tom skal kende:** når de gamle fonte fjernes, får den **klassiske landing i produktion** (vist fordi `LANDING_VARIANT` kun er sat i Preview) også Big Shoulders og Geist. Det er i tråd med "én stemme", men landingen skifter udseende ved merge. Anbefaling: slå Kalk-landingen til i Production samtidig.

**Uden for scope:** mailskabeloner, `/coach/*`-komponenternes indhold (kun scope), klassisk landing, `AnatomyFigure3D`, splash og ikon (D3, næste butiksudgivelse), `join`/`signup`/`waitlist`/`legal`.

---

## Filstruktur

| Fil | Ansvar | Ny/ændret |
|---|---|---|
| `src/app/layout.tsx` | Tre fonte, lys PWA-farve i viewport forbliver mørk (klassisk landing) | ændret |
| `src/app/globals.css` | Fontstakke på `:root`, nye tokens `--scrim`, `--media`, `--anatomy-*` | ændret |
| `src/lib/design/kalk-theme.test.ts` | Font- og tokenporte | ændret |
| `src/lib/design/kalk-surface-gate.test.ts` | Porte for mørke literals, titler, eyebrows | **ny** |
| `src/lib/i18n/app-copy-gate.test.ts` | Porte for tankestreger, numre, hardcodet HRV/Mind-copy | **ny** |
| `src/app/coach/layout.tsx` | Nat-scope + mørk viewport | ændret |
| `src/app/onboarding/layout.tsx` | Kalk-scope + lys viewport | ændret |
| `src/lib/native/status-bar.ts` | Ren funktion `statusBarStyleFor` + `syncStatusBar` | **ny** |
| `src/lib/native/status-bar.test.ts` | Test af ovenstående | **ny** |
| `src/components/native/NativeChrome.tsx` | Klientkomponent, kalder `syncStatusBar` ved navigation | **ny** |
| `capacitor.config.ts`, `src/app/manifest.ts` | Kalk-baggrund | ændret |
| `src/components/app/PageHeader.tsx` | Delegerer til `PageTitle` | ændret |
| 17 sider + `NutritionSetupView.tsx` | `PageTitle` i stedet for egne titler | ændret |
| 24 filer | `SectionHeader` i stedet for eyebrow + h2 | ændret |
| `messages/{da,en}/*.json` | Numre og tankestreger væk, ny HRV/Mind-copy | ændret |

---

## Chunk 1: Fundament (fonte, scopes, tokens, farver)

### Task 1: Én typografisk stemme

**Files:**
- Modify: `src/lib/design/kalk-theme.test.ts:44-58`
- Modify: `src/app/layout.tsx:1-57,93-97`
- Modify: `src/app/globals.css` (`:root`-display-blok l. ~71-75, Kalk-blok l. ~128-133, `.font-display`-kommentar l. ~270)

- [ ] **Step 1: Skriv de fejlende tests.** Erstat de to tests "swaps the three font stacks…" og "lets display treatment follow the font…" med:

```ts
  it("has one typographic voice: the stacks are the Kalk families everywhere", () => {
    expect(layout).not.toMatch(/Inter|Archivo_Black|JetBrains_Mono/);
    expect(layout).toMatch(/Big_Shoulders\(\{\s*variable: "--font-display-stack"/);
    expect(layout).toMatch(/Geist\(\{\s*variable: "--font-sans-stack"/);
    expect(layout).toMatch(/Geist_Mono\(\{\s*variable: "--font-mono-stack"/);
    expect(layout).not.toMatch(/preload: false/);
  });

  it("sets the Big Shoulders display treatment on :root, not per theme", () => {
    const root = readThemeTokens(css, ":root");
    expect(root["--display-weight"]).toBe("800");
    expect(root["--display-tracking"]).toBe("-0.005em");
    expect(root["--display-leading"]).toBe("0.88");
    expect(kalk["--display-weight"]).toBeUndefined();
    expect(kalk["--font-display-stack"]).toBeUndefined();
    expect(nat["--display-weight"]).toBeUndefined();
  });
```

Ret også filteret i "mirrors every Kalk colour token…" (det må gerne blive, som det er, da Kalk ikke længere har font-nøgler).

- [ ] **Step 2: Kør og se dem fejle.**
Run: `npx vitest run src/lib/design/kalk-theme.test.ts`
Expected: FAIL på de to nye tests (layout indeholder `Inter`, `:root` har `400`).

- [ ] **Step 3: Implementér.** I `layout.tsx`:

```ts
import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";

// Kalk (spec 2026-09-17 §3.2) is the one typographic voice. Nat surfaces
// (/session, /coach) use the same families with dark colours.
const display = Big_Shoulders({
  variable: "--font-display-stack",
  subsets: ["latin"],
  display: "swap",
  // next/font has no automatic fallback metrics for Big Shoulders; opt out
  // instead of letting the build warn on every run.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "sans-serif"],
});

const sans = Geist({ variable: "--font-sans-stack", subsets: ["latin"], display: "swap" });

const mono = Geist_Mono({ variable: "--font-mono-stack", subsets: ["latin"], display: "swap" });
```

og `className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}`.

I `globals.css`: sæt `:root`-blokken til `--display-weight: 800; --display-tracking: -0.005em; --display-leading: 0.88;`, slet de seks font/display-linjer i Kalk-blokken, og opdatér kommentaren ved `.font-display` (Archivo er væk). Søg efter `--font-kalk-` i hele `src/`, og fjern alle rester.

- [ ] **Step 4: Kør tests.**
Run: `npx vitest run src/lib/design`
Expected: PASS

- [ ] **Step 5: Commit.**
```bash
git add src/app/layout.tsx src/app/globals.css src/lib/design/kalk-theme.test.ts
git commit -m "feat(design): én typografisk stemme, Inter, Archivo Black og JetBrains Mono fjernet"
```

### Task 2: `/coach` i Nat og onboarding i Kalk

**Files:**
- Create: `src/lib/design/kalk-surface-gate.test.ts`
- Modify: `src/app/coach/layout.tsx`
- Modify: `src/app/onboarding/layout.tsx`

- [ ] **Step 1: Skriv den fejlende port.**

```ts
// src/lib/design/kalk-surface-gate.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("theme scopes (spec §2)", () => {
  it("/coach is explicitly Nat with dark browser chrome", () => {
    const src = read("app/coach/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="nat"/);
    expect(src).toMatch(/colorScheme: "dark"/);
  });

  it("/onboarding is Kalk with light browser chrome", () => {
    const src = read("app/onboarding/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="kalk"/);
    expect(src).toMatch(/colorScheme: "light"/);
  });
});
```

- [ ] **Step 2: Kør.** `npx vitest run src/lib/design/kalk-surface-gate.test.ts` → FAIL.

- [ ] **Step 3: Implementér.** `coach/layout.tsx`:

```tsx
import type { Viewport } from "next";
import ThemeScope from "@/components/ui/ThemeScope";
// …
// Coach console stays dark in v1 (spec §2). Explicit, so it never depends on :root.
export const viewport: Viewport = { themeColor: "#0A0A0B", colorScheme: "dark" };
// …
  return (
    <ThemeScope theme="nat" className="flex flex-1 flex-col">
      <CoachShell member={member}>{children}</CoachShell>
    </ThemeScope>
  );
```

`onboarding/layout.tsx`:

```tsx
import type { Viewport } from "next";
import ThemeScope from "@/components/ui/ThemeScope";

export const viewport: Viewport = { themeColor: "#E7E9EB", colorScheme: "light" };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="kalk" className="relative z-10 minh-dvh">
      {children}
    </ThemeScope>
  );
}
```

Tjek `CoachShell`s yderste element: hvis det selv sætter `min-h-*`/`flex`, så tilpas `className` på `ThemeScope`, så layoutet er uændret.

- [ ] **Step 4: Kør.** Samme kommando → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/app/coach/layout.tsx src/app/onboarding/layout.tsx src/lib/design/kalk-surface-gate.test.ts
git commit -m "feat(design): coach eksplicit i Nat, onboarding i Kalk"
```

### Task 3: Tokens til scrim, media og anatomi

**Files:**
- Modify: `src/lib/design/kalk-theme.test.ts`
- Modify: `src/app/globals.css` (Nat-blok, Kalk-blok, Nat-løft, `@theme inline`)

- [ ] **Step 1: Fejlende test** (tilføj i `kalk-theme.test.ts`):

```ts
  const NEW_TOKENS = ["--scrim", "--media", "--anatomy-body", "--anatomy-edge", "--anatomy-idle", "--anatomy-accent"];

  it.each(NEW_TOKENS)("%s exists in Kalk, Nat and the Nat lift", (t) => {
    const natLift = readThemeTokens(css, 'html:has(.theme-root[data-theme="nat"])');
    expect(kalk[t], "kalk").toBeDefined();
    expect(nat[t], "nat").toBeDefined();
    expect(natLift[t], "lift").toBeDefined();
  });

  it("exposes scrim and media as Tailwind colours", () => {
    expect(css).toMatch(/--color-scrim:\s*var\(--scrim\)/);
    expect(css).toMatch(/--color-media:\s*var\(--media\)/);
  });

  it("gives the anatomy accent 3:1 as a graphic on Kalk --bg-2", () => {
    expect(contrastRatio(kalk["--anatomy-accent"], kalk["--bg-2"])).toBeGreaterThanOrEqual(3);
  });
```

- [ ] **Step 2: Kør** → FAIL.

- [ ] **Step 3: Implementér.** Værdier:

| Token | Nat (og Nat-løft) | Kalk | Rolle |
|---|---|---|---|
| `--scrim` | `rgba(0, 0, 0, 0.7)` | `rgba(13, 15, 18, 0.45)` | Bagtæppe bag modaler |
| `--media` | `#000000` | `#0D0F12` | Letterbox bag video og billeder |
| `--anatomy-body` | `#1A1A1C` | `#DCDFE2` | Silhuet |
| `--anatomy-edge` | `#3A3A3E` | `#B4B9C0` | Kant, led, hoved |
| `--anatomy-idle` | `#222226` | `#CDD1D6` | Ikke-trænede muskler |
| `--anatomy-accent` | `#C97B3E` | `#A8380B` | Sekundære/tertiære muskler (Kalk = `--body`) |

Primære muskler bruger `var(--fg)` direkte, så der er ingen `--anatomy-primary`. I `@theme inline`: `--color-scrim: var(--scrim);` og `--color-media: var(--media);`.

Kør `npx vitest run src/lib/design/kalk-theme.test.ts`. "keeps the Nat <html> lift value-identical" skal også være grøn.

- [ ] **Step 4: Commit.**
```bash
git add src/app/globals.css src/lib/design/kalk-theme.test.ts
git commit -m "feat(design): tokens til scrim, media og anatomi-figur i begge temaer"
```

### Task 4: Ingen mørke literals i app-fladerne

**Files:**
- Modify: `src/lib/design/kalk-surface-gate.test.ts`
- Modify (fund fra grep 2026-09-17):
  - `src/app/(app)/train/exercises/[slug]/ExerciseHero.tsx:21-25,210`
  - `src/app/(app)/train/exercises/[slug]/page.tsx:161`
  - `src/components/anatomy/AnatomyFigure.tsx:33-40,95-96,122-127`
  - `src/components/exercise/CuesList.tsx:60`
  - `src/app/(app)/session/[id]/SessionClient.tsx:639`
  - `src/app/(app)/science/ScienceFeed.tsx:112`, `src/lib/science/domains.ts:12-16`
  - `src/app/(app)/nutrition/LogMealButton.tsx:77`, `OffPlanLogButton.tsx:68`, `MealCard.tsx:106`
  - `src/components/mind/MentalResourcesModal.tsx:80`, `MindFirstTimeTour.tsx:62`
  - `src/components/nutrition/StreakCelebration.tsx:36`
  - `src/components/chat/VideoRecorder.tsx:258,266,268,295`, `MessageBubble.tsx:63`
  - `src/app/(app)/profile/page.tsx:254`, `src/app/(app)/coach-school/lessons/[slug]/page.tsx:60`

- [ ] **Step 1: Udvid porten.** Tilføj i `kalk-surface-gate.test.ts`:

```ts
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../../", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Member surfaces. Coach console, mail, classic landing and the 3D coach spike are out of scope (spec header).
const OUT_OF_SCOPE = [
  /^app\/coach\//, /^components\/coach\//, /^lib\/email\//, /^components\/marketing\/(?!kalk\/)/,
  /^components\/Spotlight\.tsx$/, /^components\/anatomy\/AnatomyFigure3D/, /^app\/coach\b/,
];
// Browser-chrome metadata must be a literal (Next viewport API): Nat values are legitimate there.
const CHROME_METADATA = ["app/layout.tsx", "app/(app)/session/[id]/page.tsx", "app/coach/layout.tsx"];

const DARK = /#0A0A0B|#F5F2EC|#111113|#18181B|#1F1F23|#A8A6A0|#56554F|#C97B3E|#4CAF7D|#E8703A|#4F86C6|rgba\(245,\s?242,\s?236|rgba\(10,\s?10,\s?11/i;
const DARK_UTIL = /\b(bg-black|text-white|bg-white|text-black)(\/\d+)?\b/;

const surfaceFiles = walk(SRC)
  .map((p) => relative(SRC, p))
  .filter((p) => /\.(tsx?|css)$/.test(p) && !/\.test\./.test(p) && p !== "app/globals.css")
  .filter((p) => !OUT_OF_SCOPE.some((r) => r.test(p)) && !CHROME_METADATA.includes(p));

describe("no dark-only literals on member surfaces (spec §8)", () => {
  it.each(surfaceFiles)("%s", (p) => {
    const src = readFileSync(join(SRC, p), "utf8");
    expect(src).not.toMatch(DARK);
    expect(src).not.toMatch(DARK_UTIL);
  });
});
```

Bemærk: `lib/science/config.ts` har også de tre science-farver. Tjek med `grep -rn "\.color" src/lib/science scripts/` om `color` fra `config.ts` bruges nogen steder. Hvis ikke: fjern felterne. Hvis ja: brug de samme `var(--…)`-strenge som i `domains.ts`.

- [ ] **Step 2: Kør.** `npx vitest run src/lib/design/kalk-surface-gate.test.ts` → FAIL med de filer, der står ovenfor (plus `manifest.ts`, som rettes i Task 6; lad den fejle til da, eller lav Task 6 først).

- [ ] **Step 3: Ret filerne.** Erstatninger:

| Før | Efter |
|---|---|
| `bg-black/60`, `bg-black/80`, `bg-black/85` (modal-bagtæppe) | `bg-scrim` |
| `style={{ background: "rgba(10,10,11,0.92)" }}` (`StreakCelebration`) | `className="… bg-scrim"` (fjern inline background, behold `backdropFilter`) |
| `bg-black` på `<video>`/`<img>` og videorammer | `bg-media` |
| `bg-black/60 … text-white` (optage-badge, `MealCard`-badge) | `bg-scrim text-bg` i Nat-scope: pak badgen i `<span data-theme="nat">`, og brug `bg-bg/70 text-fg`. Badgen ligger oven på et foto, så den skal være mørk i begge temaer |
| `border-l-[#C97B3E]` | `border-l-body` |
| `text-[#4CAF7D]` (verificeret-flueben) | `text-food` |
| `DOMAIN_COLOR = { mad: "#4CAF7D", krop: "#E8703A", sind: "#4F86C6" }` | `{ mad: "var(--food)", krop: "var(--body)", sind: "var(--mind)" }`. Opdatér kommentaren: farverne følger nu domænesystemet (`DOMAIN_COLOR_SYSTEM.md`) |
| `ExerciseHero` `TIER_COLOR` | `{ primary: "var(--fg)", secondary: "var(--anatomy-accent)", tertiary: "color-mix(in oklab, var(--anatomy-accent) 40%, transparent)" }` |
| `Chip` `color: dark ? "#0A0A0B" : "#F5F2EC"` | `color: dark ? "var(--bg)" : "var(--fg)"` |
| `AnatomyFigure` `COLORS` | `{ body: "var(--anatomy-body)", body_outline: "var(--anatomy-edge)", inactive: "var(--anatomy-idle)", tertiary: "var(--anatomy-accent)", secondary: "var(--anatomy-accent)", primary: "var(--fg)" }` |

`fill`/`stroke` som SVG-attributter accepterer ikke `var()` pålideligt i Safari. Flyt dem til `style`: `style={{ fill: COLORS.body, stroke: COLORS.body_outline }}` og `<path … style={{ fill }} opacity={opacity} />`. Tjek, at `AnatomyFigure`s opacity-niveauer stadig giver tydelig forskel på lys baggrund (screenshot i Task 14). Justér kun opacity, ikke farver.

- [ ] **Step 4: Kør porten og relaterede tests.**
Run: `npx vitest run src/lib/design src/components/anatomy src/app/(app)/science src/lib/science`
Expected: PASS (bortset fra `manifest.ts`, hvis Task 6 ikke er lavet).

- [ ] **Step 5: Commit** (gerne i to commits: anatomi/øvelser og scrims/media/science).
```bash
git commit -m "fix(design): anatomi, cues og science-farver via tokens"
git commit -m "fix(design): scrim og media-tokens i stedet for sort og hvid"
```

---

## Chunk 2: Native og browser-chrome

### Task 5: Statusbaren følger temaet

**Files:**
- Create: `src/lib/native/status-bar.ts`
- Create: `src/lib/native/status-bar.test.ts`
- Create: `src/components/native/NativeChrome.tsx`
- Modify: `src/app/layout.tsx` (mount)

- [ ] **Step 1: Fejlende test.**

```ts
// src/lib/native/status-bar.test.ts
import { describe, expect, it, vi } from "vitest";
import { statusBarStyleFor, syncStatusBar } from "./status-bar";

describe("statusBarStyleFor", () => {
  it("uses dark text on light surfaces", () => expect(statusBarStyleFor("light")).toBe("LIGHT"));
  it("uses light text on dark surfaces", () => expect(statusBarStyleFor("dark")).toBe("DARK"));
  it("falls back to light text for unknown values (Nat is the :root default)", () =>
    expect(statusBarStyleFor("normal")).toBe("DARK"));
});

describe("syncStatusBar", () => {
  it("does nothing without the injected plugin", async () => {
    await expect(syncStatusBar(undefined, "light")).resolves.toBe(false);
  });

  it("sets style and background once per scheme", async () => {
    const plugin = { setStyle: vi.fn().mockResolvedValue(undefined), setBackgroundColor: vi.fn().mockResolvedValue(undefined) };
    await syncStatusBar(plugin, "light");
    expect(plugin.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(plugin.setBackgroundColor).toHaveBeenCalledWith({ color: "#E7E9EB" });
  });

  it("swallows plugin errors (Android 15+ rejects background colour)", async () => {
    const plugin = { setStyle: vi.fn().mockResolvedValue(undefined), setBackgroundColor: vi.fn().mockRejectedValue(new Error("x")) };
    await expect(syncStatusBar(plugin, "dark")).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Kør.** `npx vitest run src/lib/native` → FAIL (modul findes ikke).

- [ ] **Step 3: Implementér.**

```ts
// src/lib/native/status-bar.ts
/**
 * Status bar follows the surface theme (spec 2026-09-17 §6, D3).
 * The plugin comes from the shell-injected runtime (window.Capacitor.Plugins),
 * like NativePushToggle; nothing is bundled.
 */
export type StatusBarStyle = "LIGHT" | "DARK";

export type StatusBarPlugin = {
  setStyle: (o: { style: StatusBarStyle }) => Promise<void>;
  setBackgroundColor: (o: { color: string }) => Promise<void>;
};

const BACKGROUND = { LIGHT: "#E7E9EB", DARK: "#0A0A0B" } as const;

/** Capacitor naming: LIGHT = dark text for light backgrounds. */
export function statusBarStyleFor(colorScheme: string): StatusBarStyle {
  return colorScheme.trim() === "light" ? "LIGHT" : "DARK";
}

export async function syncStatusBar(plugin: StatusBarPlugin | undefined, colorScheme: string): Promise<boolean> {
  if (!plugin) return false;
  const style = statusBarStyleFor(colorScheme);
  await plugin.setStyle({ style }).catch(() => {});
  await plugin.setBackgroundColor({ color: BACKGROUND[style] }).catch(() => {});
  return true;
}

export function statusBarPlugin(): StatusBarPlugin | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { Capacitor?: { Plugins?: { StatusBar?: StatusBarPlugin } } }).Capacitor?.Plugins?.StatusBar;
}
```

```tsx
// src/components/native/NativeChrome.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/platform";
import { statusBarPlugin, syncStatusBar } from "@/lib/native/status-bar";

/** Re-reads <html>'s color-scheme after each navigation (the theme is lifted there via :has). */
export default function NativeChrome() {
  const pathname = usePathname();
  useEffect(() => {
    if (!isNativeApp()) return;
    const id = requestAnimationFrame(() => {
      void syncStatusBar(statusBarPlugin(), getComputedStyle(document.documentElement).colorScheme);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}
```

Mount `<NativeChrome />` i root-layoutet ved siden af `<SWRegister />`.

- [ ] **Step 4: Kør.** `npx vitest run src/lib/native` → PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/native src/components/native src/app/layout.tsx
git commit -m "feat(native): statusbaren følger temaet i shells"
```

### Task 6: Kalk-baggrund i shells og PWA

**Files:**
- Modify: `capacitor.config.ts:23`
- Modify: `src/app/manifest.ts:19-20`
- Modify: `src/lib/design/kalk-surface-gate.test.ts`

- [ ] **Step 1: Fejlende test.**

```ts
describe("native and PWA chrome (spec §6, D3)", () => {
  const cap = readFileSync(new URL("../../../capacitor.config.ts", import.meta.url), "utf8");
  it("shell window background is Kalk; splash waits for the next store release", () => {
    expect(cap).toMatch(/^\s{2}backgroundColor: "#E7E9EB"/m);
    expect(cap).toMatch(/SplashScreen: \{\s*backgroundColor: "#0A0A0B"/);
  });
  it("PWA manifest is Kalk", () => {
    const m = read("app/manifest.ts");
    expect(m).toMatch(/background_color: "#E7E9EB"/);
    expect(m).toMatch(/theme_color: "#E7E9EB"/);
  });
});
```

- [ ] **Step 2: Kør** → FAIL. **Step 3:** ret de tre værdier, og tilføj en kommentar i `capacitor.config.ts` over splash: `// Splash and icon change with the next store release (spec D3, needs Tom's ok).` **Step 4:** kør → PASS (inkl. hele `kalk-surface-gate`).

- [ ] **Step 5: Commit.**
```bash
git commit -am "feat(native): Kalk-baggrund i shell-vindue og PWA-manifest"
```

> **Til Tom:** ændringen i `capacitor.config.ts` virker først efter `npx cap sync` og et nyt build af shells. Webdelen (statusbar) virker i de eksisterende shells med det samme.

---

## Chunk 3: Titler og sektionshoveder

### Task 7: `PageHeader` bruger `PageTitle`

**Files:**
- Modify: `src/components/app/PageHeader.tsx`
- Modify: `src/components/ui/primitives-layout.test.tsx`

- [ ] **Step 1: Fejlende test** (tilføj i `primitives-layout.test.tsx`, brug den eksisterende `render`):

```tsx
import PageHeader from "@/components/app/PageHeader";

it("PageHeader renders through PageTitle's single scale", () => {
  const html = render(<PageHeader eyebrow="Træn" title="Øvelser" subtitle="Alle løft" />);
  expect(html).toContain('data-size="page"');
  expect(html).toContain("Alle løft");
  expect(html).not.toContain("4.5rem");
});
```

- [ ] **Step 2: Kør** → FAIL. **Step 3: Implementér:**

```tsx
import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import { cn } from "@/lib/utils";

/** Page header band: PageTitle (one scale) + optional subtitle, inside the page container. */
export default function PageHeader({
  eyebrow, title, subtitle, className, right,
}: {
  eyebrow: string; title: string; subtitle?: string; className?: string; right?: React.ReactNode;
}) {
  return (
    <div className={cn("border-b hairline", className)}>
      <Container className="py-10 md:py-14">
        <PageTitle kicker={eyebrow} title={title} action={right} />
        {subtitle ? <p className="mt-4 max-w-xl text-fg-dim text-base md:text-lg">{subtitle}</p> : null}
      </Container>
    </div>
  );
}
```

`PageTitle`s `action` ligger ved siden af titlen på alle skærmbredder. Tidligere lå `right` under titlen på mobil. Tjek de sider, der bruger `right` (`grep -rn "right=" src/app`), på 390 px i Task 14.

- [ ] **Step 4: Kør** → PASS. **Step 5: Commit** `refactor(ui): PageHeader bruger PageTitles ene titelskala`.

### Task 8: Alle app-sider har en fælles titel

**Files:**
- Modify: `src/lib/design/kalk-surface-gate.test.ts`
- Modify: de 17 sider: `messages`, `science`, `buddy`, `buddy/why`, `coach-school`, `coach-school/sandbox`, `coach-school/live`, `coach-school/lessons/[slug]`, `community`, `nutrition`, `nutrition/preferences`, `nutrition/shopping`, `coaching`, `program/[code]` (alle under `src/app/(app)/`) samt `src/app/(app)/nutrition/setup/NutritionSetupView.tsx`

- [ ] **Step 1: Fejlende port.**

```ts
describe("one title scale on every app page (spec §6)", () => {
  const APP = join(SRC, "app/(app)");
  // Pages that render no title of their own: live session (Nat, no chrome), redirects, delegates.
  const EXEMPT = new Set(["session/[id]/page.tsx", "mind/check/page.tsx", "mind/onboarding/page.tsx", "nutrition/setup/page.tsx"]);
  const pages = walk(APP).map((p) => relative(APP, p)).filter((p) => p.endsWith("page.tsx") && !EXEMPT.has(p));

  it.each(pages)("%s uses PageHeader or PageTitle", (p) => {
    const src = readFileSync(join(APP, p), "utf8");
    expect(src).toMatch(/<(PageHeader|PageTitle)\b/);
  });

  it.each([...pages, "nutrition/setup/NutritionSetupView.tsx"])("%s has no hand-built display h1", (p) => {
    const src = readFileSync(join(APP, p), "utf8");
    expect(src).not.toMatch(/<h1[^>]*font-display/);
  });
});
```

- [ ] **Step 2: Kør** → FAIL med præcis de 17 + `NutritionSetupView`.

- [ ] **Step 3: Migrér én side ad gangen.** Mønsteret:

```tsx
// Før
<div className="eyebrow mb-2">{t("eyebrow")}</div>
<h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">{t("title")}</h1>

// Efter (siden har allerede sin egen Container/padding, så brug PageTitle direkte)
<PageTitle kicker={t("eyebrow")} title={t("title")} />
```

Regler:
- Brug `PageTitle`, når siden selv har container og padding. Brug `PageHeader`, når siden starter direkte med indhold og mangler et topbånd.
- Tomme tilstande og "ingen plan"-varianter, der har deres egen `<h1>` (fx `buddy`, `buddy/why`, der har to), får også `PageTitle`.
- Titler med indlejret markup (fx `messages` l. 68, `program/[code]` l. 59-68 med chips i eyebrowen): `title` skal være en streng. Læg chips i `action` eller i en linje under titlen. Ændr ikke copy.
- Brug `size="compact"` på undersider (`buddy/why`, `coach-school/*`, `nutrition/preferences`, `nutrition/shopping`).

Commit efter hver 3-4 sider: `refactor(app): PageTitle på <sider>`.

- [ ] **Step 4: Kør porten** → PASS, og kør `npx vitest run "src/app/(app)"` → PASS (nogle eksisterende tests matcher markup, fx `community/page.connected.test.ts`. Ret kun testens forventning, hvis den tjekker den gamle titelmarkup).

### Task 9: Sektionshoveder via `SectionHeader`

**Files:**
- Modify: `src/lib/design/kalk-surface-gate.test.ts`
- Modify (24 filer): `app/(app)/settings/SettingsClient.tsx` (6), `app/(app)/billing/page.tsx` (4), `app/(app)/reps/RedeemButton.tsx` (3), `components/mind/MentalResourcesModal.tsx` (3), `app/(app)/hrv/page.tsx` (2), `app/(app)/nutrition/page.tsx` (2), `components/mind/SessionRunner.tsx` (2), og én i hver af: `program/[code]/page.tsx`, `community/page.tsx`, `nutrition/shopping/page.tsx`, `coaching/page.tsx`, `session/[id]/SessionClient.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/onboarding/OnboardingClient.tsx`, `components/app/FirstTimeTour.tsx`, `components/dashboard/ConnectDotsStream.tsx`, `components/hrv/WearableConnectSheet.tsx`, `components/hrv/HrvTrendsEmpty.tsx`, `components/hrv/HrvSettingsSection.tsx`, `components/hrv/LifestyleLogCard.tsx`, `components/community/PostComposer.tsx`, `components/nutrition/PlanGenerationOverlay.tsx`, `components/adaptive/AdaptiveConsentCard.tsx`

- [ ] **Step 1: Fejlende port.**

```ts
describe("section headers use SectionHeader (spec §6)", () => {
  const HAND_BUILT = /<(div|p|span)\s+className="eyebrow[^"]*"[^>]*>[\s\S]{0,160}?<\/\1>\s*<h2\b/;
  const files = surfaceFiles.filter((p) => p.endsWith(".tsx") && !p.startsWith("components/ui/"));
  it.each(files)("%s", (p) => {
    expect(readFileSync(join(SRC, p), "utf8")).not.toMatch(HAND_BUILT);
  });
});
```

- [ ] **Step 2: Kør** → FAIL med de 24 filer.

- [ ] **Step 3: Migrér.** Mønsteret:

```tsx
// Før
<div className="eyebrow mb-3">{t("x.eyebrow")}</div>
<h2 className="font-display text-2xl md:text-3xl leading-[1.05]">{t("x.title")}</h2>

// Efter
<SectionHeader eyebrow={t("x.eyebrow")} title={t("x.title")} />
```

Regler:
- Hvis `<h2>` har et `id` (til `aria-labelledby`), så send det som `id`.
- Taste-regel: højst én eyebrow pr. tre sektioner. Hvor en side får flere `SectionHeader` i træk, så drop `eyebrow` på de midterste, og slet de ubrugte nøgler i **både** da og en.
- Modaler og sheets (`MentalResourcesModal`, `WearableConnectSheet`, `FirstTimeTour`, `PlanGenerationOverlay`): `SectionHeader` har `mb-4`. Tilføj ikke ekstra margin.
- `SessionClient` er Nat. `SectionHeader` bruger kun tokens, så den virker uændret.

Commit pr. område: `refactor(ui): SectionHeader i indstillinger og betaling`, `… i HRV`, `… i Mind`, osv.

- [ ] **Step 4: Kør** `npx vitest run src/lib/design src/components src/app` → PASS.

---

## Chunk 4: Copy

### Task 10: Ingen nummererede eyebrows

**Files:**
- Create: `src/lib/i18n/app-copy-gate.test.ts`
- Modify: `messages/{da,en}/{Coaching,Community,Reps,Profile,Nutrition,Messages,Nav,Mind}.json`

- [ ] **Step 1: Fejlende port.**

```ts
// src/lib/i18n/app-copy-gate.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Member-app namespaces. Marketing (classic landing; kalk has its own gate), Email, Legal
// and the coach console (Coach, CoachStudio) are out of scope for F4.
export const APP_NAMESPACES = [
  "Adaptive", "Billing", "Buddy", "Coaching", "CoachSchool", "Common", "Community", "Dashboard",
  "FormCheck", "Hrv", "Language", "Login", "Messages", "Mind", "Misc", "Nav", "Nutrition",
  "Onboarding", "Profile", "ProgramDetail", "Push", "Reps", "Science", "Session", "Settings", "Train",
] as const;

const load = (l: string, ns: string) =>
  JSON.parse(readFileSync(new URL(`../../../messages/${l}/${ns}.json`, import.meta.url), "utf8"));

function entries(v: unknown, p = ""): [string, string][] {
  if (typeof v === "string") return [[p, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => entries(x, `${p}[${i}]`));
  if (!v || typeof v !== "object") return [];
  return Object.entries(v).flatMap(([k, x]) => entries(x, p ? `${p}.${k}` : k));
}

const all = (["da", "en"] as const).flatMap((l) =>
  APP_NAMESPACES.flatMap((ns) => entries(load(l, ns)).map(([k, s]) => [`${l}/${ns}:${k}`, s] as const)),
);

describe("app copy gate (spec §5 taste rules, §8)", () => {
  it("has no section numbers in eyebrows", () => {
    const bad = all.filter(([k, s]) => /eyebrow/i.test(k) && /^\s*\d{1,2}\s*[·—–-]/.test(s));
    expect(bad).toEqual([]);
  });
});
```

- [ ] **Step 2: Kør** → FAIL med 14 nøgler × 2 sprog.

- [ ] **Step 3: Ret copy.** Fjern præfikset, behold ordet: `"02 — Træn"` → `"Træn"`, `"01 · I dag"` → `"I dag"`. Samme i en. Tjek i `FirstTimeTour.tsx` og `MindFirstTimeTour.tsx`, at progress-prikkerne stadig viser trinnet (de gør i dag, l. 93 hhv. tilsvarende).

- [ ] **Step 4: Kør** → PASS. **Step 5: Commit** `fix(copy): ingen sektionsnumre i app-eyebrows`.

### Task 11: Ingen tankestreger i app-copy

**Files:**
- Modify: `src/lib/i18n/app-copy-gate.test.ts`
- Modify: `messages/{da,en}/<APP_NAMESPACES>.json`

- [ ] **Step 1: Fejlende test.**

```ts
  it("has no em or en dashes", () => {
    const bad = all.filter(([, s]) => /[–—]/.test(s)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it("keeps da and en keys in lockstep", () => {
    for (const ns of APP_NAMESPACES) {
      const keys = (l: string) => entries(load(l, ns)).map(([k]) => k).sort();
      expect(keys("da"), ns).toEqual(keys("en"));
    }
  });
```

- [ ] **Step 2: Kør** → FAIL (ca. 230 da + en). Hvis lockstep-testen fejler på et namespace allerede nu, så notér det og ret det i et separat commit først.

- [ ] **Step 3: Omskriv pr. namespace** (ét commit hvert). Regler:
  - Indskud (`X — Y — Z`): brug komma eller parentes.
  - Forklaring efter tankestreg (`Hvile — det er træning`): punktum og ny sætning, eller kolon.
  - Talintervaller (`3–5 sæt`, `06:00–09:00`): brug bindestreg `3-5`.
  - Titler med `—` som separator (`Coach — MakeIt`): brug `·`.
  - Tom tilstand vist som `—`: tegnet er data, ikke copy. Flyt det til komponenten som `"·"` eller `"-"`. Hvis den er en nøgle alene (`"empty": "—"`), så brug `"-"`.
  - Ændr ikke betydning. Hold tonen (du-form, korte sætninger). Hold ICU-placeholders (`{count}`) intakte.
  - Kør `grep -rn "—\|–" src --include='*.tsx' | grep -v test` bagefter. Tankestreger i JSX-tekst i app-flader flyttes til messages i Task 12 eller rettes her.

- [ ] **Step 4: Kør hele testsuiten.** `npm test`. Eksisterende tests, der matcher en streng med tankestreg (fx `cdo-bodycopy.test.ts`, `adaptive-copy.honesty.test.ts`), opdateres til den nye tekst, ikke omvendt.

- [ ] **Step 5: Commit** pr. namespace: `fix(copy): ingen tankestreger i <Namespace>`.

### Task 12: HRV- og Mind-copy i messages

**Files:**
- Modify: `src/lib/i18n/app-copy-gate.test.ts`
- Modify: `src/app/(app)/hrv/page.tsx`, `hrv/trends/page.tsx`, `hrv/learn/adaptive/page.tsx`, `mind/settings/page.tsx`
- Modify: `src/components/hrv/{InsightCard,HrvSettingsSection,TrendChart,HrvWelcomeBonusToast,LifestyleLogCard,ReadinessLadder,ConnectionStatus,HrvMilestoneToast}.tsx`
- Modify: `src/components/mind/{SessionRunner,SessionCard,WeeklyInsightsView,CirkelPostForm}.tsx`
- Modify: `messages/{da,en}/{Hrv,Mind}.json`

- [ ] **Step 1: Fejlende port.**

```ts
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

describe("no hardcoded copy in HRV and Mind (review finding)", () => {
  const SRC = fileURLToPath(new URL("../../", import.meta.url));
  const dirs = ["app/(app)/hrv", "app/(app)/mind", "components/hrv", "components/mind"];
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const files = dirs.flatMap((d) => walk(join(SRC, d))).filter((f) => f.endsWith(".tsx") && !f.includes(".test."));
  // JSX text with a real word, and user-facing string attributes.
  const JSX_TEXT = />\s*[^<>{}\s][^<>{}]*[A-Za-zÆØÅæøå]{3,}[^<>{}]*</;
  const ATTR = /\b(aria-label|title|placeholder|alt)="[^"]*[A-Za-zÆØÅæøå]{3,}[^"]*"/;
  // Metadata <title> with an id is a11y copy too; keep it in messages.
  it.each(files.map((f) => [f.slice(SRC.length), f]))("%s", (_n, f) => {
    const src = readFileSync(f, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(src).not.toMatch(JSX_TEXT);
    expect(src).not.toMatch(ATTR);
  });
});
```

- [ ] **Step 2: Kør** → FAIL. Hvis porten rammer en falsk positiv (fx kode inde i `<code>`, et brand-navn som `Oura` alene), så indsnævr regexen med en navngiven undtagelse og en kommentar. Undtag aldrig en hel fil.

- [ ] **Step 3: Flyt copy.** Nøgler under et underobjekt pr. fil, fx `Hrv.page.connectionLost`, `Hrv.learnAdaptive.example.eyebrow`, `Mind.weekly.title`. Engelsk oversættes (ingen tankestreger, samme tone som resten af `en/Hrv.json`). Server-sider bruger `getTranslations`, klientkomponenter `useTranslations`. Lister (`hrv/learn/adaptive` l. 146-157) bliver arrays via `t.raw("…")` eller nummererede nøgler, som resten af kodebasen gør (`grep -rn "t.raw" src | head`).

`/mind/settings`-linket i `WeeklyInsightsView.tsx:75` bruger `t.rich` med et `<link>`-tag.

- [ ] **Step 4: Kør** `npx vitest run src/lib/i18n src/components/hrv src/components/mind "src/app/(app)/hrv"` → PASS. Eksisterende tests, der matcher dansk tekst (fx `HrvBandHero.test.ts`), skal stadig være grønne, fordi de renderer med da-messages.

- [ ] **Step 5: Commit** pr. område: `fix(i18n): HRV-copy i messages`, `fix(i18n): Mind-copy i messages`.

---

## Chunk 5: Visuel kontrol, porte og overlevering

### Task 13: Mind-serier og anatomi i Kalk

**Files:**
- Modify: `src/lib/design/kalk-theme.test.ts`

- [ ] **Step 1: Test for graf-blæk.**

```ts
  it.each(["--mind-energy", "--mind-stress", "--mind-focus"])(
    "%s reaches 3:1 as chart ink on Kalk --bg and --bg-2",
    (t) => {
      for (const s of SURFACES) expect(contrastRatio(kalk[t], kalk[s])).toBeGreaterThanOrEqual(3);
    },
  );
```

- [ ] **Step 2: Kør.** Hvis den fejler, så justér kun den fejlende Kalk-værdi (behold kulør, gør den mørkere), og notér før/efter i commit-beskeden.

- [ ] **Step 3: Kig på graferne** i Task 14 (`/mind`, `/mind/insights` hvis den findes, `/hrv/trends`): de tre serier skal kunne skelnes fra hinanden og fra `--mind`. Hvis `--mind-stress` og `--mind` er identiske (`#1D4ED8`) og står i samme graf, så skift `--mind-stress` i Kalk til en anden blå/teal med ≥ 3:1, og opdatér testen.

- [ ] **Step 4: Commit** `test(design): mind-serierne er læsbare som graf-blæk i Kalk`.

### Task 14: Browser-verifikation

Protokol: `docs/PLATFORM_OVERVIEW.md` §8 (demo mode, port 3002, invite-kode `MUNK-01`). Worktreet har sin egen `.env.local`-kopi, som skal flyttes væk under verifikationen og tilbage bagefter.

Gotchas fra F3:
- Browser-panelet er ofte skjult (`visibilityState: hidden`), så React afslører aldrig streamet indhold, og body-højden læses som 17 px. Afslør `#S:0` før måling. Det er ikke en fejl.
- Indtastning af invite-koden bliver blokeret af permission-klassifikatoren. Bed Tom logge ind i panelet.

- [ ] **Step 1:** Start dev-serveren og log ind.
- [ ] **Step 2:** Screenshot på 390 px og 1440 px, og tjek `console errors === 0`, på:
  - de 17 migrerede sider fra Task 8 og `/nutrition/setup`,
  - `/settings`, `/billing`, `/reps`, `/hrv`, `/hrv/trends`, `/hrv/learn/adaptive`, `/mind`, `/mind/settings`,
  - `/train/exercises/<slug>` med video **og** en øvelse uden klip (anatomi-fallback),
  - `/session/<id>` (Nat, ingen lys overscroll, aktiv cue har orange/krop-streg),
  - `/onboarding` (Kalk),
  - `/coach` (Nat, samme fonte som appen),
  - `/science` (domænefarver fra tokens),
  - klassisk landing `/` (fontskiftet er forventet; notér det til Tom).
- [ ] **Step 3:** Tjek modal-scrims (`LogMealButton`, `MentalResourcesModal`) i Kalk: bagtæppet dæmper uden at blive sort.
- [ ] **Step 4:** Ret fund i små commits (`fix(<område>): …`), og tag nye screenshots.
- [ ] **Step 5:** Gendan `.env.local`.

### Task 15: Porte, plan-status og PR

- [ ] **Step 1: Kør alle porte.**
```bash
npm test
npm run lint
npm run build
npx tsc --noEmit 2>&1 | grep -c "error TS"   # skal være ≤ 7
```
Expected: alt grønt, tsc ≤ 7.

- [ ] **Step 2: Opdatér status.** I `docs/superpowers/plans/2026-09-17-kalk-redesign.md`: `- [x] F4 App-flader (…)`, og skriv fontbeslutningen ind under "F4 App-flader → Oprydning" som besluttet 2026-09-17. I specens §2: `/coach` er nu eksplicit Nat-scope.

- [ ] **Step 3: Commit** `docs(plan): F4 app-flader leveret`.

- [ ] **Step 4: Push og PR** mod `main`. PR-beskrivelsen nævner:
  - at den klassiske landing i produktion skifter font ved merge (anbefal at slå `LANDING_VARIANT` til i Production),
  - at shells kræver `npx cap sync` og nyt build for vinduesbaggrunden,
  - at splash og ikon venter på D3.

  **Merge kræver Toms udtrykkelige ok i chatten.**
