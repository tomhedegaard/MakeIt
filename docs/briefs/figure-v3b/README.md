# MakeIt-figur v3B — craft stills

Produktionstills fra den rigtige `MakeItFigure` (ikke AI-koncepter).
Silhuetten er `V3B_OUTLINE` i `src/components/brand/figure-v3b/`.
`AnatomyFigure` / `PARTS` røres ikke. Mappingen er låst i
`docs/MAKEIT_FIGURE.md` §1.

Illustratorens kilde: `docs/briefs/MAKEIT_FIGURE_V3B_ILLUSTRATOR.md`.
AI-koncepterne (`*-concept.png`) er **retning, ikke produktion**.

## Toggle

`MakeItFigure` defaulter til v3B (`data-craft="v3b"`). Landing
(`MarketingBodyMap`) og dashboard (`BodyMap`) arver det.

Sammenlign med library-omridset:

```tsx
<MakeItFigure variant="v3a.2" highlightedDomains={DOMAINS} />
```

Ingen env-flag. Prop + `data-craft` er nok.

## Stills (fra komponenten)

| Fil | Frame |
|-----|--------|
| `teaching.png` | A Teaching — alle fire bløde, ingen grøn halo |
| `heart-focus.png` | C Fokus Hjerte — kun anatomisk hjerte |
| `food-focus.png` | E Fokus Kost — J-mave + slynger + 1px grøn halo |

Genopfrisk:

```
node --import tsx scripts/capture-figure-v3b.mjs
```

## Organ-noter (x/y i viewBox `0 0 724 1448`)

| Anker | Placering |
|-------|-----------|
| Sind | Hoved-volumen, centrum ≈ (362, 216) |
| Hjerte | Thorax, personens venstre / seers højre. Volumen 362–436 × 332–456 |
| Krop | AnatomyFigure `PARTS` (kinetisk kæde), clip’et til v3B-omridset. Abs fri |
| Kost | J-mave + slynger i abdomen. Alle gut-Y ≤ 650. Skridt ≈ 754 |

## Resterende huller vs briefen

Første hand-authored craft-pass. Ikke illustrator-final.

- **Hænder:** fire fingre + tommelfinger, men dalene er stadig bløde —
  mitten-risiko ved dashboard-størrelse (~144px).
- **Fødder:** hæl + sål + tå-hints, ikke kiler — men tæerne læses
  stadig som én klump på afstand.
- **Kønslæsning:** androgyn editorial athlete, men skulderbredden
  følger library-envelope (så PARTS sidder). Kan stadig læses lidt
  maskulint.
- **Torso:** talje er der, men subtil. Ingen abs i omridset.
- **Arme:** tyndere end library-highlighteren; kinetisk kæde clip’es
  ind, så PARTS ikke løber ud.

Næste pass: illustrator-master med skarpere finger-dale og mere
vægt i fødderne — samme viewBox, samme organ-xy.
