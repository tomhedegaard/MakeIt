/**
 * Pure logic for turning workflow output into seed SQL: collect, merge,
 * validate, render. No file or process access; gen-exercise-seed.mjs is
 * the thin CLI around it.
 */

/** The app's 18 muscle slugs (src/lib/data/muscle-groups.ts). A test keeps the two in step. */
export const MUSCLES = [
  "neck", "chest", "front_delts", "biceps", "forearms", "abs", "obliques",
  "adductors", "quads", "calves_front", "traps", "rear_delts", "lats",
  "triceps", "lower_back", "glutes", "hamstrings", "calves_back",
];

const looksLikeExercise = (v) =>
  Boolean(v) && typeof v === "object" && typeof v.slug === "string" && Array.isArray(v.cues);

/**
 * Every exercise object found anywhere inside `value`: a workflow
 * result, one line of a workflow journal, or a plain list. Strings that
 * hold JSON are opened too, since a journal may store results that way.
 */
export function collectExercises(value) {
  const found = [];
  const walk = (v) => {
    if (typeof v === "string") {
      if (v.length > 1 && (v[0] === "{" || v[0] === "[")) {
        try {
          walk(JSON.parse(v));
        } catch {
          /* not JSON after all */
        }
      }
    } else if (Array.isArray(v)) {
      if (v.length > 0 && v.every(looksLikeExercise)) found.push(...v);
      else v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(value);
  return found;
}

/** Exercises from a file's text: one JSON document, or JSON Lines (a workflow journal). */
export function parseExerciseSource(text) {
  try {
    return collectExercises(JSON.parse(text));
  } catch {
    const found = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        found.push(...collectExercises(JSON.parse(line)));
      } catch {
        /* a line that is not JSON */
      }
    }
    return found;
  }
}

/**
 * One list per source file; a later file wins on slug, which is how a
 * re-run batch replaces the first attempt. An exact duplicate inside
 * one file is fine (a journal can hold the same result twice). The
 * same slug with different content inside one file is a conflict,
 * unless a later file holds that slug cleanly and so settles it.
 */
export function mergeExercises(lists) {
  const bySlug = new Map();
  const conflicts = new Set();
  for (const list of lists) {
    const local = new Map();
    const clashed = new Set();
    for (const e of list) {
      const prev = local.get(e.slug);
      if (prev && JSON.stringify(prev) !== JSON.stringify(e)) clashed.add(e.slug);
      local.set(e.slug, e);
    }
    for (const [slug, e] of local) {
      bySlug.set(slug, e);
      if (clashed.has(slug)) conflicts.add(slug);
      else conflicts.delete(slug);
    }
  }
  const merged = [...bySlug.values()].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { merged, conflicts: [...conflicts].sort() };
}

const TEXT_FIELDS = ["name", "primary_muscle", "cue", "why_matters", "setup", "progression", "regression"];
const ENUM_FIELDS = [
  ["categories", "category"],
  ["patterns", "pattern"],
  ["equipment", "equipment"],
  ["difficulty", "difficulty"],
];
/** Categories that only go with their own patterns, and patterns that only go with them. */
const PAIRED = { mobility: ["mobility"], cardio: ["conditioning"], power: ["jump", "olympic"] };

const blank = (v) => typeof v !== "string" || v.trim() === "";

/**
 * Readable errors for everything that would make the seed wrong, each
 * starting with the slug it concerns. `taxonomy` is
 * src/lib/data/exercise-taxonomy.json. With `batchSlugs` the list must
 * hold exactly those slugs.
 * @param {any[]} list
 * @param {{ taxonomy: Record<string, string[]>, batchSlugs?: string[] | null }} options
 * @returns {string[]}
 */
export function validateExercises(list, { taxonomy, batchSlugs = null }) {
  const errors = [];
  const muscles = new Set(MUSCLES);
  const batch = batchSlugs ? new Set(batchSlugs) : null;

  list.forEach((e, i) => {
    const id = typeof e.slug === "string" && e.slug ? e.slug : `#${i}`;
    if (typeof e.slug !== "string" || !/^[a-z0-9-]+$/.test(e.slug)) {
      errors.push(`${id}: ugyldig eller manglende slug`);
      return;
    }
    if (batch && !batch.has(e.slug)) {
      errors.push(`${id}: hører ikke til batchen`);
      return;
    }
    for (const [group, field] of ENUM_FIELDS) {
      if (!taxonomy[group].includes(e[field])) errors.push(`${id}: ukendt ${field} "${e[field]}"`);
    }
    for (const tier of ["primary_muscles", "secondary_muscles", "tertiary_muscles"]) {
      for (const m of e[tier] ?? []) {
        if (!muscles.has(m)) errors.push(`${id}: ukendt muskel "${m}" i ${tier}`);
      }
    }
    if (!Array.isArray(e.primary_muscles) || e.primary_muscles.length === 0) {
      errors.push(`${id}: mangler primary_muscles`);
    }
    for (const f of TEXT_FIELDS) if (blank(e[f])) errors.push(`${id}: tomt felt ${f}`);
    if (!Array.isArray(e.cues) || e.cues.length < 4 || e.cues.some(blank)) {
      errors.push(`${id}: cues skal være mindst 4 ikke-tomme tekster`);
    }
    if (
      !Array.isArray(e.mistakes) ||
      e.mistakes.length < 2 ||
      e.mistakes.some((m) => !m || blank(m.title) || blank(m.body))
    ) {
      errors.push(`${id}: mistakes skal være mindst 2 med title og body`);
    }
    const text = JSON.stringify(e);
    if (text.includes("$ex$")) errors.push(`${id}: tekst indeholder "$ex$", som bryder SQL-citeringen`);
    // House style for member-facing copy (the app copy gate): no em or en dashes.
    if (/[–—]/.test(text)) errors.push(`${id}: tekst indeholder tankestreg`);
    const wants = PAIRED[e.category];
    const owner = Object.keys(PAIRED).find((c) => PAIRED[c].includes(e.pattern));
    if (taxonomy.categories.includes(e.category) && taxonomy.patterns.includes(e.pattern)) {
      if ((wants && !wants.includes(e.pattern)) || (owner && owner !== e.category)) {
        errors.push(`${id}: kategori "${e.category}" og mønster "${e.pattern}" passer ikke sammen`);
      }
    }
  });

  if (batch) {
    const have = new Set(list.map((e) => e.slug));
    for (const slug of batchSlugs) if (!have.has(slug)) errors.push(`${slug}: mangler i JSON`);
  }
  return errors;
}

/**
 * The batch slugs that validation errors start with: the ones a re-run
 * must produce again. Errors about anything else are left out.
 * @param {string[]} errors
 * @param {string[]} batchSlugs
 * @returns {string[]}
 */
export function slugsToRerun(errors, batchSlugs) {
  const batch = new Set(batchSlugs);
  const named = errors.map((e) => e.slice(0, Math.max(0, e.indexOf(":"))));
  return [...new Set(named)].filter((slug) => batch.has(slug)).sort();
}

// Postgres single-quote string literal ('' escapes a quote).
const q = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;
// Postgres text-array literal {a,b,c}.
const arr = (a) => `'{${(a ?? []).join(",")}}'`;
// jsonb via dollar-quote: Danish text can hold ' but never $ex$ (validated).
const jsonb = (v) => `$ex$${JSON.stringify(v ?? [])}$ex$`;

function renderRow(e, order) {
  return `  (${q(e.slug)}, ${q(e.name)}, ${q(e.category)}, ${q(e.pattern)}, ${q(e.equipment)}, ${q(e.difficulty)},
   ${q(e.primary_muscle)}, ${arr(e.primary_muscles)}, ${arr(e.secondary_muscles)}, ${arr(e.tertiary_muscles)},
   ${q(e.cue)}, ${jsonb(e.cues)}, ${jsonb(e.mistakes)},
   ${q(e.why_matters)}, ${q(e.setup)}, ${q(e.progression)}, ${q(e.regression)},
   ${order}, false)`;
}

/**
 * The whole seed migration. `orderFor(exercise, index)` gives each row
 * its display_order. Drafts only: is_published=false on insert, and the
 * conflict clause never touches is_published, demo_asset_url or
 * display_order, so a re-run cannot unpublish or reorder anything.
 * @param {any[]} list
 * @param {{ orderFor: (exercise: any, index: number) => number, subtitle?: string | null }} options
 * @returns {string}
 */
export function renderSeed(list, { orderFor, subtitle = null }) {
  const header = `-- =================================================================
-- MakeIt // HQ — øvelsesbibliotek-udvidelse (${list.length} MoveKit-øvelser${subtitle ? `, ${subtitle}` : ""})
-- =================================================================
-- AI-genereret coaching-data (draft) fra MoveKit-biblioteket. ALLE
-- importeres med is_published=false — Munk reviewer og publicerer i
-- batches via coach-fladerne. demo_asset_url sættes separat ved
-- video-ingestion. Muskel-highlighting + cues virker uden video.
--
-- Idempotent: upsert on slug. Genereret af scripts/gen-exercise-seed.mjs.
-- En genkørsel overskriver tekstfelterne, også en coach' rettelser;
-- is_published, demo_asset_url og display_order røres ikke.

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
  return header + list.map((e, i) => renderRow(e, orderFor(e, i))).join(",\n") + conflict;
}
