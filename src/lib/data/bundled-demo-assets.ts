/**
 * Bundled v1 exercise demo loops — the files that live in
 * `public/exercise-demos/` and ship with the deploy.
 *
 * Contract:
 *  - Demo mode + v1 seed write `demo_asset_url` as
 *    `/exercise-demos/{slug}.webm`. `resolveDemoAssets` derives the
 *    `.mp4` + `-poster.jpg` siblings from that single URL.
 *  - Coach upload (`DemoAssetUploader` / `uploadDemoAssetAction`)
 *    writes a Supabase Storage public URL
 *    (`…/storage/v1/object/public/exercise-demos/{slug}.webm?v=`).
 *    Same sibling derivation; do not overwrite those rows on seed.
 *  - All 20 core lifts have a trio here. Any other slug stays null
 *    and falls back to PhaseAnimator / AnatomyFigure. Do not invent
 *    a loop for a missing trio.
 */

export const BUNDLED_DEMO_SLUGS = [
  "back-squat",
  "barbell-curl",
  "bench",
  "deadlift",
  "dip",
  "front-squat",
  "hip-thrust",
  "khr",
  "lateral-raise",
  "lunge",
  "ohp",
  "paused-bench",
  "plank",
  "pull-up",
  "push-press",
  "push-up",
  "rdl",
  "row",
  "standing-calf-raise",
  "tricep-pushdown",
] as const;

export type BundledDemoSlug = (typeof BUNDLED_DEMO_SLUGS)[number];

const BUNDLED = new Set<string>(BUNDLED_DEMO_SLUGS);

export function isBundledDemoSlug(slug: string): slug is BundledDemoSlug {
  return BUNDLED.has(slug);
}

/** Public-path WebM URL, or null when no trio exists on disk. */
export function bundledDemoAssetUrl(slug: string): string | null {
  return isBundledDemoSlug(slug) ? `/exercise-demos/${slug}.webm` : null;
}
