# MakeIt-figur v3B — handoff til ekstern design-AI

Paste blokken under **PROMPT (paste)** til design-agenten.
Blokken under **LEVERANCE TIL ENGINEERING** er accept-kriteriet for hvad vi skal have retur.

---

## Kontekst (til dig der pastes)

MakeIt er en dansk strength-editorial coaching-app (træning, kost, hjerte, sind).
Brandets kropskort er én androgyn figur med fire systemer *på* kroppen.
Intern draft (PR #78) har en første custom SVG-silhuet — den er bedre end library-paper-doll, men **ikke** illustrator-grade (hænder/fødder bløde, skulderbredde lidt maskulin).
Din opgave: levere den endelige editorial-figur så engineering kan droppe den ind i `MakeItFigure` uden at tegne om.

Farver / tokens (låst):
- Baggrund `#0A0A0B`, krop-fyld `#1A1D24`, kant `#56554F`, cream `#F5F2EC` kun som streg
- Sind `#5B9DF5` · Hjerte `#F2545B` · Krop `#FF9C41` · Kost `#45C487`
- Farve er retning (~10 %). Aldrig farvet hud. Aldrig store farveflader.

---

## PROMPT (paste)

```
ROLE
You are a senior editorial illustrator / design AI for MakeIt, a Danish strength-coaching product.
You design ONE brand body-map figure that engineering will implement as SVG in a React/Next app.
Aesthetic over medical accuracy. Simplicity over detail. Flat vector only.

GOAL
Deliver a final custom editorial human silhouette with four domain systems drawn INTO the body
(not stickers beside it), ready for production handoff.

AESTHETIC (strength editorial)
- Background void: #0A0A0B
- Body fill: #1A1D24
- Outline / unlit interior hairlines: #56554F
- Cream #F5F2EC only as line accent, never as skin fill
- Thin constant stroke (1–1.5px feel). No bevel, drop shadow, paper grain on the body, 3D extrusion, photoreal skin, gradient skin
- Quiet muscle relief as hairline interior — athlete readable, not a coloring book
- Still, frontal, even weight. Not a pose. Not mid-rep.

THE PERSON
- Androgynous adult, standing front view
- No face (no eyes, nose, mouth, expression)
- No clothes, shoes, props, weights, logos, UI chrome
- Hands with fingers (not mittens). Feet with standing weight (not wedges)
- Capable editorial athlete — not bodybuilder, not fashion-thin
- Avoid masculine shoulder exaggeration; keep proportions balanced

LOCKED MAPPING (must all be present)
1. MIND = cranial / upper head volume — #5B9DF5
2. HEART = anatomical organ in thorax, person's left / viewer's right — #F2545B
   - Asymmetric fist: wide base, pointed apex angled down to person's left
   - Two vessel stubs (aorta + pulmonary). One septum hairline
   - NOT valentine / peach / emoji / fruit-stem
3. BODY = kinetic chain only (neck, traps, delts, chest, arms, quads, calves) — #FF9C41
   - Abs and obliques stay empty / charcoal
   - In teaching state, body is the quietest of the four
4. FOOD = J-stomach + bowel loops INSIDE the abdomen — #45C487
   - Fundus under left ribs (viewer's right), body, antrum to midline
   - Short esophagus into stomach
   - 2–3 horizontal coils with width — NEVER hanging into groin/crotch/thighs
   - NOT balloon-on-a-string / circle-with-tail
5. HALO = 1px #45C487 aura around WHOLE silhouette — ONLY in food-focus state
   - Aura / dosage, never a filled green cloud

FIVE FRAMES (same figure, same crop, same viewBox)
A. Teaching — all four soft; body quietest; NO halo
B. Focus mind — only head lit; rest charcoal-ghost
C. Focus heart — only anatomical heart lit
D. Focus body — only kinetic chain lit (still quiet); abs empty
E. Focus food — stomach+coils lit + 1px green halo around whole silhouette

HARD REJECTS
Valentine/peach heart · balloon-on-a-string gut · organs as stickers outside the body · face/mascot · paper-doll / gym heatmap · photoreal anatomy · clothes · gendered pair (man+woman) · pastel / sparkle AI look · 3D extrusion of the same flat paths

COMPOSITION
Full figure, centered, generous dark margin. Portrait.
Must read at ~36rem (landing) AND ~144px (dashboard).
No caption, legend, arrows, floating icons, or typography in the frames.

SUCCESS TEST
A non-designer says: "head, heart, muscles, stomach."
They never say: peach, balloon, sticker, paper doll, mascot, textbook, or gym heatmap.
```

---

## LEVERANCE TIL ENGINEERING (hvad vi skal have retur)

Vi implementerer i `MakeItFigure` (React + SVG). Agenten skal levere filer — ikke kun billeder.

### 1. Master SVG (obligatorisk)
- Én fil: `makeit-figure-v3b.svg`
- `viewBox="0 0 724 1448"` (eller dokumentér andet — så skalerer vi tokens)
- Ren SVG 1.1 / 2.0, ingen embedded bitmap, ingen filter-effekter der kræver raster
- Strokes i `currentColor` eller eksplicit hex — ingen hardcodede UI-farver udenfor de fire domæner + charcoal
- **Named groups** (id eller data-name, stabile):

| Gruppe | Indhold |
|--------|---------|
| `outline` | Silhuet + unlit interior hairlines (charcoal) |
| `mind` | Cranial fill/stroke |
| `heart` | Anatomisk hjerte (+ kar + septum) |
| `body` | Kinetic-chain relief paths (kan være flere `<path>` under gruppen) |
| `food` | Esophagus + J-stomach + coils |
| `halo` | 1px silhouette aura (kun brugt i food-focus) |

Valgfrit men ønsket undergrupper:
- `heart/aorta`, `heart/pulm`, `heart/chamber`
- `food/esophagus`, `food/stomach`, `food/coils`

### 2. State-ready SVG eller layer-noter
Enten:
- **A)** Fem separate SVG’er (`teaching.svg`, `focus-mind.svg`, …) der kun tænder relevante grupper, **eller**
- **B)** Ét master SVG + kort JSON der siger hvilke grupper der er `lit` / `ghost` / `off` pr. state:

```json
{
  "teaching": { "mind": "soft", "heart": "soft", "body": "ghost", "food": "soft", "halo": "off" },
  "focus-mind": { "mind": "lit", "heart": "ghost", "body": "ghost", "food": "ghost", "halo": "off" },
  "focus-heart": { "mind": "ghost", "heart": "lit", "body": "ghost", "food": "ghost", "halo": "off" },
  "focus-body": { "mind": "ghost", "heart": "ghost", "body": "lit", "food": "ghost", "halo": "off" },
  "focus-food": { "mind": "ghost", "heart": "ghost", "body": "ghost", "food": "lit", "halo": "on" }
}
```

### 3. Preview PNG (5 frames)
- `teaching.png`, `focus-mind.png`, `focus-heart.png`, `focus-body.png`, `focus-food.png`
- Mindst 2000px på den lange kant
- På `#0A0A0B` **eller** transparent baggrund
- Samme crop som SVG

### 4. Anchor note (én side / JSON)
Koordinater i viewBox-units for:
- Hjerte centrum (x,y)
- Mave/fundus centrum (x,y)
- Bekræftelse: laveste tarm-Y er **over** skridt/groin
- Anbefalet stroke-width ved 724×1448

### 5. DomainMark sync (valgfrit men værdifuldt)
Små standalone SVG’er (24–32px viewBox) for ikonerne:
- `mark-mind.svg`, `mark-heart.svg`, `mark-body.svg`, `mark-food.svg`
Samme organ-sprog som figuren (særligt heart + food), så UI-ikoner matcher kroppens organer.

### 6. Hvad I IKKE skal sende
- PSD/AI med 40 lag uden eksport
- Kun Midjourney-PNG uden SVG-paths
- 3D mesh / GLB
- Separate “man” og “woman” filer
- Farvede hudtoner eller tøjvarianter

### 7. Accept (CDO)
- Filernes groups matcher tabellen ovenfor
- Alle fem states findes
- Hjerte læses ikke som fersken/valentine
- Mave/tarm læses ikke som ballon-på-snor og rammer ikke skridtet
- Hænder har fingre; fødder har vægt
- PNG’erne består success-testen

Når det er godkendt: engineering dropper paths ind i `src/components/brand/figure-v3b/`, sætter `data-craft="v3b"`, og synkroniserer `DomainMark` hvis mark-SVG’er følger med.
