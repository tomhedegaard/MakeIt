import { describe, expect, it } from "vitest";
import { buildMorningSignal, type MorningSignalInput } from "./morning-signal";

const base: MorningSignalInput = {
  hrv: { latestMs: 43.4, bucket: "low", band: { lowMs: 54, highMs: 68 }, nightsMs: [60, 58, 55, 43] },
  mind: { energy: 3, stress: 2, focus: 4 },
  intake: { consumedKcal: 1312, targetKcal: 2740, consumedProtein: 96, targetProtein: 182 },
  trainingDay: true,
};

describe("buildMorningSignal", () => {
  it("returns heart, food and mind cards with links; the session is its own card", () => {
    const cards = buildMorningSignal(base);
    expect(cards.map((c) => c.domain)).toEqual(["heart", "food", "mind"]);
    expect(cards.map((c) => c.href)).toEqual(["/hrv", "/nutrition", "/mind/check"]);
  });

  it("states facts with a why-line and data ink, never a score", () => {
    const [heart, food, mind] = buildMorningSignal(base);
    expect(heart).toMatchObject({ value: 43, unit: "ms", valueKey: "belowBand" });
    expect(heart.why).toEqual([{ key: "band", values: { low: 54, high: 68 } }]);
    expect(heart.ink).toEqual({ kind: "spark", data: [60, 58, 55, 43] });
    expect(food).toMatchObject({ value: 1312, unit: "kcalOf", of: 2740 });
    expect(food.why).toEqual([{ key: "trainingDay" }, { key: "proteinOf", values: { value: 96, of: 182 } }]);
    expect(food.ink).toMatchObject({ kind: "bar" });
    expect(mind).toMatchObject({ value: 3, unit: "scale", valueKey: "energy" });
    expect(mind.ink).toEqual({ kind: "ticks", values: [3, 2, 4] });
  });

  it("keeps 14 nights and says the band is building until it is steady", () => {
    const nightsMs = Array.from({ length: 20 }, (_, i) => 50 + i);
    const [heart] = buildMorningSignal({ ...base, hrv: { ...base.hrv!, band: null, nightsMs } });
    expect(heart.why).toEqual([{ key: "bandBuilding" }]);
    expect(heart.ink).toEqual({ kind: "spark", data: nightsMs.slice(-14) });
  });

  it("says eaten of the target, never remaining, and has no warning over the target", () => {
    const over = buildMorningSignal({ ...base, intake: { ...base.intake, consumedKcal: 2940 } })[1];
    expect(over).toMatchObject({ value: 2940, of: 2740, ink: { kind: "bar", ratio: 1 } });
    const rest = buildMorningSignal({ ...base, trainingDay: false })[1];
    expect(rest.why[0]).toEqual({ key: "restDay" });
  });

  it("turns missing data into an action, not an empty hole", () => {
    const [heart, food, mind] = buildMorningSignal({
      hrv: null,
      mind: null,
      intake: { consumedKcal: 0, targetKcal: null, consumedProtein: 0, targetProtein: null },
      trainingDay: false,
    });
    expect(heart).toMatchObject({ valueKey: "connect", why: [{ key: "connectWhy" }], ink: null });
    expect(heart.value).toBeUndefined();
    expect(mind).toMatchObject({ valueKey: "checkIn", why: [{ key: "checkInWhy" }], ink: null });
    expect(food).toMatchObject({ value: 0, unit: "kcal", ink: null });
    expect(food.why[1]).toEqual({ key: "protein", values: { value: 0 } });
  });
});
