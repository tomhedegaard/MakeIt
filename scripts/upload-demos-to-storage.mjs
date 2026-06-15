/**
 * Uploader øvelses-demo-trioer til Supabase Storage-bucket'en
 * `exercise-demos` (public, oprettet i migration 0033). Bruges til
 * biblioteks-udvidelsen (188 øvelser) hvor public/-bundling ville
 * bloate repoet — Storage holder ~57 MB ude af git, og bucket'en er
 * bygget til præcis dette (coach-uploaderen bruger samme bucket).
 *
 * Læser NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fra
 * miljøet (.env.local). Idempotent: upsert pr. fil.
 *
 * Brug: MI_DEMO_OUT=/tmp/demo-staging node scripts/upload-demos-to-storage.mjs [--dry]
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
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
const BUCKET = "exercise-demos";

if (!URL || !KEY) { console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const TYPE = { webm: "video/webm", mp4: "video/mp4", jpg: "image/jpeg" };

const files = (await readdir(DIR)).filter((f) => /\.(webm|mp4|jpg)$/.test(f));
console.log(`${files.length} filer fra ${DIR} → bucket '${BUCKET}'${DRY ? " (DRY RUN)" : ""}`);
if (DRY) { console.log("Eksempler:", files.slice(0, 6).join(", ")); process.exit(0); }

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

let ok = 0;
const fail = [];
const CONCURRENCY = 8;
for (let i = 0; i < files.length; i += CONCURRENCY) {
  const slice = files.slice(i, i + CONCURRENCY);
  await Promise.all(slice.map(async (f) => {
    const ext = f.split(".").pop();
    const body = await readFile(`${DIR}/${f}`);
    const { error } = await supabase.storage.from(BUCKET).upload(f, body, {
      contentType: TYPE[ext], upsert: true,
    });
    if (error) fail.push(`${f}: ${error.message}`);
    else ok++;
  }));
  if (ok % 60 < CONCURRENCY) console.log(`${ok}/${files.length}...`);
}

console.log(`\n✓ ${ok} uploadet, ${fail.length} fejl`);
if (fail.length) { console.log(fail.slice(0, 10).join("\n")); process.exit(1); }
console.log(`Public URL-mønster: ${URL}/storage/v1/object/public/${BUCKET}/<slug>.webm`);
