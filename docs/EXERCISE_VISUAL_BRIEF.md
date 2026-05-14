# MakeIt // Exercise visual brief

For 3D illustrators / motion designers producing the demo loops that
plug into `/train/exercises/[slug]` via `exercises.demo_asset_url`.

## What we need

One 3-4 second looping demo per exercise, in MakeIt's visual language.
Total target: 20 exercises in v1 (see [`supabase/seed-exercises.sql`](../supabase/seed-exercises.sql)).

## Style anchor

Reference: Caliber / Hevy / MuscleWiki — flat-shaded, stylized,
non-photorealistic. Distinctive enough that a member would recognize
"that's a MakeIt asset" from across a gym.

- One androgynous-leaning lifter character (we can also produce a
  male/female variant later, but v1 ships one figure).
- Brand palette: charcoal silhouette (#1a1a1c), edge stroke (#3a3a3e),
  brand cream (#F5F2EC), warm amber accent (#C97B3E).
- No background. Transparent.
- Camera angle locked: side-profile or 3/4 — same for every lift.

## File spec

- Format: **WebM (VP9)** + **MP4 (H.264)** fallback
- Resolution: 720×1280 (portrait, 9:16) — matches our portrait figure
- Frame rate: 30 fps
- Duration: 3-4 sec total (one full rep cycle)
- Loop: seamless — last frame transitions cleanly to first
- File size: target < 400 KB per loop (we host 20+ on a tiered plan)
- Audio: none

## Per-exercise deliverables

For each of the 20 exercises in [`seed-exercises.sql`](../supabase/seed-exercises.sql),
deliver:

1. **`{slug}.webm`** + **`{slug}.mp4`** — the loop
2. **`{slug}-poster.jpg`** — single still frame from the apex of the
   movement (used as `<video poster>` while the loop loads)

Filename = exercise slug. Lowercase, hyphenated.

## Movement timing must match phase data

Each exercise has a `phases[]` array in the DB describing how long
each phase of the rep lasts and which muscles dominate. The animation
**must hit these phase boundaries** — when phase 2 starts in the data,
the visual must be at the corresponding point in the rep.

Example — Back Squat (`back-squat`):

| Phase     | Duration | Visual cue                                |
|-----------|----------|-------------------------------------------|
| Descent   | 1500 ms  | Eccentric: hip back, knee bend, controlled |
| Bottom    | 400 ms   | Hip below knee, brief hold                |
| Drive     | 1100 ms  | Concentric: explosive up to lockout       |

Coaches can tune phases per exercise later, but defaults are in
`supabase/seed-exercises.sql`. Match them.

## Anatomical accuracy checklist

For every exercise, the loop must visually show:

- [ ] Correct stance / grip width
- [ ] Correct bar / dumbbell / cable position
- [ ] Range of motion that matches our cue text (e.g. squat: hip
      below knee; bench: bar touches chest)
- [ ] No common-mistake cheating (e.g. no kipping pull-ups, no
      hyperextended lockout on deadlift)

Reference the `cues` and `mistakes` arrays in the seed file — the
visual should show the "correct" version of every cue.

## Delivery

Drop into Supabase Storage bucket `exercise-demos/` (path: bucket
root). Update each exercise's `demo_asset_url` to the public WebM URL
(MP4 fallback resolves automatically by swapping extension).

## Source files

We'd like the Blender / Cinema 4D source files too, so we can:
- Re-render at different resolutions if needed
- Tune timing if phases change
- Produce variants (male, female, alternate angle) later

## Out of scope for v1

- Male + female variants — we ship androgynous v1
- Multiple camera angles — locked side view
- Voiceover or text overlays — we do those at render time
- Phase-by-phase muscle highlighting on the model itself — our
  `<AnatomyFigure>` handles that as a separate layer
