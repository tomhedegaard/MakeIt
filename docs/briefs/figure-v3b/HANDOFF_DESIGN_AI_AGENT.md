# MakeIt-figur v3B — handoff til ekstern design-AI

Kilde til sandhed for den **færdige custom editorial silhuet**. Erstatter
`OUTLINES.male.front` i `MakeItFigure`. `AnatomyFigure` (øvelsesflader)
røres ikke. Mappingen er låst i `docs/MAKEIT_FIGURE.md` §1.

- Illustrator one-pager (menneske): `docs/briefs/MAKEIT_FIGURE_V3B_ILLUSTRATOR.md`
- Concept stills (retning, ikke produktion): `docs/briefs/figure-v3b/`
- Tokens: `src/app/globals.css`
- Implementering: `src/components/brand/MakeItFigure.tsx` — **accepter
  ikke** en v3B-gren der tvinger `data-craft="v3b"` før CDO siger til.

---

## Sådan bruges filen

1. Kopiér **hele** den engelske prompt-blok nedenfor ind i den eksterne
   design-AI (Midjourney/Flux/Illustrator-agent — hvad I bruger).
2. Returnér kun de engineering-leverancer i §Accept. PNG-only afvises.
3. Engineering implementerer master-SVG’en som navngivne grupper i
   `MakeItFigure`. Ingen ny krop ved siden af. Ingen foto-maske.

---

## PASTE THIS INTO THE DESIGN AI

```
ROLE
You are the finishing illustrator for MakeIt, a Danish strength-editorial
coaching product. Produce the FINAL custom body-map silhouette that
replaces a library outline. This is brand craft, not a concept sketch.

GOAL
One androgynous adult human, front view, even weight. Four body systems
live ON the body — not as icons beside it. The figure must read at
landing size (~36rem) AND at a compact dashboard slot (~144px).

AESTHETIC — STRENGTH EDITORIAL
- Background: #0A0A0B
- Body fill: #1A1D24
- Outline stroke: #56554F
- Flat editorial vector. Strength magazine. Not a medical poster.
  Not a mascot. Not 3D. Not photography. Not a paper doll.
- Thin constant line weight. No drop shadow, bevel, glow-sky, or grain
  on the body itself.
- Colour is direction, never decoration. Max ~10% of the surface.
  Colour appears only as thin organ stroke + very soft organ fill.

DOMAIN COLOURS (tokens — do not invent others)
- Mind  #5B9DF5  — upper head volume
- Heart #F2545B  — anatomical heart (person's left / viewer's right)
- Body  #FF9C41  — kinetic chain (shoulder, arms, thighs, calves)
- Food  #45C487  — J-stomach + bowel coils IN the abdomen

LOCKED MAPPING
- mind  = the head. Faceless (no eyes, nose, mouth).
- heart = anatomical organ. Wide base, pointed apex down toward the
  person's left. TWO vessel stubs (aorta + pulmonary). Not a peach.
  Not a valentine / emoji heart. Not a single stem.
- body  = kinetic chain / musculature. NOT abs, NOT obliques, NOT a
  gym heatmap, NOT decorative orange stripes.
- food  = open J-stomach + esophagus + fundus + coiled gut in the
  abdomen. Not a balloon on a string. Not a circle with a tail.
  Gut Y stays ABOVE the groin.
- halo  = 1px green (#45C487) aura around the FULL silhouette ONLY
  in the food-focus frame. Never a filled green cloud. Never in
  teaching. Optional soft outer glow is aura, not fill.

THE PERSON
- Androgynous adult, standing front, even stance
- No face, no hair that genders the figure, no clothes, shoes, props,
  or weights
- Hands with fingers (not mittens). Feet with weight (not wedges)
- Athletic editorial — not bodybuilder, not fashion-thin

FIVE FRAMES — same figure, same crop, same viewBox
A Teaching        — all four organs soft. Body is the quietest.
                    NO green halo.
B Focus Mind      — only the head in #5B9DF5. Rest charcoal-ghost.
C Focus Heart     — only the anatomical heart. Rest charcoal-ghost.
D Focus Body      — only the kinetic chain, quiet. Abs empty.
E Focus Food      — J-stomach + coils + 1px green halo around the
                    whole silhouette (aura, not a filled sky).
                    Halo ONLY here.

HARD REJECTS — do not produce, do not iterate toward
- Valentine / emoji heart
- Peach-shaped heart
- Balloon-on-a-string stomach
- Gut sitting in the groin / crotch
- Stickers or icons pasted ON TOP of the body
- Face, mascot, smile, eyes
- Paper-doll / gym-heatmap / muscle-coloring-book
- Photoreal anatomy, 3D, CGI, film grain on the body
- Clothes, shoes, props, weights
- Gender pair (man + woman)
- Midjourney / Flux PNG as the only deliverable
- A second body next to the silhouette
- Colour on buttons, large fills, or body-text areas
- Green halo in teaching or on non-food frames

ENGINEERING DELIVERABLES (required — PNG-only is a fail)
1. Master SVG, viewBox preferably 0 0 724 1448 (matches current
   MakeItFigure / AnatomyFigure male.front). Crop must match.
2. Named groups exactly: outline, mind, heart, body, food, halo.
   Paths inside those groups — no unexplained wrappers.
3. Five states, either:
   - five separate SVGs (teaching, focus-mind, focus-heart,
     focus-body, focus-food), OR
   - one master SVG + a small JSON that lists each group's
     lit / ghost / off values per state.
4. Five PNG proofs (A–E), ≥2000px on the long edge, on #0A0A0B
   or transparent.
5. One-line anchor note: heart x/y, stomach x/y, and confirmation
   that gut Y stays above the groin.
6. Optional: 24px DomainMark SVGs for mind / heart / body / food
   in the same stroke language (strokeWidth ~1.6, round caps,
   currentColor). Same organ language as the figure, not Lucide
   dumbbells / bowls / lightbulbs.

DO NOT ACCEPT
A folder of Midjourney PNGs without the master SVG and named groups.
We implement this in code. Raster-only is unused.
```

---

## Accept — engineering (MakeItFigure)

En leverance er **færdig** kun når alt nedenfor er sandt. CDO / CTO
afviser ellers.

| Krav | Pass |
|------|------|
| Master SVG, viewBox helst `0 0 724 1448` | Ja |
| Navngivne grupper `outline` / `mind` / `heart` / `body` / `food` / `halo` | Ja |
| Fem states (separate SVG’er **eller** master + JSON med lit/ghost/off) | Ja |
| Fem PNG ≥2000px (teaching + fire fokus) | Ja |
| Anker-note: hjerte xy, mave xy, tarm-Y over skridtet | Ja |
| DomainMark-SVG’er (valgfrit, samme stregsprog) | Hvis med |
| **Ikke** Midjourney-PNG-only | Obligatorisk |

### Visuel accept (ikke-designer)

En person uden designbaggrund siger «hoved, hjerte, muskler, mave».
De siger aldrig «fersken», «ballon», «sticker», «valentine» eller
«papirdoll».

### Kode-accept (når v3B åbnes)

- Én silhuet erstatter `OUTLINES.male.front` i `MakeItFigure`.
- `AnatomyFigure` urørt.
- Teaching: alle fire bløde, krop stilleest, **ingen** halo.
- Food-focus: J-mave + slynger + 1px `--food` halo (`fill: none`).
  Aldrig fyldt grøn sky. Aldrig halo i teaching.
- Hjerte: anatomisk, to kar, personens venstre / seers højre.
- Krop: kinetisk kæde. Abs/obliques fri så food kan læses.
- Tokens, ikke hardcoded hex i komponenten (`--steel`, `--fg-faint`,
  `--mind` / `--heart` / `--body` / `--food`).
- Ingen ny `MakeItFigure` der *kræver* v3B før CDO merger silhuetten.

### Relaterede filer

| Fil | Rolle |
|-----|--------|
| `docs/MAKEIT_FIGURE.md` | Låst mapping + v3A craft |
| `docs/briefs/MAKEIT_FIGURE_V3B_ILLUSTRATOR.md` | Kort opdrag til menneske-illustrator |
| `docs/briefs/figure-v3b/README.md` | Concept stills (retning) |
| `src/components/brand/MakeItFigure.tsx` | Nuværende v3A.2 implementation |
| `src/app/globals.css` | Tokens |
