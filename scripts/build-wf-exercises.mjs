#!/usr/bin/env node
/**
 * Skriver scripts/wf-exercises.mjs: workflow-scriptet der genererer
 * dansk coaching-metadata for en manifest-batch. Workflow-runtime har
 * ingen filadgang, så øvelseslisten og taksonomien sættes ind i
 * skabelonen scripts/wf-exercises.template.txt.
 *
 * Brug:
 *   node scripts/build-wf-exercises.mjs --batch=2026-10
 *   node scripts/build-wf-exercises.mjs --batch=2026-10 --only=<fil med én slug pr. linje>
 *
 * --only bruges til at genkøre de slugs, gen-exercise-seed.mjs afviste.
 */
import { readFile, writeFile } from "node:fs/promises";
import { MUSCLES } from "./lib/exercise-seed.mjs";
import { batchClips, equipmentHint, titleCase } from "./lib/movekit.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const batch = flag("batch");
const only = flag("only");
if (!batch) {
  console.error("Brug: node scripts/build-wf-exercises.mjs --batch=<batch> [--only=<fil>]");
  process.exit(1);
}

const repo = (p) => new URL(`../${p}`, import.meta.url);
const manifest = JSON.parse(await readFile(repo("scripts/movekit-manifest.json"), "utf8"));
const taxonomy = JSON.parse(await readFile(repo("src/lib/data/exercise-taxonomy.json"), "utf8"));

let slugs = batchClips(manifest, batch);
if (only) {
  const pick = new Set(
    (await readFile(only, "utf8"))
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const unknown = [...pick].filter((s) => !slugs.includes(s));
  if (unknown.length) {
    console.error(`--only: ikke i batch ${batch}: ${unknown.join(", ")}`);
    process.exit(1);
  }
  slugs = slugs.filter((s) => pick.has(s));
}
if (slugs.length === 0) {
  console.error(`Ingen klip i batch ${batch}`);
  process.exit(1);
}

const items = slugs.map((slug) => ({ slug, name: titleCase(slug), equipmentHint: equipmentHint(slug) }));
const fill = {
  __COUNT__: String(items.length),
  __AGENTS__: String(Math.ceil(items.length / 10)),
  __ITEMS__: JSON.stringify(items),
  __MUSCLES__: JSON.stringify(MUSCLES),
  __CATEGORIES__: JSON.stringify(taxonomy.categories),
  __PATTERNS__: JSON.stringify(taxonomy.patterns),
  __EQUIPMENT__: JSON.stringify(taxonomy.equipment),
};

let script = await readFile(repo("scripts/wf-exercises.template.txt"), "utf8");
for (const [key, value] of Object.entries(fill)) {
  if (!script.includes(key)) {
    console.error(`Skabelonen mangler pladsholderen ${key}`);
    process.exit(1);
  }
  script = script.replaceAll(key, () => value);
}
await writeFile(repo("scripts/wf-exercises.mjs"), script);

const hinted = items.filter((i) => i.equipmentHint).length;
console.log(`✓ scripts/wf-exercises.mjs: ${items.length} øvelser, ${fill.__AGENTS__} agenter, ${hinted} med redskabshint`);
