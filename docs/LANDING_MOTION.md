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
| Hero load sequence | `LandingHero` (`data-hero-rise`) | CSS keyframes with a `--rise` delay per element; the H1 is unmasked as one line because its test requires a single text node |
| Pinned horizontal gallery | `ChapterTrain` + `GalleryRig` | The island sets `data-gallery="on"` and `--gallery-len`; a named view timeline on the block slides the track while its stage is sticky. Swipe row below 1024 px |
| Stacked cards | `CrewPlates` via `TierLadder`'s `after` slot | Sticky cards with a 16 px step; the card behind scales to 0.96 on its sibling's view timeline (`timeline-scope`) |
| Magnetic buttons | `Magnetic` around the hero, tier and waitlist CTAs | `pointermove` writes `--mx` and `--my`, CSS moves the span only for a fine pointer with motion allowed |
| Tilt toward the pointer | `TiltDoor` | `pointermove` writes `--rx` and `--ry` |
| Count down on arrival | `EngineDemo` | IntersectionObserver plus `requestAnimationFrame` |
| Play once in view | `InViewOnce` on `[data-once]` (`ChapterFood`, `LandingMunk`) | Sets `data-motion="armed"` on mount (motion allowed), `"run"` on first intersection; CSS holds pieces back only under `armed` and transitions them in with staggered delays |
| Count up on arrival | `CountUp` (food week totals) | Server renders the final number; a second observer with a bottom `rootMargin` drops it to 0 just before it is visible, then `countUpAt` eases it up. Screen readers get the final value only |
| Chart draws night by night | `HeartLive` | Same arm-then-play observers; the path draws via `pathLength=1` and the marker and big reading step with it. Any pointer or key hands control to the visitor |
| Still phone, changing screens | `AppRack` (`[data-rack-pin]`) | CSS only: a named view timeline `--rack` on a tall block, each screen's opacity animated over its `1/n` slice with `animation-range: contain`. Shown only at 1024 px wide, 760 px tall, with view timelines and motion allowed; the swipe rack is the resting state everywhere else |
| Signature writes itself | `LandingMunk` (`.munk-sig`) | Paths with `pathLength=1`, `stroke-dashoffset` 1 to 0 under `InViewOnce`, after the flow steps have lit up |
| Plates load onto the bar | `TierLadder` (`.tier-bar`) | `InViewOnce`; plates slide in from the sleeve end with a `--i` stagger. The crew section clips x, so the armed plates never widen the page |
| Shopping list gathers | `ChapterFood` (`.food-shop`) + `ShoppingScreen` (`data-shop-row`, `data-shop-bar`) | `InViewOnce`; rows slide in by running index, the basket bar fills. The attributes do nothing outside the food chapter |
| Wordmark slides home, portrait rolls in | `LandingMunk` (`.munk-mark`, `.munk-disc`) | `animation-timeline: view()`. The section uses `overflow-clip`, not `overflow-hidden`: hidden makes a scroll container and the view timeline binds to it and never runs |
| Chapter mark in the nav | `LandingNav` + `NavSpy` | IntersectionObserver on a centre line over `main section[id]` sets `aria-current="location"`; a 2 px ink line scales in under the link |
| Rulers draw, access heading rises | every `.landing-rule`, `AccessPanel` (`.access-rise`) | View timeline: a `--bg` overlay on the ruler scales away, the heading translates up out of an `overflow-clip` line |
| Chosen watch's sync card | `ChapterHeart` + `DeviceStage` + `HrvScreen sources` | `HeartLive` mirrors the device onto the section's `data-device`; CSS shows the matching card and phone source, slides the card in and runs a sync dot to the phone. No product photos (makers' press images are editorial only). Devices not readable yet are flagged in `DEVICE_SOON` and say "coming" instead of a sync time |

## Nat til morgen

`[data-dawn]` on the engine section. `globals.css` registers `--dawn`
with `@property` (initial 1, light) and animates it 0 to 1 over
`animation-range: cover 50% cover 55%`. The section's tokens (`--bg`,
`--fg`, lines, signal, domain colours) are mixed between the Nord nat and
Nord values, so phones, rules and copy follow without classes.

Tuning: move the range to shift where the morning breaks. The first
report line (sleep) should still be in the dark, the decision in daylight.

## Scroll-scrubbed image sequence (asset A1)

`ScrollSequence` is mounted in `MotorStory` behind `A1_SEQUENCE`
(`src/lib/marketing/landing/a1.ts`), which is `null` until the frames
exist. Setting it is the only code change; `a1.test.ts` fails if any
frame or the poster is missing.

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
