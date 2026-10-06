/**
 * Asset A1: the squat take as a scroll-scrubbed image sequence in the
 * motor story (docs/LANDING_MOTION.md). Null until the frames are in
 * `public/landing/a1/`; setting it is the only change needed to mount
 * `ScrollSequence`. The gate test checks every frame exists once set.
 */
export const A1_SEQUENCE: {
  base: string;
  frameCount: number;
  poster: { src: string; width: number; height: number };
} | null = null;
