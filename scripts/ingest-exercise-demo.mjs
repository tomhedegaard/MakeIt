/**
 * Øvelses-demo-ingestion — normaliserer ÉT kildeklip (MoveKit-MP4,
 * custom Blender-render, hvad som helst) til den trio, demo-pipelinen
 * forventer: {slug}.webm + {slug}.mp4 + {slug}-poster.jpg, til spec i
 * docs/EXERCISE_VISUAL_BRIEF.md (720×1280, 30 fps, loop, <400 KB mål).
 *
 * Hvorfor: ExerciseDemo/resolveDemoAssets afleder altid en .webm-
 * søskende fra demo_asset_url. En MP4-only-kilde (MoveKit) ville lade
 * webm-<source> 404'e pr. load. Dette script producerer den manglende
 * webm (VP9, mindre end H.264) + poster, så app-koden er urørt.
 *
 * Brug:
 *   node scripts/ingest-exercise-demo.mjs <kilde> <slug> [--alpha]
 *   node scripts/ingest-exercise-demo.mjs movekit/bench.mp4 bench-press
 *
 * --alpha bevarer transparens (VP9 yuva420p) hvis kilden har alfa
 * (custom-renders pr. brief'en; MoveKit-MP4 har typisk ikke).
 *
 * Output lander i public/exercise-demos/ klar til upload til
 * Supabase-bucket'en `exercise-demos` (eller coach-uploaderen).
 * ffmpeg kræves (brew install ffmpeg).
 */
import { spawnSync } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";

const [, , src, slug, ...flags] = process.argv;
const alpha = flags.includes("--alpha");

if (!src || !slug) {
  console.error("Brug: node scripts/ingest-exercise-demo.mjs <kilde> <slug> [--alpha]");
  process.exit(1);
}
if (!existsSync(src)) {
  console.error(`Kilde ikke fundet: ${src}`);
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug skal være lowercase-hyphenated: "${slug}"`);
  process.exit(1);
}

const OUT = new URL("../public/exercise-demos/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

// Bevar kildens aspect ratio (MoveKit er 1300×720 landscape, custom-
// renders kan være portræt). Skalér så længste kant ≤ 720 px (vises
// ved max 240 px → 720 = 3× retina, rigeligt og let). force_divisible_by=2
// holder dimensionerne lige til yuv420p. 30 fps, ingen padding/letterbox.
const vf = "scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30";

function run(label, args) {
  const r = spawnSync("ffmpeg", ["-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) {
    console.error(`✗ ${label} fejlede (ffmpeg exit ${r.status})`);
    process.exit(1);
  }
}

const mp4 = `${OUT}${slug}.mp4`;
const webm = `${OUT}${slug}.webm`;
const poster = `${OUT}${slug}-poster.jpg`;

// MP4 (H.264) — universel fallback. yuv420p for bred afspilning.
run("mp4", [
  "-i", src,
  "-vf", `${vf},format=yuv420p`,
  "-c:v", "libx264", "-profile:v", "high", "-crf", "26", "-preset", "slow",
  "-an", "-movflags", "+faststart", "-pix_fmt", "yuv420p",
  mp4,
]);

// WebM (VP9) — primær. Alfa bevares kun med --alpha (yuva420p).
run("webm", [
  "-i", src,
  "-vf", `${vf},format=${alpha ? "yuva420p" : "yuv420p"}`,
  "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1",
  ...(alpha ? ["-auto-alt-ref", "0"] : []),
  "-an",
  webm,
]);

// Poster — ét still-frame fra ~apex (midt i klippet).
run("poster", [
  "-i", src,
  "-vf", `${vf},format=yuvj420p`,
  "-frames:v", "1", "-ss", "00:00:01",
  "-q:v", "3",
  poster,
]);

const kb = async (p) => Math.round((await stat(p)).size / 1024);
const [wkb, mkb, pkb] = await Promise.all([kb(webm), kb(mp4), kb(poster)]);
console.log(`✓ ${slug}.webm   ${wkb} KB${wkb > 400 ? "  ⚠ over 400 KB-mål" : ""}`);
console.log(`✓ ${slug}.mp4    ${mkb} KB`);
console.log(`✓ ${slug}-poster.jpg  ${pkb} KB`);
console.log(`\nUpload public/exercise-demos/${slug}.* til Supabase-bucket 'exercise-demos'`);
console.log(`og sæt exercises.demo_asset_url = <public-url>/${slug}.webm`);
