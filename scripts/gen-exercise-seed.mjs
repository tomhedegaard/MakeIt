/**
 * Genererer seed-SQL fra workflow'ets øvelses-JSON (struktureret output
 * fra scripts/wf-exercises.mjs). Matcher formatet i
 * supabase/seed-exercises.sql, men sætter is_published=false (draft til
 * Munk-review) og demo_asset_url håndteres separat (video-ingestion).
 *
 * Brug: node scripts/gen-exercise-seed.mjs <exercises.json> > out.sql
 */
import { readFile } from "node:fs/promises";

const MUSCLES = new Set([
  "neck", "chest", "front_delts", "biceps", "forearms", "abs", "obliques",
  "adductors", "quads", "calves_front", "traps", "rear_delts", "lats",
  "triceps", "lower_back", "glutes", "hamstrings", "calves_back",
]);

const src = process.argv[2];
if (!src) { console.error("Brug: node scripts/gen-exercise-seed.mjs <json>"); process.exit(1); }

const data = JSON.parse(await readFile(src, "utf8"));
const list = Array.isArray(data) ? data : data.exercises;
if (!Array.isArray(list)) { console.error("Forventede array eller {exercises:[...]}"); process.exit(1); }

// Postgres single-quote string literal (dobbelt '' for escape).
const q = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;
// Postgres tekst-array literal {a,b,c} — kun gyldige muskel-slugs.
const arr = (a) => {
  const clean = (a || []).filter((m) => MUSCLES.has(m));
  return `'{${clean.join(",")}}'`;
};
// jsonb via dollar-quote (Danish tekst kan indeholde ' men ikke $ex$).
const jsonb = (v) => `$ex$${JSON.stringify(v ?? [])}$ex$`;

const errors = [];
const rows = list.map((e, i) => {
  for (const m of [...(e.primary_muscles || []), ...(e.secondary_muscles || []), ...(e.tertiary_muscles || [])]) {
    if (!MUSCLES.has(m)) errors.push(`${e.slug}: ukendt muskel "${m}"`);
  }
  if (!e.slug) errors.push(`#${i}: mangler slug`);
  const order = 1000 + i * 10;
  return `  (${q(e.slug)}, ${q(e.name)}, ${q(e.category)}, ${q(e.pattern)}, ${q(e.equipment)}, ${q(e.difficulty)},
   ${q(e.primary_muscle)}, ${arr(e.primary_muscles)}, ${arr(e.secondary_muscles)}, ${arr(e.tertiary_muscles)},
   ${q(e.cue)}, ${jsonb(e.cues)}, ${jsonb(e.mistakes)},
   ${q(e.why_matters)}, ${q(e.setup)}, ${q(e.progression)}, ${q(e.regression)},
   ${order}, false)`;
});

if (errors.length) {
  console.error("VALIDERINGSFEJL:\n" + errors.join("\n"));
  process.exit(1);
}

const header = `-- =================================================================
-- MakeIt // HQ — øvelsesbibliotek-udvidelse (${rows.length} MoveKit-øvelser)
-- =================================================================
-- AI-genereret coaching-data (draft) fra MoveKit-biblioteket. ALLE
-- importeres med is_published=false — Munk reviewer og publicerer i
-- batches via coach-fladerne. demo_asset_url sættes separat ved
-- video-ingestion. Muskel-highlighting + cues virker uden video.
--
-- Idempotent: upsert on slug. Genereret af scripts/gen-exercise-seed.mjs.

insert into public.exercises (
  slug, name, category, pattern, equipment, difficulty,
  primary_muscle, primary_muscles, secondary_muscles, tertiary_muscles,
  cue, cues, mistakes,
  why_matters, setup, progression, regression,
  display_order, is_published
) values
`;

const conflict = `
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, pattern = excluded.pattern,
  equipment = excluded.equipment, difficulty = excluded.difficulty,
  primary_muscle = excluded.primary_muscle, primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles, tertiary_muscles = excluded.tertiary_muscles,
  cue = excluded.cue, cues = excluded.cues, mistakes = excluded.mistakes,
  why_matters = excluded.why_matters, setup = excluded.setup,
  progression = excluded.progression, regression = excluded.regression;
`;

process.stdout.write(header + rows.join(",\n") + conflict);
console.error(`✓ ${rows.length} øvelser → SQL`);
