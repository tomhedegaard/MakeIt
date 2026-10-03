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
  slugsToRerun,
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

  it("lets a later source settle a conflict from an earlier one", () => {
    const first = [ex({ slug: "a" }), ex({ slug: "a", name: "Other" })];
    const second = [ex({ slug: "a", name: "Final" })];
    const { merged, conflicts } = mergeExercises([first, second]);
    expect(conflicts).toEqual([]);
    expect(merged[0].name).toBe("Final");
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
    [{ cue: "Bryst op — knæ ud." }, /tankestreg/],
    [{ setup: "Stang i rack – hoftebredde." }, /tankestreg/],
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

describe("slugsToRerun", () => {
  it("names the batch slugs that validation errors start with, once each, sorted", () => {
    const errors = [
      "b: ukendt category \"legs\"",
      "a: mangler i JSON",
      "b: tomt felt setup",
      "#3: ugyldig eller manglende slug",
      "stranger: står to gange med forskelligt indhold i samme kilde",
    ];
    expect(slugsToRerun(errors, ["a", "b", "c"])).toEqual(["a", "b"]);
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
