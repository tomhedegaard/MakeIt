# MoveKit 577: hele pakken ind i øvelsesbiblioteket · implementeringsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De 369 ubrugte klip i den opdaterede MoveKit-pakke bliver biblioteksøvelser (kladder med video og dansk coaching-tekst), de 20 kerneøvelser får alle et rigtigt klip, og biblioteket får søgning og redskabsfilter.

**Architecture:**
- Ét manifest, `scripts/movekit-manifest.json`, er ledger over pakken. Alle scripts (workflow-generator, seed-generator, video-ingestion, URL-migration) læser batchen `2026-10` derfra. Ren logik ligger i `scripts/lib/movekit.mjs` og testes med vitest.
- Taksonomien (kategorier, mønstre, redskaber) flyttes til én JSON-fil, som app, tests og scripts deler.
- Data lander i to idempotente migrationer (0066 seed, 0067 wiring) uden skemaændring. Video ligger i Supabase Storage for biblioteket og i `public/exercise-demos/` for kerneøvelserne.
- UI-ændringerne er server-renderede med URL-parametre; eneste nye klientkode er en formular, der submitter ved ændring.

**Tech Stack:** Next.js 16.2 App Router (læs `node_modules/next/dist/docs/` før du rører Next-API'er, jf. AGENTS.md), React 19, next-intl 4, Supabase (Postgres + Storage), vitest 3 (node-miljø, kun `src/**/*.test.ts(x)`), ffmpeg/ffprobe, Node-scripts som ESM (`.mjs`).

**Spec:** [`../specs/2026-10-03-movekit-577-library-design.md`](../specs/2026-10-03-movekit-577-library-design.md)
**Branch:** `claude/movekit-577-library` fra `main` @ `814c6f0`. Arbejd i hovedcheckoutet: kildeklippene ligger i `MoveKit/` (gitignored, 1,9 GB) og findes ikke i et worktree.
**Commits:** små og atomare, conventional med dansk tekst, og denne trailer:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

**Stop-punkter:** kør aldrig `supabase db push`, og merge ikke. Begge er Toms.

**Operatør-trin:** trin mærket **[operatør]** køres af hovedsessionen, ikke af en subagent. Det er de langvarige eller udadvendte kørsler: audit over 577 klip, video-encoding, workflow-kørslen og Storage-uploaden.

---

## Verificeret i koden (2026-10-03)

| Fakta | Kilde |
|---|---|
| `MoveKit/` rummer 577 `.mp4` i 1936×1072; `movekit/` er samme mappe | `ls -id MoveKit movekit` |
| 0052 har 188 rækker i slug-orden med `display_order` 1000–2870 i trin på 10; hver række slutter med en linje `   <tal>, false)` | `supabase/migrations/0052_exercise_library_expansion.sql` |
| Kerneøvelserne har `display_order` 10–200 | live DB |
| vitest kører kun `src/**/*.test.ts(x)`; `allowJs` og `resolveJsonModule` er slået til | `vitest.config.ts`, `tsconfig.json` |
| ESLint dækker `scripts/` og ignorerer `MoveKit/**` | `eslint.config.mjs` |
| `ingest-exercise-demo.mjs <src> <slug>` skriver `{slug}.webm`, `.mp4`, `-poster.jpg` til `MI_DEMO_OUT` (default `public/exercise-demos/`) | `scripts/ingest-exercise-demo.mjs:44-48` |
| `make-portrait-demo.mjs <src> <slug>` skriver portrættrioen til `MI_DEMO_OUT` (default `public/exercise-demos`) | `scripts/make-portrait-demo.mjs:164` |
| `upload-demos-to-storage.mjs` uploader alle `.webm/.mp4/.jpg` i `MI_DEMO_OUT` med `upsert: true` | `scripts/upload-demos-to-storage.mjs` |
| Bucketen `exercise-demos` har 5 MB-grænse og rummer 1182 objekter | migration 0033, Storage-listing |
| `exercise-meta.test.ts` har en håndskrevet `CATALOGUE` og bruger `sled` som eksempel på en værdi uden label | `src/lib/data/exercise-meta.test.ts` |
| `Train.categories` og `Train.equipment` findes på dansk og engelsk | `messages/{da,en}/Train.json` |

**Staging-mappe til encodede filer:** `MoveKit/.staging/2026-10/`. Den er gitignored og ESLint-ignoreret via `MoveKit/`, overlever sessionen, og hverken audit eller `make-portrait-demo --storage` ser den, da de kun læser `.mp4` i mappens rod.

---

## Filstruktur

| Fil | Ansvar | Chunk |
|---|---|---|
| `src/lib/data/exercise-taxonomy.json` (ny) | Kategorier, mønstre, redskaber, sværhedsgrader i visningsorden | 1 |
| `src/lib/data/exercise-taxonomy.ts` (ny) | Typet adgang, `orderByTaxonomy`, `groupByCategory` | 1 |
| `scripts/lib/movekit.mjs` (ny) | Ren pipeline-logik: titel, redskabshint, manifest-regler, seed-parsing, flettet `display_order` | 1 |
| `scripts/movekit-audit.mjs` (ny) | Måler klip, fletter og skriver manifestet, rapporterer | 1 |
| `scripts/movekit-manifest.json` (ny, genereret) | Ledger over pakken | 1 |
| `scripts/movekit-map.json` | Kerneøvelse til kildeklip | 1 |
| `scripts/ingest-manifest.mjs` (ny) | Encoder en batch til staging, genoptageligt | 2 |
| `scripts/upload-demos-to-storage.mjs` | Upload der springer eksisterende over | 2 |
| `public/exercise-demos/*`, `bundled-demo-assets.ts`, seeds, tests | Kerneøvelsernes loops | 2 |
| `scripts/wf-exercises.template.txt` (ny), `scripts/build-wf-exercises.mjs` (ny), `scripts/wf-exercises.mjs` (genereret) | Workflow-script fra manifestet | 3 |
| `scripts/lib/exercise-seed.mjs` (ny), `scripts/gen-exercise-seed.mjs` | JSON til seed-SQL med validering | 3 |
| `scripts/gen-demo-urls.mjs` (ny) | URL-blokken til 0067 | 4 |
| `supabase/migrations/0066_…`, `0067_…` (nye) | Seed og wiring | 4 |
| `src/lib/data/exercises.ts`, `exercise-library-url.ts` (ny) | Søgning, facetter, URL-bygger | 5 |
| `src/app/(app)/train/exercises/page.tsx`, `LibraryFilterForm.tsx` (ny) | Bibliotekets filtre | 5 |
| `src/app/coach/exercises/review/page.tsx`, `src/lib/coach/review-queue.ts` | Kategori-filter i review-køen | 5 |
| `ExerciseEditor.tsx`, `ProgramBuilder.tsx` | Taksonomi i coach-fladerne | 5 |

---

## Chunk 1: Taksonomi og manifest

Efter denne chunk findes taksonomien, og manifestet over de 577 klip er skrevet og testet.

### Task 1: Taksonomien som én kilde

**Files:**
- Create: `src/lib/data/exercise-taxonomy.json`
- Create: `src/lib/data/exercise-taxonomy.ts`
- Create: `src/lib/data/exercise-taxonomy.test.ts`
- Modify: `src/lib/data/exercise-meta.test.ts`
- Modify: `messages/da/Train.json`, `messages/en/Train.json`

- [ ] **Step 1: Skriv de fejlende tests**

`src/lib/data/exercise-taxonomy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TAXONOMY, groupByCategory, orderByTaxonomy } from "./exercise-taxonomy";

describe("TAXONOMY", () => {
  it("has no duplicate values in any group", () => {
    for (const [group, values] of Object.entries(TAXONOMY)) {
      expect(new Set(values).size, group).toBe(values.length);
    }
  });

  it("carries the categories and equipment added with the 2026-10 MoveKit pack", () => {
    expect(TAXONOMY.categories).toEqual(expect.arrayContaining(["power", "mobility", "cardio"]));
    expect(TAXONOMY.equipment).toEqual(
      expect.arrayContaining(["trap-bar", "sled", "suspension", "cardio-machine", "accessory"]),
    );
    expect(TAXONOMY.patterns).toEqual(expect.arrayContaining(["jump", "olympic", "mobility", "conditioning"]));
  });
});

describe("orderByTaxonomy", () => {
  it("orders by the taxonomy, drops duplicates and puts unknown values last, alphabetically", () => {
    expect(orderByTaxonomy("categories", ["cardio", "zeta", "arms", "lower-body", "arms", "alpha"])).toEqual([
      "lower-body",
      "arms",
      "cardio",
      "alpha",
      "zeta",
    ]);
  });

  it("returns an empty list for no values", () => {
    expect(orderByTaxonomy("equipment", [])).toEqual([]);
  });
});

describe("groupByCategory", () => {
  it("groups in taxonomy order, names alphabetical, unknown categories then uncategorised last", () => {
    const groups = groupByCategory([
      { name: "Tempo Run", category: "cardio" },
      { name: "Back Squat", category: "lower-body" },
      { name: "Air Squat", category: "lower-body" },
      { name: "Mystery", category: "odd" },
      { name: "No Category", category: null },
    ]);
    expect(groups.map((g) => g.category)).toEqual(["lower-body", "cardio", "odd", null]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Air Squat", "Back Squat"]);
  });

  it("does not mutate its input", () => {
    const input = [
      { name: "B", category: "arms" },
      { name: "A", category: "arms" },
    ];
    groupByCategory(input);
    expect(input.map((i) => i.name)).toEqual(["B", "A"]);
  });
});
```

I `src/lib/data/exercise-meta.test.ts`: erstat den håndskrevne `CATALOGUE` med taksonomien, og lad fallback-testen bruge en værdi uden for taksonomien.

Tilføj importen under de eksisterende:

```ts
import { TAXONOMY } from "./exercise-taxonomy";
```

Erstat hele `const CATALOGUE = { … };`-blokken med:

```ts
const CATALOGUE = {
  categories: TAXONOMY.categories,
  equipment: TAXONOMY.equipment,
  difficulty: TAXONOMY.difficulty,
};
```

Erstat den sidste test med:

```ts
  it("falls back to the raw value when a new one has no translation yet", () => {
    expect(
      exerciseMetaLabels(translator(da), { category: null, equipment: "hoverboard", difficulty: null }),
    ).toEqual(["hoverboard"]);
  });
```

- [ ] **Step 2: Kør testene og se dem fejle**

Run: `npx vitest run src/lib/data/exercise-taxonomy.test.ts src/lib/data/exercise-meta.test.ts`
Expected: FAIL. Begge filer fejler på importen af `./exercise-taxonomy`, som ikke findes endnu.

- [ ] **Step 3: Skriv taksonomien**

`src/lib/data/exercise-taxonomy.json`:

```json
{
  "categories": [
    "lower-body",
    "upper-body-push",
    "upper-body-pull",
    "shoulders",
    "arms",
    "core",
    "full-body",
    "power",
    "mobility",
    "cardio"
  ],
  "patterns": [
    "squat",
    "hinge",
    "lunge",
    "push-horizontal",
    "push-vertical",
    "pull-horizontal",
    "pull-vertical",
    "core",
    "isolation",
    "carry",
    "jump",
    "olympic",
    "mobility",
    "conditioning"
  ],
  "equipment": [
    "barbell",
    "dumbbell",
    "kettlebell",
    "cable",
    "machine",
    "band",
    "bodyweight",
    "trap-bar",
    "sled",
    "suspension",
    "cardio-machine",
    "accessory"
  ],
  "difficulty": ["beginner", "intermediate", "advanced"]
}
```

`src/lib/data/exercise-taxonomy.ts`:

```ts
import taxonomy from "./exercise-taxonomy.json";

export type TaxonomyGroup = keyof typeof taxonomy;

/**
 * The catalogue's enums in display order. One source for the coach
 * editor, the library filters, the label tests and the MoveKit scripts
 * (which read the JSON file directly). The database has no check
 * constraints on these columns, so a value outside the lists can still
 * appear; callers treat it as "unknown" rather than invalid.
 */
export const TAXONOMY: Record<TaxonomyGroup, readonly string[]> = taxonomy;

/** Unique values in taxonomy order; values the taxonomy does not know come last, alphabetically. */
export function orderByTaxonomy(group: TaxonomyGroup, values: Iterable<string>): string[] {
  const present = new Set(values);
  const order = TAXONOMY[group];
  const known = order.filter((v) => present.has(v));
  const unknown = [...present].filter((v) => !order.includes(v)).sort((a, b) => a.localeCompare(b, "en"));
  return [...known, ...unknown];
}

export type CategoryGroup<T> = { category: string | null; items: T[] };

/**
 * Items bucketed by category for a grouped picker: taxonomy order,
 * unknown categories after the known ones, uncategorised last. Items
 * are sorted by name inside each group. The input is not mutated.
 */
export function groupByCategory<T extends { name: string; category: string | null }>(
  items: readonly T[],
): CategoryGroup<T>[] {
  const buckets = new Map<string | null, T[]>();
  for (const item of items) {
    const key = item.category || null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  // A fixed locale: the grouped picker renders on the server and hydrates in the browser.
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "en");
  const named = orderByTaxonomy(
    "categories",
    [...buckets.keys()].filter((k): k is string => k !== null),
  );
  const groups: CategoryGroup<T>[] = named.map((category) => ({
    category,
    items: [...(buckets.get(category) ?? [])].sort(byName),
  }));
  const uncategorised = buckets.get(null);
  if (uncategorised) groups.push({ category: null, items: [...uncategorised].sort(byName) });
  return groups;
}
```

- [ ] **Step 4: Tilføj labels**

I `messages/da/Train.json` skal `categories` og `equipment` ende sådan (de eksisterende nøgler er uændrede, de nye står sidst):

```json
  "categories": {
    "lower-body": "Ben",
    "upper-body-push": "Push",
    "upper-body-pull": "Pull",
    "full-body": "Helkrop",
    "shoulders": "Skuldre",
    "arms": "Arme",
    "core": "Core",
    "power": "Power",
    "mobility": "Mobilitet",
    "cardio": "Kondition"
  },
```

```json
  "equipment": {
    "barbell": "Vægtstang",
    "dumbbell": "Håndvægt",
    "kettlebell": "Kettlebell",
    "cable": "Kabel",
    "machine": "Maskine",
    "band": "Elastik",
    "bodyweight": "Kropsvægt",
    "trap-bar": "Trap bar",
    "sled": "Slæde",
    "suspension": "Slynge",
    "cardio-machine": "Kardiomaskine",
    "accessory": "Småudstyr"
  },
```

I `messages/en/Train.json` tilføjes de samme nøgler sidst i de to objekter. Læs filen først og behold de eksisterende engelske labels som de er:

```json
    "power": "Power",
    "mobility": "Mobility",
    "cardio": "Cardio"
```

```json
    "trap-bar": "Trap bar",
    "sled": "Sled",
    "suspension": "Suspension",
    "cardio-machine": "Cardio machine",
    "accessory": "Accessories"
```

- [ ] **Step 5: Kør testene og se dem bestå**

Run: `npx vitest run src/lib/data/exercise-taxonomy.test.ts src/lib/data/exercise-meta.test.ts`
Expected: PASS, 2 filer. `exercise-meta`-testen "has a da/en label for every value in the live catalogue" dækker nu også de nye værdier.

Run: `npx vitest run src/lib/i18n/app-copy-gate.test.ts`
Expected: PASS. Paritetstesten mellem dansk og engelsk er stadig grøn, fordi begge sprog fik de samme nøgler, og de nye labels har ingen tankestreger.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/exercise-taxonomy.json src/lib/data/exercise-taxonomy.ts src/lib/data/exercise-taxonomy.test.ts src/lib/data/exercise-meta.test.ts messages/da/Train.json messages/en/Train.json
git commit -m "feat(exercises): taksonomien som én kilde, med Power, Mobilitet og Kondition

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Ren pipeline-logik i `scripts/lib/movekit.mjs`

**Files:**
- Create: `scripts/lib/movekit.mjs`
- Create: `src/lib/data/movekit-lib.test.ts`

- [ ] **Step 1: Skriv de fejlende tests**

`src/lib/data/movekit-lib.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  batchClips,
  coreByClip,
  equipmentHint,
  interleavedOrder,
  parseSeedOrders,
  titleCase,
  unassigned,
  validateManifest,
} from "../../../scripts/lib/movekit.mjs";

const clip = (over: Record<string, unknown>) => ({
  clip: "x",
  core: [] as string[],
  library: null as string | null,
  skipped: null as string | null,
  ...over,
});

describe("titleCase", () => {
  it("turns a slug into a display name", () => {
    expect(titleCase("trap-bar-deadlift")).toBe("Trap Bar Deadlift");
    expect(titleCase("90-90-hip-switches")).toBe("90 90 Hip Switches");
  });
});

describe("equipmentHint", () => {
  it.each([
    ["trap-bar-deadlift", "trap-bar"],
    ["smith-machine-squat", "machine"],
    ["single-arm-landmine-press", "barbell"],
    ["ez-bar-skullcrusher", "barbell"],
    ["barbell-hack-squat", "barbell"],
    ["machine-hack-squat", "machine"],
    ["plyometric-kettlebell-push-up", "kettlebell"],
    ["kneeling-cable-crunch", "cable"],
    ["banded-clamshell", "band"],
    ["band-assisted-pull-up", "band"],
    ["sled-push", "sled"],
    ["trx-row", "suspension"],
    ["rowing-machine-steady-state", "cardio-machine"],
    ["incline-treadmill-walk", "cardio-machine"],
    ["steady-state-ride", "cardio-machine"],
    ["single-leg-press", "machine"],
    ["reverse-pec-deck", "machine"],
    ["medicine-ball-throw", "accessory"],
    ["plate-pinch", "accessory"],
    ["slider-leg-curl", "accessory"],
    ["towel-slide-leg-curl", "bodyweight"],
    ["backpack-row", "bodyweight"],
    ["thoracic-extension-over-foam-roller", "bodyweight"],
  ])("%s -> %s", (slug, expected) => {
    expect(equipmentHint(slug)).toBe(expected);
  });

  it("gives no hint when the slug names no equipment", () => {
    expect(equipmentHint("long-run")).toBeNull();
    expect(equipmentHint("spider-curl")).toBeNull();
    expect(equipmentHint("copenhagen-plank")).toBeNull();
  });
});

describe("manifest helpers", () => {
  const manifest = {
    clips: [
      clip({ clip: "a", library: "2026-10" }),
      clip({ clip: "b", library: "2026-06" }),
      clip({ clip: "c", core: ["rdl"] }),
      clip({ clip: "d", skipped: "dublet" }),
      clip({ clip: "e" }),
      clip({ clip: "f", library: "2026-10", missing: true }),
      clip({ clip: "0", library: "2026-10" }),
    ],
  };

  it("batchClips returns the batch, sorted, without missing clips", () => {
    expect(batchClips(manifest, "2026-10")).toEqual(["0", "a"]);
  });

  it("unassigned returns clips with no role", () => {
    expect(unassigned(manifest)).toEqual(["e"]);
  });

  it("coreByClip collects every core slug per source clip", () => {
    const map = {
      exercises: [
        { slug: "bench", movekit: "barbell-bench-press" },
        { slug: "paused-bench", movekit: "barbell-bench-press" },
        { slug: "gap", movekit: null },
      ],
    };
    expect([...coreByClip(map)]).toEqual([["barbell-bench-press", ["bench", "paused-bench"]]]);
  });
});

describe("validateManifest", () => {
  const map = { exercises: [{ slug: "rdl", movekit: "c" }] };

  it("accepts a consistent ledger", () => {
    const manifest = { clips: [clip({ clip: "a", library: "2026-10" }), clip({ clip: "c", core: ["rdl"] })] };
    expect(validateManifest(manifest, map)).toEqual([]);
  });

  it("reports duplicates, skipped clips in use, core drift and map clips that are absent", () => {
    const manifest = {
      clips: [
        clip({ clip: "a" }),
        clip({ clip: "a" }),
        clip({ clip: "s", skipped: "dublet", library: "2026-10" }),
        clip({ clip: "k", core: ["hip-thrust"] }),
      ],
    };
    const errors = validateManifest(manifest, map);
    expect(errors).toHaveLength(4);
    expect(errors.join("\n")).toMatch(/a: står to gange/);
    expect(errors.join("\n")).toMatch(/s: skipped/);
    expect(errors.join("\n")).toMatch(/k: core/);
    expect(errors.join("\n")).toMatch(/c: står i movekit-map/);
  });
});

describe("parseSeedOrders", () => {
  it("reads every (slug, display_order) pair of migration 0052", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0052_exercise_library_expansion.sql"), "utf8");
    const rows = parseSeedOrders(sql);
    expect(rows).toHaveLength(188);
    expect(rows[0]).toEqual({ slug: "abdominals-stretch-variation-four", order: 1000 });
    expect(rows.at(-1)).toEqual({ slug: "wall-sit", order: 2870 });
  });
});

describe("interleavedOrder", () => {
  const existing = [
    { slug: "band-curl", order: 1040 },
    { slug: "band-row", order: 1050 },
    { slug: "wall-sit", order: 2870 },
  ];

  it("puts a slug before every existing one at 995", () => {
    expect(interleavedOrder(existing, "arnold-press")).toBe(995);
  });

  it("puts a slug between two existing ones 5 after the preceding one", () => {
    expect(interleavedOrder(existing, "band-pull-through")).toBe(1045);
    expect(interleavedOrder(existing, "band-good-morning")).toBe(1045);
  });

  it("puts a slug after the last existing one 5 after it", () => {
    expect(interleavedOrder(existing, "zercher-squat")).toBe(2875);
  });

  it("does not depend on the order of the existing rows", () => {
    expect(interleavedOrder([...existing].reverse(), "band-pull-through")).toBe(1045);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/data/movekit-lib.test.ts`
Expected: FAIL. `scripts/lib/movekit.mjs` findes ikke.

- [ ] **Step 3: Skriv modulet**

`scripts/lib/movekit.mjs`:

```js
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
  ["bodyweight", token("towel|backpack|broomstick|foam-roller")],
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
 * neighbours among the existing library rows without renumbering them:
 * the value of the closest preceding existing slug plus 5, or 995 when
 * none precedes it. New rows that share a value are ordered by name in
 * the app (the list's secondary sort).
 */
export function interleavedOrder(existing, slug) {
  let best = null;
  for (const row of existing) {
    if (row.slug < slug && (best === null || row.slug > best.slug)) best = row;
  }
  return best ? best.order + 5 : 995;
}
```

- [ ] **Step 4: Kør testen og se den bestå**

Run: `npx vitest run src/lib/data/movekit-lib.test.ts`
Expected: PASS, alle tests grønne.

Run: `npx tsc --noEmit -p . 2>&1 | head -20`
Expected: ingen fejl. TypeScript læser `.mjs`-filen direkte, fordi `allowJs` er slået til.

Run: `npx eslint scripts/lib/movekit.mjs src/lib/data/movekit-lib.test.ts`
Expected: ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/movekit.mjs src/lib/data/movekit-lib.test.ts
git commit -m "feat(movekit): ren pipeline-logik til manifest, redskabshint og flettet rækkefølge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Kildekort, audit-script og manifest

**Files:**
- Modify: `scripts/movekit-map.json`
- Create: `scripts/movekit-audit.mjs`
- Create: `scripts/movekit-manifest.json` (genereret)
- Create: `src/lib/data/movekit-manifest.test.ts`

- [ ] **Step 1: Opdatér kildekortet**

I `scripts/movekit-map.json` erstattes `_doc` og fire poster. Resten er uændret. Behold filens nuværende formatering, så diffen kun viser de fem ændringer; blokkene herunder viser indholdet, ikke linjebrydningen.

`_doc` bliver:

```json
  "_doc": "Mapping fra MakeIts 20 kerneøvelser (supabase/seed-exercises.sql) til MoveKit-kildeklip. confidence: 'match' = samme bevægelse; 'proxy' = tæt men afviger (redskab/variant). Loops ligger i public/exercise-demos/ under kerneøvelsens slug. Brug: node scripts/ingest-movekit-batch.mjs. Resten af pakken styres af scripts/movekit-manifest.json.",
```

Posterne for `rdl`, `hip-thrust`, `standing-calf-raise` og `front-squat` bliver:

```json
    {
      "slug": "rdl",
      "movekit": "barbell-romanian-deadlift",
      "confidence": "match"
    },
```

```json
    {
      "slug": "hip-thrust",
      "movekit": "barbell-hip-thrust",
      "confidence": "match"
    },
```

```json
    {
      "slug": "standing-calf-raise",
      "movekit": "standing-calf-raise-machine",
      "confidence": "match",
      "note": "Kerneøvelsen er en maskinøvelse (setup: standing calf raise machine)"
    },
```

```json
    {
      "slug": "front-squat",
      "movekit": "front-squat",
      "confidence": "match"
    }
```

Posterne for `push-press` (proxy på `kettlebell-push-press`) og `tricep-pushdown` (proxy på `cable-rope-pushdown`) røres ikke.

Run: `node -e "const m=require('./scripts/movekit-map.json').exercises; console.log(m.length, m.filter(e=>!e.movekit).length, m.filter(e=>e.confidence==='proxy').map(e=>e.slug).join(','))"`
Expected: `20 0 tricep-pushdown,push-press`

- [ ] **Step 2: Skriv audit-scriptet**

`scripts/movekit-audit.mjs`:

```js
#!/usr/bin/env node
/**
 * MoveKit-ledger: måler alle klip i MoveKit/ og fletter resultatet med
 * scripts/movekit-manifest.json, som er sandheden om hvad vi har fået
 * fra MoveKit, og hvad hvert klip bruges til.
 *
 * Brug:
 *   node scripts/movekit-audit.mjs                        mål, flet, rapportér
 *   node scripts/movekit-audit.mjs --no-measure           genbrug mål fra manifestet (nye klip måles stadig)
 *   node scripts/movekit-audit.mjs --skip=<klip>=<grund>  markér et klip som bevidst ubrugt (kan gentages)
 *   node scripts/movekit-audit.mjs --assign=2026-10       giv utildelte klip library="2026-10"
 *
 * core genberegnes altid fra scripts/movekit-map.json. library og
 * skipped bevares fra manifestet. Første kørsel uden manifest sætter
 * library="2026-06" for de slugs, der står i migration 0052.
 *
 * ffmpeg og ffprobe kræves.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { coreByClip, parseSeedOrders, unassigned, validateManifest } from "./lib/movekit.mjs";

const SRC = "MoveKit";
const MANIFEST = "scripts/movekit-manifest.json";
const MAP = "scripts/movekit-map.json";
const BOOTSTRAP = { seed: "supabase/migrations/0052_exercise_library_expansion.sql", batch: "2026-06" };
const JOBS = 6;
const DOC =
  "Ledger over MoveKit-pakken: ét objekt pr. klip. core = kerneøvelser klippet er kilde til (fra movekit-map.json). " +
  "library = batch når klippet er en biblioteksøvelse med samme slug. skipped = begrundelse når klippet bevidst ikke bruges. " +
  "Genereres og vedligeholdes af scripts/movekit-audit.mjs.";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const assign = flag("assign") ?? null;
const noMeasure = args.includes("--no-measure");
const skips = new Map(
  args
    .filter((a) => a.startsWith("--skip="))
    .map((a) => {
      const [clip, ...reason] = a.slice("--skip=".length).split("=");
      return [clip, reason.join("=") || "sprunget over"];
    }),
);

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "pipe", "ignore"] });
    const chunks = [];
    p.stdout.on("data", (d) => chunks.push(d));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${cmd} exit ${code} (${argv.at(-1)})`)),
    );
  });
}

/** Rød muskelmarkering: pixels med r>120, r-g>45, r-b>45 over 16 frames i 480 px bredde. */
async function measure(clip) {
  const src = `${SRC}/${clip}.mp4`;
  const probe = JSON.parse(
    (
      await run("ffprobe", [
        "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height:format=duration",
        "-of", "json", src,
      ])
    ).toString(),
  );
  const { width, height } = probe.streams[0];
  const seconds = Number(probe.format.duration);
  const raw = await run("ffmpeg", [
    "-v", "error", "-i", src,
    "-vf", `fps=16/${seconds},scale=480:-2`,
    "-frames:v", "16", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
  ]);
  let redPixels = 0;
  for (let i = 0; i + 2 < raw.length; i += 3) {
    const r = raw[i];
    if (r > 120 && r - raw[i + 1] > 45 && r - raw[i + 2] > 45) redPixels++;
  }
  return { width, height, duration: Number(seconds.toFixed(2)), redPixels, highlight: redPixels > 0 };
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const map = JSON.parse(await readFile(MAP, "utf8"));
const core = coreByClip(map);
const onDisk = (await readdir(SRC))
  .filter((f) => f.endsWith(".mp4"))
  .map((f) => f.slice(0, -4))
  .sort();
const previous = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : null;
const before = new Map((previous?.clips ?? []).map((c) => [c.clip, c]));
const bootstrap = previous
  ? new Set()
  : new Set(parseSeedOrders(await readFile(BOOTSTRAP.seed, "utf8")).map((r) => r.slug));

for (const clip of skips.keys()) {
  if (!onDisk.includes(clip)) {
    console.error(`✗ --skip: ukendt klip "${clip}"`);
    process.exit(1);
  }
}

let measured = 0;
const clips = await pool(onDisk, JOBS, async (clip) => {
  const old = before.get(clip);
  const reuse = noMeasure && old && typeof old.redPixels === "number";
  const m = reuse
    ? { width: old.width, height: old.height, duration: old.duration, redPixels: old.redPixels, highlight: old.highlight }
    : await measure(clip);
  if (!reuse && ++measured % 50 === 0) console.error(`  målt ${measured}…`);
  return {
    clip,
    ...m,
    core: core.get(clip) ?? [],
    library: old?.library ?? (bootstrap.has(clip) ? BOOTSTRAP.batch : null),
    skipped: skips.get(clip) ?? old?.skipped ?? null,
  };
});

// Klip der stod i manifestet, men er væk fra mappen, beholdes og mærkes.
for (const [clip, old] of before) {
  if (!onDisk.includes(clip)) clips.push({ ...old, missing: true });
}
clips.sort((a, b) => (a.clip < b.clip ? -1 : a.clip > b.clip ? 1 : 0));

const manifest = { _doc: DOC, auditedAt: new Date().toISOString().slice(0, 10), clips };

let assigned = [];
if (assign) {
  assigned = unassigned(manifest);
  const pick = new Set(assigned);
  for (const c of manifest.clips) if (pick.has(c.clip)) c.library = assign;
}

const errors = validateManifest(manifest, map);
if (errors.length) {
  console.error("MANIFEST-FEJL:\n" + errors.map((e) => `  · ${e}`).join("\n"));
  process.exit(1);
}

// Ét klip pr. linje, så en diff viser præcis hvilke klip der ændrede sig.
const body = manifest.clips.map((c) => "  " + JSON.stringify(c)).join(",\n");
await writeFile(
  MANIFEST,
  `{\n "_doc": ${JSON.stringify(manifest._doc)},\n "auditedAt": ${JSON.stringify(manifest.auditedAt)},\n "clips": [\n${body}\n ]\n}\n`,
);

const live = manifest.clips.filter((c) => !c.missing);
const count = (fn) => live.filter(fn).length;
const batches = [...new Set(live.map((c) => c.library).filter(Boolean))].sort();
const free = unassigned(manifest);
console.log(`${live.length} klip i ${SRC}/`);
console.log(`  kernekilder:        ${count((c) => c.core.length > 0)}`);
for (const b of batches) console.log(`  bibliotek ${b}:  ${count((c) => c.library === b)}`);
console.log(`  sprunget over:      ${count((c) => c.skipped)}`);
console.log(`  utildelt:           ${free.length}${free.length ? "  → " + free.join(", ") : ""}`);
const dark = live.filter((c) => !c.highlight && !c.skipped).map((c) => c.clip);
console.log(`  uden rød markering: ${dark.length}${dark.length ? "  → " + dark.join(", ") : ""}`);
if (assign) console.log(`  tildelt ${assign}:    ${assigned.length}`);
const gone = manifest.clips.filter((c) => c.missing).map((c) => c.clip);
if (gone.length) console.log(`  mangler i mappen:   ${gone.join(", ")}`);
console.log(`→ ${MANIFEST}`);
```

Run: `npx eslint scripts/movekit-audit.mjs`
Expected: ingen fejl.

- [ ] **Step 3: [operatør] Kør audit og skriv manifestet**

Run (cirka 4 minutter, måler 577 klip):

```bash
node scripts/movekit-audit.mjs \
  "--skip=wide-push-ups=dublet af wide-push-up" \
  "--skip=open-book-rotations=dublet af open-book-rotation" \
  --assign=2026-10
```

Expected output:

```
577 klip i MoveKit/
  kernekilder:        19
  bibliotek 2026-06:  188
  bibliotek 2026-10:  369
  sprunget over:      2
  utildelt:           0
  uden rød markering: 48  → <de 48 klip>
  tildelt 2026-10:    369
→ scripts/movekit-manifest.json
```

Afviger et tal, så stop og undersøg før manifestet committes. `kernekilder` er 19, fordi `bench` og `paused-bench` deler klip.

Run: `shasum scripts/movekit-manifest.json; node scripts/movekit-audit.mjs --no-measure | head -8; shasum scripts/movekit-manifest.json`
Expected: samme tal uden linjen `tildelt`, på et øjeblik, og samme checksum før og efter. En genkørsel ændrer ikke filen, når intet er ændret (samme dag).

- [ ] **Step 4: Skriv manifest-testen**

`src/lib/data/movekit-manifest.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { batchClips, unassigned, validateManifest } from "../../../scripts/lib/movekit.mjs";

type Clip = { clip: string; core: string[]; library: string | null; skipped: string | null; highlight: boolean };

const read = (p: string) => JSON.parse(readFileSync(join(process.cwd(), p), "utf8"));
const manifest: { clips: Clip[] } = read("scripts/movekit-manifest.json");
const map = read("scripts/movekit-map.json");

describe("movekit-manifest.json", () => {
  it("holds every ledger rule", () => {
    expect(validateManifest(manifest, map)).toEqual([]);
  });

  it("leaves no clip unassigned", () => {
    expect(unassigned(manifest)).toEqual([]);
  });

  it("has 577 clips: two library batches, the core sources and two skipped duplicates", () => {
    expect(manifest.clips).toHaveLength(577);
    expect(batchClips(manifest, "2026-06")).toHaveLength(188);
    expect(batchClips(manifest, "2026-10")).toHaveLength(369);
    expect(manifest.clips.filter((c) => c.skipped).map((c) => c.clip)).toEqual([
      "open-book-rotations",
      "wide-push-ups",
    ]);
  });

  it("feeds all 20 core exercises, front-squat included", () => {
    const fed = manifest.clips.flatMap((c) => c.core).sort();
    expect(fed).toHaveLength(20);
    expect(new Set(fed).size).toBe(20);
    expect(fed).toContain("front-squat");
  });

  it("gives every core exercise a source with red muscle highlight", () => {
    const dark = manifest.clips.filter((c) => c.core.length > 0 && !c.highlight).flatMap((c) => c.core);
    expect(dark).toEqual([]);
  });

  it("puts the two freed proxy clips in the new batch", () => {
    const batch = batchClips(manifest, "2026-10");
    expect(batch).toContain("barbell-stiff-leg-deadlifts");
    expect(batch).toContain("kettlebell-hip-thrust");
    expect(batch).not.toContain("front-squat");
    expect(batch).not.toContain("barbell-romanian-deadlift");
  });
});
```

- [ ] **Step 5: Kør testen**

Run: `npx vitest run src/lib/data/movekit-manifest.test.ts`
Expected: PASS, 6 tests. Alle 19 kernekilder har rød markering (målt 02.10.2026).

- [ ] **Step 6: Commit**

```bash
git add scripts/movekit-map.json scripts/movekit-audit.mjs scripts/movekit-manifest.json src/lib/data/movekit-manifest.test.ts
git commit -m "feat(movekit): manifest over de 577 klip og rigtige kilder til fire kerneøvelser

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Chunk 2: Video-pipeline og kerneøvelser

Efter denne chunk kører encoding af de 369 klip i baggrunden, uploaden er gjort sikker, og alle 20 kerneøvelser har bundlet loop fra det rigtige klip.

### Task 4: Batch-encoding til staging

**Files:**
- Create: `scripts/ingest-manifest.mjs`

- [ ] **Step 1: Skriv scriptet**

`scripts/ingest-manifest.mjs`:

```js
#!/usr/bin/env node
/**
 * Encoder alle klip i en manifest-batch til de seks filer pr. øvelse,
 * som bucketen `exercise-demos` forventer:
 *   {slug}.webm  {slug}.mp4  {slug}-poster.jpg            (landskab)
 *   {slug}-portrait.webm  .mp4  -portrait-poster.jpg      (9:16)
 *
 * Brug:
 *   node scripts/ingest-manifest.mjs --batch=2026-10 --out=<dir> [--jobs=3] [--only=<slug>]
 *
 * Genoptageligt: et klip er færdigt, når <dir>/.done/<slug> findes.
 * Mærket skrives først, når begge trin lykkedes og alle seks filer
 * har indhold, så en afbrudt encoding aldrig tæller som færdig.
 * Fejl stopper ikke kørslen: de samles og listes til sidst (exit 1).
 *
 * Selve encodingen ligger i ingest-exercise-demo.mjs (landskab) og
 * make-portrait-demo.mjs (portræt); dette script orkestrerer dem.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { batchClips } from "./lib/movekit.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const batch = flag("batch");
const out = flag("out");
const jobs = Math.max(1, Math.floor(Number(flag("jobs")) || 3));
const only = flag("only");

if (!batch || !out) {
  console.error("Brug: node scripts/ingest-manifest.mjs --batch=<batch> --out=<dir> [--jobs=3] [--only=<slug>]");
  process.exit(1);
}

const SUFFIXES = [".webm", ".mp4", "-poster.jpg", "-portrait.webm", "-portrait.mp4", "-portrait-poster.jpg"];
const LIMIT = 5 * 1024 * 1024; // bucketens file_size_limit (migration 0033)

const manifest = JSON.parse(await readFile("scripts/movekit-manifest.json", "utf8"));
let slugs = batchClips(manifest, batch);
if (only) slugs = slugs.filter((s) => s === only);
if (slugs.length === 0) {
  console.error(`Ingen klip i batch ${batch}${only ? ` med slug ${only}` : ""}`);
  process.exit(1);
}

const doneDir = join(out, ".done");
await mkdir(doneDir, { recursive: true });

/** Kører et node-script med MI_DEMO_OUT sat. Giver null ved succes, ellers slutningen af stderr. */
function node(script, argv) {
  return new Promise((resolve) => {
    const p = spawn("node", [script, ...argv], {
      env: { ...process.env, MI_DEMO_OUT: out },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    p.stderr.on("data", (d) => {
      err = (err + d).slice(-1500);
    });
    p.on("error", (e) => resolve(String(e)));
    p.on("close", (code) => resolve(code === 0 ? null : err.trim() || `exit ${code}`));
  });
}

async function encode(slug) {
  const src = `MoveKit/${slug}.mp4`;
  if (!existsSync(src)) return `kilde mangler: ${src}`;
  const failed =
    (await node("scripts/ingest-exercise-demo.mjs", [src, slug])) ??
    (await node("scripts/make-portrait-demo.mjs", [src, slug]));
  if (failed) return failed;
  for (const suffix of SUFFIXES) {
    const file = join(out, slug + suffix);
    if (!existsSync(file) || (await stat(file)).size === 0) return `tom eller manglende fil: ${slug}${suffix}`;
  }
  await writeFile(join(doneDir, slug), "");
  return null;
}

const todo = slugs.filter((s) => !existsSync(join(doneDir, s)));
console.log(`${slugs.length} klip i batch ${batch} · ${slugs.length - todo.length} færdige · ${todo.length} encodes med ${jobs} job`);

const failures = [];
let finished = 0;
let next = 0;
const started = Date.now();
await Promise.all(
  Array.from({ length: Math.min(jobs, todo.length) }, async () => {
    while (next < todo.length) {
      const slug = todo[next++];
      const error = await encode(slug);
      finished++;
      if (error) failures.push({ slug, error });
      const minutes = ((Date.now() - started) / 60000).toFixed(1);
      console.log(`${error ? "✗" : "✓"} ${slug}  (${finished}/${todo.length}, ${minutes} min)`);
    }
  }),
);

const files = (await readdir(out)).filter((f) => /\.(webm|mp4|jpg)$/.test(f));
let bytes = 0;
const tooBig = [];
for (const f of files) {
  const { size } = await stat(join(out, f));
  bytes += size;
  if (size > LIMIT) tooBig.push(`${f} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}
const done = slugs.filter((s) => existsSync(join(doneDir, s))).length;
console.log(`\n${done}/${slugs.length} klip færdige · ${files.length} filer · ${(bytes / 1024 / 1024).toFixed(0)} MB i ${out}`);
if (tooBig.length) console.log(`Over 5 MB (afvises af bucketen):\n  ${tooBig.join("\n  ")}`);
if (failures.length) {
  console.log(`\n${failures.length} fejlede:`);
  for (const f of failures) console.log(`  · ${f.slug}:\n      ${f.error.split("\n").slice(-4).join("\n      ")}`);
  process.exit(1);
}
```

Run: `npx eslint scripts/ingest-manifest.mjs`
Expected: ingen fejl.

- [ ] **Step 2: Røgtest på ét klip**

Run:

```bash
time node scripts/ingest-manifest.mjs --batch=2026-10 --out=MoveKit/.staging/2026-10 --only=arnold-press
ls -la MoveKit/.staging/2026-10/ MoveKit/.staging/2026-10/.done/
```

Expected: linjen `✓ arnold-press  (1/1, … min)`, derefter `1/1 klip færdige · 6 filer`. Mappen rummer `arnold-press.webm`, `arnold-press.mp4`, `arnold-press-poster.jpg`, `arnold-press-portrait.webm`, `arnold-press-portrait.mp4`, `arnold-press-portrait-poster.jpg`, alle større end 0 bytes, og `.done/arnold-press`.

Run: `for f in arnold-press.webm arnold-press-portrait.webm; do ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 MoveKit/.staging/2026-10/$f; done`
Expected: `720,398` for landskab og `406,720` for portræt.

Run igen: `node scripts/ingest-manifest.mjs --batch=2026-10 --out=MoveKit/.staging/2026-10 --only=arnold-press`
Expected: `1 klip i batch 2026-10 · 1 færdige · 0 encodes med 3 job`. Genoptagelsen virker.

Run: `node scripts/ingest-manifest.mjs --batch=2026-10 --out=MoveKit/.staging/2026-10 --only=findes-ikke; echo "exit $?"`
Expected: `Ingen klip i batch 2026-10 med slug findes-ikke` og `exit 1`.

Run: `git status --short`
Expected: kun `scripts/ingest-manifest.mjs` er ny. Staging-mappen er usynlig for git.

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest-manifest.mjs
git commit -m "feat(movekit): genoptagelig batch-encoding af en manifest-batch til staging

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 4: [operatør] Start encoding af hele batchen i baggrunden**

Brug tiden fra røgtesten til at anslå varigheden: tid pr. klip × 369 ÷ 3.

Run (i baggrunden):

```bash
node scripts/ingest-manifest.mjs --batch=2026-10 --out=MoveKit/.staging/2026-10 --jobs=3 > MoveKit/.staging/ingest-2026-10.log 2>&1
```

Kørslen fortsætter, mens resten af planen udføres. Følg med: `tail -3 MoveKit/.staging/ingest-2026-10.log` og `ls MoveKit/.staging/2026-10/.done | wc -l`.
Færdig når loggen slutter med `369/369 klip færdige · 2214 filer`. Ved fejlede klip: kør samme kommando igen; kun de manglende encodes.

---

### Task 5: Upload der ikke overskriver

**Files:**
- Modify: `scripts/upload-demos-to-storage.mjs`

- [ ] **Step 1: Erstat scriptets indhold**

`scripts/upload-demos-to-storage.mjs` (hele filen):

```js
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
```

Run: `npx eslint scripts/upload-demos-to-storage.mjs`
Expected: ingen fejl.

- [ ] **Step 2: [operatør] Prøv tørkørslen mod bucketen**

Tørkørslen lister produktions-bucketen med service-role-nøglen (kun læsning) og uploader intet. Staging-mappen rummer på dette tidspunkt mindst røgtestens seks filer.

Run: `MI_DEMO_OUT=MoveKit/.staging/2026-10 node scripts/upload-demos-to-storage.mjs --dry`
Expected: første linje slutter med `(1182 objekter i forvejen)`, og `uploades: <tal> (DRY RUN)`. Begge tal afhænger af, hvor langt encodingen er nået: `findes allerede` er 0, 3, 6, 9 eller 12, efterhånden som de fire klip med portrætfiler i bucketen bliver encodet. Summen af de to tal er antallet af filer i staging.

Den rigtige upload sker først i Task 11, når alle 369 klip er færdige; en upload midt i encodingen kunne sende en halvskrevet fil.

- [ ] **Step 3: Commit**

```bash
git add scripts/upload-demos-to-storage.mjs
git commit -m "feat(movekit): Storage-upload springer eksisterende filer over som standard

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Rigtige klip til fire kerneøvelser

Kildekortet blev opdateret i Task 3. Her encodes de fire loops til `public/exercise-demos/`, og alt, der antog at front-squat mangler klip, rettes.

**Files:**
- Create/replace: `public/exercise-demos/{front-squat,rdl,hip-thrust,standing-calf-raise}{.webm,.mp4,-poster.jpg,-portrait.webm,-portrait.mp4,-portrait-poster.jpg}` (24 filer, 6 nye)
- Modify: `src/lib/data/bundled-demo-assets.ts`
- Modify: `src/lib/data/demo-assets.test.ts`
- Modify: `src/lib/data/session-demo-assets.test.ts`
- Modify: `supabase/seed-exercises.sql`, `supabase/seed.sql`
- Modify (kun kommentarer): `src/lib/data/exercise-mocks.ts`, `src/lib/data/session-demo-assets.ts`, `src/lib/data/exercises.ts`, `src/app/(app)/session/[id]/SessionClient.tsx`
- Modify (docs): `docs/EXERCISE_VISUAL_BRIEF.md`, `docs/PLATFORM_OVERVIEW.md`

- [ ] **Step 1: Ret testene, så de forventer 20 loops**

I `src/lib/data/demo-assets.test.ts` erstattes hele testen `it("front-squat (no files) stays null in mock, helper, and seed lists", …)` med:

```ts
  it("covers all 20 core exercises, front-squat included", () => {
    expect(disk).toHaveLength(20);
    expect(disk).toEqual(MOCK_EXERCISES.map((e) => e.slug).sort());
    expect(bundledDemoAssetUrl("front-squat")).toBe("/exercise-demos/front-squat.webm");
    expect(bundledDemoAssetUrl("no-such-lift")).toBeNull();
  });
```

I `src/lib/data/session-demo-assets.test.ts` erstattes testen `it("stays null for front-squat and any slug without files", …)` med:

```ts
  it("stays null for a slug without files", () => {
    expect(resolveSessionDemoAssetUrl(null, "no-such-lift")).toBeNull();
    expect(resolveSessionDemoAssetUrl("", "no-such-lift")).toBeNull();
    expect(resolveSessionDemoAssetUrl(null, null)).toBeNull();
  });
```

I samme fil omdøbes testen `it("leaves front-squat demoAssetUrl null and unknown names library-less", …)` til `it("gives front-squat its bundled loop and leaves unknown names library-less", …)`, og linjen

```ts
    expect(hydrated.exercises[0].library?.demoAssetUrl).toBeNull();
```

bliver

```ts
    expect(hydrated.exercises[0].library?.demoAssetUrl).toBe("/exercise-demos/front-squat.webm");
```

- [ ] **Step 2: Kør testene og se dem fejle**

Run: `npx vitest run src/lib/data/demo-assets.test.ts src/lib/data/session-demo-assets.test.ts`
Expected: FAIL. `disk` har 19 slugs, og `bundledDemoAssetUrl("front-squat")` er `null`.

- [ ] **Step 3: Encode de fire loops**

`MI_DEMO_OUT` må ikke være sat, så filerne lander i `public/exercise-demos/`.

Run:

```bash
unset MI_DEMO_OUT
for slug in front-squat rdl hip-thrust standing-calf-raise; do node scripts/ingest-movekit-batch.mjs --only=$slug; done
node scripts/make-portrait-demo.mjs MoveKit/front-squat.mp4 front-squat
node scripts/make-portrait-demo.mjs MoveKit/barbell-romanian-deadlift.mp4 rdl
node scripts/make-portrait-demo.mjs MoveKit/barbell-hip-thrust.mp4 hip-thrust
node scripts/make-portrait-demo.mjs MoveKit/standing-calf-raise-machine.mp4 standing-calf-raise
```

Expected: hver `ingest-movekit-batch`-kørsel slutter med `=== 1 øvelser ingested ===` og viser kildeklippet (`▸ rdl  ←  barbell-romanian-deadlift`). Hver portræt-kørsel skriver `✓ <slug>-portrait  …`.

Run: `ls public/exercise-demos | wc -l; git status --short public/exercise-demos | awk '{print $1}' | sort | uniq -c`
Expected: `120` filer. 18 ændrede (`M`) og 6 nye (`??`).

- [ ] **Step 4: Se på de fire loops**

Åbn posterne og bekræft øjensynligt, at bevægelsen er den rigtige, at figuren og redskabet er helt med i portrætbeskæringen, og at den røde muskelmarkering ses:

- `public/exercise-demos/front-squat-poster.jpg` og `front-squat-portrait-poster.jpg`: stang i front rack.
- `public/exercise-demos/rdl-poster.jpg` og `rdl-portrait-poster.jpg`: vægtstang, hofte-hængsel.
- `public/exercise-demos/hip-thrust-poster.jpg` og `hip-thrust-portrait-poster.jpg`: vægtstang over hoften, skuldre mod bænk.
- `public/exercise-demos/standing-calf-raise-poster.jpg` og `standing-calf-raise-portrait-poster.jpg`: stående lægmaskine.

Er en portrætbeskæring forkert (afskåret redskab), så stop og rapportér; ret ikke `make-portrait-demo.mjs` uden at spørge.

- [ ] **Step 5: Opdatér den bundlede liste og seeds**

I `src/lib/data/bundled-demo-assets.ts` indsættes `"front-squat",` mellem `"dip",` og `"hip-thrust",` i `BUNDLED_DEMO_SLUGS`, og det sidste punkt i kontrakt-kommentaren (de tre linjer der begynder med `` *  - `front-squat` (and any other slug without files) stays null``) erstattes med:

```ts
 *  - All 20 core lifts have a trio here. Any other slug stays null
 *    and falls back to PhaseAnimator / AnatomyFigure. Do not invent
 *    a loop for a missing trio.
```

I `supabase/seed-exercises.sql` erstattes kommentaren og listen over `update public.exercises set demo_asset_url …` (fra linjen `-- Bundled v1 demo loops live in …` til og med den afsluttende `)` i `where slug in (…)`) med:

```sql
-- Bundled v1 demo loops live in public/exercise-demos/{slug}.{webm,mp4}
-- plus {slug}-poster.jpg. Demo mode and resolveDemoAssets() use the
-- same public path. Coach uploads write a Storage URL
-- (…/storage/v1/object/public/exercise-demos/{slug}.webm?v=) via
-- DemoAssetUploader — leave those rows alone. All 20 lifts have a trio.
--
-- 0051 and 0067 already ran this UPDATE, but migrations run BEFORE seed,
-- so a fresh db:reset would otherwise insert these 20 rows with null.
update public.exercises
set demo_asset_url = '/exercise-demos/' || slug || '.webm'
where slug in (
  'back-squat', 'front-squat', 'deadlift', 'bench', 'paused-bench', 'ohp',
  'pull-up', 'row', 'lunge', 'khr', 'push-up',
  'dip', 'plank', 'barbell-curl', 'tricep-pushdown', 'lateral-raise',
  'rdl', 'push-press', 'hip-thrust', 'standing-calf-raise'
)
```

Resten af sætningen (`and ( demo_asset_url is null or demo_asset_url like '/exercise-demos/%' );`) er uændret.

I `supabase/seed.sql` erstattes de tre kommentarlinjer over UPDATE'en med:

```sql
-- Same public-path contract as seed-exercises.sql: every lift in this
-- insert has a bundled loop. Storage URLs from DemoAssetUploader are
-- not overwritten.
```

og første linje i slug-listen bliver:

```sql
  'back-squat', 'front-squat', 'deadlift', 'bench', 'paused-bench', 'ohp',
```

- [ ] **Step 6: Kør testene og se dem bestå**

Run: `npx vitest run src/lib/data/demo-assets.test.ts src/lib/data/session-demo-assets.test.ts src/lib/data/movekit-manifest.test.ts`
Expected: PASS, 3 filer.

Run: `npx vitest run src/components/marketing`
Expected: PASS. Landingens loops (back-squat, deadlift, bench) er urørte, og testen for unikke loops er stadig grøn.

- [ ] **Step 7: Ret forældede kommentarer og dokumentation**

| Fil | Fra | Til |
|---|---|---|
| `src/lib/data/exercise-mocks.ts` (hovedkommentar) | `slugs with files in public/exercise-demos/ get the public WebM` / ` * path; front-squat stays null (PhaseAnimator fallback).` | `all 20 have files in public/exercise-demos/ and get the public` / ` * WebM path.` |
| `src/lib/data/session-demo-assets.ts` | `` * `front-squat` and any other slug without files stay null.`` | `` * A slug without files stays null.`` |
| `src/lib/data/exercises.ts` (hovedkommentar) | `that has a trio in public/exercise-demos/ (front-squat stays null).` | `that has a trio in public/exercise-demos/ (all 20 do).` |
| `src/app/(app)/session/[id]/SessionClient.tsx` | `mini AnatomyFigure when the slug has no loop (front-squat etc.)` | `mini AnatomyFigure when the slug has no loop (coach-made exercises)` |
| `docs/EXERCISE_VISUAL_BRIEF.md` | ``for the 19 bundled v1 loops.`` og sætningen `` `front-squat` stays null until a real trio exists.`` | ``for the 20 bundled v1 loops.`` og sætningen fjernes |
| `docs/PLATFORM_OVERVIEW.md` (række 9) | ``| 9 | `front-squat` mangler demovideo | Indhold | Eneste hul i 20 kerneøvelser; MoveKit er et lukket katalog |`` | ``| 9 | ~~`front-squat` mangler demovideo~~ | **Løst** | MoveKit-pakken fra 09.2026 har klippet; alle 20 kerneøvelser har loop |`` |

Læs hver fil omkring stedet før du retter, og bevar linjebrydning og kommentarstil.

Run: `grep -rn "front-squat stays null\|front-squat (no files)\|19 bundled" src docs supabase | grep -v superpowers`
Expected: ingen linjer.

Run: `npx tsc --noEmit -p . 2>&1 | head; npx eslint src/lib/data "src/app/(app)/session"`
Expected: ingen fejl.

- [ ] **Step 8: Commit**

```bash
git add public/exercise-demos src/lib/data/bundled-demo-assets.ts src/lib/data/demo-assets.test.ts src/lib/data/session-demo-assets.test.ts src/lib/data/exercise-mocks.ts src/lib/data/session-demo-assets.ts src/lib/data/exercises.ts "src/app/(app)/session/[id]/SessionClient.tsx" supabase/seed-exercises.sql supabase/seed.sql docs/EXERCISE_VISUAL_BRIEF.md docs/PLATFORM_OVERVIEW.md
git commit -m "feat(exercises): front squat får loop, og rdl, hip thrust og calf raise får det rigtige klip

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Chunk 3: Metadata-værktøjer

Efter denne chunk kan workflowets output valideres og blive til seed-SQL, og workflow-scriptet for de 369 øvelser er genereret og tørkørt.

### Task 7: Seed-logik som ren, testet kode

`gen-exercise-seed.mjs` blander i dag indlæsning, validering og SQL. Logikken flyttes til `scripts/lib/exercise-seed.mjs`, så den kan testes, og CLI'en bliver tynd.

**Files:**
- Create: `scripts/lib/exercise-seed.mjs`
- Create: `src/lib/data/exercise-seed.test.ts`
- Modify: `scripts/gen-exercise-seed.mjs` (hele filen erstattes)

- [ ] **Step 1: Skriv de fejlende tests**

`src/lib/data/exercise-seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import taxonomy from "./exercise-taxonomy.json";
import { MUSCLE_LABELS } from "./muscle-groups";
import { parseSeedOrders } from "../../../scripts/lib/movekit.mjs";
import {
  MUSCLES,
  collectExercises,
  mergeExercises,
  parseExerciseSource,
  renderSeed,
  validateExercises,
} from "../../../scripts/lib/exercise-seed.mjs";

const ex = (over: Record<string, unknown> = {}) => ({
  slug: "arnold-press",
  name: "Arnold Press",
  category: "shoulders",
  pattern: "push-vertical",
  equipment: "dumbbell",
  difficulty: "intermediate",
  primary_muscle: "Shoulders",
  primary_muscles: ["front_delts"],
  secondary_muscles: ["triceps"],
  tertiary_muscles: ["abs"],
  cue: "Rotér og pres.",
  cues: ["a", "b", "c", "d"],
  mistakes: [
    { title: "t1", body: "b1" },
    { title: "t2", body: "b2" },
  ],
  why_matters: "w",
  setup: "s",
  progression: "p",
  regression: "r",
  ...over,
});

describe("MUSCLES", () => {
  it("is the app's 18-muscle taxonomy", () => {
    expect([...MUSCLES].sort()).toEqual(Object.keys(MUSCLE_LABELS).sort());
  });
});

describe("collectExercises", () => {
  it("finds exercise lists at any depth, also inside stringified JSON", () => {
    const a = ex({ slug: "a" });
    const b = ex({ slug: "b" });
    const value = { result: { exercises: [a] }, nested: [{ output: JSON.stringify({ exercises: [b] }) }] };
    expect(collectExercises(value).map((e: { slug: string }) => e.slug)).toEqual(["a", "b"]);
  });

  it("ignores lists that are not exercises (the workflow's input items have no cues)", () => {
    expect(collectExercises({ items: [{ slug: "a", name: "A", equipmentHint: null }] })).toEqual([]);
  });

  it("takes a bare list", () => {
    expect(collectExercises([ex()])).toHaveLength(1);
  });
});

describe("parseExerciseSource", () => {
  it("reads a JSON document", () => {
    expect(parseExerciseSource(JSON.stringify({ exercises: [ex()] }))).toHaveLength(1);
  });

  it("reads JSON Lines and skips lines that are not JSON", () => {
    const text = [
      JSON.stringify({ agent: 1, result: { exercises: [ex({ slug: "a" })] } }),
      "not json",
      "",
      JSON.stringify({ agent: 2, result: { exercises: [ex({ slug: "b" })] } }),
    ].join("\n");
    expect(parseExerciseSource(text).map((e: { slug: string }) => e.slug)).toEqual(["a", "b"]);
  });
});

describe("mergeExercises", () => {
  it("lets a later list win on slug and sorts by slug", () => {
    const first = [ex({ slug: "b", name: "Old B" }), ex({ slug: "a" })];
    const second = [ex({ slug: "b", name: "New B" })];
    const { merged, conflicts } = mergeExercises([first, second]);
    expect(merged.map((e: { slug: string; name: string }) => [e.slug, e.name])).toEqual([
      ["a", "Arnold Press"],
      ["b", "New B"],
    ]);
    expect(conflicts).toEqual([]);
  });

  it("tolerates an exact duplicate inside one list but reports a differing one", () => {
    const same = mergeExercises([[ex({ slug: "a" }), ex({ slug: "a" })]]);
    expect(same.merged).toHaveLength(1);
    expect(same.conflicts).toEqual([]);
    const differing = mergeExercises([[ex({ slug: "a" }), ex({ slug: "a", name: "Other" })]]);
    expect(differing.conflicts).toEqual(["a"]);
  });
});

describe("validateExercises", () => {
  const check = (list: unknown[], batchSlugs: string[] | null = null) =>
    validateExercises(list, { taxonomy, batchSlugs });

  it("accepts a valid exercise", () => {
    expect(check([ex()], ["arnold-press"])).toEqual([]);
  });

  it.each([
    [{ category: "legs" }, /ukendt category "legs"/],
    [{ pattern: "twist" }, /ukendt pattern "twist"/],
    [{ equipment: "hoverboard" }, /ukendt equipment "hoverboard"/],
    [{ difficulty: "easy" }, /ukendt difficulty "easy"/],
    [{ secondary_muscles: ["delts"] }, /ukendt muskel "delts" i secondary_muscles/],
    [{ primary_muscles: [] }, /mangler primary_muscles/],
    [{ setup: "  " }, /tomt felt setup/],
    [{ cues: ["a", "b", "c"] }, /cues/],
    [{ mistakes: [{ title: "t", body: "b" }] }, /mistakes/],
    [{ mistakes: [{ title: "t", body: "b" }, { title: "", body: "b" }] }, /mistakes/],
    [{ why_matters: "pris $ex$ her" }, /\$ex\$/],
    [{ category: "cardio", pattern: "squat" }, /passer ikke sammen/],
    [{ category: "lower-body", pattern: "jump" }, /passer ikke sammen/],
    [{ slug: "Arnold Press" }, /ugyldig eller manglende slug/],
  ])("rejects %j", (over, message) => {
    const errors = check([ex(over)]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(message);
  });

  it("accepts the paired categories with their own patterns", () => {
    expect(check([ex({ category: "power", pattern: "olympic" })])).toEqual([]);
    expect(check([ex({ category: "power", pattern: "jump" })])).toEqual([]);
    expect(check([ex({ category: "mobility", pattern: "mobility" })])).toEqual([]);
    expect(check([ex({ category: "cardio", pattern: "conditioning", equipment: "cardio-machine" })])).toEqual([]);
  });

  it("reports slugs outside the batch and batch slugs that are missing", () => {
    const errors = check([ex({ slug: "stranger" })], ["arnold-press", "z-press"]);
    expect(errors).toEqual([
      "stranger: hører ikke til batchen",
      "arnold-press: mangler i JSON",
      "z-press: mangler i JSON",
    ]);
  });
});

describe("renderSeed", () => {
  const sql = renderSeed([ex({ slug: "a", setup: "Coach's bænk" }), ex({ slug: "b" })], {
    orderFor: (e: { slug: string }) => (e.slug === "a" ? 995 : 1045),
    subtitle: "batch 2026-10",
  });

  it("writes rows that parseSeedOrders reads back", () => {
    expect(parseSeedOrders(sql)).toEqual([
      { slug: "a", order: 995 },
      { slug: "b", order: 1045 },
    ]);
  });

  it("escapes single quotes, writes muscle arrays and dollar-quoted jsonb", () => {
    expect(sql).toContain("'Coach''s bænk'");
    expect(sql).toContain("'{front_delts}', '{triceps}', '{abs}'");
    expect(sql).toContain('$ex$["a","b","c","d"]$ex$');
  });

  it("is an idempotent draft upsert that leaves is_published and demo_asset_url alone", () => {
    expect(sql).toContain("(2 MoveKit-øvelser, batch 2026-10)");
    expect(sql).toMatch(/on conflict \(slug\) do update set/);
    expect(sql).toMatch(/995, false\)/);
    const conflict = sql.slice(sql.indexOf("on conflict"));
    expect(conflict).not.toMatch(/is_published|demo_asset_url|display_order/);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/data/exercise-seed.test.ts`
Expected: FAIL. `scripts/lib/exercise-seed.mjs` findes ikke.

- [ ] **Step 3: Skriv modulet**

`scripts/lib/exercise-seed.mjs`:

```js
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
 * one file is fine (a journal can hold the same result twice); the
 * same slug with different content inside one file is a conflict.
 */
export function mergeExercises(lists) {
  const bySlug = new Map();
  const conflicts = new Set();
  for (const list of lists) {
    const local = new Map();
    for (const e of list) {
      const prev = local.get(e.slug);
      if (prev && JSON.stringify(prev) !== JSON.stringify(e)) conflicts.add(e.slug);
      local.set(e.slug, e);
    }
    for (const [slug, e] of local) bySlug.set(slug, e);
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
 * Readable errors for everything that would make the seed wrong.
 * `taxonomy` is src/lib/data/exercise-taxonomy.json. With `batchSlugs`
 * the list must hold exactly those slugs.
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
    if (JSON.stringify(e).includes("$ex$")) errors.push(`${id}: tekst indeholder "$ex$", som bryder SQL-citeringen`);
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
```

- [ ] **Step 4: Kør testen og se den bestå**

Run: `npx vitest run src/lib/data/exercise-seed.test.ts`
Expected: PASS, alle tests grønne.

- [ ] **Step 5: Gør CLI'en tynd**

`scripts/gen-exercise-seed.mjs` (hele filen):

```js
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
 * --batch  kræver præcis manifest-batchens slugs og fletter
 *          display_order ind mellem rækkerne i --after-migrationerne.
 * Uden --batch: display_order 1000, 1010, … i slug-orden.
 *
 * Valideringsfejl skrives til stderr, én pr. linje med slug forrest, og
 * giver exit 1.
 */
import { readFile } from "node:fs/promises";
import { mergeExercises, parseExerciseSource, renderSeed, validateExercises } from "./lib/exercise-seed.mjs";
import { batchClips, interleavedOrder, parseSeedOrders } from "./lib/movekit.mjs";

const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith("--"));
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const batch = flag("batch") ?? null;
const after = (flag("after") ?? "").split(",").filter(Boolean);

if (files.length === 0 || (batch && after.length === 0)) {
  console.error("Brug: node scripts/gen-exercise-seed.mjs <kilde> [<kilde> …] [--batch=<batch> --after=<seed.sql>[,<seed.sql>]]");
  process.exit(1);
}

const repo = (p) => new URL(`../${p}`, import.meta.url);
const taxonomy = JSON.parse(await readFile(repo("src/lib/data/exercise-taxonomy.json"), "utf8"));

const lists = [];
for (const f of files) lists.push(parseExerciseSource(await readFile(f, "utf8")));
const { merged, conflicts } = mergeExercises(lists);

const batchSlugs = batch
  ? batchClips(JSON.parse(await readFile(repo("scripts/movekit-manifest.json"), "utf8")), batch)
  : null;

const errors = [
  ...conflicts.map((slug) => `${slug}: står to gange med forskelligt indhold i samme kilde`),
  ...validateExercises(merged, { taxonomy, batchSlugs }),
];
if (errors.length) {
  console.error(`VALIDERINGSFEJL (${errors.length}):\n${errors.join("\n")}`);
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

process.stdout.write(renderSeed(merged, { orderFor, subtitle: batch ? `batch ${batch}` : null }));
console.error(`✓ ${merged.length} øvelser → SQL`);
```

- [ ] **Step 6: Prøv CLI'en mod en lille kilde**

Run:

```bash
mkdir -p MoveKit/.staging
node -e '
const e = { slug: "arnold-press", name: "Arnold Press", category: "shoulders", pattern: "push-vertical", equipment: "dumbbell", difficulty: "intermediate", primary_muscle: "Shoulders", primary_muscles: ["front_delts"], secondary_muscles: ["triceps"], tertiary_muscles: ["abs"], cue: "c", cues: ["a","b","c","d"], mistakes: [{title:"t",body:"b"},{title:"t2",body:"b2"}], why_matters: "w", setup: "s", progression: "p", regression: "r" };
require("fs").writeFileSync("MoveKit/.staging/fixture-ok.json", JSON.stringify({ exercises: [e] }));
require("fs").writeFileSync("MoveKit/.staging/fixture-bad.json", JSON.stringify({ exercises: [{ ...e, category: "legs" }] }));
'
node scripts/gen-exercise-seed.mjs MoveKit/.staging/fixture-ok.json | head -22 | tail -6
node scripts/gen-exercise-seed.mjs MoveKit/.staging/fixture-bad.json > /dev/null; echo "exit $?"
node scripts/gen-exercise-seed.mjs MoveKit/.staging/fixture-ok.json --batch=2026-10 --after=supabase/migrations/0052_exercise_library_expansion.sql > /dev/null 2> MoveKit/.staging/fixture-err.txt; echo "exit $?"; head -1 MoveKit/.staging/fixture-err.txt; grep -c "mangler i JSON" MoveKit/.staging/fixture-err.txt
rm MoveKit/.staging/fixture-*.json MoveKit/.staging/fixture-err.txt
```

Expected:
- første kørsel viser rækken for `arnold-press`, der slutter med `   1000, false)`, og stderr `✓ 1 øvelser → SQL`;
- anden kørsel skriver `VALIDERINGSFEJL (1):` og `arnold-press: ukendt category "legs"`, derefter `exit 1`;
- tredje kørsel giver `exit 1`, `VALIDERINGSFEJL (368):` og tallet `368` (alle batchens øvrige slugs mangler).

Run: `npx eslint scripts/gen-exercise-seed.mjs scripts/lib/exercise-seed.mjs src/lib/data/exercise-seed.test.ts && npx tsc --noEmit -p . 2>&1 | head`
Expected: ingen fejl.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/exercise-seed.mjs scripts/gen-exercise-seed.mjs src/lib/data/exercise-seed.test.ts
git commit -m "refactor(movekit): seed-generatoren validerer mod taksonomi og manifest og fletter rækkefølgen

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Workflow-scriptet genereres fra manifestet

Workflow-runtime har ingen filadgang, så øvelseslisten og taksonomien skal stå inline i scriptet. `build-wf-exercises.mjs` sætter dem ind i en skabelon.

**Files:**
- Create: `scripts/wf-exercises.template.txt`
- Create: `scripts/build-wf-exercises.mjs`
- Replace (genereret): `scripts/wf-exercises.mjs`

- [ ] **Step 1: Skriv skabelonen**

Skabelonen er workflow-scriptet med syv pladsholdere: `__COUNT__`, `__AGENTS__`, `__ITEMS__`, `__MUSCLES__`, `__CATEGORIES__`, `__PATTERNS__`, `__EQUIPMENT__`. Den er en `.txt`-fil, fordi den ikke er gyldig JavaScript, før pladsholderne er udfyldt. Scriptet bruger bevidst ingen backticks.

`scripts/wf-exercises.template.txt`:

```js
export const meta = {
  name: 'generate-exercise-library',
  description: 'Generér dansk coaching-metadata for __COUNT__ MoveKit-øvelser (kladder til review)',
  phases: [{ title: 'Generér', detail: '__AGENTS__ agenter, 10 øvelser pr. agent' }],
};

// GENERERET af scripts/build-wf-exercises.mjs fra scripts/movekit-manifest.json
// og src/lib/data/exercise-taxonomy.json. Ret skabelonen, ikke denne fil.

const ITEMS = __ITEMS__;

const MUSCLES = __MUSCLES__;
const CATEGORIES = __CATEGORIES__;
const PATTERNS = __PATTERNS__;
const EQUIPMENT = __EQUIPMENT__;

const EX = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug", "name", "category", "pattern", "equipment", "difficulty",
    "primary_muscle", "primary_muscles", "secondary_muscles", "tertiary_muscles",
    "cue", "cues", "mistakes", "why_matters", "setup", "progression", "regression",
  ],
  properties: {
    slug: { type: "string", description: "Kopiér VERBATIM fra input" },
    name: { type: "string", description: "Engelsk navn, pænt formateret" },
    category: { type: "string", enum: CATEGORIES },
    pattern: { type: "string", enum: PATTERNS },
    equipment: { type: "string", enum: EQUIPMENT },
    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    primary_muscle: { type: "string", description: "Kort engelsk display-label, fx 'Chest' eller 'Quads'" },
    primary_muscles: { type: "array", items: { type: "string", enum: MUSCLES }, minItems: 1, maxItems: 3 },
    secondary_muscles: { type: "array", items: { type: "string", enum: MUSCLES }, maxItems: 4 },
    tertiary_muscles: { type: "array", items: { type: "string", enum: MUSCLES }, maxItems: 4 },
    cue: { type: "string", description: "Én dansk one-liner-cue" },
    cues: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6, description: "Danske coaching-cues, imperativ" },
    mistakes: {
      type: "array", minItems: 2, maxItems: 3,
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "body"],
        properties: { title: { type: "string" }, body: { type: "string" } },
      },
    },
    why_matters: { type: "string", description: "Dansk, 1-2 sætninger" },
    setup: { type: "string", description: "Dansk, opstilling/udgangsposition" },
    progression: { type: "string", description: "Dansk, hårdere variant" },
    regression: { type: "string", description: "Dansk, lettere variant" },
  },
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["exercises"],
  properties: { exercises: { type: "array", items: EX } },
};

const EXAMPLE_STRENGTH = {
  slug: "back-squat", name: "Back Squat", category: "lower-body", pattern: "squat",
  equipment: "barbell", difficulty: "intermediate", primary_muscle: "Quads",
  primary_muscles: ["quads", "glutes"], secondary_muscles: ["hamstrings", "lower_back"],
  tertiary_muscles: ["abs", "adductors", "calves_back"],
  cue: "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.",
  cues: [
    "Bryst op og spændt mave før du drukner under baren.",
    "Knæ sporer tæerne — pres dem aktivt ud.",
    "Sid lavt: hofte under knæ.",
    "Driv gulvet væk og lås ud uden hyperextension.",
  ],
  mistakes: [
    { title: "Knæene falder ind", body: "Skubber kraften gennem inderlåret i stedet for glutes. Cue: pres knæene aktivt ud mod lilletåen." },
    { title: "Bryst kollapser frem", body: "Mister bar-position. Hold albuerne ind under baren og pres brystet op." },
  ],
  why_matters: "Bygger benstyrke fra bunden og tvinger hele kæden — core, ryg, hofte — til at arbejde samtidig.",
  setup: "Bar i high-bar position på øvre traps. Fødderne skulderbredde, lille udadrotation. Spændt mave før liften.",
  progression: "Tilføj pause i bunden, eller skift til front squat for mere quads.",
  regression: "Goblet squat med en kettlebell, eller box squat for dybdetilvænning.",
};

const EXAMPLE_MOBILITY = {
  slug: "90-90-hip-switches", name: "90/90 Hip Switches", category: "mobility", pattern: "mobility",
  equipment: "bodyweight", difficulty: "beginner", primary_muscle: "Hips",
  primary_muscles: ["glutes", "adductors"], secondary_muscles: ["obliques", "lower_back"],
  tertiary_muscles: ["abs"],
  cue: "Sid højt, rotér fra hofterne og lad knæene falde roligt fra side til side.",
  cues: [
    "Sid med begge knæ i 90 grader og ryggen lang.",
    "Rotér fra hofterne og lad fødderne blive i gulvet.",
    "Lad knæene falde kontrolleret til modsat side.",
    "Træk vejret roligt og hold brystet løftet gennem skiftet.",
  ],
  mistakes: [
    { title: "Ryggen runder", body: "Bevægelsen flytter fra hoften til lænden. Sid højt på siddeknoglerne, og støt med hænderne bag dig hvis det er nødvendigt." },
    { title: "For hurtigt tempo", body: "Sving giver ingen mobilitet. Brug to til tre sekunder pr. skift og stop dér, hvor hoften strammer." },
  ],
  why_matters: "Åbner hoftens ind- og udadrotation, som squat og dødløft kræver. God som opvarmning før benpas.",
  setup: "Sid på gulvet med det forreste ben bøjet 90 grader foran dig og det bagerste 90 grader ud til siden. Hænderne i gulvet bag dig som støtte.",
  progression: "Løft hænderne fra gulvet, eller rejs dig op på knæene i hver yderposition.",
  regression: "Støt med begge hænder bag dig, og gør bevægelsen mindre.",
};

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildPrompt(batch) {
  return [
    "Du er strength-coach for MakeIt — en dansk online coaching-platform. Skriv struktureret øvelsesdata for følgende øvelser.",
    "",
    "STEMME: Direkte, kompetent, ingen fyld. Engelske øvelsesnavne, men ALT coaching-tekst (cue, cues, mistakes, why_matters, setup, progression, regression) på DANSK. Cues er imperative kommandoer. Se eksemplerne.",
    "",
    "MUSKEL-TAXONOMI — brug KUN disse 18 slugs i muscle-arrays (intet andet):",
    MUSCLES.join(", "),
    "",
    "KATEGORI OG MØNSTER:",
    "- mobility + mobility: stræk, rotationer, ledcirkler, balance, nakke- og holdningsdrills.",
    "- cardio + conditioning: løb, gang, cykling, roning, svømning, kardiomaskiner, sjippetov, battle ropes, skyggeboksning.",
    "- power + jump: plyometri (hop, bounds, kast).",
    "- power + olympic: olympisk vægtløftning (clean, jerk, snatch og deres træk-varianter).",
    "- Alt andet: lower-body, upper-body-push, upper-body-pull, shoulders, arms, core eller full-body med et af mønstrene squat, hinge, lunge, push-horizontal, push-vertical, pull-horizontal, pull-vertical, core, isolation, carry.",
    "- Kategorierne mobility, cardio og power bruges KUN sammen med deres egne mønstre, og mønstrene mobility, conditioning, jump og olympic bruges KUN i de kategorier.",
    "- 'isolation' bruges til curls, raises, flyes og extensions. 'carry' til farmer's carries og lignende.",
    "- En styrkeøvelse for core (plank, dead bug, crunch, pallof press) er core + core, ikke mobility.",
    "",
    "REDSKAB:",
    "- equipmentHint er udledt af øvelsens navn. Brug den, når den passer til øvelsen. Er den null, vælger du selv.",
    "- Smith machine og andre faste maskiner: machine. EZ-bar og landmine: barbell. Trap bar: trap-bar. Slæde: sled. TRX og slynger: suspension.",
    "- Håndklæde, rygsæk, kosteskaft og foam roller: bodyweight.",
    "- Bold, vægtskive, sjippetov, battle ropes, slider og wrist roller: accessory.",
    "- Løbebånd, cykel, romaskine, ski-erg, crosstrainer, trappemaskine og lignende: cardio-machine.",
    "- Løb, gang og svømning uden maskine: bodyweight.",
    "",
    "REGLER:",
    "- slug: kopiér verbatim fra input nedenfor. Returnér præcis én øvelse pr. input, ingen ekstra.",
    "- name: engelsk navn, pænt formateret (fx 'EZ Bar Skullcrusher', 'TRX Row', '90/90 Hip Switches').",
    "- primary_muscles = prime movers (1-3, stærkeste først). secondary = synergister. tertiary = stabilisatorer.",
    "- primary_muscle: kort engelsk label der opsummerer primary_muscles (fx 'Chest', 'Quads', 'Back/Hams').",
    "- Vær anatomisk korrekt. cues og mistakes skal vise den KORREKTE udførelse.",
    "- For cardio og mobility: cues handler om tempo, åndedræt, kadence, holdning og intensitet. mistakes er de typiske fejl i netop den aktivitet. progression og regression handler om varighed, intensitet eller bevægeudslag. Muskel-arrays udfyldes stadig fra de 18 muskler.",
    "- Hvert tekstfelt skal udfyldes. cues: 4-6. mistakes: 2-3, hver med title og body.",
    "- Disse er kladder til coach-review. Vær præcis.",
    "",
    "EKSEMPEL 1 (styrke; format og stemme du skal matche):",
    JSON.stringify(EXAMPLE_STRENGTH, null, 1),
    "",
    "EKSEMPEL 2 (mobilitet):",
    JSON.stringify(EXAMPLE_MOBILITY, null, 1),
    "",
    "ØVELSER DU SKAL GENERERE (" + batch.length + " stk):",
    JSON.stringify(batch),
    "",
    "Returnér ét objekt pr. øvelse i samme rækkefølge.",
  ].join("\n");
}

phase('Generér');
const batches = chunk(ITEMS, 10);
log(ITEMS.length + " øvelser i " + batches.length + " batches");

const results = await parallel(
  batches.map((batch, bi) => () =>
    agent(buildPrompt(batch), {
      label: "batch-" + (bi + 1) + "/" + batches.length,
      phase: 'Generér',
      schema: SCHEMA,
    })
  )
);

// Selve øvelserne læses fra workflow-journalen af gen-exercise-seed.mjs.
// Returværdien holdes lille: antal, og hvilke slugs der mangler.
const all = results.filter(Boolean).flatMap((r) => (r && r.exercises) || []);
const got = new Set(all.map((e) => e.slug));
const missing = ITEMS.map((i) => i.slug).filter((s) => !got.has(s));
log(all.length + " øvelser genereret, " + missing.length + " mangler");
return { count: all.length, missing: missing };
```

- [ ] **Step 2: Skriv generatoren**

`scripts/build-wf-exercises.mjs`:

```js
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
```

`replaceAll(key, () => value)` bruger en funktion, så `$`-tegn i JSON'en ikke tolkes som erstatningsmønstre.

- [ ] **Step 3: Generér og tørkør scriptet**

Run: `node scripts/build-wf-exercises.mjs --batch=2026-10`
Expected: `✓ scripts/wf-exercises.mjs: 369 øvelser, 37 agenter, <n> med redskabshint` (n er omkring 250).

Tørkørslen udfører workflow-scriptet med stubbe i stedet for agenter og viser, at det er gyldigt og fordeler alle øvelser:

```bash
node -e '
const fs = require("fs");
const src = fs.readFileSync("scripts/wf-exercises.mjs", "utf8").replace("export const meta", "const meta");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const calls = [];
const run = new AsyncFunction("agent", "parallel", "phase", "log", src);
run(
  async (prompt, opts) => { calls.push({ label: opts.label, chars: prompt.length, schema: Boolean(opts.schema) }); return { exercises: [] }; },
  (thunks) => Promise.all(thunks.map((t) => t())),
  () => {},
  (m) => console.log("log:", m),
).then((r) => console.log("agenter:", calls.length, "| første:", calls[0].label, "| sidste:", calls.at(-1).label, "| count:", r.count, "| missing:", r.missing.length, "| prompt-tegn:", calls[0].chars, "| schema:", calls.every((c) => c.schema)));
'
```

Expected:

```
log: 369 øvelser i 37 batches
log: 0 øvelser genereret, 369 mangler
agenter: 37 | første: batch-1/37 | sidste: batch-37/37 | count: 0 | missing: 369 | prompt-tegn: <cirka 7000> | schema: true
```

Run: `head -5 scripts/wf-exercises.mjs; grep -c "__[A-Z]*__" scripts/wf-exercises.mjs; npx eslint scripts/build-wf-exercises.mjs scripts/wf-exercises.mjs`
Expected: filen begynder med `export const meta = {` og beskrivelsen nævner 369; `0` tilbageværende pladsholdere; ESLint uden fejl.

- [ ] **Step 4: Commit**

```bash
git add scripts/wf-exercises.template.txt scripts/build-wf-exercises.mjs scripts/wf-exercises.mjs
git commit -m "feat(movekit): workflow-scriptet genereres fra manifest og taksonomi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Chunk 4: Workflow-kørsel, migrationer og upload

Efter denne chunk findes de to migrationer, genereret fra workflowets output og manifestet, og videoerne ligger i Storage.

### Task 9: [operatør] Kør workflowet og generér migration 0066

**Files:**
- Create: `supabase/migrations/0066_exercise_library_expansion_2.sql` (genereret)

- [ ] **Step 1: Kør workflowet**

Tom har godkendt kørslen med 37 agenter (beslutning 2 i spec'en). Start med `Workflow({ scriptPath: "/Users/tomhedegaard/MakeIt/scripts/wf-exercises.mjs" })`. Afvises stien, så send filens indhold som `script`.

Workflowet kører i baggrunden. Fortsæt med chunk 5 (UI) imens. Når det er færdigt, giver resultatet `{ count, missing }` og stien til kørslens transcript-mappe med `journal.jsonl`.

Expected: `count: 369`, `missing: []`. En agent, der fejlede, giver færre; det håndteres i Step 3.

- [ ] **Step 2: Generér migrationen fra journalen**

Run (erstat `<journal>` med stien til kørslens `journal.jsonl`):

```bash
node scripts/gen-exercise-seed.mjs <journal> --batch=2026-10 \
  --after=supabase/migrations/0052_exercise_library_expansion.sql \
  > supabase/migrations/0066_exercise_library_expansion_2.sql
```

Expected: stderr `✓ 369 øvelser → SQL`, exit 0.

- [ ] **Step 3: Ved valideringsfejl, genkør kun de afviste**

Scriptet skriver én fejl pr. linje med slug forrest. Saml slugs og byg et lille workflow for dem:

```bash
node scripts/gen-exercise-seed.mjs <journal> --batch=2026-10 --after=supabase/migrations/0052_exercise_library_expansion.sql 2>&1 >/dev/null \
  | grep -v "^VALIDERINGSFEJL" | cut -d: -f1 | sort -u > MoveKit/.staging/rerun.txt
wc -l MoveKit/.staging/rerun.txt
node scripts/build-wf-exercises.mjs --batch=2026-10 --only=MoveKit/.staging/rerun.txt
```

Kør workflowet igen, og giv begge journaler til generatoren. Den sidste vinder på slug:

```bash
node scripts/gen-exercise-seed.mjs <journal> <journal-2> --batch=2026-10 \
  --after=supabase/migrations/0052_exercise_library_expansion.sql \
  > supabase/migrations/0066_exercise_library_expansion_2.sql
```

Gentag til exit 0. Slut af med `node scripts/build-wf-exercises.mjs --batch=2026-10`, så den committede `wf-exercises.mjs` igen dækker hele batchen (ingen diff, hvis der ikke var genkørsler).

- [ ] **Step 4: Kontrollér migrationen**

Run:

```bash
node -e '
const fs = require("fs");
const sql = fs.readFileSync("supabase/migrations/0066_exercise_library_expansion_2.sql", "utf8");
const rows = [...sql.matchAll(/^\s*\(\x27([a-z0-9-]+)\x27, \x27((?:[^\x27]|\x27\x27)*)\x27, \x27([a-z-]+)\x27, \x27([a-z-]+)\x27, \x27([a-z-]+)\x27, \x27([a-z]+)\x27,/gm)];
const tally = (i) => Object.entries(rows.reduce((a, r) => ((a[r[i]] = (a[r[i]] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(" · ");
console.log("rækker:", rows.length);
console.log("kategori:", tally(3));
console.log("mønster:", tally(4));
console.log("redskab:", tally(5));
console.log("niveau:", tally(6));
const orders = [...sql.matchAll(/^\s+(\d+), false\)/gm)].map((m) => Number(m[1]));
console.log("display_order:", Math.min(...orders), "til", Math.max(...orders), "| alle ender på 5:", orders.every((o) => o % 10 === 5));
'
```

Expected: `rækker: 369`. Kategorierne `mobility`, `cardio` og `power` er alle til stede, i størrelsesordenen 35 til 45, 30 til 40 og 20 til 30. `display_order` går fra 995 til 2875, og alle ender på 5.

Læs 12 øvelser igennem med øjnene, mindst to fra hver af `mobility`, `cardio`, `power` og resten spredt over styrke (for eksempel `tempo-run`, `freestyle-swim`, `worlds-greatest-stretch`, `open-book-rotation`, `power-clean`, `broad-jump`, `trap-bar-deadlift`, `nordic-hamstring-curl`, `sled-push`, `copenhagen-plank`, `landmine-press`, `seated-calf-raise`):

```bash
for s in tempo-run freestyle-swim worlds-greatest-stretch open-book-rotation power-clean broad-jump trap-bar-deadlift nordic-hamstring-curl sled-push copenhagen-plank landmine-press seated-calf-raise; do
  grep -A5 "^  ('$s'," supabase/migrations/0066_exercise_library_expansion_2.sql | cut -c1-700; echo
done
```

Tjek: dansk tekst, imperative cues, rigtige muskler, og at kategori, mønster og redskab giver mening. Er noget systematisk forkert (for eksempel alle konditionsøvelser med løftecues), så ret skabelonens prompt og genkør de berørte slugs som i Step 3. Enkeltstående skævheder er acceptable: det er kladder til Munks review.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0066_exercise_library_expansion_2.sql scripts/wf-exercises.mjs
git commit -m "feat(exercises): 369 nye MoveKit-øvelser som kladder (migration 0066)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Wiring-migration 0067

**Files:**
- Create: `scripts/gen-demo-urls.mjs`
- Create: `supabase/migrations/0067_expansion_2_wiring.sql`
- Modify: `src/lib/data/movekit-manifest.test.ts`

- [ ] **Step 1: Udvid manifest-testen (fejler)**

Tilføj i `src/lib/data/movekit-manifest.test.ts`. Importen udvides med `parseSeedOrders`:

```ts
import { batchClips, parseSeedOrders, unassigned, validateManifest } from "../../../scripts/lib/movekit.mjs";
```

og en ny `describe` sidst i filen:

```ts
describe("migrations for batch 2026-10", () => {
  const text = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const batch = batchClips(manifest, "2026-10");

  it("0066 seeds exactly the batch", () => {
    const seeded = parseSeedOrders(text("supabase/migrations/0066_exercise_library_expansion_2.sql"))
      .map((r: { slug: string }) => r.slug)
      .sort();
    expect(seeded).toEqual(batch);
  });

  it("0067 points exactly the batch at Storage", () => {
    const sql = text("supabase/migrations/0067_expansion_2_wiring.sql");
    const begin = sql.indexOf("-- BEGIN demo-urls 2026-10");
    const end = sql.indexOf("-- END demo-urls 2026-10");
    expect(begin).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(begin);
    const wired = [...sql.slice(begin, end).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).sort();
    expect(wired).toEqual(batch);
  });

  it("0067 gives front-squat its bundled loop without touching a coach upload", () => {
    const sql = text("supabase/migrations/0067_expansion_2_wiring.sql");
    expect(sql).toContain("set demo_asset_url = '/exercise-demos/front-squat.webm'");
    expect(sql).toContain("demo_asset_url like '/exercise-demos/%'");
  });
});
```

Run: `npx vitest run src/lib/data/movekit-manifest.test.ts`
Expected: FAIL på de to 0067-tests (filen findes ikke). 0066-testen består.

- [ ] **Step 2: Skriv URL-generatoren**

`scripts/gen-demo-urls.mjs`:

```js
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
```

- [ ] **Step 3: Skriv migrationen**

Run:

```bash
{
cat <<'SQL'
-- =================================================================
-- MakeIt // HQ — wiring for MoveKit-batch 2026-10
-- =================================================================
-- 1. demo_asset_url for de 369 øvelser fra 0066. Videoerne ligger i
--    Storage-bucket'en 'exercise-demos' (upload:
--    scripts/upload-demos-to-storage.mjs). Blokken er skrevet af
--    scripts/gen-demo-urls.mjs ud fra scripts/movekit-manifest.json.
-- 2. front-squat får sit bundlede loop (public/exercise-demos/).
-- 3. Eksisterende øvelser flyttes til de nye kategorier Power og
--    Mobilitet, så samme slags øvelse ikke ligger to steder.
--
-- Kør EFTER upload, EFTER 0066 og EFTER deploy af koden: front-squat-
-- filen og labels for de nye kategorier findes først i det deploy.
-- Idempotent: UPDATE-by-slug med guards, ingen skemaændring.

SQL
node scripts/gen-demo-urls.mjs --batch=2026-10
cat <<'SQL'

-- front-squat: klippet fandtes ikke i den første MoveKit-pakke.
-- En coach-upload (Storage-URL) overskrives ikke.
update public.exercises
set demo_asset_url = '/exercise-demos/front-squat.webm'
where slug = 'front-squat'
  and (demo_asset_url is null or demo_asset_url like '/exercise-demos/%');

-- Olympiske løft og plyometri → Power. Kun rækker der stadig har den
-- oprindelige kategori, så en coach-rettelse ikke overskrives.
update public.exercises
set category = 'power', pattern = 'olympic'
where slug in (
    'barbell-snatch', 'barbell-power-snatch', 'barbell-muscle-snatch',
    'barbell-clean-and-press', 'dumbbell-single-arm-clean-and-press'
  )
  and category = 'full-body';

update public.exercises
set category = 'power', pattern = 'jump'
where slug = 'box-jump'
  and category = 'full-body';

update public.exercises
set category = 'power', pattern = 'jump'
where slug = 'jump-squats'
  and category = 'lower-body';

-- Mavestræk → Mobilitet.
update public.exercises
set category = 'mobility', pattern = 'mobility'
where slug in (
    'abdominals-stretch-variation-one', 'abdominals-stretch-variation-two',
    'abdominals-stretch-variation-three', 'abdominals-stretch-variation-four'
  )
  and category = 'core';
SQL
} > supabase/migrations/0067_expansion_2_wiring.sql
grep -c "" supabase/migrations/0067_expansion_2_wiring.sql
```

Expected: stderr `✓ 369 slugs`. Filen er omkring 150 linjer.

- [ ] **Step 4: Kør testene**

Run: `npx vitest run src/lib/data/movekit-manifest.test.ts`
Expected: PASS, 9 tests.

Run: `grep -n "update public.exercises" supabase/migrations/0067_expansion_2_wiring.sql | wc -l; grep -c ";" supabase/migrations/0067_expansion_2_wiring.sql`
Expected: `6` UPDATE-sætninger og `6` semikoloner.

Run: `npx eslint scripts/gen-demo-urls.mjs src/lib/data/movekit-manifest.test.ts`
Expected: ingen fejl.

Migrationerne køres ikke. `supabase db push` er Toms trin efter merge og deploy.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-demo-urls.mjs supabase/migrations/0067_expansion_2_wiring.sql src/lib/data/movekit-manifest.test.ts
git commit -m "feat(exercises): migration 0067 kobler de nye øvelser til video og samler Power og Mobilitet

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: [operatør] Upload til Storage

Forudsætter at encodingen fra Task 4 er færdig.

- [ ] **Step 1: Bekræft at encodingen er komplet**

Run:

```bash
tail -4 MoveKit/.staging/ingest-2026-10.log
ls MoveKit/.staging/2026-10/.done | wc -l
ls MoveKit/.staging/2026-10 | grep -c -E "\.(webm|mp4|jpg)$"
find MoveKit/.staging/2026-10 -maxdepth 1 -type f -size +5M | wc -l
find MoveKit/.staging/2026-10 -maxdepth 1 -type f -size 0 | wc -l
```

Expected: loggen slutter med `369/369 klip færdige · 2214 filer`; `369`; `2214`; `0` filer over 5 MB; `0` tomme filer. Ved fejlede klip: kør `ingest-manifest.mjs` igen. Ved filer over 5 MB: stop og rapportér hvilke.

- [ ] **Step 2: Se på et udsnit af portrætbeskæringerne**

De nye klip har motiver, beskæringen ikke har mødt før (svømning, kardiomaskiner, slæde). Åbn disse posters og bekræft, at figur og redskab er helt med:

`MoveKit/.staging/2026-10/freestyle-swim-portrait-poster.jpg`, `assault-bike-portrait-poster.jpg`, `sled-push-portrait-poster.jpg`, `rowing-machine-steady-state-portrait-poster.jpg`, `trap-bar-deadlift-portrait-poster.jpg`, `worlds-greatest-stretch-portrait-poster.jpg`, `battle-ropes-portrait-poster.jpg`, `machine-hack-squat-portrait-poster.jpg`.

En beskæring, der skærer motivet over, noteres til slutrapporten. Den blokerer ikke uploaden: landskabsversionen bruges på detaljesiden, og Munk ser klippet i review.

- [ ] **Step 3: Tørkørsel**

Run: `MI_DEMO_OUT=MoveKit/.staging/2026-10 node scripts/upload-demos-to-storage.mjs --dry`
Expected:

```
2214 filer i MoveKit/.staging/2026-10 → bucket 'exercise-demos' (1182 objekter i forvejen)
  findes allerede: 12 (springes over)
  uploades:        2202  (DRY RUN)
  eksempler på eksisterende: barbell-stiff-leg-deadlifts-portrait-poster.jpg, …
```

De 12 eksisterende er portrætfilerne for `barbell-stiff-leg-deadlifts`, `cable-bar-pushdown`, `kettlebell-calf-raise` og `kettlebell-hip-thrust`. Er tallet et andet, så stop og undersøg.

- [ ] **Step 4: Upload**

Uploaden skriver til produktions-bucketen. Den er additiv: ingen eksisterende fil ændres, og ingen databaserække peger på de nye filer, før 0067 køres.

Run: `MI_DEMO_OUT=MoveKit/.staging/2026-10 node scripts/upload-demos-to-storage.mjs`
Expected: `✓ 2202 uploadet, 0 fejl`. Ved fejl: kør kommandoen igen; den tager kun de manglende.

- [ ] **Step 5: Verificér**

Run:

```bash
MI_DEMO_OUT=MoveKit/.staging/2026-10 node scripts/upload-demos-to-storage.mjs --dry | head -3
B=https://wtxhsbrtzoukkhhtsqnu.supabase.co/storage/v1/object/public/exercise-demos
for s in arnold-press tempo-run freestyle-swim worlds-greatest-stretch power-clean broad-jump trap-bar-deadlift sled-push trx-row zercher-squat barbell-stiff-leg-deadlifts kettlebell-calf-raise; do
  for f in .webm .mp4 -poster.jpg -portrait.webm -portrait.mp4 -portrait-poster.jpg; do
    printf "%s " "$(curl -s -o /dev/null -w '%{http_code}' -I "$B/$s$f")"
  done; echo " $s"
done
```

Expected: `(3384 objekter i forvejen)`, `findes allerede: 2214`, `uploades: 0`. Alle 72 svar er `200`.

Der er intet at committe i dette trin.

---

## Chunk 5: Bibliotek, review-kø og coach-flader

Efter denne chunk kan biblioteket søges og filtreres på redskab, review-køen kan filtreres på kategori, og coach-editoren og program-byggeren bruger taksonomien. Læs `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (afsnittet om `searchParams`) og `…/02-components/form.md` før Task 14 og 15: i denne Next-version er `searchParams` et Promise, og `next/form` giver klientnavigation på GET-formularer.

### Task 12: Rene filter-hjælpere

**Files:**
- Create: `src/lib/data/exercise-filters.ts`
- Create: `src/lib/data/exercise-filters.test.ts`
- Create: `src/lib/data/exercise-library-url.ts`
- Create: `src/lib/data/exercise-library-url.test.ts`

- [ ] **Step 1: Skriv de fejlende tests**

`src/lib/data/exercise-filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { escapeLike, facetsOf, matchesFilters } from "./exercise-filters";

const squat = { name: "Back Squat", category: "lower-body", equipment: "barbell", pattern: "squat", difficulty: "intermediate" as const };
const run = { name: "Tempo Run", category: "cardio", equipment: "bodyweight", pattern: "conditioning", difficulty: "beginner" as const };

describe("matchesFilters", () => {
  it("matches everything with no filters", () => {
    expect(matchesFilters(squat, {})).toBe(true);
  });

  it("searches the name as a case-insensitive substring", () => {
    expect(matchesFilters(squat, { q: "squat" })).toBe(true);
    expect(matchesFilters(squat, { q: "  SQUA " })).toBe(true);
    expect(matchesFilters(run, { q: "squat" })).toBe(false);
  });

  it("treats a blank search as no search", () => {
    expect(matchesFilters(run, { q: "   " })).toBe(true);
  });

  it("combines search with category and equipment", () => {
    expect(matchesFilters(squat, { q: "squat", category: "lower-body", equipment: "barbell" })).toBe(true);
    expect(matchesFilters(squat, { q: "squat", equipment: "dumbbell" })).toBe(false);
    expect(matchesFilters(squat, { category: "cardio" })).toBe(false);
  });

  it("filters on pattern and difficulty as before", () => {
    expect(matchesFilters(squat, { pattern: "hinge" })).toBe(false);
    expect(matchesFilters(squat, { difficulty: "intermediate" })).toBe(true);
  });
});

describe("escapeLike", () => {
  it("escapes the LIKE wildcards and the escape character", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
    expect(escapeLike("squat")).toBe("squat");
  });
});

describe("facetsOf", () => {
  it("lists the categories and equipment that occur, in taxonomy order, unknown last", () => {
    expect(
      facetsOf([
        { category: "cardio", equipment: "cardio-machine" },
        { category: "lower-body", equipment: "barbell" },
        { category: "lower-body", equipment: null },
        { category: null, equipment: "hoverboard" },
      ]),
    ).toEqual({
      categories: ["lower-body", "cardio"],
      equipment: ["barbell", "cardio-machine", "hoverboard"],
    });
  });

  it("is empty for no rows", () => {
    expect(facetsOf([])).toEqual({ categories: [], equipment: [] });
  });
});
```

`src/lib/data/exercise-library-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { libraryHref, normalizeSearch, pickFacet } from "./exercise-library-url";

describe("libraryHref", () => {
  it("is the bare library path with no filters", () => {
    expect(libraryHref()).toBe("/train/exercises");
    expect(libraryHref({ q: "  ", category: null, equipment: "" })).toBe("/train/exercises");
  });

  it("keeps only the filters that are set, in a stable order", () => {
    expect(libraryHref({ equipment: "barbell", q: "squat" })).toBe("/train/exercises?q=squat&equipment=barbell");
    expect(libraryHref({ category: "cardio" })).toBe("/train/exercises?category=cardio");
  });

  it("encodes the search text", () => {
    expect(libraryHref({ q: "push up & pull" })).toBe("/train/exercises?q=push+up+%26+pull");
  });
});

describe("normalizeSearch", () => {
  it("trims, takes the first of repeated params and caps the length at 80", () => {
    expect(normalizeSearch("  squat ")).toBe("squat");
    expect(normalizeSearch(["row", "curl"])).toBe("row");
    expect(normalizeSearch("x".repeat(200))).toHaveLength(80);
  });

  it("is undefined for missing or blank input", () => {
    expect(normalizeSearch(undefined)).toBeUndefined();
    expect(normalizeSearch("   ")).toBeUndefined();
  });
});

describe("pickFacet", () => {
  it("honours a value only when a published exercise has it", () => {
    expect(pickFacet("cardio", ["lower-body", "cardio"])).toBe("cardio");
    expect(pickFacet("made-up", ["lower-body", "cardio"])).toBeUndefined();
    expect(pickFacet(undefined, ["cardio"])).toBeUndefined();
    expect(pickFacet(["cardio", "arms"], ["cardio"])).toBe("cardio");
  });
});
```

- [ ] **Step 2: Kør testene og se dem fejle**

Run: `npx vitest run src/lib/data/exercise-filters.test.ts src/lib/data/exercise-library-url.test.ts`
Expected: FAIL. Ingen af de to moduler findes.

- [ ] **Step 3: Skriv modulerne**

`src/lib/data/exercise-filters.ts`:

```ts
/**
 * Exercise filtering as pure functions, free of the server-only
 * Supabase client, so the demo-mode path and the tests share one
 * definition with the SQL filters in exercises.ts.
 */
import type { Exercise, ExerciseDifficulty } from "./exercises";
import { orderByTaxonomy } from "./exercise-taxonomy";

export type ExerciseFilters = {
  category?: string;
  equipment?: string;
  pattern?: string;
  difficulty?: ExerciseDifficulty;
  /** Free-text search on the exercise name. */
  q?: string;
};

type Filterable = Pick<Exercise, "name" | "category" | "equipment" | "pattern" | "difficulty">;

/** The in-memory twin of the SQL filters in listPublishedExercises. */
export function matchesFilters(e: Filterable, f: ExerciseFilters): boolean {
  if (f.category && e.category !== f.category) return false;
  if (f.equipment && e.equipment !== f.equipment) return false;
  if (f.pattern && e.pattern !== f.pattern) return false;
  if (f.difficulty && e.difficulty !== f.difficulty) return false;
  const q = f.q?.trim().toLowerCase();
  if (q && !e.name.toLowerCase().includes(q)) return false;
  return true;
}

/** Escapes LIKE wildcards so a search for "50%" or "a_b" matches those characters literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type ExerciseFacets = { categories: string[]; equipment: string[] };

/** The categories and equipment that occur in `rows`, in taxonomy order. */
export function facetsOf(rows: readonly { category: string | null; equipment: string | null }[]): ExerciseFacets {
  const present = (key: "category" | "equipment") =>
    rows.map((r) => r[key]).filter((v): v is string => Boolean(v));
  return {
    categories: orderByTaxonomy("categories", present("category")),
    equipment: orderByTaxonomy("equipment", present("equipment")),
  };
}
```

`src/lib/data/exercise-library-url.ts`:

```ts
/**
 * The library's filter state lives in the URL (?q=&category=&equipment=)
 * so a filtered view can be shared and the page stays server-rendered.
 */

export type LibraryQuery = {
  q?: string | null;
  category?: string | null;
  equipment?: string | null;
};

const LIBRARY_PATH = "/train/exercises";

type RawParam = string | string[] | undefined;
const first = (raw: RawParam) => (Array.isArray(raw) ? raw[0] : raw);

/** The library URL for a filter state. Empty values are left out. */
export function libraryHref(query: LibraryQuery = {}): string {
  const params = new URLSearchParams();
  const q = query.q?.trim();
  if (q) params.set("q", q);
  if (query.category) params.set("category", query.category);
  if (query.equipment) params.set("equipment", query.equipment);
  const search = params.toString();
  return search ? `${LIBRARY_PATH}?${search}` : LIBRARY_PATH;
}

/** Search text as the page uses it: trimmed, at most 80 characters, undefined when blank. */
export function normalizeSearch(raw: RawParam): string | undefined {
  return first(raw)?.trim().slice(0, 80) || undefined;
}

/** A category or equipment filter is honoured only when some published exercise has that value. */
export function pickFacet(raw: RawParam, available: readonly string[]): string | undefined {
  const value = first(raw);
  return value && available.includes(value) ? value : undefined;
}
```

- [ ] **Step 4: Kør testene og se dem bestå**

Run: `npx vitest run src/lib/data/exercise-filters.test.ts src/lib/data/exercise-library-url.test.ts`
Expected: PASS, 2 filer.

Run: `npx tsc --noEmit -p . 2>&1 | head; npx eslint src/lib/data/exercise-filters.ts src/lib/data/exercise-filters.test.ts src/lib/data/exercise-library-url.ts src/lib/data/exercise-library-url.test.ts`
Expected: ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/exercise-filters.ts src/lib/data/exercise-filters.test.ts src/lib/data/exercise-library-url.ts src/lib/data/exercise-library-url.test.ts
git commit -m "feat(exercises): rene hjælpere til søgning, facetter og bibliotekets URL

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Søgning, facetter og stabil sortering i datalaget

**Files:**
- Modify: `src/lib/data/exercises.ts`
- Create: `src/lib/data/exercises.demo.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

Testen kører datalaget i demo-mode (ingen Supabase), hvor det filtrerer de 20 mocks.

`src/lib/data/exercises.demo.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }));

const { listPublishedExerciseFacets, listPublishedExercises } = await import("./exercises");

describe("exercise library in demo mode", () => {
  it("lists all 20 mocks without filters", async () => {
    expect(await listPublishedExercises()).toHaveLength(20);
  });

  it("searches by name", async () => {
    const hits = await listPublishedExercises({ q: "squat" });
    expect(hits.map((e) => e.slug).sort()).toEqual(["back-squat", "front-squat"]);
  });

  it("combines search with equipment", async () => {
    const all = await listPublishedExercises({ q: "press" });
    const barbell = await listPublishedExercises({ q: "press", equipment: "barbell" });
    expect(all.length).toBeGreaterThan(0);
    expect(barbell.every((e) => e.equipment === "barbell")).toBe(true);
    expect(await listPublishedExercises({ q: "squat", equipment: "kettlebell" })).toEqual([]);
  });

  it("reports the categories and equipment that occur, in taxonomy order", async () => {
    const facets = await listPublishedExerciseFacets();
    expect(facets.categories[0]).toBe("lower-body");
    expect(facets.categories).toContain("core");
    expect(facets.equipment[0]).toBe("barbell");
    expect(facets.equipment).not.toContain("sled");
  });
});
```

Run: `npx vitest run src/lib/data/exercises.demo.test.ts`
Expected: FAIL. `listPublishedExerciseFacets` findes ikke, og `q` filtrerer ikke endnu.

- [ ] **Step 2: Udvid datalaget**

I `src/lib/data/exercises.ts`:

1. Tilføj importen under de eksisterende:

```ts
import {
  escapeLike,
  facetsOf,
  matchesFilters,
  type ExerciseFacets,
  type ExerciseFilters,
} from "@/lib/data/exercise-filters";
```

2. Erstat den lokale typedefinition

```ts
export type ExerciseFilters = {
  category?: string;
  equipment?: string;
  pattern?: string;
  difficulty?: ExerciseDifficulty;
};
```

med en re-eksport, så eksisterende importer af typen fra `exercises.ts` stadig virker:

```ts
export type { ExerciseFacets, ExerciseFilters } from "@/lib/data/exercise-filters";
```

3. Erstat hele `listPublishedExercises` med:

```ts
export async function listPublishedExercises(
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_EXERCISES.filter((e) => matchesFilters(e, filters));

  // Many library rows share a display_order (the 2026-10 batch is
  // interleaved between older rows), so name breaks the tie.
  let query = supabase
    .from("exercises")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.equipment) query = query.eq("equipment", filters.equipment);
  if (filters.pattern) query = query.eq("pattern", filters.pattern);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  const search = filters.q?.trim();
  if (search) query = query.ilike("name", `%${escapeLike(search)}%`);

  const { data } = await query;
  // Supabase's generated DB types don't yet include the columns added
  // in migration 0028 — cast via unknown until `npm run db:types` is
  // re-run against the cloud project.
  return (data ?? []).map((r) => asExercise(r as unknown as ExerciseRow));
}

/**
 * The categories and equipment that occur among published exercises,
 * in taxonomy order. Two columns only: the library page needs the
 * filter choices without loading every exercise in full.
 */
export async function listPublishedExerciseFacets(): Promise<ExerciseFacets> {
  const supabase = await createClient();
  if (!supabase) return facetsOf(MOCK_EXERCISES);

  const { data } = await supabase
    .from("exercises")
    .select("category, equipment")
    .eq("is_published", true);

  return facetsOf((data ?? []) as unknown as { category: string | null; equipment: string | null }[]);
}
```

4. I `listAllExercisesForCoach` tilføjes den sekundære sortering, så review-køen og coach-listen ikke ordner rækker med samme `display_order` tilfældigt:

```ts
  const { data } = await supabase
    .from("exercises")
    .select(SELECT_COLS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
```

5. Slet den private funktion `matches` nederst i filen (den er erstattet af `matchesFilters`).

- [ ] **Step 3: Kør testene**

Run: `npx vitest run src/lib/data/exercises.demo.test.ts src/lib/data/exercise-filters.test.ts`
Expected: PASS.

Run: `grep -n "function matches\|matches(e, f" src/lib/data/exercises.ts; npx tsc --noEmit -p . 2>&1 | head; npx eslint src/lib/data/exercises.ts src/lib/data/exercises.demo.test.ts`
Expected: ingen grep-linjer, ingen type- eller lint-fejl.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/exercises.ts src/lib/data/exercises.demo.test.ts
git commit -m "feat(exercises): søgning på navn, facetter og stabil sortering i datalaget

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Biblioteket får søgning og redskabsfilter

**Files:**
- Create: `src/components/exercise/FilterPill.tsx`
- Create: `src/components/exercise/LibraryFilterForm.tsx`
- Create: `src/components/exercise/LibraryFilterForm.test.tsx`
- Modify: `src/app/(app)/train/exercises/page.tsx` (hele filen erstattes)
- Modify: `messages/da/Train.json`, `messages/en/Train.json`

- [ ] **Step 1: Skriv den fejlende test**

`next/form` kræver appens router; testen erstatter den med en almindelig `<form>`.

`src/components/exercise/LibraryFilterForm.test.tsx`:

```tsx
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

const { default: LibraryFilterForm } = await import("./LibraryFilterForm");

const labels = {
  search: "Søg øvelse",
  placeholder: "Navn, fx squat",
  equipment: "Redskab",
  allEquipment: "Alle redskaber",
  submit: "Søg",
};
const equipmentOptions = [
  { value: "barbell", label: "Vægtstang" },
  { value: "dumbbell", label: "Håndvægt" },
];

describe("LibraryFilterForm", () => {
  it("is a GET form on the library with the applied search and equipment filled in", () => {
    const html = renderToStaticMarkup(
      <LibraryFilterForm q="squat" category="" equipment="barbell" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(html).toContain('action="/train/exercises"');
    expect(html).toMatch(/<input[^>]*type="search"[^>]*name="q"[^>]*value="squat"/);
    expect(html).toContain('maxLength="80"');
    expect(html).toContain('<option value="">Alle redskaber</option>');
    expect(html).toContain('<option value="barbell" selected="">Vægtstang</option>');
    expect(html).toContain('<option value="dumbbell">Håndvægt</option>');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Søg<\/button>/);
  });

  it("labels both fields", () => {
    const html = renderToStaticMarkup(
      <LibraryFilterForm q="" category="" equipment="" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(html).toMatch(/<label[^>]*>.*Søg øvelse.*<input/);
    expect(html).toMatch(/<label[^>]*>.*Redskab.*<select/);
  });

  it("carries the chosen category along, and only when one is chosen", () => {
    const withCategory = renderToStaticMarkup(
      <LibraryFilterForm q="" category="cardio" equipment="" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(withCategory).toContain('<input type="hidden" name="category" value="cardio"/>');
    const without = renderToStaticMarkup(
      <LibraryFilterForm q="" category="" equipment="" equipmentOptions={equipmentOptions} labels={labels} />,
    );
    expect(without).not.toContain('name="category"');
  });
});
```

Run: `npx vitest run src/components/exercise/LibraryFilterForm.test.tsx`
Expected: FAIL. Komponenten findes ikke.

- [ ] **Step 2: Skriv komponenterne**

`src/components/exercise/FilterPill.tsx`:

```tsx
import Link from "next/link";

/**
 * A filter choice that is a link, so the filter state lives in the URL.
 * The active one is filled, the rest outlined; 44 px tall for touch.
 */
export default function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center px-4 text-xs border hairline transition-colors ${
        active ? "bg-fg text-bg border-transparent" : "text-fg-dim hover:text-fg hover:border-fg/30"
      }`}
    >
      {label}
    </Link>
  );
}
```

`src/components/exercise/LibraryFilterForm.tsx`:

```tsx
"use client";

import Form from "next/form";

type Option = { value: string; label: string };

/**
 * Search and equipment filter for the exercise library. A GET form, so
 * the state lives in the URL and it works without JavaScript; with
 * JavaScript, next/form navigates on the client and the equipment
 * choice submits on change. The page gives this component a key made
 * of the applied filters, so the fields reset when a pill or the
 * reset link changes them.
 */
export default function LibraryFilterForm({
  q,
  category,
  equipment,
  equipmentOptions,
  labels,
}: {
  q: string;
  category: string;
  equipment: string;
  equipmentOptions: Option[];
  labels: { search: string; placeholder: string; equipment: string; allEquipment: string; submit: string };
}) {
  return (
    <Form action="/train/exercises" className="flex flex-wrap items-end gap-3">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <label className="min-w-0 flex-1 basis-56 space-y-1.5">
        <span className="block text-xs text-fg-dim">{labels.search}</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={labels.placeholder}
          maxLength={80}
          autoComplete="off"
          className="input w-full"
        />
      </label>
      <label className="min-w-0 basis-44 space-y-1.5">
        <span className="block text-xs text-fg-dim">{labels.equipment}</span>
        <select
          name="equipment"
          defaultValue={equipment}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="input w-full"
        >
          <option value="">{labels.allEquipment}</option>
          {equipmentOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-primary">
        {labels.submit}
      </button>
    </Form>
  );
}
```

Run: `npx vitest run src/components/exercise/LibraryFilterForm.test.tsx`
Expected: PASS, 3 tests. Fejler en regex på attributrækkefølgen (React skriver attributterne i den rækkefølge, de står i JSX), så ret regex'en til den faktiske rækkefølge, ikke komponenten.

- [ ] **Step 3: Tilføj tekster**

I `messages/da/Train.json` udvides `index` (de seks eksisterende nøgler er uændrede):

```json
  "index": {
    "metaTitle": "Øvelser · Train",
    "eyebrow": "Train · Øvelses-bibliotek",
    "title": "Øvelser.",
    "subtitle": "Hver øvelse: hvilke muskler den rammer, hvordan du udfører den rigtigt, og hvad du skal undgå. Vores form-coach på print.",
    "allFilter": "Alle",
    "empty": "Ingen øvelser i biblioteket endnu.",
    "searchLabel": "Søg øvelse",
    "searchPlaceholder": "Navn, fx squat",
    "equipmentLabel": "Redskab",
    "allEquipment": "Alle redskaber",
    "submit": "Søg",
    "categoryNav": "Kategorier",
    "count": "{count, plural, one {# øvelse} other {# øvelser}}",
    "emptyFiltered": "Ingen øvelser matcher.",
    "reset": "Nulstil filtre"
  },
```

I `messages/en/Train.json` tilføjes de samme ni nøgler sidst i `index`:

```json
    "searchLabel": "Search exercises",
    "searchPlaceholder": "Name, e.g. squat",
    "equipmentLabel": "Equipment",
    "allEquipment": "All equipment",
    "submit": "Search",
    "categoryNav": "Categories",
    "count": "{count, plural, one {# exercise} other {# exercises}}",
    "emptyFiltered": "No exercises match.",
    "reset": "Clear filters"
```

- [ ] **Step 4: Skriv siden**

`src/app/(app)/train/exercises/page.tsx` (hele filen):

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import ExerciseCard from "@/components/exercise/ExerciseCard";
import FilterPill from "@/components/exercise/FilterPill";
import LibraryFilterForm from "@/components/exercise/LibraryFilterForm";
import { COMPANY } from "@/lib/company";
import { libraryHref, normalizeSearch, pickFacet } from "@/lib/data/exercise-library-url";
import { listPublishedExerciseFacets, listPublishedExercises } from "@/lib/data/exercises";

export async function generateMetadata() {
  const t = await getTranslations("Train.index");
  return {
    title: `${t("metaTitle")} · ${COMPANY.product}`,
  };
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ExercisesIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const t = await getTranslations("Train");

  // The filter choices come from what is actually published, so a
  // category or an implement nobody can find never shows, and a made-up
  // value in the URL is ignored.
  const facets = await listPublishedExerciseFacets();
  const q = normalizeSearch(params.q);
  const category = pickFacet(params.category, facets.categories);
  const equipment = pickFacet(params.equipment, facets.equipment);
  const exercises = await listPublishedExercises({ q, category, equipment });
  const filtered = Boolean(q || category || equipment);

  const label = (group: "categories" | "equipment", value: string) =>
    t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value;

  return (
    <>
      <PageHeader
        eyebrow={t("index.eyebrow")}
        title={t("index.title")}
        subtitle={t("index.subtitle")}
      />

      <Container className="py-10 md:py-14 space-y-8">
        <div className="space-y-4">
          <LibraryFilterForm
            key={`${q ?? ""}|${category ?? ""}|${equipment ?? ""}`}
            q={q ?? ""}
            category={category ?? ""}
            equipment={equipment ?? ""}
            equipmentOptions={facets.equipment.map((value) => ({ value, label: label("equipment", value) }))}
            labels={{
              search: t("index.searchLabel"),
              placeholder: t("index.searchPlaceholder"),
              equipment: t("index.equipmentLabel"),
              allEquipment: t("index.allEquipment"),
              submit: t("index.submit"),
            }}
          />

          {facets.categories.length > 0 ? (
            <nav aria-label={t("index.categoryNav")} className="flex flex-wrap gap-2">
              <FilterPill
                href={libraryHref({ q, equipment })}
                active={!category}
                label={t("index.allFilter")}
              />
              {facets.categories.map((c) => (
                <FilterPill
                  key={c}
                  href={libraryHref({ q, equipment, category: c })}
                  active={category === c}
                  label={label("categories", c)}
                />
              ))}
            </nav>
          ) : null}
        </div>

        <p className="text-sm text-fg-dim" role="status">
          {t("index.count", { count: exercises.length })}
        </p>

        {exercises.length === 0 ? (
          filtered ? (
            <p className="text-fg-dim">
              {t("index.emptyFiltered")}{" "}
              <Link href={libraryHref()} className="underline underline-offset-4">
                {t("index.reset")}
              </Link>
            </p>
          ) : (
            <p className="text-fg-dim">{t("index.empty")}</p>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <li key={ex.slug} className="min-w-0">
                <ExerciseCard exercise={ex} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
```

- [ ] **Step 5: Kør tests, typer og lint**

Run: `npx vitest run src/components/exercise src/lib/i18n/app-copy-gate.test.ts src/lib/data/exercise-meta.test.ts`
Expected: PASS. Copy-gaten bekræfter, at dansk og engelsk har de samme nøgler og ingen tankestreger.

Run: `npx tsc --noEmit -p . 2>&1 | head; npx eslint "src/app/(app)/train/exercises" src/components/exercise`
Expected: ingen fejl.

- [ ] **Step 6: Commit**

```bash
git add src/components/exercise/FilterPill.tsx src/components/exercise/LibraryFilterForm.tsx src/components/exercise/LibraryFilterForm.test.tsx "src/app/(app)/train/exercises/page.tsx" messages/da/Train.json messages/en/Train.json
git commit -m "feat(exercises): søgning og redskabsfilter i øvelsesbiblioteket

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Kategori-filter i review-køen

**Files:**
- Modify: `src/lib/coach/review-queue.ts`
- Modify: `src/lib/coach/review-queue.test.ts`
- Modify: `src/app/coach/exercises/review/page.tsx` (hele filen erstattes)
- Modify: `messages/da/CoachStudio.json`, `messages/en/CoachStudio.json`

- [ ] **Step 1: Skriv den fejlende test**

I `src/lib/coach/review-queue.test.ts` udvides importen med `draftCategoryCounts`:

```ts
import { draftCategoryCounts, initialQueue, keyToAction, queueReducer, tally } from "./review-queue";
```

og en ny `describe` tilføjes sidst i filen:

```ts
describe("draftCategoryCounts", () => {
  it("counts drafts per category in taxonomy order", () => {
    const drafts = [
      { category: "cardio" },
      { category: "lower-body" },
      { category: "cardio" },
      { category: "mobility" },
    ];
    expect(draftCategoryCounts(drafts)).toEqual([
      { category: "lower-body", count: 1 },
      { category: "mobility", count: 1 },
      { category: "cardio", count: 2 },
    ]);
  });

  it("leaves drafts without a category out, and puts unknown categories last", () => {
    expect(draftCategoryCounts([{ category: null }, { category: "odd" }, { category: "arms" }])).toEqual([
      { category: "arms", count: 1 },
      { category: "odd", count: 1 },
    ]);
  });

  it("is empty for no drafts", () => {
    expect(draftCategoryCounts([])).toEqual([]);
  });
});
```

Run: `npx vitest run src/lib/coach/review-queue.test.ts`
Expected: FAIL. `draftCategoryCounts` er ikke eksporteret.

- [ ] **Step 2: Skriv hjælperen**

I `src/lib/coach/review-queue.ts` tilføjes importen øverst (efter filens hovedkommentar):

```ts
import { orderByTaxonomy } from "@/lib/data/exercise-taxonomy";
```

og funktionen sidst i filen:

```ts
/**
 * Drafts per category, in taxonomy order, for the queue's filter. A
 * draft without a category is only reachable under "all".
 */
export function draftCategoryCounts(
  drafts: readonly { category: string | null }[],
): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of drafts) {
    if (d.category) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  }
  return orderByTaxonomy("categories", counts.keys()).map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
}
```

Run: `npx vitest run src/lib/coach/review-queue.test.ts`
Expected: PASS.

- [ ] **Step 3: Tilføj tekster**

I `messages/da/CoachStudio.json`, i `exercises.review`, efter linjen `"error": "Det virkede ikke: {message}"` (husk kommaet efter den):

```json
      "filterAll": "Alle ({count})",
      "filterCategory": "{label} ({count})"
```

I `messages/en/CoachStudio.json` samme sted:

```json
      "filterAll": "All ({count})",
      "filterCategory": "{label} ({count})"
```

- [ ] **Step 4: Skriv siden**

`src/app/coach/exercises/review/page.tsx` (hele filen):

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import ExerciseReviewQueue from "@/components/coach/ExerciseReviewQueue";
import FilterPill from "@/components/exercise/FilterPill";
import { draftCategoryCounts } from "@/lib/coach/review-queue";
import { listAllExercisesForCoach } from "@/lib/data/exercises";

export async function generateMetadata() {
  const t = await getTranslations("CoachStudio.exercises.review");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** Drafts with a video, in library order. Drafts without one stay in the editor. */
export default async function CoachExerciseReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("CoachStudio.exercises.review");
  const tTrain = await getTranslations("Train");
  const all = (await listAllExercisesForCoach()).filter((ex) => !ex.isPublished && ex.demoAssetUrl);

  // A category the queue has no drafts for is ignored, like a made-up one.
  const counts = draftCategoryCounts(all);
  const raw = (await searchParams).category;
  const wanted = Array.isArray(raw) ? raw[0] : raw;
  const category = counts.some((c) => c.category === wanted) ? wanted : undefined;
  const drafts = category ? all.filter((ex) => ex.category === category) : all;

  const categoryLabel = (c: string) => (tTrain.has(`categories.${c}`) ? tTrain(`categories.${c}`) : c);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-title md:text-[2.75rem]">{t("title")}</h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">{t("intro")}</p>
        <Link href="/coach/exercises" className="mt-4 inline-block text-sm text-fg-dim underline underline-offset-4">
          {t("back")}
        </Link>
      </header>

      {counts.length > 1 ? (
        <nav aria-label={tTrain("index.categoryNav")} className="flex flex-wrap gap-2">
          <FilterPill href="/coach/exercises/review" active={!category} label={t("filterAll", { count: all.length })} />
          {counts.map((c) => (
            <FilterPill
              key={c.category}
              href={`/coach/exercises/review?category=${encodeURIComponent(c.category)}`}
              active={category === c.category}
              label={t("filterCategory", { label: categoryLabel(c.category), count: c.count })}
            />
          ))}
        </nav>
      ) : null}

      {/* The queue freezes its list at mount; a new key restarts it when the filter changes. */}
      <ExerciseReviewQueue key={category ?? "all"} drafts={drafts} />
    </Container>
  );
}
```

- [ ] **Step 5: Kør tests, typer og lint**

Run: `npx vitest run src/lib/coach/review-queue.test.ts src/components/coach/ExerciseReviewQueue.test.tsx`
Expected: PASS. Køens egen test er uændret og grøn.

Run: `node -e "for (const l of ['da','en']) { const r=require('./messages/'+l+'/CoachStudio.json').exercises.review; console.log(l, r.filterAll, '|', r.filterCategory) }"`
Expected: `da Alle ({count}) | {label} ({count})` og `en All ({count}) | {label} ({count})`.

Run: `npx tsc --noEmit -p . 2>&1 | head; npx eslint src/app/coach/exercises/review src/lib/coach/review-queue.ts src/lib/coach/review-queue.test.ts`
Expected: ingen fejl.

- [ ] **Step 6: Commit**

```bash
git add src/lib/coach/review-queue.ts src/lib/coach/review-queue.test.ts src/app/coach/exercises/review/page.tsx messages/da/CoachStudio.json messages/en/CoachStudio.json
git commit -m "feat(coach): review-køen kan filtreres på kategori

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Taksonomien i coach-editoren og program-byggeren

**Files:**
- Modify: `src/app/coach/exercises/[slug]/ExerciseEditor.tsx`
- Create: `src/components/coach/ExercisePicker.tsx`
- Create: `src/components/coach/ExercisePicker.test.tsx`
- Modify: `src/app/coach/programs/[code]/ProgramBuilder.tsx`
- Modify: `src/app/coach/programs/[code]/page.tsx`
- Modify: `messages/da/CoachStudio.json`, `messages/en/CoachStudio.json`

- [ ] **Step 1: Skriv den fejlende test for vælgeren**

`src/components/coach/ExercisePicker.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render } from "../marketing/test-render";
import ExercisePicker from "./ExercisePicker";

const library = [
  { id: "3", name: "Tempo Run", category: "cardio" },
  { id: "1", name: "Back Squat", category: "lower-body" },
  { id: "2", name: "Air Squat", category: "lower-body" },
  { id: "4", name: "Mystery Move", category: "odd" },
  { id: "5", name: "Coach Draft", category: null },
];
const props = { onChange: () => {}, emptyLabel: "Ingen øvelser i bibliotek", uncategorisedLabel: "Uden kategori" };

describe("ExercisePicker", () => {
  it("groups the options by category in taxonomy order with translated labels", () => {
    const html = render(<ExercisePicker value="1" library={library} {...props} />);
    const order = ["Ben", "Kondition", "odd", "Uden kategori"].map((l) => html.indexOf(`<optgroup label="${l}">`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("sorts names inside a group and marks the chosen exercise", () => {
    const html = render(<ExercisePicker value="1" library={library} {...props} />);
    expect(html.indexOf("Air Squat")).toBeLessThan(html.indexOf("Back Squat"));
    expect(html).toContain('<option value="1" selected="">Back Squat</option>');
  });

  it("shows the empty label when the library is empty", () => {
    const html = render(<ExercisePicker value={null} library={[]} {...props} />);
    expect(html).toContain('<option value="">Ingen øvelser i bibliotek</option>');
    expect(html).not.toContain("<optgroup");
  });
});
```

Run: `npx vitest run src/components/coach/ExercisePicker.test.tsx`
Expected: FAIL. Komponenten findes ikke.

- [ ] **Step 2: Skriv vælgeren**

`src/components/coach/ExercisePicker.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { groupByCategory } from "@/lib/data/exercise-taxonomy";

export type PickerExercise = { id: string; name: string; category: string | null };

/**
 * The exercise dropdown in the program builder. With several hundred
 * exercises a flat list is unusable, so the options are grouped by
 * category in taxonomy order and sorted by name inside each group.
 */
export default function ExercisePicker({
  value,
  library,
  onChange,
  emptyLabel,
  uncategorisedLabel,
}: {
  value: string | null;
  library: PickerExercise[];
  onChange: (exercise: PickerExercise | null) => void;
  emptyLabel: string;
  uncategorisedLabel: string;
}) {
  const tTrain = useTranslations("Train");
  const groups = useMemo(() => groupByCategory(library), [library]);
  const groupLabel = (category: string | null) =>
    category === null
      ? uncategorisedLabel
      : tTrain.has(`categories.${category}`)
        ? tTrain(`categories.${category}`)
        : category;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(library.find((l) => l.id === e.target.value) ?? null)}
      className="input w-full"
    >
      {library.length === 0 ? <option value="">{emptyLabel}</option> : null}
      {groups.map((group) => (
        <optgroup key={group.category ?? ""} label={groupLabel(group.category)}>
          {group.items.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
```

Run: `npx vitest run src/components/coach/ExercisePicker.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 3: Brug vælgeren i program-byggeren**

I `src/app/coach/programs/[code]/ProgramBuilder.tsx`:

1. Tilføj importen under de eksisterende:

```ts
import ExercisePicker, { type PickerExercise } from "@/components/coach/ExercisePicker";
```

2. Slet linjen `type LibraryExercise = { id: string; name: string };`, og ret prop-typen `library: LibraryExercise[];` til `library: PickerExercise[];`.

3. Erstat hele `<select … > … </select>`-elementet inde i `<label>` med `{t("exerciseLabel")}` (det med `value={ex.exerciseId ?? ""}`) med:

```tsx
                        <ExercisePicker
                          value={ex.exerciseId}
                          library={library}
                          onChange={(lib) =>
                            patchExercise(di, ei, {
                              exerciseId: lib?.id ?? null,
                              exerciseName: lib?.name ?? "",
                            })
                          }
                          emptyLabel={t("libraryEmpty")}
                          uncategorisedLabel={t("libraryUncategorised")}
                        />
```

I `src/app/coach/programs/[code]/page.tsx` sendes kategorien med:

```ts
  // Minimal shape for the exercise picker dropdown.
  const library = libraryRaw.map((e) => ({ id: e.id, name: e.name, category: e.category }));
```

I `messages/da/CoachStudio.json`, i `programBuilder`, efter linjen `"libraryEmpty": "Ingen øvelser i bibliotek",`:

```json
    "libraryUncategorised": "Uden kategori",
```

I `messages/en/CoachStudio.json` samme sted:

```json
    "libraryUncategorised": "No category",
```

- [ ] **Step 4: Lad coach-editoren læse taksonomien**

I `src/app/coach/exercises/[slug]/ExerciseEditor.tsx` tilføjes importen under de eksisterende:

```ts
import { TAXONOMY } from "@/lib/data/exercise-taxonomy";
```

og de tre håndskrevne lister `const CATEGORIES = [ … ];`, `const PATTERNS = [ … ];` og `const EQUIPMENT = [ … ];` erstattes med:

```ts
// The editor offers exactly what the catalogue knows. The hand-written
// lists that stood here lacked kettlebell, band, isolation and carry.
const CATEGORIES = [...TAXONOMY.categories];
const PATTERNS = [...TAXONOMY.patterns];
const EQUIPMENT = [...TAXONOMY.equipment];
```

`const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;` bliver stående.

- [ ] **Step 5: Kør tests, typer og lint**

Run: `npx vitest run src/components/coach src/lib/data/exercise-taxonomy.test.ts`
Expected: PASS.

Run: `grep -n '"upper-body-push"\|"push-horizontal"' "src/app/coach/exercises/[slug]/ExerciseEditor.tsx"; grep -n "LibraryExercise" "src/app/coach/programs/[code]/ProgramBuilder.tsx"`
Expected: ingen linjer.

Run: `npx tsc --noEmit -p . 2>&1 | head; npx eslint src/app/coach src/components/coach/ExercisePicker.tsx src/components/coach/ExercisePicker.test.tsx`
Expected: ingen fejl.

- [ ] **Step 6: Commit**

```bash
git add "src/app/coach/exercises/[slug]/ExerciseEditor.tsx" src/components/coach/ExercisePicker.tsx src/components/coach/ExercisePicker.test.tsx "src/app/coach/programs/[code]/ProgramBuilder.tsx" "src/app/coach/programs/[code]/page.tsx" messages/da/CoachStudio.json messages/en/CoachStudio.json
git commit -m "feat(coach): editor og program-bygger bruger taksonomien, og øvelsesvælgeren grupperes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 17: [operatør] Samlet verifikation, dokumentation og PR

- [ ] **Step 1: Hele suiten**

Run: `npm test 2>&1 | tail -8; npx tsc --noEmit -p . 2>&1 | head; npm run lint 2>&1 | tail -5; npm run build 2>&1 | tail -15`
Expected: alle tests grønne, ingen type- eller lint-fejl, og build gennemført. Notér antal tests.

- [ ] **Step 2: Browser i demo-mode**

Følg browser-verify-protokollen: `.env.local` flyttes til `.env.local.bak`, så appen kører på mocks, dev-serveren startes, og login sker med invitationskoden for Munk. Kør ikke samtidig med Storage-uploaden, som læser `.env.local`. Flyt filen tilbage bagefter, og bekræft at den er der.

På `/train/exercises`, i 375 px og desktop-bredde:

| Handling | Forventet |
|---|---|
| Åbn siden | Søgefelt, redskabsvælger, kategori-piller, "20 øvelser", 20 kort |
| Søg `squat` | URL `?q=squat`, "2 øvelser": Back Squat og Front Squat |
| Vælg et redskab i vælgeren | Siden filtrerer uden klik på knappen, URL får `equipment=` og beholder `q` |
| Klik en kategori-pille | URL får `category=` og beholder de andre filtre; pillen er markeret |
| Søg `zzz` | "0 øvelser", teksten "Ingen øvelser matcher." og linket "Nulstil filtre", som fører til siden uden parametre med tomt søgefelt |
| Åbn `?category=findes-ikke` | Parameteren ignoreres, alle 20 vises |
| Front Squat-kortet, derefter detaljesiden | Loopet afspilles (det nye klip) |

Ingen fejl i konsollen. Ingen vandret scroll i 375 px.

Coach-fladerne: `/coach/exercises/back-squat` viser redskabslisten med alle 12 værdier; program-byggeren viser øvelsesvælgeren grupperet (Ben, Push, Pull …).

Tag et skærmbillede af biblioteket på mobil og desktop til PR'en.

- [ ] **Step 3: Vægten af "Alle"-visningen**

Mål i browseren på `/train/exercises`:

```js
({ html: document.documentElement.outerHTML.length, card: document.querySelector("ul.grid > li").outerHTML.length, cards: document.querySelectorAll("ul.grid > li").length })
```

Anslå vægten ved 580 kort som `html + (580 − cards) × card` og rapportér tallet i slutrapporten sammen med en vurdering af, om paginering bør følge.

- [ ] **Step 4: Dokumentation**

- `docs/PLATFORM_OVERVIEW.md`, række 10: `| 10 | 369 nye øvelser er `is_published=false` | Indhold | MoveKit-batch 2026-10 (migration 0066); venter på Munk-review i `/coach/exercises/review` |`.
- `docs/EXERCISE_3D_RESEARCH.md`, i afsnit 4 (v1-ingestion): et kort afsnit om, at pakken nu er 577 klip, at `scripts/movekit-manifest.json` er ledger, og at en ny pakke håndteres med `movekit-audit.mjs`, `build-wf-exercises.mjs`, `gen-exercise-seed.mjs`, `ingest-manifest.mjs`, `upload-demos-to-storage.mjs` og `gen-demo-urls.mjs` i den rækkefølge.

Commit: `docs: MoveKit-pipelinen og status efter batch 2026-10`.

- [ ] **Step 5: Afsluttende kode-review**

Send hele branchens diff (`git diff main...HEAD`, uden `docs/superpowers/` og `scripts/movekit-manifest.json`) til en code-reviewer-agent med spec'en som krav. Ret kritiske og vigtige fund, og kør Step 1 igen.

- [ ] **Step 6: Push og PR**

Push branchen og åbn en PR mod `main`. Merge ikke. PR-beskrivelsen skal indeholde:

- hvad der er lavet, med tallene (369 kladder, 4 kerneøvelser, 2214 filer i Storage);
- **udrulningsrækkefølgen**: merge og deploy først, derefter `supabase db push` (0066 og 0067). Før deploy ville front-squat pege på en fil, der ikke findes, og Power-labelen mangle;
- at Storage-uploaden er sket og er additiv;
- at de 369 er kladder og først ses af medlemmer, når Munk godkender dem;
- afvigelser fra gennemgangen med Tom (369 i stedet for 373, intet `?v=2`, flyt af jump-squats og mavestræk, grupperet øvelsesvælger);
- skærmbilleder og testtal.

Bind PR'en i appen, og læs CI-status.

