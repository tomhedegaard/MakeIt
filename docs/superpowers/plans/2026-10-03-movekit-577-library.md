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
| `make-portrait-demo.mjs <src> <slug>` skriver portrættrioen til `MI_DEMO_OUT` (default `public/exercise-demos`) | `scripts/make-portrait-demo.mjs:163` |
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
| `scripts/build-wf-exercises.mjs` (ny), `scripts/wf-exercises.mjs` (genereret) | Workflow-script fra manifestet | 3 |
| `scripts/lib/exercise-seed.mjs` (ny), `scripts/gen-exercise-seed.mjs` | JSON til seed-SQL med validering | 3 |
| `scripts/gen-demo-urls.mjs` (ny) | URL-blokken til 0067 | 3 |
| `supabase/migrations/0066_…`, `0067_…` (nye) | Seed og wiring | 3 |
| `src/lib/data/exercises.ts`, `exercise-library-url.ts` (ny) | Søgning, facetter, URL-bygger | 4 |
| `src/app/(app)/train/exercises/page.tsx`, `LibraryFilterForm.tsx` (ny) | Bibliotekets filtre | 4 |
| `src/app/coach/exercises/review/page.tsx`, `src/lib/coach/review-queue.ts` | Kategori-filter i review-køen | 4 |
| `ExerciseEditor.tsx`, `ProgramBuilder.tsx` | Taksonomi i coach-fladerne | 4 |

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
  const unknown = [...present].filter((v) => !order.includes(v)).sort((a, b) => a.localeCompare(b));
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
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
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

Run: `npx vitest run messages src/i18n`
Expected: PASS. Eventuelle paritetstests mellem dansk og engelsk er stadig grønne, fordi begge sprog fik de samme nøgler.

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
  ])("%s -> %s", (slug, expected) => {
    expect(equipmentHint(slug)).toBe(expected);
  });

  it("gives no hint when the slug names no equipment", () => {
    expect(equipmentHint("long-run")).toBeNull();
    expect(equipmentHint("spider-curl")).toBeNull();
    expect(equipmentHint("towel-slide-leg-curl")).toBeNull();
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
];

/** The equipment a slug names, or null when it names none. Advisory: the agent may overrule it. */
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

I `scripts/movekit-map.json` erstattes `_doc` og fire poster. Resten er uændret.

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
console.log(`  uden rød markering: ${count((c) => !c.highlight && !c.skipped)}`);
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
  uden rød markering: 48
  tildelt 2026-10:    369
→ scripts/movekit-manifest.json
```

Afviger et tal, så stop og undersøg før manifestet committes. `kernekilder` er 19, fordi `bench` og `paused-bench` deler klip.

Run: `node scripts/movekit-audit.mjs --no-measure | head -8`
Expected: samme tal uden linjen `tildelt`, på et øjeblik. Det viser, at en genkørsel er stabil.

Run: `shasum scripts/movekit-manifest.json` før og efter genkørslen
Expected: samme checksum. Genkørslen ændrer ikke filen, når intet er ændret (samme dag).

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
const jobs = Math.max(1, Number(flag("jobs") ?? 3));
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
  for (const f of failures) console.log(`  · ${f.slug}: ${f.error.split("\n").at(-1)}`);
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

Run: `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 MoveKit/.staging/2026-10/arnold-press.webm MoveKit/.staging/2026-10/arnold-press-portrait.webm`
Expected: `720,398` (eller 720×400, lige tal) for landskab og `406,720` for portræt.

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

- [ ] **Step 2: Prøv tørkørslen mod bucketen**

Tørkørslen lister bucketen (kun læsning) og uploader intet. Staging-mappen rummer på dette tidspunkt mindst røgtestens seks filer.

Run: `MI_DEMO_OUT=MoveKit/.staging/2026-10 node scripts/upload-demos-to-storage.mjs --dry`
Expected: første linje slutter med `(1182 objekter i forvejen)`, `findes allerede: 0 (springes over)` og `uploades: <antal filer i staging> (DRY RUN)`. Antallet afhænger af, hvor langt encodingen er nået.

- [ ] **Step 3: Commit**

```bash
git add scripts/upload-demos-to-storage.mjs
git commit -m "feat(movekit): Storage-upload springer eksisterende filer over som standard

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

