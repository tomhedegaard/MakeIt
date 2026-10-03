/**
 * Genererer seed-SQL fra workflowets øvelses-output (struktureret
 * output fra scripts/wf-exercises.mjs). Alle rækker er kladder
 * (is_published=false); demo_asset_url sættes af en wiring-migration.
 *
 * Brug:
 *   node scripts/gen-exercise-seed.mjs <kilde> [<kilde> …] > out.sql
 *   node scripts/gen-exercise-seed.mjs <kilde> [<kilde> …] --batch=2026-10 \
 *        --after=supabase/migrations/0052_exercise_library_expansion.sql > out.sql
 *
 * En kilde er en JSON-fil (liste eller {exercises:[…]}) eller en
 * workflow-journal (JSON Lines). Flere kilder flettes på slug, og en
 * senere kilde vinder: sådan lægges en genkørt batch oven på den første.
 *
 * --batch      kræver præcis manifest-batchens slugs og fletter
 *              display_order ind mellem rækkerne i --after-migrationerne.
 *              Øvelser med en slug uden for batchen droppes med en advarsel
 *              (en agent, der har ændret en slug; den rigtige meldes som manglende).
 * --rerun-out  skriver de batch-slugs, der fejlede eller mangler, én pr. linje,
 *              klar til build-wf-exercises.mjs --only.
 * Uden --batch: display_order 1000, 1010, … i slug-orden.
 *
 * Valideringsfejl skrives til stderr, én pr. linje med slug forrest, og
 * giver exit 1.
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  mergeExercises,
  parseExerciseSource,
  renderSeed,
  slugsToRerun,
  validateExercises,
} from "./lib/exercise-seed.mjs";
import { batchClips, interleavedOrder, parseSeedOrders } from "./lib/movekit.mjs";

const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith("--"));
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const batch = flag("batch") ?? null;
const after = (flag("after") ?? "").split(",").filter(Boolean);
const rerunOut = flag("rerun-out") ?? null;

if (files.length === 0 || (batch && after.length === 0)) {
  console.error(
    "Brug: node scripts/gen-exercise-seed.mjs <kilde> [<kilde> …] [--batch=<batch> --after=<seed.sql>[,<seed.sql>] [--rerun-out=<fil>]]",
  );
  process.exit(1);
}

const repo = (p) => new URL(`../${p}`, import.meta.url);
const taxonomy = JSON.parse(await readFile(repo("src/lib/data/exercise-taxonomy.json"), "utf8"));

const lists = [];
for (const f of files) lists.push(parseExerciseSource(await readFile(f, "utf8")));
const { merged, conflicts } = mergeExercises(lists);

let batchSlugs = null;
let list = merged;
let clashes = conflicts;
if (batch) {
  batchSlugs = batchClips(JSON.parse(await readFile(repo("scripts/movekit-manifest.json"), "utf8")), batch);
  const inBatch = new Set(batchSlugs);
  const strays = merged.filter((e) => !inBatch.has(e.slug)).map((e) => String(e.slug));
  if (strays.length) {
    console.error(`ADVARSEL: ${strays.length} øvelser uden for batch ${batch} droppes: ${strays.join(", ")}`);
  }
  list = merged.filter((e) => inBatch.has(e.slug));
  clashes = conflicts.filter((slug) => inBatch.has(slug));
}

const errors = [
  ...clashes.map((slug) => `${slug}: står to gange med forskelligt indhold i samme kilde`),
  ...validateExercises(list, { taxonomy, batchSlugs }),
];
if (errors.length) {
  console.error(`VALIDERINGSFEJL (${errors.length}):\n${errors.join("\n")}`);
  if (rerunOut && batchSlugs) {
    const rerun = slugsToRerun(errors, batchSlugs);
    await writeFile(rerunOut, rerun.join("\n") + "\n");
    console.error(`→ ${rerun.length} slugs til genkørsel i ${rerunOut}`);
  }
  process.exit(1);
}

let orderFor = (_e, i) => 1000 + i * 10;
if (batch) {
  const existing = [];
  for (const f of after) existing.push(...parseSeedOrders(await readFile(f, "utf8")));
  if (existing.length === 0) {
    console.error(`--after: ingen rækker fundet i ${after.join(", ")}`);
    process.exit(1);
  }
  orderFor = (e) => interleavedOrder(existing, e.slug);
}

process.stdout.write(renderSeed(list, { orderFor, subtitle: batch ? `batch ${batch}` : null }));
// Nothing left to re-run: an old list from a failed round must not linger.
if (rerunOut) await writeFile(rerunOut, "");
console.error(`✓ ${list.length} øvelser → SQL`);
