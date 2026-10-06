# Landing motion

How the landing moves, which building blocks exist, and how to add the
next one without pulling in an animation library. Companion to
`DESIGN.md` (motion rules) and the asset list for the landing.

## Principles

- Copy is visible without JS and under `prefers-reduced-motion: reduce`.
  Motion is added on top of a resting state that already reads.
- Prefer CSS scroll-driven animation (`animation-timeline: view()`) behind
  `@supports`. Browsers without it get the resting state.
- When JS is needed, it is a small `"use client"` island that observes
  and writes a `data-*` attribute or a CSS variable. CSS does the rest.
- Only `transform`, `opacity` and colour tokens animate. No layout
  properties.
- No GSAP, Lenis or Framer on the landing. Everything here runs on the
  platform.

## Building blocks

| Block | Where | How |
| --- | --- | --- |
| Reveal in view | `CrewAlone` (`.spot-card`) | `animation-timeline: view()` with a staggered `--i` |
| Draw once in view | `NightCurve` + `NightCurveReveal` | IntersectionObserver sets `data-in-view`, CSS animates `stroke-dashoffset` |
| Sticky device with steps | `MotorStory` + `MotorStoryRig` | IntersectionObserver picks the step nearest the viewport centre, `data-active` drives Tailwind `group-data` variants |
| Nat til morgen | `MotorStory` (`data-dawn`) | View timeline animates the registered number `--dawn`, every token in the section is `color-mix`ed from it |
| Scroll-scrubbed image sequence | `ScrollSequence` | Poster `<img>` at rest, canvas draws the frame that matches scroll progress once frames load |
| Tilt toward the pointer | `TiltDoor` | `pointermove` writes `--rx` and `--ry` |
| Count down on arrival | `EngineDemo` | IntersectionObserver plus `requestAnimationFrame` |

## Nat til morgen

`[data-dawn]` on the engine section. `globals.css` registers `--dawn`
with `@property` (initial 1, light) and animates it 0 to 1 over
`animation-range: cover 50% cover 55%`. The section's tokens (`--bg`,
`--fg`, lines, signal, domain colours) are mixed between the Nord nat and
Nord values, so phones, rules and copy follow without classes.

Tuning: move the range to shift where the morning breaks. The first
report line (sleep) should still be in the dark, the decision in daylight.

## Scroll-scrubbed image sequence (asset A1)

`ScrollSequence` is ready but not mounted until the frames exist.

1. Export 120 frames from the A1 take as WebP, 1600 px wide for desktop
   and 800 px for mobile, named `a1-squat-frame-001.webp` to
   `a1-squat-frame-120.webp`, into `public/landing/a1/` and
   `public/landing/a1/m/`.
2. Pick frame 001 as the poster, or a separate still with the lifter at
   rest.
3. Mount it in `MotorStory` beside the report lines, or in place of the
   sticky rig on desktop:

```tsx
<ScrollSequence
  base="/landing/a1/a1-squat-frame"
  frameCount={120}
  poster={{ src: "/landing/a1/a1-squat-frame-001.webp", alt: "", width: 1600, height: 2000 }}
  range={{ start: 0.25, end: 0.75 }}
  className="aspect-[4/5] w-full"
/>
```

The helpers in `src/lib/marketing/landing/scroll-sequence.ts` are pure
and tested: `progressThrough` (how far a block has travelled through the
viewport), `frameIndexFor` (progress to frame, with a hold at each end),
`frameUrl` and `loadOrder` (coarse frames first, then the rest).

Mobile: serve the `m/` frames by passing a different `base` under a
`matchMedia` check in the parent, or keep the poster only below 1024 px
and let the sticky rig carry the story there.

## Adding a new effect

1. Write the resting state first and check it reads without JS.
2. Try `animation-timeline: view()` inside `@supports` and
   `prefers-reduced-motion: no-preference`.
3. If JS is needed, copy the shape of `NightCurveReveal`: observe, set a
   `data-*` attribute, let CSS animate.
4. Add the reduced variant in the `prefers-reduced-motion: reduce` block
   in `globals.css` if the effect has an animated resting state.
5. Run `npm test`. The landing gates reject hex colours, palette classes,
   `data-reveal`, Framer-style `initial={{ opacity: 0` and inline SVG
   outside the allowlist.
