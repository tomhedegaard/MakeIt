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
    ["bodyweight-squat-to-stand", "bodyweight"],
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

  it("keeps the order of a slug that is already seeded", () => {
    expect(interleavedOrder(existing, "band-row")).toBe(1050);
  });

  it("joins the slot of a predecessor that is itself interleaved (a third batch)", () => {
    const withSecondBatch = [
      ...existing,
      { slug: "arnold-press", order: 995 },
      { slug: "band-pull-through", order: 1045 },
    ];
    expect(interleavedOrder(withSecondBatch, "assault-bike")).toBe(995);
    expect(interleavedOrder(withSecondBatch, "band-pullover")).toBe(1045);
    expect(interleavedOrder(withSecondBatch, "band-shrug")).toBe(1055);
  });
});
