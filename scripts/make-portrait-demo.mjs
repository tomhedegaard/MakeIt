#!/usr/bin/env node
/**
 * Portrait (9:16) versions of the exercise loops, next to the landscape
 * ones: {slug}-portrait.webm + .mp4 + -portrait-poster.jpg.
 *
 * MoveKit renders are landscape (1300×720 or 1936×1072). A plain centre
 * crop to 9:16 cuts off a bench, a cable stack or a wide lunge, so the
 * crop follows the subject instead:
 *  1. Sample the clip in grey at low resolution and mark every column
 *     with sharp vertical edges in any frame. That span is the figure plus its
 *     equipment over the whole loop; the smooth backdrop has no edges.
 *  2. If the span fits a 9:16 crop at full height, crop there, centred
 *     on it, and scale to 406×720.
 *  3. If it is wider, keep the whole span, scale it down to 406 wide and
 *     stretch the plain backdrop rows above and below it to fill 9:16, so
 *     nothing is cut and no ghost of the figure shows in the fill.
 *
 * Usage:
 *   node scripts/make-portrait-demo.mjs <src.mp4> <slug>       one clip
 *   node scripts/make-portrait-demo.mjs --public                the mapped core
 *        exercises (scripts/movekit-map.json) into public/exercise-demos
 *   node scripts/make-portrait-demo.mjs --storage <dir>         every other
 *        MoveKit clip into <dir>, for scripts/upload-demos-to-storage.mjs
 *
 * ffmpeg and ffprobe are required.
 */
import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const OUT_W = 406; // 9:16 at 720 high, rounded to even
const OUT_H = 720;
const SAMPLE_W = 260; // analysis width; height follows the source ratio
const MARGIN = 0.04; // breathing room each side of the subject, as a share of the source width

function ffprobeSize(src) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", src], {
    encoding: "utf8",
  });
  const [w, h] = r.stdout.trim().split(",").map(Number);
  if (!w || !h) throw new Error(`ffprobe could not read ${src}`);
  return { w, h };
}

/**
 * Columns (in source pixels) that hold the subject at any point in the
 * loop. The backdrop is a smooth gradient with a soft vignette, so
 * brightness alone marks everything; edges do not. A column counts when
 * enough of its pixels sit on a sharp left-to-right step in brightness,
 * which is the figure, the bar and the equipment, never the backdrop.
 */
export function subjectSpan(frames, sw, sh, srcW) {
  const hits = new Uint16Array(sw);
  for (const f of frames) {
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const i = y * sw + x;
        // Horizontal change only: a floor line or platform edge runs the
        // full width and would claim every column; the figure and the
        // equipment always have vertical edges where they stand.
        if (Math.abs(f[i + 1] - f[i - 1]) > 20) hits[x]++;
      }
    }
  }
  // A column is part of the subject when it has edges in at least 2 % of
  // the sampled pixels; the frame's own outer columns never count.
  const need = Math.max(3, Math.round(frames.length * sh * 0.02));
  let x0 = -1;
  let x1 = -1;
  for (let x = 2; x < sw - 2; x++) {
    if (hits[x] >= need) {
      if (x0 < 0) x0 = x;
      x1 = x;
    }
  }
  if (x0 < 0) return { x0: 0, x1: srcW }; // nothing found: keep everything
  const scale = srcW / sw;
  const pad = MARGIN * srcW;
  return { x0: Math.max(0, x0 * scale - pad), x1: Math.min(srcW, (x1 + 1) * scale + pad) };
}

/**
 * The ffmpeg filter that turns the source into a 406×720 portrait loop.
 * A wide subject keeps its full span, scaled to the portrait width, with
 * the rows just above and below it stretched into the empty space: the
 * backdrop is plain there, so the fill reads as more of the same wall.
 */
export function portraitFilter({ x0, x1 }, srcW, srcH) {
  const cropW = Math.round(((OUT_W / OUT_H) * srcH) / 2) * 2; // 9:16 at source height
  const span = x1 - x0;
  const cx = (x0 + x1) / 2;
  if (span <= cropW) {
    const x = Math.round(Math.min(Math.max(cx - cropW / 2, 0), srcW - cropW));
    return { simple: `crop=${cropW}:${srcH}:${x}:0,scale=${OUT_W}:${OUT_H},fps=30` };
  }
  const w = Math.min(srcW, Math.round(span / 2) * 2);
  const x = Math.round(Math.min(Math.max(cx - w / 2, 0), srcW - w));
  const fgH = Math.round((srcH * OUT_W) / w / 2) * 2;
  const top = Math.floor((OUT_H - fgH) / 4) * 2;
  const bottom = OUT_H - fgH - top;
  const strip = Math.max(4, Math.round(srcH / 90));
  return {
    complex:
      `[0:v]fps=30,crop=${w}:${srcH}:${x}:0,split=3[a][b][c];` +
      `[a]scale=${OUT_W}:${fgH}[fg];` +
      `[b]crop=${w}:${strip}:0:0,scale=${OUT_W}:${top}[top];` +
      `[c]crop=${w}:${strip}:0:${srcH - strip},scale=${OUT_W}:${bottom}[bot];` +
      `[top][fg][bot]vstack=inputs=3`,
  };
}

function analyse(src, { w, h }) {
  const sh = Math.round((SAMPLE_W * h) / w / 2) * 2;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", src, "-vf", `fps=3,scale=${SAMPLE_W}:${sh},format=gray`, "-f", "rawvideo", "-"], {
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`analysis failed for ${src}`);
  const size = SAMPLE_W * sh;
  const frames = [];
  for (let i = 0; i + size <= r.stdout.length; i += size) frames.push(r.stdout.subarray(i, i + size));
  return subjectSpan(frames, SAMPLE_W, sh, w);
}

function ffmpeg(label, args) {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(`${label} failed (ffmpeg exit ${r.status})`);
}

export async function makePortrait(src, slug, outDir) {
  await mkdir(outDir, { recursive: true });
  const size = ffprobeSize(src);
  const span = analyse(src, size);
  const f = portraitFilter(span, size.w, size.h);
  const vf = (fmt) => (f.simple ? ["-vf", `${f.simple},format=${fmt}`] : ["-filter_complex", `${f.complex},format=${fmt}`]);
  const base = join(outDir, `${slug}-portrait`);

  ffmpeg("mp4", ["-i", src, ...vf("yuv420p"), "-c:v", "libx264", "-profile:v", "high", "-crf", "26", "-preset", "slow", "-an", "-movflags", "+faststart", `${base}.mp4`]);
  ffmpeg("webm", ["-i", src, ...vf("yuv420p"), "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", "-an", `${base}.webm`]);
  ffmpeg("poster", ["-ss", "00:00:01", "-i", src, ...vf("yuvj420p"), "-frames:v", "1", "-q:v", "3", `${base}-poster.jpg`]);

  const kb = async (p) => Math.round((await stat(p)).size / 1024);
  const mode = f.simple ? "crop" : `fit ${Math.round(span.x1 - span.x0)}px`;
  console.log(`✓ ${slug}-portrait  ${mode}  webm ${await kb(`${base}.webm`)} KB · mp4 ${await kb(`${base}.mp4`)} KB`);
}

async function main() {
  const [, , a, b] = process.argv;
  const map = JSON.parse(await readFile("scripts/movekit-map.json", "utf8")).exercises.filter((e) => e.movekit);

  if (a === "--public") {
    for (const e of map) await makePortrait(`MoveKit/${e.movekit}.mp4`, e.slug, "public/exercise-demos");
    return;
  }
  if (a === "--storage") {
    if (!b) throw new Error("--storage needs an output directory");
    const all = (await readdir("MoveKit")).filter((f) => f.endsWith(".mp4")).map((f) => f.slice(0, -4));
    for (const slug of all) await makePortrait(`MoveKit/${slug}.mp4`, slug, b);
    return;
  }
  if (!a || !b) {
    console.error("Usage: make-portrait-demo.mjs <src.mp4> <slug> | --public | --storage <dir>");
    process.exit(1);
  }
  await makePortrait(a, b, process.env.MI_DEMO_OUT ?? "public/exercise-demos");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
}
