import { describe, expect, it } from "vitest";
import { foodSignals, type FoodSignalInput } from "./food-signals";

const base: FoodSignalInput = {
  today: "2026-10-06",
  floorKcal: 1800,
  days: [],
  pejlemaerke: [],
  estimates: [],
  weighIns: [],
};

describe("foodSignals", () => {
  it("finds nothing in an ordinary week", () => {
    expect(
      foodSignals({
        ...base,
        days: [
          { date: "2026-10-04", kcal: 2400, logs: 4 },
          { date: "2026-10-05", kcal: 2300, logs: 3 },
        ],
        weighIns: [{ date: "2026-10-05", count: 1 }],
      }),
    ).toEqual([]);
  });

  it("flags three fully logged days in a row under the floor", () => {
    const days = ["2026-10-03", "2026-10-04", "2026-10-05"].map((date) => ({ date, kcal: 1400, logs: 3 }));
    expect(foodSignals({ ...base, days })).toEqual(["underFloor"]);
    // A gap breaks the streak; partly logged days do not count.
    expect(foodSignals({ ...base, days: [days[0], days[2], { date: "2026-10-06", kcal: 1400, logs: 3 }] })).toEqual([]);
    expect(foodSignals({ ...base, days: days.map((d) => ({ ...d, logs: 2 })) })).toEqual([]);
  });

  it("flags a pejlemærke lowered three times in 30 days, not raised ones or old ones", () => {
    const kgs = [80, 78, 76, 74];
    const pejlemaerke = kgs.map((kg, i) => ({ kg, at: `2026-09-${20 + i}T10:00:00Z` }));
    expect(foodSignals({ ...base, pejlemaerke })).toEqual(["pejlemaerkeLowered"]);
    expect(foodSignals({ ...base, pejlemaerke: pejlemaerke.slice(0, 3) })).toEqual([]);
    const old = kgs.map((kg, i) => ({ kg, at: `2026-08-0${1 + i}T10:00:00Z` }));
    expect(foodSignals({ ...base, pejlemaerke: old })).toEqual([]);
  });

  it("flags estimates edited below HQ's interval three times in 14 days", () => {
    const cut = { kcal: 300, low: 550, edited: true };
    const estimates = ["2026-10-01", "2026-10-03", "2026-10-05"].map((date) => ({ date, ...cut }));
    expect(foodSignals({ ...base, estimates })).toEqual(["estimatesCutDown"]);
    expect(foodSignals({ ...base, estimates: estimates.map((e) => ({ ...e, edited: false })) })).toEqual([]);
    expect(foodSignals({ ...base, estimates: estimates.map((e) => ({ ...e, kcal: 600 })) })).toEqual([]);
  });

  it("flags three weigh-ins on one day in the last week", () => {
    expect(foodSignals({ ...base, weighIns: [{ date: "2026-10-04", count: 3 }] })).toEqual(["frequentWeighing"]);
    expect(foodSignals({ ...base, weighIns: [{ date: "2026-09-20", count: 5 }] })).toEqual([]);
  });
});
