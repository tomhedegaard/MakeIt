import { describe, expect, it } from "vitest";
import da from "../../../messages/da/Train.json";
import en from "../../../messages/en/Train.json";
import { exerciseMetaLabels } from "./exercise-meta";
import { TAXONOMY } from "./exercise-taxonomy";

function translator(messages: Record<string, unknown>) {
  const get = (key: string) =>
    key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), messages);
  const t = (key: string) => String(get(key));
  t.has = (key: string) => typeof get(key) === "string";
  return t;
}

const CATALOGUE = {
  categories: TAXONOMY.categories,
  equipment: TAXONOMY.equipment,
  difficulty: TAXONOMY.difficulty,
};

describe("exerciseMetaLabels", () => {
  it("translates the card kicker instead of showing catalogue enums", () => {
    const t = translator(da);
    expect(exerciseMetaLabels(t, { category: "lower-body", equipment: "barbell", difficulty: "intermediate" })).toEqual([
      "Ben",
      "Vægtstang",
      "Mellem",
    ]);
  });

  it.each([["da", da], ["en", en]] as const)("has a %s label for every value in the live catalogue", (_loc, msgs) => {
    const t = translator(msgs);
    for (const [group, values] of Object.entries(CATALOGUE)) {
      for (const v of values) expect(t.has(`${group}.${v}`), `${group}.${v}`).toBe(true);
    }
  });

  it("falls back to the raw value when a new one has no translation yet", () => {
    expect(
      exerciseMetaLabels(translator(da), { category: null, equipment: "hoverboard", difficulty: null }),
    ).toEqual(["hoverboard"]);
  });
});
