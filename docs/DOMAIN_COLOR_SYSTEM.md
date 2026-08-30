# Domænefarver — tertiært farvesystem oven på monokrom base

> Status: Vedtaget 2026-08-30. Designprincip + tokens + faseplan for de fire
> domænefarver i MakeIt's ellers sort/hvide "strength editorial"-design.

## 1. Princip

**Farve er retning, ikke dekoration.** Den monokrome base bliver. Domænefarver
fortæller *hvilken verden du er i* — de må aldrig betyde "klik her" eller "fejl".

| Domæne | Navn | Token | Hex | Dækker |
|--------|------|-------|-----|--------|
| 🔴 Hjerte | Heart | `--heart` | `#F2545B` | HRV, puls, kondital, alt kardiovaskulært (`/hrv`) |
| 🟢 Kost | Food | `--food` | `#45C487` | Måltidsplan, indkøb, vægt, præferencer (`/nutrition`) |
| 🟠 Krop | Body | `--body` | `#FF9C41` | Øvelser, programmer, pas, sessions (`/coaching`, `/train`, `/program`, `/session`) |
| 🔵 Sind | Mind | `--mind` | `#5B9DF5` | Check-in, journal, sessioner, cirkler, søvn (`/mind`) |

Alle fire er valgt til ≥ 4.5:1 kontrast mod `--bg` (#0A0A0B), så de kan bære
11px mono-kickers direkte (AA).

### Doseringsregel
Max ~10 % af en flade må være farvet. Farven optræder KUN i disse roller:

**Må:**
- Kicker/eyebrow (11px mono uppercase) — skifter fra `--fg-faint` til domænefarve
- Kort accent-streg (24×2px) øverst på dashboard-tiles
- Data-blæk i charts (linjer, punkter, bands) — akser/grid forbliver monokrome
- Aktiv nav-indikator (sidebar-rail, mobil tab-ikon) + domæne-dot ved nav-numre
- Puls-dot og status-dots
- Badge/pill-tint: 12 % flade + 32 % kant + farvet tekst

**Må ikke:**
- Store farvede flader eller gradients
- Knapper og CTA'er — interaktion forbliver monokrom (hvid invertering)
- Brødtekst, overskrifter, kort-baggrunde
- Alerts/fejlbeskeder (det er status-farvernes job, se §5)

## 2. Tokens (`src/app/globals.css`)

Tilføjes efter de eksisterende accent-tokens (~linje 25):

```css
/* Domain accents — farve er retning, ikke dekoration */
--heart: #F2545B;
--food:  #45C487;
--body:  #FF9C41;
--mind:  #5B9DF5;

--heart-tint: color-mix(in oklab, var(--heart) 12%, transparent);
--food-tint:  color-mix(in oklab, var(--food) 12%, transparent);
--body-tint:  color-mix(in oklab, var(--body) 12%, transparent);
--mind-tint:  color-mix(in oklab, var(--mind) 12%, transparent);

--heart-line: color-mix(in oklab, var(--heart) 32%, transparent);
--food-line:  color-mix(in oklab, var(--food) 32%, transparent);
--body-line:  color-mix(in oklab, var(--body) 32%, transparent);
--mind-line:  color-mix(in oklab, var(--mind) 32%, transparent);

/* Status — adskilt fra domæner, kun til alerts/validering (§5).
   Info er altid monokrom (--line-bright + ikon). Ingen --info-token. */
--ok:     #4ADE80;
--warn:   #FACC15;
--danger: #F87171;
```

Og i `@theme inline`-blokken:

```css
--color-heart: var(--heart);  --color-heart-tint: var(--heart-tint);  --color-heart-line: var(--heart-line);
--color-food:  var(--food);   --color-food-tint:  var(--food-tint);   --color-food-line:  var(--food-line);
--color-body:  var(--body);   --color-body-tint:  var(--body-tint);   --color-body-line:  var(--body-line);
--color-mind:  var(--mind);   --color-mind-tint:  var(--mind-tint);   --color-mind-line:  var(--mind-line);
--color-ok: var(--ok); --color-warn: var(--warn); --color-danger: var(--danger);
```

Det giver Tailwind-utilities: `text-heart`, `bg-food-tint`, `border-mind-line` osv.

### `data-domain`-mønstret (nøglen til lav vedligeholdelse)

```css
[data-domain="heart"] { --domain: var(--heart); --domain-tint: var(--heart-tint); --domain-line: var(--heart-line); }
[data-domain="food"]  { --domain: var(--food);  --domain-tint: var(--food-tint);  --domain-line: var(--food-line); }
[data-domain="body"]  { --domain: var(--body);  --domain-tint: var(--body-tint);  --domain-line: var(--body-line); }
[data-domain="mind"]  { --domain: var(--mind);  --domain-tint: var(--mind-tint);  --domain-line: var(--mind-line); }
```

Hver domæne-layout sætter attributten én gang, fx i `src/app/(app)/hrv/layout.tsx`:
`<section data-domain="heart">`. Delte komponenter (kort, kickers, charts, dots)
bruger så `text-(--domain)` / `bg-(--domain-tint)` / `stroke="var(--domain)"` og
farves automatisk korrekt uanset hvilket domæne de renderes i. Én komponent,
fire farver, nul props.

## 3. Anvendelse pr. overflade

### Navigation
- **Sidebar (`src/components/app/AppShell.tsx`)**: Domæne-items (02 Træning, 03 Kost,
  05 HRV, 06 Sind) får deres nummer tonet i domænefarven (altid synligt = wayfinding).
  Aktivt item: 2px venstre-rail i domænefarve + hvid tekst. Ikke-domæne-items
  (Dashboard, Community, Reps, Profil, Beskeder) forbliver monokrome.
- **Mobil tab-bar (`src/components/app/MobileTabBar.tsx`)**: Inaktiv = grå (som nu).
  Aktiv = domænefarve i ikon + label (i stedet for hvid). Ikke-domæne-tabs
  aktiveres fortsat med hvid.

### Domæneflader
- Side-kicker (den 11px mono uppercase linje øverst) → domænefarve
- Sub-nav (fx `HrvSubNav.tsx`): aktiv underline/indikator i domænefarve
- `pulse-dot` (globals.css) → ny variant der bruger `var(--domain)`
- Kort: forbliver monokrome surfaces — kun kicker + evt. dot farves.
  Dashboard-tiles er undtagelsen: 24×2px accent-streg øverst + domæne-kicker.

### Charts (alle egne SVG'er)
- Grid, akser, labels: monokrome som nu (`currentColor` + opacity)
- Data-blæk: `var(--domain)` — `TrendChart.tsx` (heart), vægt-grafik (food),
  readiness (heart)
- **`MentalGraph.tsx` remap** (hardcodede farver linje 71–81 fjernes):
  - Energi: `#9F8CFB` (violet) — erstatter yellow-300
  - Stress: `#5B9DF5` (= `--mind`) — erstatter sky-300
  - Fokus: `#6FE0E8` (cyan) — erstatter emerald-300
  Tre serier i samme kølige familie = grafen "tilhører" Sind-domænet, men
  serierne kan stadig skelnes. Defineres som `--mind-energy/--mind-stress/--mind-focus`.

### Dashboard (cross-domain — her betaler systemet sig)
Hver tile bærer sit domænes accent-streg + kicker. Brugeren ser på ét blik
hvilke verdener der kalder. Reps/badges: reps optjent i et domæne tintes
med domænets badge-stil (`bg-(--domain-tint)` + `text-(--domain)`).

## 4. Det forbliver monokromt
- Alle knapper (`.btn`, `.btn-primary`, `.btn-ghost`) og pills' aktive tilstand
  (hvid invertering) — farve må aldrig konkurrere med "klik her"
- `/session/[id]` (immersivt live-pas): forbliver 100 % monokromt — fokus-tilstand
- Coach-flader (`/coach/*`): 100 % monokrome i v1 — beslutning, ikke et hul (§8)
- Community, Profil, Beskeder

## 5. Status- vs. domænefarver (konflikthåndtering)

Nuværende ad-hoc brug af `red-400/green-400/blue-400` ryddes op:

| Sted | Nu | Bliver til |
|------|----|-----------|
| `SkipDaysCard.tsx` | `red-400` warning | `--danger` (status, uændret udtryk) |
| `MindCheckForm.tsx` | `red-500` fejlramme | `--danger` |
| `LogWeightCard.tsx` | `green-400` vægttab | `--food` (det ER kost-domænet — harmonisk) |
| `nutrition/page.tsx` | `blue-400` infoboks | monokrom (`--line-bright` + ikon) |
| `AudioRecorder.tsx` | `bg-red-500` REC-dot | `--danger` (konvention for optagelse) |

**Disambiguerings-regel:** Statusfarver optræder altid i en fyldt alert/badge
MED ikon og tekst. Domænefarver optræder aldrig i alerts. Rolle + kontekst
adskiller dem, selv hvor hue ligger tæt (heart vs. danger).

## 6. Tilgængelighed
- Kontrast: alle fire baser ≥ 4.5:1 på `--bg` (heart 5.7, food 8.8, body 9.3, mind 7.0)
- Farve er aldrig eneste signal — ikon + label + position følger altid med
  (kritisk for rød/orange ved protanopi og rød/grøn ved deuteranopi)
- Tints (12 %) bruges kun bag tekst i selve domænefarven, aldrig bag `--fg-dim`

## 7. Faseplan (PR-opdelt)

| Fase | Indhold | Filer (ca.) |
|------|---------|-------------|
| **1. Tokens** | globals.css: tokens + @theme + data-domain + pulse-dot-variant. Layout-attributter på 4 domæne-layouts | 5 |
| **2. Navigation** | AppShell.tsx (sidebar-rail + nummer-tint), MobileTabBar.tsx (aktiv tab-farve) | 2 |
| **3. Domæneflader** | Kickers + sub-nav + dots: HRV (HrvSubNav, InsightCard, ReadinessLadder, LifestyleLogCard, ConnectionStatus), Nutrition (DailyCheckInCard, MealCard, StreakCelebration), Train (ExerciseCard, program-side), Mind (MindTile, SessionCard, BreathingRing) | 12–14 |
| **4. Charts** | TrendChart (heart-blæk), MentalGraph (remap), vægt/readiness-grafik | 3 |
| **5. Dashboard** | Tiles med accent-streg + kicker, Reps-domæne-tints | 2–3 |
| **6. Status-oprydning + QA** | §5-tabellen + browser-verify af alle fire domæner + dashboard | 5 |

Hver fase er selvstændigt shipbar; fase 1 er forudsætning for resten.
Browser-verify-protokollen (kendt fra Søjle 4) køres pr. fase: alle fire
domæneflader + dashboard screenshotes og tjekkes for kontrast og dosering.

## 8. Lukkede beslutninger (2026-08-30)

Tom (CEO) lukkede de tre åbne punkter. De kører allerede i produktet og genåbnes ikke.

1. **Coach-flader (`/coach/*`)** får ingen domænefarver i v1. De forbliver 100 % monokrome. Det er en beslutning, ikke et hul.
2. **Dashboard-tiles** får både 24×2px accent-streg og domæne-kicker.
3. **`--info` droppes.** Info er altid monokrom (`--line-bright` + ikon). Tokenet findes ikke i `src/app/globals.css` og tilføjes ikke.
