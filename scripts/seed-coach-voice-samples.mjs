#!/usr/bin/env node
/**
 * scripts/seed-coach-voice-samples.mjs
 *
 * Seeds the coach_voice_samples pool from a JSON file Munk curates.
 * Idempotent: clears the pool and re-inserts each run, so the JSON
 * is the canonical source of truth — edit there, re-run here.
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §6
 *
 * Curation flow:
 *   1. Copy docs/coach-voice-samples.example.json to (gitignored)
 *      docs/coach-voice-samples.local.json
 *   2. Replace STUB entries with real Munk replies (20-30 total,
 *      balanced across the four tones)
 *   3. Run:  npm run seed:voice-samples
 *
 * Without a curated .local.json file, falls back to the .example.json
 * STUBS so the seed step doesn't fail in CI / fresh dev environments
 * — but the draft cron will then speak in generic-coaching-app voice
 * until Munk curates real samples.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error(
    "ERROR: SUPABASE_SERVICE_ROLE_KEY required.\n" +
      "Run `supabase status` and export it, or source .env.local."
  );
  process.exit(1);
}

// Prefer the curated .local.json (gitignored). Fall back to the
// example with STUBS so the script is safe to run anywhere.
const LOCAL_PATH = resolve(REPO_ROOT, "docs/coach-voice-samples.local.json");
const EXAMPLE_PATH = resolve(REPO_ROOT, "docs/coach-voice-samples.example.json");

const sourcePath = existsSync(LOCAL_PATH) ? LOCAL_PATH : EXAMPLE_PATH;
const isStubMode = sourcePath === EXAMPLE_PATH;

console.log(`Reading samples from: ${sourcePath}`);
if (isStubMode) {
  console.warn(
    "⚠️  Using EXAMPLE file with STUB samples. The draft cron will\n" +
      "   produce generic-coaching-app voice until Munk curates real\n" +
      "   replies into docs/coach-voice-samples.local.json.\n"
  );
}

const raw = JSON.parse(readFileSync(sourcePath, "utf8"));
if (!Array.isArray(raw.samples)) {
  console.error("Source file missing 'samples' array");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve exercise_slug → exercise_id once; cheaper than per-row lookup.
const slugs = [
  ...new Set(
    raw.samples
      .map((s) => s.exercise_slug)
      .filter((slug) => typeof slug === "string" && slug.length > 0)
  ),
];
const exerciseIdBySlug = new Map();
if (slugs.length > 0) {
  const { data: exRows, error: exErr } = await sb
    .from("exercises")
    .select("id, slug")
    .in("slug", slugs);
  if (exErr) {
    console.error("exercises lookup:", exErr.message);
    process.exit(1);
  }
  for (const row of exRows ?? []) {
    exerciseIdBySlug.set(row.slug, row.id);
  }
  const missing = slugs.filter((s) => !exerciseIdBySlug.has(s));
  if (missing.length > 0) {
    console.warn(`Unknown exercise slugs (samples kept with null exercise_id): ${missing.join(", ")}`);
  }
}

// Wipe + re-insert. JSON is source of truth.
const { error: delErr } = await sb
  .from("coach_voice_samples")
  .delete()
  .gte("created_at", "1970-01-01"); // match all
if (delErr) {
  console.error("delete existing:", delErr.message);
  process.exit(1);
}

const rows = raw.samples.map((s) => ({
  reply_text: s.reply_text,
  tone: s.tone,
  exercise_id: s.exercise_slug
    ? (exerciseIdBySlug.get(s.exercise_slug) ?? null)
    : null,
  notes: s.notes ?? null,
}));

// Validate before insert so bad data surfaces with a clear error
// instead of a Postgres CHECK violation halfway through.
const VALID_TONES = new Set(["encouraging", "corrective", "terse", "playful"]);
for (const [i, row] of rows.entries()) {
  if (typeof row.reply_text !== "string" || row.reply_text.length < 5) {
    console.error(`sample ${i}: reply_text must be a non-trivial string`);
    process.exit(1);
  }
  if (!VALID_TONES.has(row.tone)) {
    console.error(`sample ${i}: tone "${row.tone}" not in ${[...VALID_TONES].join(",")}`);
    process.exit(1);
  }
}

const { error: insErr } = await sb.from("coach_voice_samples").insert(rows);
if (insErr) {
  console.error("insert:", insErr.message);
  process.exit(1);
}

console.log(`✅ Seeded ${rows.length} voice samples.`);

// Quick tone-balance summary so curator can spot uneven coverage.
const counts = rows.reduce((acc, r) => {
  acc[r.tone] = (acc[r.tone] ?? 0) + 1;
  return acc;
}, {});
console.log("Tone distribution:");
for (const tone of ["encouraging", "corrective", "terse", "playful"]) {
  console.log(`  ${tone.padEnd(12)} ${counts[tone] ?? 0}`);
}
