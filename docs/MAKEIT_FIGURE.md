# MakeIt-figuren — brandets kropskort

> Status: Vedtaget 2026-09-01 (Tom/CDO). Mappingen er låst. Ikke et UDKAST.
> Craft: v3A.2 (2026-09-03) — glyf-sprog: anatomisk hjerte + J-mave.
>   v3A.1 var dosering/stater; Tom: «fersken» / «ballon i snor».
>   v3B = custom editorial silhuet. Illustratorens kilde er det danske
>   one-pager `docs/briefs/MAKEIT_FIGURE_V3B_ILLUSTRATOR.md` — ikke den
>   gamle engelske engineering-brief.

> Tokens: `src/app/globals.css`. Farveprincip: `docs/DOMAIN_COLOR_SYSTEM.md`.

Strength editorial bliver. Basen er monokrom. Farve er retning — max ~10 %
af en flade, aldrig store farvede fyld, aldrig farvet brødtekst.

En charcoal-omridsfigur af et menneske (androgyn, uden ansigt, cream/charcoal
som det eksisterende AnatomyFigure-sprog) er brandets kropskort. Når noget
er "off", tændes kun det relevante anker; resten bliver charcoal.

---

## 1. Mapping (låst)

Figuren er ét menneske. De fire domæner er organer/systemer på det menneske
— ikke fire ikoner ved siden af hinanden.

| Domæne | Navn | Token | Hex (`globals.css`) | Anker på figuren |
|--------|------|-------|---------------------|------------------|
| Sind | Mind | `--mind` | `#5B9DF5` | Hovedet |
| Hjerte | Heart | `--heart` | `#F2545B` | Hjertet i brystet |
| Krop | Body | `--body` | `#FF9C41` | Den kinetiske kæde / muskulaturen |
| Kost | Food | `--food` | `#45C487` | Fordøjelsen (mave/tarm) som ANKER, plus en svag 1px halo omkring hele silhuetten: mad påvirker hele systemet |

Tints og linjer følger det eksisterende mønster i `globals.css`:

```
--food-tint  = color-mix(in oklab, var(--food) 12%, transparent)
--food-line  = color-mix(in oklab, var(--food) 32%, transparent)
```

samme for `--heart`, `--body`, `--mind`. Flader scopes med `data-domain`
(`heart` | `food` | `body` | `mind`) så `--domain` / `--domain-tint` /
`--domain-line` resolver automatisk.

Coach er typografi. Aldrig en tegnet person. Coach-flader (`/coach/*`)
forbliver 100 % monokrome i v1 (`docs/DOMAIN_COLOR_SYSTEM.md` §8).

---

## 2. Dosering + craft v3A

Farve på figuren er anker + (når det er rigtigt) halo. Ikke fyld. Ikke sky.

v3A løfter håndværket **på det eksisterende omrids** (`OUTLINES.male.front`
fra react-native-body-highlighter). Omrids-pathen røres ikke. Custom
silhuet er v3B.

To visuelle modi på `MakeItFigure` (`data-mode`, `data-craft="v3a.2"`):

| Mode | Hvornår | Læs |
|------|---------|-----|
| `teaching` | `highlightedDomains` har alle fire | Ét balanceret billede. Organer som bløde ankre. Krop er den stilleeste (ghost). Ingen domæne ejer silhuetten via glow. |
| `focus` | ét (eller få) aktive domæner — typisk hover | Det aktive domæne er dominant. De andre charcoal/ghost. |

Dashboard (I dag) og landing-rest bruger `teaching`. Landing-hover
(`MarketingBodyMap`) skifter til `focus` på ét domæne.

### Halo + glow (kun kost, og kun i food-focus)

To lag omkring `OUTLINES.male.front`. Aldrig fill på silhuetten.
Aldrig en fyldt grøn sky. Skal læses som aura på `--bg` (#0A0A0B).

**Fuld aura** (`data-food-aura="full"`) kun når food er tændt **og**
figuren ikke er i teaching. Teaching skal ikke se food-ejet ud.

1. **Skarp 1px-halo** (`.makeit-figure-halo`)
   - `fill: none`
   - `stroke: var(--food)`
   - `stroke-width: 1`
   - `opacity: 0.35` (vindue 0.28–0.35)
   - `vector-effect: non-scaling-stroke` så 1px forbliver 1px i alle størrelser

2. **Blød ydre glow** (`.makeit-figure-halo-glow`)
   - anden kopi af samme omrids
   - `fill: none`
   - `stroke: var(--food)`
   - `stroke-width: 8` med `vector-effect: non-scaling-stroke` (8 css-px
     i alle størrelser — synlig gennem landing-grain på `--bg` #0A0A0B)
   - `opacity: 0.12` (vindue 0.08–0.12)
   - `filter: feGaussianBlur` med `stdDeviation="12"` (user-units) på
     glow-laget — ikke på den skarpe 1px-streg
   - to lag, ingen fill: aura, ikke en fyldt grøn sky

**Teaching (alle fire):** ingen halo, ingen glow. Fordøjelsen er
til stede som ghost-organ (`data-food-aura="ghost"`, fill ≈ 0.08,
streg ≈ 0.55) — ikke en grøn rand om hele kroppen.

### Organ-craft (v3A.2 glyffer)

v3A.1 ændrede dosering, ikke glyf-sproget. Tom (CEO): hjertet læste
som en fersken, mave-tarm som en ballon i snor. v3A.2 tegner organerne
om på samme omrids.

- **Hjerte:** anatomisk knytnæve — bred base, spids apex ned-højre
  (personens venstre / seers højre). To kar-stubs (aorta + pulmonal),
  ikke én stilk. Septum/kammer som streg, ikke fill-sky. Stroke +
  lav `fillOpacity` i `--heart`. `data-heart="organ"`. Lag: under,
  volume, chamber, sulcus, aorta, pulm. Thorax: ikke hals, ikke abs.
- **Fordøjelse:** åben J-mave (`data-gut="stomach"`) + øsofagus
  (`data-gut="esophagus"`) + fundus-volumen (`data-gut="fundus"`) +
  tre tarmslynger med bredde (`data-gut="coil"`) **i abdomen**.
  Alle Y ≤ `GUT_Y_MAX` (650). Ikke en cirkel med hale. Soft `--food`
  fill kun på fundus (0.14 i focus, 0.08 i teaching).
- **Sind:** samme AnatomyFigure-hovedpath. Focus = fill 0.18 / streg
  1.45. Teaching = blødere (fill 0.10 / streg 1.2 / opacity 0.55) så
  den blå kant ikke vinder hele figuren.
- **Krop:** AnatomyFigure-`PARTS` (kinetisk kæde). Abs/obliques holdes
  fri. Ingen stick-man-overlay. Focus = stille relief (fill 0.10,
  blød kant 0.20) — ikke dekorative orange striber. Teaching = den
  stilleeste af de fire (fill 0.055 / stroke 0.12), ghost, ikke
  orange festival.
- **Hænder/fødder:** v3A rører ikke omrids-pathen. Mitten-hænder og
  flade fødder er et silhuet-problem og hører til v3B (custom
  editorial charcoal). Ingen finger-overrides oven på library-omridset
  — det bliver støj, ikke craft.
- Slukket anker: charcoal med synlig tilstedeværelse (opacity ≈ 0.5 /
  fill 0.04) — ikke usynligt.

**Ankre når de er tændt:**

- kun det matchende område får domænefarven
- fill, hvis den bruges, er lav opacity på selve organet (mave, hjerte)
  eller muskelpartiet (krop) — ikke på torsoen som flade, ikke på
  baggrunden
- resten af omridset forbliver charcoal via tokens: fill `var(--steel)`,
  kant `var(--fg-faint)` (`src/app/globals.css`)

**Må ikke:**

- store farvede flader (organ-volumen-gradient på hjertet er undtagelsen
  — den er anker, ikke flade)
- farvet brødtekst
- 3D, foto, maskot-ansigt
- en anden krop end AnatomyFigure-silhuetten i v3A
- fuld food-halo i teaching

---

## 3. Silhuetten (AnatomyFigure er kilden)

Hypotesen holdt: `src/components/anatomy/AnatomyFigure.tsx` er det rigtige
omrids at forlænge — ikke en ny krop.

`MakeItFigure` genbruger `OUTLINES.male.front` + `VIEWBOX.male.front`
(`0 0 724 1448`) fra `src/lib/data/anatomy/paths.ts`. Kant og fyld er
tokens (`--fg-faint`, `--steel`), ikke hardcoded hex. Female-omridset
droppes her, fordi det bærer hår og dermed køn; brandfiguren er androgyn
og uden ansigt.

AnatomyFigure selv (primary/secondary/tertiary, 3D-spike) bliver på
øvelsesfladerne. Brandfiguren er samme krop, anden opgave.

Sind-ankeret sporer `PARTS.male.front` head-path. Hjerte og fordøjelse
findes ikke i muscle-taxonomien og tegnes som organ-glyffer i samme
viewBox. Krop tænder AnatomyFigure-muskelpathene (kinetisk kæde) som
lav-opacity fill — ikke syv streg-segmenter ovenpå silhuetten. Abs og
obliques holdes fri, så food-ankeret (mave/tarm) kan læses.

Dashboard (I dag) viser undervisningstilstanden: alle fire ankre tændt
som ét balanceret read (`data-mode="teaching"`). Organer som bløde
ankre, krop ghost, ingen food-halo. Det er fase 1, ikke Today-as-figure
(kun det der er off). Landing (`MarketingBodyMap` `lg:h-[36rem]`) og
dashboard (`BodyMap` `h-36 md:h-48`) arver v3A automatisk via
`MakeItFigure` — størrelsesklasserne røres ikke. Hover på landing
skifter til `focus` på ét domæne (food-hover = fuld 1px+glow).

---

## 4. Fase 1 (denne PR)

Shipbart nu:

1. Denne spec.
2. `DomainMark` — custom 24px streg-SVG'er for body/food/mind/heart.
   Samme stregsprog som tab-ikonerne (`strokeWidth` 1.6, round caps,
   `currentColor`). Ikke generiske Lucide-håndvægte/skåle/pærer.
3. `MakeItFigure` — charcoal-omrids + `highlightedDomains`.
4. Figuren synlig ét sted: dashboard/today-headeren som kompakt
   editorial kropskort over de eksisterende tiles, med alle fire ankre
   tændt (undervisning). Tiles og data bliver.
5. Tests for `DomainMark` og `MakeItFigure` (render + `data-domain` /
   domain-class).

Ingen Today-rebuild. Ingen HRV-graf-omtegning. Ingen crew-silhuetter.
Ingen App Store-screenshot-recapture.

---

## 5. Senere (ikke denne PR)

Disse faser er låst som retning og åbnes først når CDO siger til.
De er **senere**, ikke huller i fase 1.

| Fase | Retning |
|------|---------|
| Today-as-figure | Today *er* figuren. Ankre tændes ud fra det der er off i dag. |
| HRV som puls | HRV tegnes som puls langs brystet — ikke som et nyt chart-sprog. |
| Check-in som hoved-state | Mind-check lyser/ændrer hoved-ankeret. |
| Progress som korn | Fremdrift er grain-density på omridset, ikke progress-bars i farve. |
| Crew som overlap | Crew er overlappende silhuetter — samme krop, flere omrids. |
| Coach | Bliver type. Aldrig en tegnet person. |

---

## 6. Implementering

| Fil | Rolle |
|-----|--------|
| `src/components/brand/DomainMark.tsx` | 24px streg-mærke. `domain` prop. `data-domain` + `domain-mark domain-mark--{domain}`. |
| `src/components/brand/MakeItFigure.tsx` | Silhuet. `highlightedDomains?: Domain[]`. Teaching = balanceret ghost. Food-focus = gut + 1px halo + blød glow (§2). |
| `src/components/brand/BodyMap.tsx` | Kompakt editorial slot: figur + fire DomainMark-kickers. |
| `src/components/app/MobileTabBar.tsx` | Train/food/mind bruger DomainMark. Øvrige tabs urørt. |
| Dashboard `HrvChip` | Heart-fladen får DomainMark. |

`data-domain` er nøglemønstret (`docs/DOMAIN_COLOR_SYSTEM.md` §2).
Kickers og marks arver `--domain` fra nærmeste scope og farves med
`text-domain` / `stroke="var(--domain)"` — én komponent, fire farver.
