/**
 * Uploader øvelses-demo-filer til Supabase Storage-bucket'en
 * `exercise-demos` (public, oprettet i migration 0033). Biblioteks-
 * øvelsernes loops ligger her i stedet for i public/, så repoet ikke
 * vokser med flere hundrede MB.
 *
 * Standard: filer der allerede findes i bucketen springes over, så en
 * kørsel aldrig ændrer noget, der er live. --overwrite erstatter dem.
 *
 * Læser NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fra
 * miljøet (.env.local).
 *
 * Brug: MI_DEMO_OUT=<dir> node scripts/upload-demos-to-storage.mjs [--dry] [--overwrite]
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";

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
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`kunne ikke liste bucketen: ${error.message}`);
    for (const o of data) names.add(o.name);
    if (data.length < 1000) return names;
  }
}

const files = (await readdir(DIR)).filter((f) => /\.(webm|mp4|jpg)$/.test(f)).sort();
const existing = await listBucket();
const present = files.filter((f) => existing.has(f));
const todo = OVERWRITE ? files : files.filter((f) => !existing.has(f));

console.log(`${files.length} filer i ${DIR} → bucket '${BUCKET}' (${existing.size} objekter i forvejen)`);
console.log(`  findes allerede: ${present.length} ${OVERWRITE ? "(overskrives)" : "(springes over)"}`);
console.log(`  uploades:        ${todo.length}${DRY ? "  (DRY RUN)" : ""}`);
if (DRY) {
  if (present.length) console.log("  eksempler på eksisterende:", present.slice(0, 6).join(", "));
  process.exit(0);
}

let ok = 0;
const fail = [];
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  await Promise.all(
    todo.slice(i, i + CONCURRENCY).map(async (f) => {
      const path = `${DIR}/${f}`;
      const { size } = await stat(path);
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
