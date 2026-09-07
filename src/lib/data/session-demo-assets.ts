import { bundledDemoAssetUrl } from "@/lib/data/bundled-demo-assets";

/**
 * Resolve a session lift's MoveKit loop.
 *
 * Preference:
 *  1. Joined `exercises.demo_asset_url` (Storage upload or seed path)
 *  2. Slug → bundled public path from #86 (`/exercise-demos/{slug}.webm`)
 *  3. null — caller falls back to AnatomyFigure / nothing
 *
 * `front-squat` and any other slug without files stay null.
 * Client-safe: no server-only imports.
 */
export function resolveSessionDemoAssetUrl(
  joinedUrl: string | null | undefined,
  slug: string | null | undefined,
): string | null {
  const fromJoin = joinedUrl?.trim();
  if (fromJoin) return fromJoin;
  if (slug) return bundledDemoAssetUrl(slug);
  return null;
}
