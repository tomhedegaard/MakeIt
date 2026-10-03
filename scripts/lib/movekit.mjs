/**
 * Pure helpers for the MoveKit pipeline: no file or process access.
 * The scripts in scripts/ and the vitest suite both import from here.
 *
 * Manifest shape (scripts/movekit-manifest.json):
 *   { clips: [{ clip, width, height, duration, redPixels, highlight,
 *               core: string[], library: string | null,
 *               skipped: string | null, missing?: true }] }
 */

/** "trap-bar-deadlift" -> "Trap Bar Deadlift". The workflow agents polish casing (EZ, TRX). */
export function titleCase(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

const token = (words) => new RegExp(`(^|-)(${words})(-|$)`);

/**
 * First match wins, so order matters: an explicit implement beats a
 * generic word ("barbell-hack-squat" is barbell), and cardio machines
 * are tested before "machine" ("rowing-machine-steady-state").
 */
const EQUIPMENT_RULES = [
  ["trap-bar", token("trap-bar")],
  ["machine", token("smith-machine")],
  ["barbell", token("barbell|ez-bar|landmine")],
  ["dumbbell", token("dumbbell")],
  ["kettlebell", token("kettlebell")],
  ["cable", token("cable")],
  ["band", token("band|banded")],
  ["sled", token("sled")],
  ["suspension", token("trx")],
  [
    "cardio-machine",
    token("treadmill|assault-bike|elliptical|ski-erg|stair-climber|versaclimber|arc-trainer|rowing|cycling|spin|ride"),
  ],
  ["machine", token("machine|hammer-strength|selectorized|pendulum|lever|leg-press|pec-deck|captains-chair")],
  ["accessory", token("medicine-ball|wall-ball|stability-ball|plate|jump-rope|battle-ropes|slider|wrist-roller")],
  ["bodyweight", token("bodyweight|towel|backpack|broomstick|foam-roller")],
];

/**
 * The equipment a slug names, or null when it names none. Advisory: the agent may overrule it.
 * @param {string} slug
 * @returns {string | null}
 */
export function equipmentHint(slug) {
  for (const [equipment, re] of EQUIPMENT_RULES) if (re.test(slug)) return equipment;
  return null;
}

/** Clips that are library exercises in `batch`, sorted. Clips gone from disk are left out. */
export function batchClips(manifest, batch) {
  return manifest.clips
    .filter((c) => c.library === batch && !c.missing)
    .map((c) => c.clip)
    .sort();
}

/** Clips on disk with no role: not a core source, not a library exercise, not skipped. */
export function unassigned(manifest) {
  return manifest.clips
    .filter((c) => !c.missing && c.core.length === 0 && !c.library && !c.skipped)
    .map((c) => c.clip);
}

/** Core exercise slugs per source clip, from scripts/movekit-map.json. */
export function coreByClip(map) {
  const out = new Map();
  for (const e of map.exercises) {
    if (!e.movekit) continue;
    out.set(e.movekit, [...(out.get(e.movekit) ?? []), e.slug].sort());
  }
  return out;
}

/** Every rule the ledger must hold. Returns readable errors; an empty list means valid. */
export function validateManifest(manifest, map) {
  const errors = [];
  const seen = new Set();
  const core = coreByClip(map);
  for (const c of manifest.clips) {
    if (seen.has(c.clip)) errors.push(`${c.clip}: står to gange`);
    seen.add(c.clip);
    if (c.skipped && (c.core.length > 0 || c.library)) {
      errors.push(`${c.clip}: skipped kan ikke også være core eller library`);
    }
    const want = core.get(c.clip) ?? [];
    if (JSON.stringify([...c.core].sort()) !== JSON.stringify(want)) {
      errors.push(`${c.clip}: core ${JSON.stringify(c.core)} matcher ikke movekit-map ${JSON.stringify(want)}`);
    }
  }
  for (const clip of core.keys()) {
    if (!seen.has(clip)) errors.push(`${clip}: står i movekit-map men ikke i manifestet`);
  }
  return errors;
}

/**
 * (slug, display_order) for every row of a seed migration written by
 * gen-exercise-seed.mjs. A row starts with "  ('slug'," and ends with a
 * line "   <order>, false)".
 */
export function parseSeedOrders(sql) {
  const rows = [];
  const re = /^\s*\('([a-z0-9-]+)',[\s\S]*?^\s*(\d+), (?:true|false)\)/gm;
  for (const m of sql.matchAll(re)) rows.push({ slug: m[1], order: Number(m[2]) });
  return rows;
}

/**
 * display_order for a new slug so it sorts next to its alphabetical
 * neighbours among the existing library rows without renumbering them.
 * The first import numbered its rows in steps of 10; a later row takes
 * the slot 5 above the closest preceding slug, or 995 when none
 * precedes it. Rows that share a slot are ordered by name in the app
 * (the list's secondary sort), so a predecessor that already sits in
 * such a slot is joined there rather than passed. A slug that is
 * already seeded keeps its order.
 */
export function interleavedOrder(existing, slug) {
  let best = null;
  for (const row of existing) {
    if (row.slug === slug) return row.order;
    if (row.slug < slug && (best === null || row.slug > best.slug)) best = row;
  }
  if (best === null) return 995;
  return best.order % 10 === 0 ? best.order + 5 : best.order;
}
