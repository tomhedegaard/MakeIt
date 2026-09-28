import { describe, expect, it } from "vitest";
import { generateMockPlan } from "./mock-plan";
import {
  PLAN_MACRO_TOLERANCE,
  dayMacrosWithinBand,
  defaultKcalForGoal,
  defaultProteinGForKcal,
  resolveDailyTargets,
  scaleMealsToDailyTargets,
  sumDayMacros,
  type PlanMealDraft,
} from "./plan-macros";

const WEEK = "2026-09-07";

const OMNI_RECOMP = {
  diet: "omnivore" as const,
  allergies: [] as string[],
  dislikes: [] as string[],
  preferences: [] as string[],
  fishPerWeek: 2,
  cookingLevel: "intermediate" as const,
  goal: "recomp" as const,
  dailyKcalTarget: 2500,
  dailyProteinGTarget: 188,
};

function meal(partial: Partial<PlanMealDraft> & { estKcal: number; estProteinG: number }): PlanMealDraft {
  return {
    dayIndex: 0,
    slot: "frokost",
    kind: "component",
    title: "Testmåltid",
    description: "Test.",
    ingredients: [{ name: "kyllingebryst", amount: 150, unit: "g" }],
    steps: ["Steg."],
    estCarbsG: 40,
    estFatG: 12,
    carbDensity: "standard",
    prepMinutes: 10,
    swappable: true,
    position: 0,
    imageUrl: null,
    imageThumbUrl: null,
    imageAttributionName: null,
    imageAttributionUrl: null,
    ...partial,
  };
}

describe("resolveDailyTargets", () => {
  it("uses explicit profile targets when set", () => {
    expect(
      resolveDailyTargets({
        goal: "maintain",
        dailyKcalTarget: 2500,
        dailyProteinGTarget: 188,
      }),
    ).toMatchObject({ kcal: 2500, proteinG: 188 });
  });

  it("defaults recomp to 2500 kcal / 188 g protein (30% of kcal)", () => {
    const t = resolveDailyTargets({
      goal: "recomp",
      dailyKcalTarget: null,
      dailyProteinGTarget: null,
    });
    expect(t.kcal).toBe(2500);
    expect(t.proteinG).toBe(188);
    expect(defaultKcalForGoal("recomp")).toBe(2500);
    expect(defaultProteinGForKcal(2500)).toBe(188);
  });
});

describe("scaleMealsToDailyTargets", () => {
  it("scales a ~1500 kcal / 70 g day up into the 2500 / 188 band", () => {
    const raw = [
      meal({ slot: "morgen", estKcal: 360, estProteinG: 26, position: 0 }),
      meal({
        slot: "frokost",
        estKcal: 580,
        estProteinG: 22,
        position: 1,
        ingredients: [{ name: "edamame", amount: 100, unit: "g" }],
      }),
      meal({
        slot: "aften",
        estKcal: 540,
        estProteinG: 22,
        position: 2,
        ingredients: [{ name: "kikærter", amount: 300, unit: "g" }],
      }),
    ];
    expect(sumDayMacros(raw)).toEqual({ kcal: 1480, proteinG: 70 });
    expect(
      dayMacrosWithinBand(sumDayMacros(raw), { kcal: 2500, proteinG: 188 }),
    ).toBe(false);

    const scaled = scaleMealsToDailyTargets(raw, { kcal: 2500, proteinG: 188 });
    const totals = sumDayMacros(scaled);
    expect(
      dayMacrosWithinBand(totals, { kcal: 2500, proteinG: 188 }, PLAN_MACRO_TOLERANCE),
    ).toBe(true);
    expect(scaled.some((m) => m.title.includes("protein-top"))).toBe(true);
  });
});

describe("generateMockPlan macro band", () => {
  /**
   * Tolerance locked here and in PLAN_MACRO_TOLERANCE:
   *   kcal    ±15% of daily target
   *   protein ±20% of daily target
   * For 2500 / 188 that is 2125–2875 kcal and 150–226 g protein.
   */
  it("lands every day within ±15% kcal / ±20% protein of 2500 / 188", () => {
    const plan = generateMockPlan({ profile: OMNI_RECOMP, weekStart: WEEK });
    expect(plan.targets.kcal).toBe(2500);
    expect(plan.targets.proteinG).toBe(188);

    for (let day = 0; day < 7; day++) {
      const totals = sumDayMacros(plan.meals.filter((m) => m.dayIndex === day));
      expect(
        dayMacrosWithinBand(totals, plan.targets, PLAN_MACRO_TOLERANCE),
        `day ${day} was ${totals.kcal} kcal / ${totals.proteinG}g P`,
      ).toBe(true);
    }
  });

  it("uses the same band when targets come from the recomp goal default", () => {
    const plan = generateMockPlan({
      profile: { ...OMNI_RECOMP, dailyKcalTarget: null, dailyProteinGTarget: null },
      weekStart: WEEK,
    });
    expect(plan.targets.kcal).toBe(2500);
    expect(plan.targets.proteinG).toBe(188);
    for (let day = 0; day < 7; day++) {
      const totals = sumDayMacros(plan.meals.filter((m) => m.dayIndex === day));
      expect(dayMacrosWithinBand(totals, plan.targets)).toBe(true);
    }
  });

  it("keeps cut / mass goal defaults inside the same relative band", () => {
    for (const goal of ["cut", "mass", "maintain"] as const) {
      const plan = generateMockPlan({
        profile: { ...OMNI_RECOMP, goal, dailyKcalTarget: null, dailyProteinGTarget: null },
        weekStart: WEEK,
      });
      for (let day = 0; day < 7; day++) {
        const totals = sumDayMacros(plan.meals.filter((m) => m.dayIndex === day));
        expect(
          dayMacrosWithinBand(totals, plan.targets),
          `${goal} day ${day} was ${totals.kcal} / ${totals.proteinG}`,
        ).toBe(true);
      }
    }
  });
});
