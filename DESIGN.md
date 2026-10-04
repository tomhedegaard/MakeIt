---
name: MakeIt // HQ
description: Dansk coaching-app til styrketræning i retning Nord. Hvid flade, én skrift, 1 px linjer, mos som eneste accent.
colors:
  ink: "#111111"
  paper: "#FFFFFF"
  paper-2: "#F2F2F0"
  paper-3: "#E9E9E6"
  body-ink: "#333333"
  dim: "#5E5E59"
  faint: "#696964"
  line: "#E1E1DE"
  line-strong: "#CFCFCA"
  line-bright: "#B9B9B4"
  mos: "#2E4A3B"
  heart: "#BE123C"
  food: "#116A35"
  body: "#A8380B"
  mind: "#1D4ED8"
  mind-energy: "#6D28D9"
  mind-focus: "#0E7490"
  ok: "#116A35"
  warn: "#8A6A00"
  danger: "#B42318"
  nat-bg: "#111111"
  nat-bg-2: "#1A1A19"
  nat-bg-3: "#232322"
  nat-fg: "#FFFFFF"
  nat-body-ink: "#E6E6E2"
  nat-dim: "#B9B9B4"
  nat-faint: "#8F8F8A"
  nat-heart: "#F2545B"
  nat-food: "#45C487"
  nat-body: "#FF9C41"
  nat-mind: "#5B9DF5"
  nat-ok: "#45C487"
  nat-warn: "#FACC15"
  nat-danger: "#F87171"
typography:
  hero-lg:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "5.5rem"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  hero:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  card:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  copy:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  meta:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0"
  micro:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0"
rounded:
  none: "0"
  full: "9999px"
spacing:
  text-gap: "12px"
  card-gap: "16px"
  page-margin: "20px"
  card-padding: "20px"
  section-gap: "32px"
  page-margin-md: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
    typography: "{typography.copy}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ghost:
    textColor: "{colors.mos}"
    rounded: "{rounded.none}"
    height: "48px"
  button-sm:
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "44px"
    typography: "{typography.meta}"
  button-xl:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "64px"
    width: "100%"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
  card-grey:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
  field:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  pill:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "44px"
  pill-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  avatar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "36px"
    typography: "{typography.micro}"
---

# Design System: MakeIt // HQ

Kilde: den shippede kode (`src/app/globals.css`, `src/components/ui/*`, `src/components/app/*`), briefen `docs/superpowers/specs/2026-09-26-nord-redesign-design.md` og `docs/DOMAIN_COLOR_SYSTEM.md`. Hvor koden og briefen er uenige, gælder koden, og afvigelsen står her. Frontmatter er normativ; prosaen forklarer brugen.

## Overview

**Creative North Star: "Grebet holder"**

Nordisk minimalisme, der læner sig op ad webshoppen: hvid flade, én skrift i sentence case, tynde linjer, data og produkt på hvid. Appen har intet eget udtryk; den genbruger shoppens token-navne og skrift. Det premium-agtige kommer fra præcis copy, ærlige tal og store tal, ikke fra effekter.

Mørkt findes præcis to steder: live-passet (`/session/[id]`) og coach-konsollen (`/coach`). Alt andet, inklusive login, onboarding og mails, er Nord lys. Farve er retning, ikke dekoration: fire domænefarver fortæller, hvilken verden du er i, og må aldrig betyde "klik her".

**Key Characteristics:**
- Radius 0 overalt; kun cirkler (avatar, dots, skyderknop) er runde.
- 1 px linjer i stedet for skygger. Ingen glød, blur, gradient eller korn.
- Én skrift (Schibsted Grotesk 400/500), sentence case, titler slutter med punktum.
- Blæk er interaktion, mos er accent, domænefarver er data-blæk.
- Nummereret navigation (01 I dag … 10 Beskeder) er en fast del af udtrykket.
- Ingen 0–100-scores: ms, kg, minutter, dage.

## Colors

En monokrom blæk-og-papir-base med én brand-accent (mos) og fire domænefarver i streng dosering.

### Primary
- **Blæk** (`ink`, `--fg`): overskrifter, tal, primærknap, fokusring, valgt chip/pill.
- **Papir** (`paper`, `--bg`): side og standardkort. `--bg-elev` er også hvid (sheets, popovers, modaler).

### Secondary
- **Mos** (`mos`, `--signal` / `--signal-ink`): eneste brand-accent. Kicker uden domæne, links, progress-fyld, aktiv tab-markør (2 px), valgt tilstand, skyderfyld. 9,7:1 på hvid. På nat er `--signal` hvid; der er ingen mos på mørkt.

### Tertiary (domæner)
- **Krop** (`body`, `--body`): træning, øvelser, programmer, muskelfiguren.
- **Mad** (`food`, `--food`): kost, måltider, vægt.
- **Hjerte** (`heart`, `--heart`): HRV, puls.
- **Sind** (`mind`, `--mind`): mind-check, journal, søvn. Grafserier: `--mind-energy`, `--mind-stress` (= `--mind`), `--mind-focus`.
- Hver har `-tint` (12 %) og `-line` (32 %) via `color-mix`. Sæt `data-domain="heart|food|body|mind"` én gang på et layout/kort; efterkommere bruger `text-domain`, `bg-domain-tint`, `border-domain-line`, som falder tilbage til monokromt uden for et scope.

### Neutral
- **Papir 2** (`paper-2`, `--bg-2`): grå flade (`.surface`, `Card`), sheet-baggrund.
- **Papir 3** (`paper-3`, `--bg-3`): indlejrede felter, stepper, inaktive spor.
- **Brødblæk** (`body-ink`, `--fg-body`): brødtekst.
- **Dæmpet** (`dim`, `--fg-dim`): metadata, aksetekst, inaktive tabs.
- **Svag** (`faint`, `--fg-faint`): placeholder. Skubbet ned fra briefens `#B9B9B4`, så al neutral tekst holder AA på alle tre flader (spec §10.1).
- **Linjer** (`line`, `line-strong`, `line-bright`): `--line` er standard for alle kanter (også Tailwinds farveløse `border`), `--line-strong` til primærkort/aktive rammer/felter, `--line-bright` kun dekorativ streg.
- **Status** (`ok`, `warn`, `danger`): kun i fyldte alerts/badges med ikon og tekst. Der findes ingen info-farve; info er monokrom.
- `--scrim` (modal-baggrund) og `--media` (video-letterbox) findes i begge temaer.

### Temaer
- **Nord lys** ligger på `:root` og er standard.
- **Nord nat** (`nat-*`-nøglerne) aktiveres kun med `<ThemeScope theme="nat">` på layout-niveau i `/session/[id]` og `/coach`. Nat-blokken løftes til `<html>` via `:has()`, så portalerede sheets og cookie-bar følger med. En nat-scope midt på en lys side gør hele siden mørk; brug den aldrig der.

### Named Rules
**The Mos Is Not Paint Rule.** Mos er aldrig knapfyld og aldrig en stor flade. Primærknappen er blæk.

**The Ten Percent Rule.** Domænefarve må dække højst ca. 10 % af en flade og kun som: kicker, data-blæk i grafer, aktiv nav-markør, dots, badge-tint (12 % flade + 32 % kant + farvet tekst) og dashboard-tilens 24 × 2 px streg (`.domain-stroke`). Aldrig i knapper, brødtekst, overskrifter, kortbaggrunde eller alerts.

**The Monochrome Console Rule.** Coach-konsollen er 100 % monokrom (beslutning, ikke hul). Live-passet er også monokromt: ingen domænefarve i nat. Danger må kun stå ved safety.

## Typography

**Font:** Schibsted Grotesk (400 og 500), fallback `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. `font-sans`, `font-display` og `font-mono` peger alle på samme stak; der findes ingen anden skrift. `font-synthesis: none`, så `font-bold` falder til 500.

**Character:** En saglig grotesk i sentence case. Display er 500 med stram spærring; brød er 400 uden spærring.

### Skalaen (eneste tilladte størrelser)

På medlems- og coachflader (`src/app/(app)`, `src/app/coach`, `src/components` uden for `marketing/`) er disse otte Tailwind-størrelser de eneste tilladte. Hver bærer selv linjehøjde, spærring og vægt, så `text-title` alene giver hele rollen. Kombiner med `font-display` på overskrifter.

| Token | px | Rolle | Eksempler |
|---|---|---|---|
| `text-hero-lg` | 88 | Hero-tal fra tablet og op (`md:text-hero-lg`) | Samme tal som `text-hero` |
| `text-hero` | 64 | Hero-tal, ét pr. skærm | "43 ms", "1.420 Reps", topsæt "135 kg" |
| `text-title` | 34 | Sidetitel (`PageTitle`, `PageHeader`) | "Din uge.", "Brændstof.", "HRV." |
| `text-section` | 22 | Sektionstitel (`SectionHeader`), sheet-titel, fortællebåndstitel, enhed ved hero-tal i `--fg-dim` | "Seneste morgener", "ms" ved 43 |
| `text-card` | 17 | Korttitel, øvelsesnavn, mellemstore tal i nøgletal | "Dag A · Squat", "Back squat" |
| `text-copy` | 15 | Brødtekst, knaptekst, listetekst. Body-default | Undertitler, HQ's begrundelse |
| `text-meta` | 13 | Metadata, kicker (`.eyebrow`), sekundære links, `.btn-sm` | "Træn · coach Mikael Munk", "Se alle" |
| `text-micro` | 12 | Tabelhoveder, tidsstempler, chips, avatar-initialer, akselabels | "HQ · 05:30", "4. okt., 11.24" |

Brød hedder `text-copy`, fordi `text-body` er domænefarven Krop. `cn()` (`src/lib/utils.ts`) kender skalaen, så `text-micro text-fg-dim` overlever merge.

**Ikke tilladt på medlems- og coachflader:** rå Tailwind-størrelser (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl` …) og vilkårlige størrelser (`text-[13px]`, `text-[2.75rem]`, `text-[clamp(…)]`). Landing og marketing (`components/marketing/`) har sin egen skala og er undtaget.

**Sidetitlen er 34 px i alle bredder.** Den tidligere 44 px fra `md` (`md:text-[2.75rem]`, spec §10.5) udgår med typografibølgen; der findes ingen titelstørrelse mellem `text-title` og `text-hero`.

**Komponent-interne størrelser** i `globals.css` er ikke en del af skalaen og må ikke kopieres: tab-label 11 px (brief §5), stepper-tal 32 px, stepper-knap 24 px.

### Tal
- `.numeric`: proportionale cifre, −0,02em. Til alle fritstående tal ("1.420", "68,4"). Skriftens `tabular-nums` giver også punktum og komma cifferbredde ("1 . 420"), derfor er standarden proportional (ændret 2026-10-04).
- `.tabular`: `tabular-nums` kun til tal, der skifter på stedet (timere, steppere) eller står i højrestillede kolonner.
- Danske talformater: "1.420", "137,5 kg", "6,5". Intervaller med en-dash og kun i tal: "54–68 ms", "0–999".

### Named Rules
**The One Voice Rule.** Én skrift, to vægte, sentence case. Ingen `uppercase`, ingen `font-mono`, ingen spærret tracking (`tracking-wide*`, `tracking-[0.x em]`).

**The Eight Sizes Rule.** Hvis en størrelse ikke står i tabellen, findes den ikke. Vælg rollen, ikke pixelværdien.

**The Kicker Rule.** Kicker er 13 px 500 i sentence case: mos uden domæne, domænefarve med `eyebrow-domain` i et `data-domain`-scope. Højst én pr. blok, og den gentager aldrig titlen eller en kicker over den.

## Layout

- **Margin:** 20 px på telefon, 40 px fra `md` (`Container`: `px-5 md:px-10`). Bredder: standard 1280 px, `wide` 1480 px, `narrow` 768 px.
- **Rytme:** 12 px mellem tekstblokke, 16 px mellem kort, 32 px mellem sektioner, 20 px indvendig kortmargin (`p-5`). `PageHeader` har `py-8 md:py-12` og 1 px linje under.
- **Retning:** alt er venstrestillet, også tomme tilstande. Kun tal-i-kolonner (ugedage, nøgletal, segmenterede valg) centreres.
- **Shell:** desktop har en sticky sidebar med nummererede punkter (01 I dag · 02 Træn · 03 Mad · 04 Crew · 05 HRV · 06 Mind · 07 Reps · 08 Forskning · 09 Mig · 10 Beskeder). Mobil har en in-flow tab-bar (I dag · Træn · Mad · Mind · Crew; Mind beholder sin fane, spec §10.6). Coach har sin egen nummererede rail.
- **Safe area:** top-chrome bruger `.safe-top`; tab-bar og sheets lægger `--safe-bottom` til som padding. Scrollporten bruger `.pb-tabbar`.
- **Touch:** 44 px er gulvet for alt, der kan trykkes (`.btn-sm`, `.pill`, `.range`, stepper-input, tab-links). Små links får et usynligt tryk-areal via `after:` frem for at vokse.

## Elevation & Depth

Systemet er fladt. Dybde kommer fra tonale flader (`--bg` → `--bg-2` → `--bg-3`) og 1 px linjer, aldrig fra skygger. Sheets og modaler løftes med `--scrim` bag sig og en linje, ikke en skygge. Fokus er en 2 px blæk-outline med 2 px offset.

### Named Rules
**The Flat Rule.** Ingen `shadow*`, `backdrop-blur`, `bg-gradient-to-*`, `conic-gradient` eller `radial-gradient` på medlems- og coachflader. Pulserende dots pulserer med opacitet, ikke en glødring. Den eneste lineære gradient er skyderens hårde fyldstop.

## Shapes

Radius 0 er sat i Tailwind-temaet (`--radius-xs … --radius-4xl: 0`), så enhver `rounded-*` bliver kantet. `rounded-full` er undtaget og bruges kun til cirkler: avatarer, dots, skyderknop. Ingen pilleformer. Linjeikoner fra `lucide-react` med `{...ICON}` (`src/components/ui/icon.ts`): 1,5 px streg, firkantede ender, mitrede hjørner, `currentColor`, 24 px i navigation. Ingen emoji som UI; typografiske tegn (→ · ✓) i copy er tekst.

## Components

Komponentklasserne i `globals.css` (`.btn*`, `.surface*`, `.hairline*`, `.eyebrow`, `.numeric`, `.tabular`, `.field`, `.pill`, `.stepper`, tab-bar m.fl.) ligger i `@layer components`, så Tailwind-utilities (`lg:hidden`, `hover:border-fg`) vinder over dem. Lokale workarounds for kaskaden er ikke nødvendige.

### Buttons (`.btn`)
- **Form:** kantet rektangel, 48 px høj, 0 20 px padding, 15 px 500, sentence case, `white-space: nowrap`.
- **Sekundær (`.btn`):** 1 px blæk-outline, gennemsigtig. Hover inverterer til blæk-fyld.
- **Primær (`.btn btn-primary`):** blæk-fyld, papirtekst. Hover inverterer til outline. Højst én primærknap pr. skærm.
- **Tertiær (`.btn btn-ghost`):** mos-tekstlink uden ramme; hover understreger.
- **Lille (`.btn-sm`):** 44 px, 13 px tekst. Bruges fx til "Behold original".
- **Stor (`.btn-xl`):** 64 px, fuld bredde. Live-passets "Log sæt".
- **Destruktiv:** outline med fare-tekst. Aldrig mos- eller domænefyld.
- **Overgang:** baggrund, farve og kant på 200 ms ease-out.

### Chips og pills
- **Chip:** 1 px linje, `text-micro`, kantet. Valgt chip: blæk-fyld, papirtekst. Domæne-chips må bruge badge-tint.
- **Pill (`.pillgroup` / `.pill`):** segmenteret valg (RPE), 44 × 44 px minimum, 1 px `--line-strong`; aktiv (`data-active="true"`) inverterer til blæk.

### Cards / Containers
- **Standardkort:** hvid flade med 1 px `--line` (`.surface-2`). Dette er standarden for indhold.
- **Grå flade:** `--bg-2` med 1 px linje (`.surface` og `Card`). `Card variant="primary"` får `--line-strong` og er det ene vigtigste på en skærm. At grå markerer det primære er dagens tilstand, ikke afgjort.
- **Hover:** `.lift` løfter 2 px og skifter til `--line-strong` på 200 ms; slukket ved reduceret bevægelse.
- **Linje-hjælpere:** `.hairline` (`--line`) og `.hairline-strong` (`--line-strong`) sætter kun kantfarven.

### Inputs / Fields
- **`.field`:** 48 px, `--bg-3`, 1 px `--line-strong`, 15 px. Fokus: blæk-kant og `--bg-2`. `.input` er den ældre variant til tekstfelter og textareas.
- **Touch:** alle native tekstfelter (`.field`, `.input`, `input`, `textarea`, `select`) er 16 px på grove pointere og under 40rem, så iOS ikke zoomer. Én global regel; komponenter skal ikke selv vælge en størrelse for det.
- **Skyder (`.range`):** 4 px spor i `--bg-3`, mos-fyld med hårdt stop, 20 px blæk-knop med papirkant, 44 px tryk-flade.
- **Stepper (`.stepper`):** 56 px knapper på hver side af værdien; værdien kan redigeres direkte.

### Navigation
- **Tab-bar (`nav.tabbar`):** hvid, 1 px linje over, ikoner 24 px, label 11 px 500 i `--fg-dim`. Aktiv: blæk-label plus en 24 × 2 px mos-streg øverst. Ingen domænefarve i bjælken.
- **Sidebar og coach-rail:** nummereret liste. Aktivt punkt har `aria-current="page"`; i sidebaren får domænepunkter en 2 px venstre-rail i domænefarve. Coach-railen er monokrom.

### Delte primitiver (`src/components/ui`, `src/components/app`)
- **`PageHeader`:** sidens titelbånd (kicker, titel, undertitel i `text-copy`, valgfri højre-handling) i `Container`, 1 px linje under. Bruges på faner.
- **`PageTitle`:** én titelskala i `text-title`. `size="page"` til faner, `size="compact"` til undersider. Hver side i `(app)` skal bruge `PageHeader` eller `PageTitle`.
- **`SectionHeader`:** valgfri kicker, `h2` i `text-section`, valgfrit mos-link i `text-meta` med 44 px tryk-areal. Håndbyggede kicker-plus-`h2` er forbudt.
- **`Card`:** kortet med `variant` (`quiet`/`primary`) og valgfrit `domain`, som sætter `data-domain`.
- **`Progress`:** 4 px spor i `--line` med mos-fyld via `scaleX`; bærer `role="progressbar"`, `aria-label` og `aria-valuetext`.
- **`Avatar`:** initialer i en 36 px cirkel med 1 px `--line-strong`, `text-micro`, `aria-hidden` (handlen ved siden af bærer navnet).
- **`Stat`:** kicker-label, tal i `.numeric`, enhed i `--fg-dim`, monokrom delta-pil.
- **`Sheet` / `SheetContent`:** Radix-bundsheet i `--bg-2`, 1 px `--line-strong` foroven, grabber, maks. 92dvh, safe-area i bunden. Har altid et tilgængeligt navn.
- **`Modal`:** centreret Radix-dialog i `--bg-elev` med 1 px linje på `--scrim`; fokusfælde, Escape og klik på baggrund lukker.
- **`ConfirmSheet`:** ja/nej i et sheet (Annullér som `.btn`, bekræft som `.btn-primary`). Erstatter `window.confirm()` overalt.
- **`ThemeScope`:** eneste måde at skifte tema på, kun på layout-niveau.

### Muskelfiguren og grafer
- Muskelfiguren er den eneste kropsgrafik: trænet muskel i Krop-farven i tre styrker (`--muscle-primary/-secondary/-tertiary`, 100/50/24 %) på en flad silhuet med 1 px kant.
- Grafer: grid og ramme i `--line`/`--line-strong`, aksetekst i `--fg-dim`, data i domænefarve, bånd som flade tints. Ingen afrundede søjler, ingen trafiklys. Hver graf har et tekst- eller tabelalternativ.

### Bevægelse
- 200 ms ease-out på tilstandsskift (knapper, `.lift`, progress). Sheets glider ind på 320 ms og scrim fader på 220 ms.
- `prefers-reduced-motion: reduce` slukker pulsdots, `animate-pulse`, `.lift` og landingens tegnede streger. Nye animationer skal have en reduceret variant.
- Ingen konfetti.

## Do's and Don'ts

### Do:
- **Do** brug kun de otte størrelser fra skalaen på medlems- og coachflader, og vælg dem efter rolle.
- **Do** brug hvide kort med 1 px `--line` som standard; grå flade kun til det ene primære.
- **Do** brug blæk til interaktion, mos til links/progress/valgt tilstand og domænefarve kun som data-blæk og kicker.
- **Do** sæt `data-domain` én gang på layout eller kort, frem for at farve enkeltelementer.
- **Do** giv alt trykbart mindst 44 px og aktiv navigation `aria-current="page"`.
- **Do** brug `.numeric` til fritstående tal og `.tabular` kun til tal, der skifter på stedet eller står i kolonner.
- **Do** brug `ConfirmSheet`, `Modal`, `Sheet`, `Progress` og `Avatar` frem for håndbyggede varianter.
- **Do** afslut sidetitler med punktum og skriv tal på dansk ("1.420", "137,5 kg").

### Don't:
- **Don't** brug `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl` … eller `text-[…]` uden for landing og marketing.
- **Don't** brug `uppercase`, `font-mono`, spærret tracking eller en anden skrift.
- **Don't** brug skygger, blur, glød, gradienter eller korn.
- **Don't** brug radius ud over 0, undtagen `rounded-full` til cirkler.
- **Don't** fyld knapper eller store flader med mos eller domænefarve.
- **Don't** brug domænefarve i coach-konsollen eller i live-passet.
- **Don't** vis 0–100-scores; vis ms, kg, minutter og dage.
- **Don't** brug en-dash eller tankestreg i prosa; en-dash er kun til talintervaller.
- **Don't** gentag en kicker eller lad den gentage titlen.
- **Don't** brug emoji som UI eller håndtegnede SVG-ikoner.
- **Don't** sæt `ThemeScope theme="nat"` andre steder end `/session/[id]` og `/coach`.

## Gates

Reglerne håndhæves i vitest. En ændring, der bryder dem, skal rette koden, ikke gaten.

| Gate | Hvad den holder |
|---|---|
| `src/lib/design/nord-theme.test.ts` | Lys på `:root`, nat i én blok kun to steder; AA for neutral tekst på alle tre flader; én skrift i 400/500; ingen uppercase; radius 0; ingen korn eller glød; 16 px felter på touch; statisk slutbillede ved reduceret bevægelse |
| `src/lib/design/nord-surface-gate.test.ts` | Ingen mørke literals på medlemsflader; ingen `text-[clamp(…)]` i overskrifter; ingen uppercase/mono/tracking; ingen skygge, blur eller gradient; mails i Nord lys; PWA og native chrome i lys; hver side bruger `PageHeader`/`PageTitle`; sektioner bruger `SectionHeader`; `/coach` er nat |
| `src/lib/design/nord-graphics-gate.test.ts` | Ét ikonsprog (lucide + `ICON`), SVG kun i en begrundet allowlist; ingen emoji som UI |
| `src/lib/design/nord-type-scale-gate.test.ts` | Kun de otte størrelser: rå `text-xs`, `text-sm` … `text-2xl` og `text-[…px/rem]` fejler i `(app)`, `coach`, `onboarding`, `login` og `components` (marketing/landing undtaget) |
| `src/lib/design/nord-shell-gate.test.ts` | Zoom tilladt (WCAG 1.4.4); den globale 16 px-regel mod iOS-fokuszoom |
| `src/lib/design/safe-area.test.ts` | Top-chrome rydder statusbjælken i native shells |
| `src/lib/design/contrast.test.ts`, `theme-tokens.test.ts` | Kontrastberegning og token-læsning, som gates bygger på |
| `src/components/ui/touch-targets.test.ts` | `.btn` og `.btn-sm` ≥ 44 px og de navngivne kontroller |
| `src/components/ui/ThemeScope.test.tsx`, `src/app/(app)/theme-scope.test.ts` | Temaskift kun via `ThemeScope` |

