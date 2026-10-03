#!/usr/bin/env node
/**
 * MoveKit-ledger: måler alle klip i MoveKit/ og fletter resultatet med
 * scripts/movekit-manifest.json, som er sandheden om hvad vi har fået
 * fra MoveKit, og hvad hvert klip bruges til.
 *
 * Brug:
 *   node scripts/movekit-audit.mjs                        mål, flet, rapportér
 *   node scripts/movekit-audit.mjs --no-measure           genbrug mål fra manifestet (nye klip måles stadig)
 *   node scripts/movekit-audit.mjs --skip=<klip>=<grund>  markér et klip som bevidst ubrugt (kan gentages)
 *   node scripts/movekit-audit.mjs --assign=2026-10       giv utildelte klip library="2026-10"
 *
 * core genberegnes altid fra scripts/movekit-map.json. library og
 * skipped bevares fra manifestet. Første kørsel uden manifest sætter
 * library="2026-06" for de slugs, der står i migration 0052.
 *
 * ffmpeg og ffprobe kræves.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { coreByClip, parseSeedOrders, unassigned, validateManifest } from "./lib/movekit.mjs";

const SRC = "MoveKit";
const MANIFEST = "scripts/movekit-manifest.json";
const MAP = "scripts/movekit-map.json";
const BOOTSTRAP = { seed: "supabase/migrations/0052_exercise_library_expansion.sql", batch: "2026-06" };
const JOBS = 6;
const DOC =
  "Ledger over MoveKit-pakken: ét objekt pr. klip. core = kerneøvelser klippet er kilde til (fra movekit-map.json). " +
  "library = batch når klippet er en biblioteksøvelse med samme slug. skipped = begrundelse når klippet bevidst ikke bruges. " +
  "Genereres og vedligeholdes af scripts/movekit-audit.mjs.";

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "--no-measure" && !/^--(assign|skip)=.+/.test(a));
if (unknown.length) {
  console.error(`✗ ukendt eller ufuldstændigt flag: ${unknown.join(" ")}`);
  console.error("Brug: node scripts/movekit-audit.mjs [--no-measure] [--skip=<klip>=<grund>]… [--assign=<batch>]");
  process.exit(1);
}
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const assign = flag("assign") ?? null;
const noMeasure = args.includes("--no-measure");
const skips = new Map(
  args
    .filter((a) => a.startsWith("--skip="))
    .map((a) => {
      const [clip, ...reason] = a.slice("--skip=".length).split("=");
      return [clip, reason.join("=") || "sprunget over"];
    }),
);

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let err = "";
    p.stdout.on("data", (d) => chunks.push(d));
    p.stderr.on("data", (d) => {
      err = (err + d).slice(-400);
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${cmd} exit ${code}: ${err.trim()}`)),
    );
  });
}

/** Måler ét klip. En fejl navngiver klippet, så en lang kørsel ikke dør anonymt. */
async function measure(clip) {
  try {
    return await measureClip(clip);
  } catch (e) {
    throw new Error(`${clip}: ${e.message}`);
  }
}

/** Rød muskelmarkering: pixels med r>120, r-g>45, r-b>45 over 16 frames i 480 px bredde. */
async function measureClip(clip) {
  const src = `${SRC}/${clip}.mp4`;
  const probe = JSON.parse(
    (
      await run("ffprobe", [
        "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height:format=duration",
        "-of", "json", src,
      ])
    ).toString(),
  );
  const { width, height } = probe.streams[0];
  const seconds = Number(probe.format.duration);
  const raw = await run("ffmpeg", [
    "-v", "error", "-i", src,
    "-vf", `fps=16/${seconds},scale=480:-2`,
    "-frames:v", "16", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
  ]);
  // Uden frames ville klippet ligne et uden markering.
  if (raw.length === 0) throw new Error("ffmpeg gav ingen frames");
  let redPixels = 0;
  for (let i = 0; i + 2 < raw.length; i += 3) {
    const r = raw[i];
    if (r > 120 && r - raw[i + 1] > 45 && r - raw[i + 2] > 45) redPixels++;
  }
  return { width, height, duration: Number(seconds.toFixed(2)), redPixels, highlight: redPixels > 0 };
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const map = JSON.parse(await readFile(MAP, "utf8"));
const core = coreByClip(map);
const onDisk = (await readdir(SRC))
  .filter((f) => f.endsWith(".mp4"))
  .map((f) => f.slice(0, -4))
  .sort();
const previous = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : null;
const before = new Map((previous?.clips ?? []).map((c) => [c.clip, c]));
const bootstrap = previous
  ? new Set()
  : new Set(parseSeedOrders(await readFile(BOOTSTRAP.seed, "utf8")).map((r) => r.slug));

for (const clip of skips.keys()) {
  if (!onDisk.includes(clip)) {
    console.error(`✗ --skip: ukendt klip "${clip}"`);
    process.exit(1);
  }
}

let measured = 0;
const clips = await pool(onDisk, JOBS, async (clip) => {
  const old = before.get(clip);
  // Et klip der var væk og er kommet tilbage kan være en ny render: mål det igen.
  const reuse = noMeasure && old && !old.missing && typeof old.redPixels === "number";
  const m = reuse
    ? { width: old.width, height: old.height, duration: old.duration, redPixels: old.redPixels, highlight: old.highlight }
    : await measure(clip);
  if (!reuse && ++measured % 50 === 0) console.error(`  målt ${measured}…`);
  return {
    clip,
    ...m,
    core: core.get(clip) ?? [],
    library: old?.library ?? (bootstrap.has(clip) ? BOOTSTRAP.batch : null),
    skipped: skips.get(clip) ?? old?.skipped ?? null,
  };
}).catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});

// Klip der stod i manifestet, men er væk fra mappen, beholdes og mærkes.
for (const [clip, old] of before) {
  if (!onDisk.includes(clip)) clips.push({ ...old, core: core.get(clip) ?? [], missing: true });
}
clips.sort((a, b) => (a.clip < b.clip ? -1 : a.clip > b.clip ? 1 : 0));

// Datoen for seneste måling: en ren --no-measure-kørsel ændrer ikke filen.
const auditedAt = measured > 0 || !previous ? new Date().toISOString().slice(0, 10) : previous.auditedAt;
const manifest = { _doc: DOC, auditedAt, clips };

let assigned = [];
if (assign) {
  assigned = unassigned(manifest);
  const pick = new Set(assigned);
  for (const c of manifest.clips) if (pick.has(c.clip)) c.library = assign;
}

const errors = validateManifest(manifest, map);
if (errors.length) {
  console.error("MANIFEST-FEJL:\n" + errors.map((e) => `  · ${e}`).join("\n"));
  process.exit(1);
}

// Ét klip pr. linje, så en diff viser præcis hvilke klip der ændrede sig.
const body = manifest.clips.map((c) => "  " + JSON.stringify(c)).join(",\n");
await writeFile(
  MANIFEST,
  `{\n "_doc": ${JSON.stringify(manifest._doc)},\n "auditedAt": ${JSON.stringify(manifest.auditedAt)},\n "clips": [\n${body}\n ]\n}\n`,
);

const live = manifest.clips.filter((c) => !c.missing);
const count = (fn) => live.filter(fn).length;
const batches = [...new Set(live.map((c) => c.library).filter(Boolean))].sort();
const free = unassigned(manifest);
console.log(`${live.length} klip i ${SRC}/`);
console.log(`  kernekilder:        ${count((c) => c.core.length > 0)}`);
for (const b of batches) console.log(`  bibliotek ${b}:  ${count((c) => c.library === b)}`);
console.log(`  sprunget over:      ${count((c) => c.skipped)}`);
console.log(`  utildelt:           ${free.length}${free.length ? "  → " + free.join(", ") : ""}`);
const dark = live.filter((c) => !c.highlight && !c.skipped).map((c) => c.clip);
console.log(`  uden rød markering: ${dark.length}${dark.length ? "  → " + dark.join(", ") : ""}`);
if (assign) console.log(`  tildelt ${assign}:    ${assigned.length}`);
const gone = manifest.clips.filter((c) => c.missing).map((c) => c.clip);
if (gone.length) console.log(`  mangler i mappen:   ${gone.join(", ")}`);
console.log(`→ ${MANIFEST}`);
