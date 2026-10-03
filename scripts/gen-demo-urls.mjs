#!/usr/bin/env node
/**
 * Skriver URL-blokken til en wiring-migration: demo_asset_url for alle
 * biblioteksøvelser i en manifest-batch, pegende på Storage-bucketen
 * `exercise-demos`. resolveDemoAssets() afleder .mp4, poster og
 * portræt-trioen fra .webm-URL'en.
 *
 * Kun rækker uden demo_asset_url sættes, så en coach-upload ikke
 * overskrives ved genkørsel. Blokken afgrænses af BEGIN/END-linjer,
 * som manifest-testen læser.
 *
 * Brug: node scripts/gen-demo-urls.mjs --batch=2026-10
 */
import { readFile } from "node:fs/promises";
import { batchClips } from "./lib/movekit.mjs";

// Produktionsprojektets public bucket (samme base som migration 0053).
const BASE = "https://wtxhsbrtzoukkhhtsqnu.supabase.co/storage/v1/object/public/exercise-demos/";

const batch = process.argv.find((a) => a.startsWith("--batch="))?.slice("--batch=".length);
if (!batch) {
  console.error("Brug: node scripts/gen-demo-urls.mjs --batch=<batch>");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(new URL("./movekit-manifest.json", import.meta.url), "utf8"));
const slugs = batchClips(manifest, batch);
if (slugs.length === 0) {
  console.error(`Ingen klip i batch ${batch}`);
  process.exit(1);
}

const lines = [];
for (let i = 0; i < slugs.length; i += 4) {
  lines.push("    " + slugs.slice(i, i + 4).map((s) => `'${s}'`).join(", "));
}

process.stdout.write(`-- BEGIN demo-urls ${batch}
update public.exercises
set demo_asset_url = '${BASE}' || slug || '.webm'
where demo_asset_url is null
  and slug in (
${lines.join(",\n")}
  );
-- END demo-urls ${batch}
`);
console.error(`✓ ${slugs.length} slugs`);
