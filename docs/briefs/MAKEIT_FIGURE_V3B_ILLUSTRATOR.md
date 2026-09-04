# MakeIt Figure v3B — illustrator brief

Custom editorial charcoal silhouette to replace the
`react-native-body-highlighter` outline currently traced by
`MakeItFigure` (`OUTLINES.male.front` in `src/lib/data/anatomy/paths.ts`).

v3A (shipped in product) lifts organ craft **on that library outline**.
v3B is the silhouette itself. Do not restyle AnatomyFigure. Do not
invent a new mapping.

**Owner:** Tom / CDO. **Mapping:** locked in `docs/MAKEIT_FIGURE.md` §1.
**Tokens:** `src/app/globals.css`. **Color principle:**
`docs/DOMAIN_COLOR_SYSTEM.md`.

---

## 1. What this is

Strength-editorial body-map. One androgynous adult, charcoal on cream
dark (`--bg` #0A0A0B). The four health domains are **organs / systems
on that person** — not four icons beside them.

When something is "off", only the matching anchor lights; the rest
stays charcoal. Color is direction, never decoration. Max ~10 % of a
surface. No large colored fills. No colored body copy.

This figure is the brand's body-map on landing (`lg:h-[36rem]`) and
the compact dashboard slot (`h-36` / `md:h-48`). It must read at both.

---

## 2. Locked mapping (do not reopen)

| Domain | Token | Hex | Anchor on the body |
|--------|-------|-----|--------------------|
| Mind | `--mind` | `#5B9DF5` | Head |
| Heart | `--heart` | `#F2545B` | Heart in the chest — person's left / viewer's right |
| Body | `--body` | `#FF9C41` | Kinetic chain / musculature (not abs — leave the gut clear) |
| Food | `--food` | `#45C487` | Digestion (stomach / intestine) as the **anchor**, plus a weak 1px halo around the whole silhouette *only when food is the focused highlight* |

Food's halo means "food affects the whole system." It is an aura, never
a filled green cloud. Teaching (all four lit) must **not** look
food-owned: ghost organ presence, no full green rim.

Coach is typography. Never a drawn person.

---

## 3. What to draw

### Silhouette

- One adult human, standing, front view, weight even.
- **Androgynous by design** — not "male minus hair" and not a
  stylized woman. No breasts as a gender cue, no beard, no makeup, no
  hair-as-gender. A body anyone on the crew can project onto.
- No face. No eyes, nose, mouth, expression. The head is a volume
  (mind-anchor), not a character.
- No clothes, no shoes, no props, no weights.
- Hands: articulated fingers, relaxed at the sides. Not mittens.
  Not splayed cartoon hands.
- Feet: standing weight, toes suggested, not wedges or blobs.
- Proportion: editorial athlete — capable, not bodybuilder, not
  fashion-thin. Strength magazine, not mascot, not medical poster.

### Four anchors designed *into* the body

The silhouette is not a blank to sticker icons onto. The four regions
must be drawable as soft interiors of this outline:

1. **Mind** — cranial volume. Clean head path. No face features that
   fight a `--mind` fill/stroke.
2. **Heart** — anatomical heart / mediastinal region, person's left
   (viewer's right). Soft organ volume, not a valentine, not an emoji.
   Readable at ~32 px tall on a 36 rem figure.
3. **Body** — kinetic chain as quiet muscle relief (shoulder girdle,
   arms, quads, calves). Abs and obliques stay clear so the gut can
   read. When all four are teaching, body is the *quietest* of the four.
4. **Food** — J-stomach (fundus person's left) + intestinal coils that
   **stay in the abdomen**. Never escape into the groin or thighs.
   Soft `--food` fill. Halo is a separate 1px outline treatment, not
   part of the organ drawing.

Leave reserved interior space for those four. Do not pack the torso
with decorative muscle striation that will turn into an orange
festival when `--body` is lit.

### Visual language

- Charcoal outline + steel fill. Match the existing token pair:
  fill `#1A1D24` (`--steel`), edge `#56554F` (`--fg-faint`).
- Stroke is a line, not a 3D bevel. No drop shadows. No grain on
  the body (landing already has page grain).
- Editorial, still, frontal. Not a pose. Not mid-rep.
- No 3D, no photo, no gradient skin, no mascot face.

---

## 4. What this is *not*

`AnatomyFigure` (`src/components/anatomy/AnatomyFigure.tsx`) stays the
**exercise muscle map**. Primary / secondary / tertiary fills, 3D
spike, male/female/front/back taxonomy — that system does not change
and must not be "fixed" by this brief.

v3B replaces only the **brand figure** outline used by `MakeItFigure`.
If a construction grid helps you, you may start from the current
viewBox (`0 0 724 1448`) so the swap is a path drop-in. You are not
required to keep the library's mitten hands or groin-heavy hips.

Do not deliver:

- a smiling character or any face
- a gendered pair (male + female) as the brand figure
- a new color system
- stickers / floating icons around the body
- a valentine heart
- a gut that reads as genitals or runs into the thigh gap
- photoreal anatomy or medical textbook rendering

---

## 5. Deliverables

All paths in a single coordinate system. Prefer viewBox `0 0 724 1448`
(current) so engineering can swap `OUTLINES.male.front` without a
layout rewrite. If you must change the viewBox, say so and supply
the new box + a scale note.

1. **Master SVG** (production)
   - `makeit-figure-v3b.svg`
   - Outline as one compound path (or a clearly named `outline` group).
   - Separate named groups or paths: `mind` (head), `heart` (organ
     layers), `food` (stomach + coils), `body` (kinetic-chain parts).
   - No embedded raster. No undocumented clip masks.
   - Tokens, not hardcoded brand hex on the organ fills — or a
     clearly labeled `<style>` that maps to `--mind/--heart/--body/--food`.
2. **Hi-res still** (art direction / review)
   - `makeit-figure-v3b.png` (or PDF) at least 2000 px on the long edge,
     transparent or on `#0A0A0B`.
   - Show the **teaching state**: all four anchors present as a
     balanced read — organs soft, body ghost, no domain owns the
     silhouette via glow.
3. **Focus stills** (four frames, same crop)
   - One still per domain with that domain dominant, others charcoal.
   - Food-focus still includes the 1px halo + soft glow recipe from
     `docs/MAKEIT_FIGURE.md` §2 (aura, not a filled cloud).
4. **Construction notes** (one page)
   - Where the four anchors sit (x/y in the viewBox).
   - Abdomen band: gut Y must stay above the groin. Call the number.
   - Hand and foot articulation notes (so we do not regress to mittens).

Optional but useful: a 24 px-ready reduction of the four organ
fragments if they improve `DomainMark`. Not required — marks already
exist.

---

## 6. Acceptance

CDO signs off when all of the following are true:

- [ ] Androgynous at a glance. A reviewer does not say "that's a man"
      or "that's a woman."
- [ ] No face. Head still reads as the mind anchor when `--mind` is lit.
- [ ] Heart is an organ on the person's left, readable at landing size,
      not a valentine.
- [ ] Gut is a J-stomach + coils inside the abdomen. No groin escape.
- [ ] Hands have fingers; feet have standing weight. Not library mittens.
- [ ] Teaching still: one balanced picture. Body quietest. No green
      rim owning the outline.
- [ ] Food-focus still: organ + 1px halo + soft glow. Aura, not a cloud.
- [ ] Same figure works at `lg:h-[36rem]` and at `h-36`.
- [ ] Strength-editorial, not mascot, not medical.
- [ ] AnatomyFigure / exercise muscle map is untouched.
- [ ] Mapping table in §2 is unchanged.

---

## 7. How this lands in the product

Engineering will:

- keep `MakeItFigure` as the only brand body-map component
- replace `OUTLINES.male.front` (and only that consumer path) with the
  delivered outline
- keep v3A teaching / focus dosage (`data-mode`, food aura rules)
- leave `AnatomyFigure` + `PARTS` on exercise surfaces

Until v3B assets are accepted, v3A stays on the highlighter outline.

---

## 8. References (in repo)

- `docs/MAKEIT_FIGURE.md` — mapping, dosage, v3A craft, later phases
- `docs/DOMAIN_COLOR_SYSTEM.md` — color is direction
- `src/components/brand/MakeItFigure.tsx` — current implementation
- `src/components/marketing/MarketingBodyMap.tsx` — landing size + hover
- `src/app/globals.css` — tokens (`--steel`, `--fg-faint`, domain hues)
- `src/components/anatomy/AnatomyFigure.tsx` — **do not replace**
