/**
 * Batch-ingestion af MoveKit-klip → demo-trio pr. slug.
 *
 * Læser scripts/movekit-map.json og kører ingest-exercise-demo.mjs for
 * hver mapping. Default: kun confidence="match". Flag:
 *   --include-proxy   medtag også confidence="proxy"
 *   --only=<slug>     kør én enkelt slug
 *
 * Kilde-klippene forventes i ./MoveKit/<movekit>.mp4 (gitignored).
 * Output → public/exercise-demos/<slug>.{webm,mp4,jpg}.
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const flags = process.argv.slice(2);
const includeProxy = flags.includes("--include-proxy");
const only = flags.find((f) => f.startsWith("--only="))?.split("=")[1];

const mapUrl = new URL("./movekit-map.json", import.meta.url);
const { exercises } = JSON.parse(await readFile(mapUrl, "utf8"));
const srcDir = new URL("../MoveKit/", import.meta.url).pathname;
const ingest = new URL("./ingest-exercise-demo.mjs", import.meta.url).pathname;

let done = 0;
const skipped = [];

for (const e of exercises) {
  if (only && e.slug !== only) continue;
  if (e.confidence === "gap" || !e.movekit) {
    skipped.push(`${e.slug} — gap (intet klip)`);
    continue;
  }
  if (e.confidence === "proxy" && !includeProxy && !only) {
    skipped.push(`${e.slug} — proxy (brug --include-proxy)`);
    continue;
  }
  const src = `${srcDir}${e.movekit}.mp4`;
  if (!existsSync(src)) {
    skipped.push(`${e.slug} — KILDE MANGLER: MoveKit/${e.movekit}.mp4`);
    continue;
  }
  console.log(`\n▸ ${e.slug}  ←  ${e.movekit}${e.confidence === "proxy" ? "  (proxy)" : ""}`);
  const r = spawnSync("node", [ingest, src, e.slug], { stdio: "inherit" });
  if (r.status === 0) done += 1;
  else skipped.push(`${e.slug} — ingestion fejlede`);
}

console.log(`\n=== ${done} øvelser ingested ===`);
if (skipped.length) {
  console.log("Sprunget over:");
  for (const s of skipped) console.log(`  · ${s}`);
}
