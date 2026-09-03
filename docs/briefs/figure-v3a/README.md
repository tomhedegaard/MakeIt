# MakeIt Figure v3A.2 — craft stills

Landing-size (`lg:h-[36rem]`) and torso crops of `MakeItFigure` after
the v3A.2 **glyph** pass. Outline is still `OUTLINES.male.front`
(v3B is the custom silhouette).

## What changed vs v3A.1

v3A.1 changed dosage and teaching/focus states. The glyphs were still
a round blob + stem and a circle + tail. Tom: *«Hjertet ligner en
fersken, og mave-tarm-system en underlig ballon i snor.»*

v3A.2 redraws only those paths:

- **Heart:** fist-like organ — wide base, pointed apex down-right
  (person’s left), aorta + pulmonary stubs (two vessels, not a stem),
  septum as a line. Stroke + low fill. No peach / valentine.
- **Gut:** open J-stomach (fundus under left ribs, pylorus hooks to
  midline) + esophagus + horizontal bowel loops in the abdomen.
  Not a balloon on a string. Teaching still has no full-body green halo.

If a non-designer still cannot say «heart» / «stomach» at this size,
the ceiling is the library silhouette + editorial line-weight — see
`docs/briefs/MAKEIT_FIGURE_V3B_ILLUSTRATOR.md`. Do not invent a third
body in code.

| File | State |
|------|--------|
| `figure_v3a_craft_states.png` | Teaching + food-focus + heart/body/mind/idle |
| `figure_v3a_torso-teaching.png` | Torso crop, all four teaching |
| `figure_v3a_teaching.png` | All four, no food halo |
| `figure_v3a_food-focus.png` | Food only, 1px + glow |
| `figure_v3a_heart-focus.png` | Heart only |

Raw (this branch):

`https://raw.githubusercontent.com/tomhedegaard/MakeIt/cursor/makeit-figure-v3a-craft-f64d/docs/briefs/figure-v3a/<file>`
