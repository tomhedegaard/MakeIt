/**
 * The hero's lifter: one back-squat rep from the MoveKit demo
 * (`public/exercise-demos/back-squat-portrait.mp4`, frames 0 to 116),
 * keyed off its white backdrop and saved as alpha WebP in
 * `public/landing/hero/`. The poster is the first frame, standing.
 * `hero.test.ts` fails if any frame or the poster is missing.
 */
export const HERO_SEQUENCE = {
  base: "/landing/hero/squat",
  frameCount: 117,
  poster: { src: "/landing/hero/squat-poster.webp", width: 406, height: 720 },
} as const;
