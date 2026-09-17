# Kalk F3 · App-kerne implementeringsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Medlemsappen kører i Kalk med seks fælles primitiver, et dashboard hvor dagens pas står øverst, fem faner på mobil, og live-sessionen i Nat.

**Architecture:**
- `(app)/layout.tsx` wrapper `AppShell` i `ThemeScope theme="kalk"`, og `session/[id]/page.tsx` wrapper sit indhold i `ThemeScope theme="nat"`. Nat-løftet i `globals.css` vinder på `<html>`, så `/session` forbliver mørk.
- Primitiverne ligger i `src/components/ui/` og bruger kun tokens, så de virker i begge temaer.
- Dashboardet får en ny rækkefølge. Den styres af en ren rækkefølge (`TODAY_LAYOUT`) og nye komponenter:
  - `MorningSignal` (C5)
  - `KeepOriginal`, der viser C1 "Behold original" med den eksisterende `setAdaptationResponseAction`
  - A2-hvorfor-chips via den eksisterende `AdaptiveReasonStrip`

**Tech Stack:** Next.js 16.2 App Router, next-intl, Tailwind v4 (Kalk-tokens fra F1), vitest (node, `renderToStaticMarkup`, test-helper `src/components/marketing/test-render.tsx`), Supabase (dual mode: demo uden env).

**Spec:** [`../specs/2026-09-17-kalk-redesign-design.md`](../specs/2026-09-17-kalk-redesign-design.md) §3, §4 (A2, C1, C5), §6, §8
**Designreference:** koncept B's app-skærme i `docs/design/kalk/concept-b-kalk.html`, både dashboardet i hero og rack-skærmene. Reviewets dashboard-skitse "Før og efter" ligger i artifact `3zbLod9C8chXGc5s8pJPJq`.
**Branch:** `claude/kalk-f3-app-core` fra `main`. F1 og F2 er merget (#100, #102).
**Afhænger af:** F1 (`ThemeScope`, tokens) og F2 (`test-render.tsx`, `PhoneFrame`-mønstre). Uafhængig af F2's landing-copy.

---

## Verificeret i koden (2026-09-17)

| Fakta | Kilde |
|---|---|
| `AppShell` fjerner al chrome på `/session/*` | `src/components/app/AppShell.tsx:39-43` |
| Mobilheaderen har allerede avatar til `/profile` og en beskedikon | `AppShell.tsx:138-173` |
| `MobileTabBar` har 8 faner. Ulæst-badgen tjekker `/messages`, som ingen fane har, så den er død kode | `MobileTabBar.tsx:61-70,119,130-137` |
| Ingen test låser antallet af faner. `first-run-surfaces.test.ts:78-108` og `tabbar-clearance.test.ts` låser CSS-tokens og strukturen | tests |
| Dashboardet har 15 moduler. Dagens pas står på plads 12 (`page.tsx:318-394`), og Start-knappen er på `:389` | `dashboard/page.tsx` |
| Dashboardet henter ikke dagens tilpasning. Sessionen gør (`getActiveAdaptationForSession(memberId, sessionId)`, `src/lib/data/adaptive.ts:108`) | `session/[id]/page.tsx:42` |
| `setAdaptationResponseAction({ modifierId, sessionId, accepted })` returnerer `ok` i demo og revaliderer kun `/session/${id}` | `session/[id]/actions.ts:134-180` |
| Demo-data til en tilpasning findes som scenarie (`explainerScenarioDecision`, `EXPLAINER_EXPLANATION_DA`), men intet bygger en `ActiveAdaptation` af det. Læringssiden har kun statisk markup | `src/lib/adaptive/mock-scenarios.ts`, `hrv/learn/adaptive/page.tsx:60-100` |
| Dagens indtag: `getDailyIntake(memberId)` giver kcal og protein i forhold til målet. Uden Supabase returneres tomme værdier | `src/lib/data/nutrition-intake.ts:29` |
| HRV-chippen bruger den lokale `getHrvChipData` (demo: `demoSteadySeries`) | `dashboard/page.tsx:121-156` |
| `PageHeader(eyebrow, title, subtitle?, right?)` bruges af 19 sider | `src/components/app/PageHeader.tsx` |
| `.input` og `.field` har 14 px tekst, og root-viewport har `maximumScale: 1` | `globals.css:461-519`, `layout.tsx:85` |
| Statusbar-stil styres ingen steder. `@capacitor/status-bar` er installeret | grep, `package.json:37` |

---

## Faste regler

1. **Dual mode:** alt skal se rigtigt ud i demo-tilstand (Munk demoer på det). Demo bruger eksisterende fixtures og opfinder ikke nye tal.
2. **Kun tokens:** ingen hex, `rgb()` eller Tailwind-paletfarver i nye eller ændrede filer.
3. **Knapper er monokrome.** Primær er `.btn .btn-primary`. "Behold original" er en ghost-knap. Orange (`--signal`) bruges kun til aktiv fane, overstregning og progress.
4. **Komponenter:** nye komponenter er ikke async og bruger `useTranslations`. Klient-øer får `"use client"`. Pages må være async.
5. **Tekst:** ingen hardcodet copy. Nye nøgler kommer i `messages/da` og `messages/en` med ens nøgler og uden tankestreger.
6. **Porte pr. task:** `npx vitest run <egne tests>`, `npx eslint <egne filer>` og `npx tsc --noEmit 2>&1 | grep -c "error TS"`, som skal give 7.
7. **Commits:** conventional med dansk tekst og trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Stage eksplicitte stier.
8. **Framework:** Next.js 16.2 afviger fra træningsdata. Slå op i `node_modules/next/dist/docs/`, før du skriver framework-nær kode.
9. **Kendte faldgruber:** `.font-display` og `.btn` ligger uden for Tailwinds layers og slår utilities, så brug `!` sparsomt i stedet for at flytte dem. Browser-panelet er ofte skjult. Så viser React ikke streamet indhold, og en side ser 17 px høj ud. Mål i så fald indholdet i `#S:0`.

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/components/ui/PageTitle.tsx` (+test) | Sidetitel med to størrelser (`page`, `compact`) og valgfri kicker og handling |
| `src/components/ui/SectionHeader.tsx` (+test) | Eyebrow i domænefarve, overskrift og valgfrit "se alle"-link |
| `src/components/ui/Card.tsx` (+test) | `quiet` eller `primary`, padding 20, radius 14, valgfri `domain` |
| `src/components/ui/EmptyState.tsx` (+test) | Ikon, én sætning og én handling |
| `src/components/ui/Stat.tsx` (+test) | Label, mono-tal og monokrom delta med pil |
| `src/components/ui/Field.tsx` (+test) | Label over, hjælpetekst og fejl under, korrekt `autoComplete`/`inputMode` og 16 px på touch |
| `src/lib/dashboard/morning-signal.ts` (+test) | Ren model for de fire domænefelter |
| `src/components/dashboard/MorningSignal.tsx` (+test) | Rækken med fire felter (C5) |
| `src/components/dashboard/KeepOriginal.tsx` (+test) | Klient-knap til C1 |
| `src/lib/data/today-adaptation.ts` (+test) | Dagens tilpasning: connected via `getActiveAdaptationForSession`, demo via scenariet |
| `src/lib/dashboard/today-layout.ts` (+test) | Ren rækkefølge for dashboard-moduler |
| `src/components/app/MobileTabBar.tsx` | 5 faner og ingen død badge |
| `src/components/app/AppShell.tsx` | Avatar-menu med Mig, Reps, HRV og Forskning på mobil |
| `src/app/(app)/layout.tsx` | `ThemeScope kalk` og viewport |
| `src/app/(app)/session/[id]/page.tsx` | `ThemeScope nat` og viewport |
| `src/app/(app)/session/[id]/actions.ts` | Revaliderer også `/dashboard` |
| `src/app/(app)/dashboard/page.tsx` | Ny rækkefølge og nye komponenter |
| `src/app/globals.css` | Aktiv fane bruger `--signal`, felter får 16 px på touch |
| `src/app/layout.tsx` | `maximumScale` fjernes |
| `messages/{da,en}/{Nav,Dashboard}.json` | Nye og rettede nøgler |

---

## Chunk 1: Primitiver

### Task 1: `Card`, `SectionHeader` og `PageTitle`

**Files:** Create `src/components/ui/{Card,SectionHeader,PageTitle}.tsx` og `src/components/ui/primitives-layout.test.tsx`

- [ ] **Step 1: Fejlende test**

```tsx
// src/components/ui/primitives-layout.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Card from "./Card";
import SectionHeader from "./SectionHeader";
import PageTitle from "./PageTitle";

describe("Card", () => {
  it("is a quiet token surface by default", () => {
    const html = renderToStaticMarkup(<Card>x</Card>);
    expect(html).toContain('data-card="quiet"');
    expect(html).toMatch(/class="[^"]*bg-bg-2[^"]*rounded-\[14px\][^"]*p-5/);
  });

  it("marks the primary card and scopes a domain", () => {
    const html = renderToStaticMarkup(<Card variant="primary" domain="body" as="section">x</Card>);
    expect(html).toMatch(/^<section/);
    expect(html).toContain('data-card="primary"');
    expect(html).toContain('data-domain="body"');
    expect(html).toContain("border-line-strong");
  });

  it("passes data- and aria-attributes through", () => {
    const html = renderToStaticMarkup(
      <Card data-dashboard="todaySession" aria-label="Dagens session" className="p-0">x</Card>,
    );
    expect(html).toContain('data-dashboard="todaySession"');
    expect(html).toContain('aria-label="Dagens session"');
    expect(html).not.toMatch(/\bp-5\b/); // twMerge drops p-5 for p-0
  });
});

describe("SectionHeader", () => {
  it("renders a domain eyebrow, a heading and an optional link", () => {
    const html = renderToStaticMarkup(
      <SectionHeader eyebrow="Krop" title="Kommende" href="/coaching" linkLabel="Se alle" id="up" />,
    );
    expect(html).toContain("eyebrow eyebrow-domain");
    expect(html).toContain('<h2 id="up"');
    expect(html).toContain('href="/coaching"');
    expect(html).toContain("Se alle");
  });

  it("omits the link without href", () => {
    expect(renderToStaticMarkup(<SectionHeader title="X" />)).not.toContain("<a");
  });
});

describe("PageTitle", () => {
  it("has one h1 and two sizes", () => {
    const page = renderToStaticMarkup(<PageTitle title="I dag" kicker="Tirsdag" />);
    const compact = renderToStaticMarkup(<PageTitle title="Mad" size="compact" />);
    expect(page.match(/<h1/g)).toHaveLength(1);
    expect(page).toContain('data-size="page"');
    expect(compact).toContain('data-size="compact"');
    expect(page).toContain("font-display");
  });
});
```

Run: `npx vitest run src/components/ui/primitives-layout.test.tsx`. Expected: FAIL.

- [ ] **Step 2: Implementér**

```tsx
// src/components/ui/Card.tsx
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Domain = "body" | "food" | "heart" | "mind";

/**
 * The one card (spec 2026-09-17 §6). quiet = grouped content,
 * primary = the single most important thing on a screen (max one).
 */
export default function Card({
  variant = "quiet",
  domain,
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  variant?: "quiet" | "primary";
  domain?: Domain;
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag
      {...rest}
      data-card={variant}
      data-domain={domain}
      className={cn(
        "bg-bg-2 rounded-[14px] p-5 border",
        variant === "primary" ? "border-line-strong" : "border-line",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
```

```tsx
// src/components/ui/SectionHeader.tsx
import Link from "next/link";

export default function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
  id,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow eyebrow-domain mb-2">{eyebrow}</p> : null}
        <h2 id={id} className="font-display text-2xl">{title}</h2>
      </div>
      {href && linkLabel ? (
        <Link href={href} className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
```

```tsx
// src/components/ui/PageTitle.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One title scale for every app page (replaces 8 ad-hoc clamp sizes). */
export default function PageTitle({
  title,
  kicker,
  size = "page",
  action,
  className,
}: {
  title: string;
  kicker?: string;
  size?: "page" | "compact";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header data-size={size} className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {kicker ? <p className="eyebrow eyebrow-domain mb-2">{kicker}</p> : null}
        <h1
          className={cn(
            "font-display",
            size === "page" ? "text-[clamp(2.25rem,8vw,3.5rem)]" : "text-[clamp(1.75rem,6vw,2.5rem)]",
          )}
        >
          {title}
        </h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
```

- [ ] **Step 3: Grøn, lint, tsc og commit** `feat(ui): Card, SectionHeader og PageTitle til Kalk`

### Task 2: `EmptyState`, `Stat` og `Field`

**Files:** Create `src/components/ui/{EmptyState,Stat,Field}.tsx` og `src/components/ui/primitives-content.test.tsx`. Modify `src/app/globals.css` (touch-regel). Test `src/lib/design/kalk-theme.test.ts` (touch-port).

- [ ] **Step 1: Fejlende test**

```tsx
// src/components/ui/primitives-content.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";
import Stat from "./Stat";
import Field from "./Field";

describe("EmptyState", () => {
  it("says one thing and offers one action", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Intet pas endnu" body="Vælg et program." actionHref="/coaching" actionLabel="Vælg program" />,
    );
    expect(html).toContain("data-empty-state");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain("btn btn-primary");
  });
});

describe("Stat", () => {
  it("shows a mono value and a monochrome delta with an arrow", () => {
    const html = renderToStaticMarkup(<Stat label="Volumen" value="18.420" unit="kg" delta={4} />);
    expect(html).toContain("font-mono");
    expect(html).toContain("tabular-nums");
    expect(html).toMatch(/↑\s*4/);
    expect(html).not.toMatch(/text-(ok|warn|danger)/);
  });
});

describe("Field", () => {
  it("puts the label above, wires hint and error, and never uses the placeholder as label", () => {
    const html = renderToStaticMarkup(
      <Field id="email" name="email" label="Email" type="email" hint="Vi deler den ikke" error="Ugyldig" />,
    );
    expect(html).toMatch(/<label[^>]*for="email"[^>]*>Email<\/label>[\s\S]*<input/);
    expect(html).toContain('aria-describedby="email-hint email-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/autoComplete="email"/i);
    expect(html).toMatch(/inputMode="email"/i);
    expect(html).toContain("field");
  });
});
```

Tilføj i `src/lib/design/kalk-theme.test.ts`:

```ts
it("gives inputs 16px on touch so iOS does not zoom (enables removing maximumScale)", () => {
  expect(css).toMatch(/@media \(pointer: coarse\)\s*\{[\s\S]*?\.input,\s*\.field\s*\{[\s\S]*?font-size:\s*16px/);
});
```

Run begge. Expected: FAIL.

- [ ] **Step 2: Implementér**

**`EmptyState`:** en `div` med `data-empty-state` og `Card`-lignende klasser uden `Card`-afhængighed. Den tager `...rest: HTMLAttributes<HTMLDivElement>` og spreder dem, så `data-today-empty` kan sættes, fordi `page.connected.test.ts` kræver den. Udvid testen med `data-today-empty`. Den indeholder et valgfrit ikon (`ReactNode`, `aria-hidden`), `title` (`font-display text-xl`), `body` (`text-fg-dim`) og ét `<Link className="btn btn-primary">`.

**`Stat`:**
- Props: `{ label, value, unit?, delta?: number, deltaLabel? }`.
- Delta vises som `↑ n`, `↓ n` eller `→ 0` i `text-fg-dim`, med `sr-only`-tekst fra `deltaLabel`.
- Tallet vises som `font-mono tabular-nums text-2xl`.
- `delta` dækker kun et tal. Dashboardets eksisterende `TrendArrow` ("new", "stable" og procent) bliver, hvor den er. `Stat` bruges kun til de simple tal.

**`Field`:**
- Props: `{ id, name, label, type?, hint?, error?, autoComplete?, inputMode?, ...rest }`.
- Defaults afledes af `type`:
  - `email` giver `autoComplete="email"` og `inputMode="email"`.
  - `tel` giver `tel` og `tel`.
  - `number` giver `inputMode="decimal"`.
- `aria-describedby` samles af `${id}-hint` og `${id}-error`, når de findes. `aria-invalid` sættes, når der er `error`.
- Fejlteksten vises i en `role="alert"`-boks med `text-danger` og et ikon, jf. statusreglen.
- Input bruger den eksisterende `.field`-klasse.

**`globals.css`:** tilføj efter `.field`-reglerne:

```css
/* iOS zooms on focus below 16px. With this, the root viewport can
 * drop maximumScale and let people pinch-zoom (WCAG 1.4.4). */
@media (pointer: coarse) {
  .input,
  .field { font-size: 16px; }
}
```

- [ ] **Step 3: Grøn, lint, tsc og commit** `feat(ui): EmptyState, Stat og Field med 16 px på touch`

---

## Chunk 2: Tema, navigation og data

### Task 3: Kalk på `(app)`, Nat på `/session`

**Files:** Modify `src/app/(app)/layout.tsx` og `src/app/(app)/session/[id]/page.tsx`. Create `src/app/(app)/theme-scope.test.ts`.

- [ ] **Step 1: Fejlende test**

```ts
// src/app/(app)/theme-scope.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const session = readFileSync(new URL("./session/[id]/page.tsx", import.meta.url), "utf8");

describe("app theme scopes (spec §2, §6)", () => {
  it("runs the member app in Kalk with a light browser chrome", () => {
    expect(layout).toContain('<ThemeScope theme="kalk"');
    expect(layout).toMatch(/export const viewport[\s\S]*?themeColor: "#E7E9EB"/);
  });

  it("keeps the live session in Nat with a dark browser chrome", () => {
    expect(session).toContain('<ThemeScope theme="nat"');
    expect(session).toMatch(/export const viewport[\s\S]*?themeColor: "#0A0A0B"/);
  });
});
```

Hvis `session/[id]/page.tsx` allerede eksporterer `generateViewport` eller `viewport`, så tilpas i stedet for at duplikere, og justér testens regex. Slå reglerne op i `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`.

- [ ] **Step 2: Implementér**

Tilføj `import type { Viewport } from "next";` og `import ThemeScope from "@/components/ui/ThemeScope";` i begge filer.

`(app)/layout.tsx`: wrap `<AppShell …>` i `<ThemeScope theme="kalk" className="flex-1 flex flex-col">`, og tilføj:

```ts
export const viewport: Viewport = { themeColor: "#E7E9EB", colorScheme: "light" };
```

`session/[id]/page.tsx`: wrap alle returnerede grene (`SessionPreview`, `SessionClient` og eventuelle not-found- eller redirect-grene, der rendrer UI) i `<ThemeScope theme="nat" className="minh-dvh">`. AppShells immersive wrapper er ikke flex, så `flex-1` virker ikke, og uden `minh-dvh` viser kort indhold Kalk-baggrund nedenunder. Tilføj:

```ts
export const viewport: Viewport = { themeColor: "#0A0A0B", colorScheme: "dark" };
```

**Statusbar:** native Capacitor-statusbar er F4 (ingen bridge-kode findes). PWA'ens `appleWebApp.statusBarStyle` er `"black-translucent"` i root-layoutet, hvilket giver hvid statustekst. Sæt `appleWebApp: { statusBarStyle: "default" }` i `(app)/layout.tsx`'s `metadata`, så iOS-PWA'en får mørk tekst på Kalk. Kun session bliver `black-translucent`. Tjek i `node_modules/next/dist/docs/`, at segment-metadata merger `appleWebApp` som forventet, og tilføj en assertion i `theme-scope.test.ts`.

- [ ] **Step 3: Verificér hurtigt:** `npx vitest run 'src/app/(app)' src/components/app` er grøn, `tabbar-clearance` og `first-run-surfaces` er uændrede, lint og tsc er uændrede.
- [ ] **Step 4: Commit** `feat(app): medlemsappen i Kalk, live-session i Nat`

### Task 4: Fem faner og mobilmenu

**Files:** Modify `src/components/app/MobileTabBar.tsx`, `src/components/app/AppShell.tsx`, `src/app/globals.css` (`.tab[data-active="true"]::before`) og `messages/{da,en}/Nav.json`. Create `src/components/app/navigation.test.ts`.

- [ ] **Step 1: Fejlende test**

```ts
// src/components/app/navigation.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bar = readFileSync(new URL("./MobileTabBar.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const da = JSON.parse(readFileSync(new URL("../../../messages/da/Nav.json", import.meta.url), "utf8"));

describe("Kalk navigation (spec §6)", () => {
  it("has exactly five mobile tabs in order: today, train, food, mind, crew", () => {
    const keys = [...bar.matchAll(/labelKey:\s*"(\w+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(["today", "train", "food", "mind", "crew"]);
  });

  it("drops the dead messages badge from the tab bar", () => {
    expect(bar).not.toContain('"/messages"');
    expect(bar).not.toMatch(/unreadMessages/);
  });

  it("marks the active tab with the Kalk signal stroke and an ink label (spec §6)", () => {
    expect(css).toMatch(/\.tab\[data-active="true"\]::before\s*\{[^}]*var\(--signal\)/);
    expect(css).not.toMatch(/\.tab\[data-domain\]\[data-active="true"\]/);
  });

  it("reaches Me, Reps, HRV and Science from the mobile header menu", () => {
    const menu = shell.slice(shell.indexOf("data-mobile-menu"), shell.indexOf("</details>", shell.indexOf("data-mobile-menu")));
    expect(menu.length).toBeGreaterThan(0);
    for (const href of ["/profile", "/reps", "/hrv", "/science"]) expect(menu).toContain(`"${href}"`);
    expect(da.shell.menu).toBeTruthy();
  });

  it("describes the five tabs in the first-run tour", () => {
    expect(da.tour.steps.tabs.eyebrow).not.toMatch(/Reps|Mig/);
  });
});
```

Run. Expected: FAIL.

- [ ] **Step 2: Implementér**

- **`MobileTabBar`:**
  - `TABS` indeholder `today`, `train` (`/coaching`), `food` (`/nutrition`), `mind` (`/mind`) og `crew` (`/community`), med de eksisterende ikoner og domæner.
  - Fjern `unreadMessages`-prop, badge-grenen og den ubrugte `Icon.chat`.
  - Kaldet i `AppShell` opdateres, så prop'en ikke længere sendes.
  - `--tabbar-stack`-målingen og strukturen røres ikke (tests låser dem).
- **`AppShell`, mobilheaderen (`lg:hidden`):**
  - Avatar-linket erstattes af en `<details data-mobile-menu>` med avataren som `summary` (`aria-label` = `shell.myProfile`).
  - Menuen indeholder links til `/profile` (`links.me`), `/reps` (`links.reps`), `/hrv` (`links.hrv`) og `/science` (`links.science`).
  - Den virker uden JS og lukkes ved navigation med et `onClick`, der fjerner `open`.
  - Beskedikonet og badgen bliver.
  - Sidebaren på desktop er uændret (alle 10 punkter).
- **`globals.css`:** `.tab[data-active="true"]::before` bruger `background: var(--signal)`. **Begge** domænevarianter (`.tab[data-domain][data-active="true"]` for farve og `::before`) fjernes, så aktiv label og ikon er `--fg` (spec §6). Nat har `--signal` = `--fg`, så Nat-flader ville være visuelt uændrede, men tab-baren vises alligevel ikke i Nat.
- **`Nav.json`:**
  - `shell.menu` sættes til "Menu" på både da og en.
  - `links.mind` forbliver "Mind". Produktet bruger "Mind" konsekvent (Mind-check, `Misc.loading.mindTitle`), og en omdøbning til "Sind" er en separat beslutning til Tom.
  - `tour.steps.tabs` (eyebrow, title, body) opdateres, så teksten beskriver de fem faner og menuen i headeren. Den må ikke nævne "Reps / Mig" som faner. Samme ændring på en.

- [ ] **Step 3: Grøn** (inkl. `tabbar-clearance.test.ts` og `first-run-surfaces.test.ts`), lint og tsc.
- [ ] **Step 4: Commit** `feat(app): fem faner og mobilmenu med Mig, Reps, HRV og Forskning`

### Task 5: Dagens tilpasning og "Behold original" på dashboardet

**Files:**
- Create `src/lib/data/today-adaptation.ts` (+`.test.ts`)
- Create `src/components/dashboard/KeepOriginal.tsx` (+`.test.tsx`)
- Modify `src/app/(app)/session/[id]/actions.ts` (revalidér også `/dashboard`)
- Modify `messages/{da,en}/Dashboard.json` (`todaySession.keepOriginal`, `todaySession.keptOriginal`, `todaySession.keepOriginalError`)

- [ ] **Step 1: Fejlende tests**

```ts
// src/lib/data/today-adaptation.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_ENABLED: false }));

import { getTodayAdaptation } from "./today-adaptation";

describe("getTodayAdaptation", () => {
  it("returns null without a session today", async () => {
    expect(await getTodayAdaptation("m1", null)).toBeNull();
  });

  it("returns the explainer scenario in demo so Munk can demo the flow", async () => {
    const a = await getTodayAdaptation("m1", "demo-session");
    expect(a?.modifierId).toBeTruthy();
    expect(a?.acceptedByMember).toBeNull();
  });
});
```

```tsx
// src/components/dashboard/KeepOriginal.test.tsx
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/(app)/session/[id]/actions", () => ({ setAdaptationResponseAction: vi.fn() }));
import { render } from "@/components/marketing/test-render";
import KeepOriginal from "./KeepOriginal";

describe("KeepOriginal", () => {
  it("offers a ghost 'Behold original' while undecided", () => {
    const html = render(<KeepOriginal modifierId="m" sessionId="s" accepted={null} />);
    expect(html).toContain("Behold original");
    expect(html).toContain("btn-ghost");
    expect(html).not.toContain("btn-primary");
  });

  it("confirms the kept plan and hides the button once declined", () => {
    const html = render(<KeepOriginal modifierId="m" sessionId="s" accepted={false} />);
    expect(html).not.toContain("<button");
    expect(html).toContain('role="status"');
  });
});
```

Og i en eksisterende eller ny test for `actions.ts` (læs kilden som streng):

```ts
expect(actionsSrc).toMatch(/revalidatePath\("\/dashboard"\)/);
```

Run. Expected: FAIL.

- [ ] **Step 2: Implementér**

**`today-adaptation.ts`** (`import "server-only"`):

```ts
export async function getTodayAdaptation(
  memberId: string,
  sessionId: string | null,
): Promise<ActiveAdaptation | null>
```

- Uden `sessionId` returneres `null`.
- Med `SUPABASE_ENABLED` delegeres til `getActiveAdaptationForSession(memberId, sessionId)`.
- I demo bygges en ny `ActiveAdaptation` af `mock-scenarios.ts`. `hrv/learn/adaptive/page.tsx` har ingen objektkonstruktion at genbruge, kun statisk markup:

  ```ts
  const decision = explainerScenarioDecision();
  return {
    modifierId: "demo-explainer",
    modifierType: decision.action,
    params: decision.params,
    ruleDecision: decision,
    explanationDa: EXPLAINER_EXPLANATION_DA,
    reviewedBy: null,
    acceptedByMember: null,
  };
  ```

  Tilpas feltnavnene til `CandidateDecision`s faktiske form (læs typen), og lad tsc afgøre det.
- **Kendt demo-afvigelse:** sessionssiden viser fortsat ingen tilpasning i demo (`adaptation={null}`). Det er uændret i F3 og noteret i PR'en.

**`KeepOriginal.tsx`** (`"use client"`):
- Bruger `useOptimistic` og `useTransition` som i `AdaptationCard.tsx`.
- Knappen `className="btn btn-ghost btn-sm"` kalder `setAdaptationResponseAction({ modifierId, sessionId, accepted: false })`.
- Er `accepted === false`, vises `<p role="status">` med `keptOriginal`. Det gælder også optimistisk og **efter et vellykket svar**: gem det valgte udfald i `useState`, når `ok` er sand. I demo gemmes intet på serveren, så props forbliver `null`, og knappen ville ellers komme igen, når transitionen slutter.
- Ved `ok: false` vises `keepOriginalError` i `role="alert"`, og knappen er tilbage.
- Test: mock `setAdaptationResponseAction` til `{ ok: true }`. Da SSR-render ikke kan klikke, testes tilstandslogikken i en ren helper `nextKeepState(prev, result)` i samme fil med egne tests (`pending`, `ok`, `error`).

**`actions.ts`:** tilføj `revalidatePath("/dashboard")` efter den eksisterende revalidering.

**Copy (da):** `keepOriginal` = "Behold original", `keptOriginal` = "Du kører den oprindelige plan i dag.", `keepOriginalError` = "Det gik ikke igennem. Prøv igen."

- [ ] **Step 3: Grøn, lint, tsc og commit** `feat(dashboard): Behold original direkte på dagens pas`

### Task 6: Morgenens signal (C5)

**Files:** Create `src/lib/dashboard/morning-signal.ts` (+test), `src/components/dashboard/MorningSignal.tsx` (+test). Modify `messages/{da,en}/Dashboard.json` (`morningSignal.*`).

- [ ] **Step 1: Fejlende tests**

```ts
// src/lib/dashboard/morning-signal.test.ts
import { describe, expect, it } from "vitest";
import { buildMorningSignal } from "./morning-signal";

describe("buildMorningSignal", () => {
  const base = {
    session: { adapted: true },
    hrv: { rmssdMs: 48, bucket: "low" as const },
    mindCheckedToday: false,
    intake: { consumedKcal: 640, targetKcal: 2740 },
  };

  it("returns four cells in fixed domain order with links", () => {
    const cells = buildMorningSignal(base);
    expect(cells.map((c) => c.domain)).toEqual(["body", "heart", "mind", "food"]);
    expect(cells.map((c) => c.href)).toEqual(["/coaching", "/hrv", "/mind/check", "/nutrition"]);
  });

  it("states facts, not scores", () => {
    const [body, heart, mind, food] = buildMorningSignal(base);
    expect(body).toMatchObject({ valueKey: "adapted" });
    expect(buildMorningSignal({ ...base, session: { adapted: false } })[0].valueKey).toBe("planned");
    expect(buildMorningSignal({ ...base, hrv: { rmssdMs: 50, bucket: null } })[1].valueKey).toBe("measured");
    expect(heart).toMatchObject({ value: "48", unit: "ms", valueKey: "belowBand" });
    expect(mind).toMatchObject({ valueKey: "checkIn" });
    expect(food).toMatchObject({ value: "640", unit: "kcal", of: "2740" });
  });

  it("degrades honestly when data is missing", () => {
    const [body, heart, , food] = buildMorningSignal({
      session: null, hrv: null, mindCheckedToday: true, intake: { consumedKcal: 0, targetKcal: null },
    });
    expect(body.valueKey).toBe("noSession");
    expect(heart.valueKey).toBe("noReading");
    expect(heart.value).toBeUndefined();
    expect(food.of).toBeUndefined();
  });
});
```

`MorningSignal.test.tsx` renderer via `render()` og tjekker:
- 4 links, hver med `data-domain`,
- ingen hex-farver,
- én `aria-label` på rækken (`morningSignal.label`),
- tal i `font-mono`.

Run. Expected: FAIL.

- [ ] **Step 2: Implementér**

`buildMorningSignal` er ren og har typerne `MorningSignalInput` og `MorningSignalCell = { domain; href; labelKey; valueKey; value?; unit?; of? }`.

| Felt | Regel |
|---|---|
| `body` | Uden session giver `noSession`. `adapted` giver `adapted`. Ellers `planned`. (Der er ingen `done`, fordi `getTodayCard` kun returnerer åbne pas.) |
| `heart` | Uden HRV giver `noReading` uden `value`. Ellers vises `rmssdMs` som tekst, og `bucket` afgør `valueKey`: `"low"` giver `belowBand`, `"high"` giver `aboveBand`, `"normal"` giver `inBand`, og `null` giver `measured` ("Målt", uden båndvurdering). |
| `mind` | `mindCheckedToday` giver `checkedIn`, ellers `checkIn`. |
| `food` | `value` er `consumedKcal`. `of` er `targetKcal`, når den ikke er `null`. |

`MorningSignal.tsx` er en server component med 4 kolonner (2×2 under 360 px). Hver celle er et `Link` med `data-domain`, kicker (`eyebrow eyebrow-domain`), mono-tal eller statustekst og en `sr-only` fuld sætning. Der bruges ingen statusfarver.

Copy (da):
- `morningSignal.label` = "Morgenens signal"
- Labels: Krop, Hjerte, Sind, Mad
- Værdier:
  - `adapted` = "Tilpasset"
  - `planned` = "Klar"
  - `measured` = "Målt"
  - `noSession` = "Intet pas"
  - `belowBand` = "Under bånd"
  - `inBand` = "I bånd"
  - `aboveBand` = "Over bånd"
  - `noReading` = "Ingen måling"
  - `checkIn` = "Tjek ind"
  - `checkedIn` = "Tjekket ind"

- [ ] **Step 3: Grøn, lint, tsc og commit** `feat(dashboard): morgenens signal på tværs af fire domæner`

---

## Chunk 3: Dashboard og verifikation

### Task 7: "I dag først"

**Files:** Create `src/lib/dashboard/today-layout.ts` (+test). Modify `src/app/(app)/dashboard/page.tsx`. Create `src/app/(app)/dashboard/page.order.test.ts`.

- [ ] **Step 1: Fejlende tests**

```ts
// src/lib/dashboard/today-layout.test.ts
import { describe, expect, it } from "vitest";
import { TODAY_LAYOUT } from "./today-layout";

describe("TODAY_LAYOUT", () => {
  it("puts today's session first after the greeting, then the morning signal", () => {
    expect(TODAY_LAYOUT.slice(0, 4)).toEqual(["greeting", "todaySession", "morningSignal", "munkNote"]);
  });

  it("keeps the rest below the fold in a fixed order and drops the decorative body map", () => {
    expect(TODAY_LAYOUT).toEqual([
      "greeting", "todaySession", "morningSignal", "munkNote",
      "prose", "upcoming", "stats", "crew", "tierBanner", "installHint",
    ]);
    expect(TODAY_LAYOUT).not.toContain("bodyMap");
  });
});
```

```ts
// src/app/(app)/dashboard/page.order.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("dashboard renders today first", () => {
  it("renders the session card before the morning signal and everything else", () => {
    const at = (s: string) => page.indexOf(s);
    expect(at('data-dashboard="todaySession"')).toBeGreaterThan(-1);
    expect(at('data-dashboard="todaySession"')).toBeLessThan(at("<MorningSignal"));
    expect(at("<MorningSignal")).toBeLessThan(at("<TodayProse"));
    expect(at("<TodayProse")).toBeLessThan(at('data-dashboard="upcoming"'));
  });

  it("uses the new primitives and Behold original", () => {
    expect(page).toContain("<Card");
    expect(page).toContain("<KeepOriginal");
    expect(page).toContain("getTodayAdaptation(");
    expect(page).not.toContain("<BodyMap");
    expect(page).not.toContain("<HrvChip");
    expect(page).not.toContain("<MindTile");
  });
});
```

Run. Expected: FAIL.

- [ ] **Step 2: Implementér**

`today-layout.ts` eksporterer konstanten ovenfor med en kommentar, der henviser til spec §6.

`dashboard/page.tsx` omlægges i den rækkefølge. Alle eksisterende datakald bevares, bortset fra de fjernede moduler:

1. **`greeting`:** den eksisterende hilsen med `PageTitle` (`kicker` = ugedag eller `greeting.eyebrow`, `title` = handle) og stribe som `action`.
2. **`todaySession`:** `<Card variant="primary" domain="body" as="section" data-dashboard="todaySession">`.
   - Genbrug header, stats og øvelsesliste fra det nuværende kort (`:318-394`).
   - Under headeren står `AdaptiveReasonStrip` (A2), som i dag.
   - Når `getTodayAdaptation(member.id, today?.id ?? null)` giver en tilpasning, vises `<KeepOriginal …>` ved siden af Start-knappen.
   - Tomt kort (`:396-418`): `EmptyState` med de eksisterende `emptyTitle`, `emptyBody` og `emptyCta`. `data-today-empty` bevares (en test kræver det).
3. **`morningSignal`:** `<MorningSignal>` med input fra:
   - `today` → `session: today ? { adapted: adaptation != null && adaptation.acceptedByMember !== false } : null`,
   - `getHrvChipData`,
   - `hasMindCheckToday`,
   - `getDailyIntake(member.id)`, som er ny. I demo returnerer den nul-værdier, og cellen viser da "0 kcal" uden mål. Det er acceptabelt og ærligt.
4. **`munkNote`:** den eksisterende form-check-besked (`:290-315`) som `Card`.
5. **`prose`:** `TodayProse`.
6. **`upcoming`:** den eksisterende sektion med `SectionHeader`. Wrapperen får `data-dashboard="upcoming"`.
7. **`stats`:** de eksisterende tal med `Stat`.
8. **`crew`:** den eksisterende sektion med `SectionHeader`.
9. **`tierBanner`:** kun når der er en promotion.
10. **`installHint`:** `InstallHint`.

Fjernes fra dashboardet:
- **`BodyMap`:** dekorativ.
- **`HrvChip`-komponenten og `MindTile`:** erstattet af Morgenens signal.
- **`DailyCheckInCard`:** fjernes fra dashboardet. `/nutrition` renderer den allerede (`nutrition/page.tsx:151`), og det er Mad-cellens destination.
- **`ConnectDotsStream`:** flyttes under `prose`, hvis den har selvstændigt indhold, ellers fjernes den. Læs komponenten, og vælg. Begrund valget i commit-beskeden.

Filerne slettes ikke, fordi andre sider kan bruge dem. Tjek med `grep`.

`FirstTimeTour` beholdes øverst. Tour-copy'en for fanerne er rettet i Task 4. Hvis andre trin peger på fjernede moduler, rettes de her.

Kør `dashboard/page.connected.test.ts`, `cdo-bodycopy.test.ts`, `dashboard.today-pick.test.ts` og `connected-first-run.test.ts`.

**Kendt brud:** `cdo-bodycopy.test.ts:85` forventer strengen `t("hrvChip.unit")` i `dashboard/page.tsx`. Flyt assertionen, så den læser `src/components/dashboard/MorningSignal.tsx`, og forvent den enhedsnøgle, MorningSignal faktisk bruger. Genbrug `hrvChip.unit` fra `Dashboard.json`, hvis det giver mening. Andre brud rettes kun, hvis testen låser et fjernet modul, og det begrundes i commit-beskeden.

- [ ] **Step 3: Grøn, lint, tsc og commit** `feat(dashboard): dagens pas først, morgenens signal og færre moduler`

### Task 8: Zoom og farver uden for tokens i skallen

**Files:** Modify `src/app/layout.tsx` (fjern `maximumScale: 1`). Ret hardcodede mørke farver i de filer, dashboardet og skallen renderer. Find dem med:

```bash
grep -rnE '#0A0A0B|#F5F2EC|rgba\(245, ?242, ?236|rgba\(10, ?10, ?11|bg-black|text-white|bg-white|text-black|#C97B3E|#4CAF7D' src/components/app src/components/dashboard src/app/'(app)'/dashboard src/components/ui
```

Resten af appen er F4.

- [ ] **Step 1: Fejlende port**

```ts
// src/lib/design/kalk-shell-gate.test.ts
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files: (readonly [string, string])[] = [
  "../../components/app", "../../components/dashboard", "../../components/ui",
].flatMap((d) => readdirSync(new URL(d + "/", import.meta.url))
  .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
  .map((f) => [f, readFileSync(new URL(`${d}/${f}`, import.meta.url), "utf8")] as const));
const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
files.push(["dashboard/page.tsx", readFileSync(new URL("../../app/(app)/dashboard/page.tsx", import.meta.url), "utf8")]);

describe("Kalk shell gate", () => {
  it("lets people zoom (WCAG 1.4.4)", () => {
    expect(layout).not.toMatch(/maximumScale/);
  });

  it.each(files)("%s has no dark-only literals", (_f, src) => {
    expect(src).not.toMatch(/#0A0A0B|#F5F2EC|rgba\(245,\s?242,\s?236|rgba\(10,\s?10,\s?11/i);
    expect(src).not.toMatch(/\b(bg-black|text-white|bg-white|text-black)\b/);
  });
});
```

Run. Expected: FAIL på `maximumScale` og eventuelle literals.

- [ ] **Step 2: Ret.** I dag er det eneste kendte fund `FirstTimeTour.tsx:64` (`bg-black/70`). Brug tokens (`bg-fg text-bg` til inverterede flader, `var(--glow)` osv.). Kopier ikke Nat-værdier ind som literals.
- [ ] **Step 3: Grøn, lint, tsc og commit** `fix(app): zoom tilladt og ingen mørke literals i skal og dashboard`

### Task 9: Verifikation

1. **Login:** browser-login med invite-kode er blokeret for agenter. **Bed Tom** om at logge ind i browser-panelet (demo-tilstand, `MUNK-01`), og fortsæt derefter. Brug protokollen fra PLATFORM_OVERVIEW §8 (dev-server uden `.env.local`, stop kun port 3002, flyt altid `.env.local` tilbage).
2. **Tjek på 390×844, 1024 og 1440** (ved skjult panel måles `#S:0`):
   - `/dashboard`: Kalk, dagens pas over folden på 390, "Behold original" klikbar med statusbesked, Morgenens signal med fire links, ingen vandret scroll.
   - Tab-bar: 5 faner, orange aktiv streg, menuen med Mig/Reps/HRV/Forskning virker uden JS.
   - `/session/<id>` fra Start pas: mørk, også under kort indhold (`SessionPreview`), ingen lys overscroll, `theme-color` `#0A0A0B`, og tilbage til dashboardet er lyst igen.
   - Demo: "Behold original" på dashboardet bliver skjult efter klik og viser statusbeskeden.
   - `/hrv`, `/mind`, `/nutrition`, `/coaching`, `/community`, `/profile`, `/reps`, `/science`: ingen ulæselig tekst eller usynlige kanter. Notér fund til F4-listen, og ret dem ikke her, medmindre de blokerer.
   - `/coach`: uændret mørk.
   - Pinch-zoom er muligt. Fokus på et felt zoomer ikke på touch-emulering.
   - Konsol: 0 fejl, bortset fra den kendte service worker-fejl.
3. **Samlet kørsel:** `npm test && npm run lint && npm run build`, og tsc skal give 7.
4. **Afslutning:** push, åbn PR, og opdater status i hovedplanen. Commit `docs(plan): F3 app-kerne leveret`.

---

## Status

- [ ] Task 1 Card, SectionHeader, PageTitle
- [ ] Task 2 EmptyState, Stat, Field
- [ ] Task 3 Tema på app og session
- [ ] Task 4 Fem faner og mobilmenu
- [ ] Task 5 Behold original på dashboardet
- [ ] Task 6 Morgenens signal
- [ ] Task 7 I dag først
- [ ] Task 8 Zoom og literals
- [ ] Task 9 Verifikation (kræver Toms login i browser-panelet)
