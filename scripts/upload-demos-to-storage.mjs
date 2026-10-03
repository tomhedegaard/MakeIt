/**
 * Uploader øvelses-demo-filer til Supabase Storage-bucket'en
 * `exercise-demos` (public, oprettet i migration 0033). Biblioteks-
 * øvelsernes loops ligger her i stedet for i public/, så repoet ikke
 * vokser med flere hundrede MB.
 *
 * Standard: filer der allerede findes i bucketen springes over, så en
 * kørsel aldrig ændrer noget, der er live. --overwrite erstatter dem.
 *
 * Har mappen en .done/-mappe (skrevet af ingest-manifest.mjs), uploades
 * kun filer for klip med et mærke dér. Filer fra et klip, der fejlede
 * eller stadig encodes, holdes tilbage: en halvskrevet fil i bucketen
 * ville ellers blive stående, fordi næste kørsel springer den over.
 *
 * Læser NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fra
 * miljøet (.env.local).
 *
 * Brug: MI_DEMO_OUT=<dir> node scripts/upload-demos-to-storage.mjs [--dry] [--overwrite]
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";

// Minimal .env.local-loader (ingen dotenv-dependency nødvendig).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* env allerede sat */ }

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIR = process.env.MI_DEMO_OUT || "/tmp/demo-staging";
const DRY = process.argv.includes("--dry");
const OVERWRITE = process.argv.includes("--overwrite");
const BUCKET = "exercise-demos";
const LIMIT = 5 * 1024 * 1024; // bucketens file_size_limit (migration 0033)
const CONCURRENCY = 8;

if (!URL || !KEY) { console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const TYPE = { webm: "video/webm", mp4: "video/mp4", jpg: "image/jpeg" };
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

/** Alle filnavne i bucketens rod, hentet side for side. */
async function listBucket() {
  const names = new Set();
  for (let offset = 0; ; ) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`kunne ikke liste bucketen: ${error.message}`);
    // Til en tom side: serveren kan give færre end de 1000, der bedes om.
    if (data.length === 0) return names;
    for (const o of data) names.add(o.name);
    offset += data.length;
  }
}

const MEDIA = /(-portrait)?(-poster)?\.(webm|mp4|jpg)$/;
const slugOf = (f) => f.replace(MEDIA, "");
const inDir = (await readdir(DIR)).filter((f) => MEDIA.test(f)).sort();
const doneDir = `${DIR}/.done`;
const done = existsSync(doneDir) ? new Set(await readdir(doneDir)) : null;
const files = done ? inDir.filter((f) => done.has(slugOf(f))) : inDir;
const held = done ? inDir.filter((f) => !done.has(slugOf(f))) : [];
const existing = await listBucket();
const present = files.filter((f) => existing.has(f));
const todo = OVERWRITE ? files : files.filter((f) => !existing.has(f));

console.log(`${files.length} filer i ${DIR} → bucket '${BUCKET}' (${existing.size} objekter i forvejen)`);
console.log(`  findes allerede: ${present.length} ${OVERWRITE ? "(overskrives)" : "(springes over)"}`);
console.log(`  uploades:        ${todo.length}${DRY ? "  (DRY RUN)" : ""}`);
if (held.length) {
  const slugs = [...new Set(held.map(slugOf))];
  console.log(`  holdt tilbage:   ${held.length} filer fra ${slugs.length} klip uden .done-mærke: ${slugs.slice(0, 20).join(", ")}`);
}
if (DRY) {
  if (present.length) console.log("  eksisterende:", present.slice(0, 30).join(", "));
  process.exit(0);
}

let ok = 0;
const fail = [];
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  await Promise.all(
    todo.slice(i, i + CONCURRENCY).map(async (f) => {
      const path = `${DIR}/${f}`;
      const { size } = await stat(path);
      if (size === 0) {
        fail.push(`${f}: tom fil`);
        return;
      }
      if (size > LIMIT) {
        fail.push(`${f}: ${(size / 1024 / 1024).toFixed(1)} MB er over bucketens 5 MB`);
        return;
      }
      const { error } = await supabase.storage.from(BUCKET).upload(f, await readFile(path), {
        contentType: TYPE[f.split(".").pop()],
        upsert: OVERWRITE,
      });
      if (error) fail.push(`${f}: ${error.message}`);
      else ok++;
    }),
  );
  if ((i / CONCURRENCY) % 25 === 0) console.log(`  ${ok}/${todo.length}…`);
}

console.log(`\n✓ ${ok} uploadet, ${fail.length} fejl`);
if (fail.length) { console.log(fail.slice(0, 20).join("\n")); process.exit(1); }
console.log(`Public URL-mønster: ${URL}/storage/v1/object/public/${BUCKET}/<slug>.webm`);
