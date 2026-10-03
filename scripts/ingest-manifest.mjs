#!/usr/bin/env node
/**
 * Encoder alle klip i en manifest-batch til de seks filer pr. øvelse,
 * som bucketen `exercise-demos` forventer:
 *   {slug}.webm  {slug}.mp4  {slug}-poster.jpg            (landskab)
 *   {slug}-portrait.webm  .mp4  -portrait-poster.jpg      (9:16)
 *
 * Brug:
 *   node scripts/ingest-manifest.mjs --batch=2026-10 --out=<dir> [--jobs=3] [--only=<slug>]
 *
 * Genoptageligt: et klip er færdigt, når <dir>/.done/<slug> findes.
 * Mærket skrives først, når begge trin lykkedes og alle seks filer
 * har indhold, så en afbrudt encoding aldrig tæller som færdig.
 * Fejl stopper ikke kørslen: de samles og listes til sidst (exit 1).
 * Afbrydes scriptet (Ctrl-C, SIGTERM), stoppes de kørende encodere med
 * det samme, så en genkørsel ikke får to encodere på samme fil.
 *
 * Selve encodingen ligger i ingest-exercise-demo.mjs (landskab) og
 * make-portrait-demo.mjs (portræt); dette script orkestrerer dem.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { batchClips } from "./lib/movekit.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const batch = flag("batch");
const out = flag("out");
const jobs = Math.min(8, Math.max(1, Math.floor(Number(flag("jobs")) || 3)));
const only = flag("only");

if (!batch || !out) {
  console.error("Brug: node scripts/ingest-manifest.mjs --batch=<batch> --out=<dir> [--jobs=3] [--only=<slug>]");
  process.exit(1);
}

const SUFFIXES = [".webm", ".mp4", "-poster.jpg", "-portrait.webm", "-portrait.mp4", "-portrait-poster.jpg"];
const LIMIT = 5 * 1024 * 1024; // bucketens file_size_limit (migration 0033)

const manifest = JSON.parse(await readFile("scripts/movekit-manifest.json", "utf8"));
let slugs = batchClips(manifest, batch);
if (only) slugs = slugs.filter((s) => s === only);
if (slugs.length === 0) {
  console.error(`Ingen klip i batch ${batch}${only ? ` med slug ${only}` : ""}`);
  process.exit(1);
}

const doneDir = join(out, ".done");
await mkdir(doneDir, { recursive: true });

const children = new Set();

/** Kører et node-script med MI_DEMO_OUT sat. Giver null ved succes, ellers slutningen af stderr. */
function node(script, argv) {
  return new Promise((resolve) => {
    // detached: barnet leder sin egen procesgruppe, så dets ffmpeg kan stoppes sammen med det.
    const p = spawn(process.execPath, [script, ...argv], {
      env: { ...process.env, MI_DEMO_OUT: out },
      stdio: ["ignore", "ignore", "pipe"],
      detached: true,
    });
    children.add(p);
    let err = "";
    p.stderr.on("data", (d) => {
      err = (err + d).slice(-1500);
    });
    p.on("error", (e) => {
      children.delete(p);
      resolve(String(e));
    });
    p.on("close", (code) => {
      children.delete(p);
      resolve(code === 0 ? null : err.trim() || `exit ${code}`);
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    for (const p of children) {
      try {
        process.kill(-p.pid, "SIGTERM");
      } catch {
        /* allerede væk */
      }
    }
    console.error(`\nAfbrudt (${signal}). Kør kommandoen igen for at fortsætte.`);
    process.exit(1);
  });
}

async function encode(slug) {
  const src = `MoveKit/${slug}.mp4`;
  if (!existsSync(src)) return `kilde mangler: ${src}`;
  // Rester fra et afbrudt forsøg må ikke kunne gå for at være dette forsøgs output.
  for (const suffix of SUFFIXES) await rm(join(out, slug + suffix), { force: true });
  const failed =
    (await node("scripts/ingest-exercise-demo.mjs", [src, slug])) ??
    (await node("scripts/make-portrait-demo.mjs", [src, slug]));
  if (failed) return failed;
  for (const suffix of SUFFIXES) {
    const file = join(out, slug + suffix);
    if (!existsSync(file) || (await stat(file)).size === 0) return `tom eller manglende fil: ${slug}${suffix}`;
  }
  await writeFile(join(doneDir, slug), "");
  return null;
}

const todo = slugs.filter((s) => !existsSync(join(doneDir, s)));
console.log(`${slugs.length} klip i batch ${batch} · ${slugs.length - todo.length} færdige · ${todo.length} encodes med ${jobs} job`);

const failures = [];
let finished = 0;
let next = 0;
const started = Date.now();
await Promise.all(
  Array.from({ length: Math.min(jobs, todo.length) }, async () => {
    while (next < todo.length) {
      const slug = todo[next++];
      const error = await encode(slug);
      finished++;
      if (error) failures.push({ slug, error });
      const minutes = ((Date.now() - started) / 60000).toFixed(1);
      console.log(`${error ? "✗" : "✓"} ${slug}  (${finished}/${todo.length}, ${minutes} min)`);
    }
  }),
);

const files = (await readdir(out)).filter((f) => /\.(webm|mp4|jpg)$/.test(f));
let bytes = 0;
const tooBig = [];
for (const f of files) {
  const { size } = await stat(join(out, f));
  bytes += size;
  if (size > LIMIT) tooBig.push(`${f} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}
const done = slugs.filter((s) => existsSync(join(doneDir, s))).length;
console.log(`\n${done}/${slugs.length} klip færdige · ${files.length} filer · ${(bytes / 1024 / 1024).toFixed(0)} MB i ${out}`);
if (tooBig.length) {
  console.log(`Over 5 MB (afvises af bucketen):\n  ${tooBig.join("\n  ")}`);
  process.exitCode = 1;
}
if (failures.length) {
  console.log(`\n${failures.length} fejlede:`);
  for (const f of failures) console.log(`  · ${f.slug}:\n      ${f.error.split("\n").slice(-4).join("\n      ")}`);
  process.exit(1);
}
