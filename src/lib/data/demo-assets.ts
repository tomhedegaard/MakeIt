/**
 * Exercise demo-asset resolution — pure string helpers, no runtime
 * dependencies. Kept separate from `exercises.ts` (which imports the
 * server-only Supabase client) so client components can import it
 * without dragging `next/headers` into the browser bundle.
 */

export type DemoAssets = { webm: string; mp4: string; poster: string };

export type DemoOrientation = "landscape" | "portrait";

/**
 * Resolves a demo_asset_url into its webm / mp4 / poster siblings.
 * The stored URL points at one file and may carry a `?v=` cache-bust
 * query; the brief names the trio {slug}.webm / {slug}.mp4 /
 * {slug}-poster.jpg, so the other two are derived. The query is split
 * off before the extension is stripped (the strip regex is
 * end-anchored) and re-attached to all three so the cache-bust holds.
 *
 * Every loop also exists in 9:16 as {slug}-portrait.webm / .mp4 /
 * -portrait-poster.jpg (scripts/make-portrait-demo.mjs), cropped to the
 * figure and its equipment rather than the frame's centre.
 */
export function resolveDemoAssets(demoAssetUrl: string, orientation: DemoOrientation = "landscape"): DemoAssets {
  const [path, query] = demoAssetUrl.split("?");
  const q = query ? `?${query}` : "";
  const stem = path.replace(/\.(webm|mp4)$/, "");
  const base = orientation === "portrait" ? `${stem}-portrait` : stem;
  return {
    webm: `${base}.webm${q}`,
    mp4: `${base}.mp4${q}`,
    poster: `${base}-poster.jpg${q}`,
  };
}
