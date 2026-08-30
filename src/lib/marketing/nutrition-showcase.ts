/**
 * Landing Kost-phone — day-0 meals from the same mock generator the
 * app uses in demo mode, with local Unsplash stills (no API at request
 * time). Titles stay catalog-Danish; chrome is i18n.
 */

import { generateMockPlan } from "@/lib/nutrition/mock-plan";

type MealSlot = "morgen" | "frokost" | "aften" | "snack" | "pre" | "post";

/** Same defaults as `DEFAULT_PROFILE` — inlined so the landing
 *  does not import the server-only nutrition data layer. */
const SHOWCASE_PROFILE = {
  diet: "omnivore" as const,
  allergies: [] as string[],
  dislikes: [] as string[],
  preferences: [] as string[],
  fishPerWeek: 2,
  cookingLevel: "intermediate" as const,
  goal: "maintain" as const,
  dailyKcalTarget: null,
  dailyProteinGTarget: null,
};

/** Stable Monday — generator only uses weekStart in notes. */
const SHOWCASE_WEEK_START = "2026-08-24";

type Still = {
  src: string;
  photographer: string;
};

/**
 * Stills keyed by exact mock-plan titles for day 0 of the default
 * omnivore plan. If the catalog rotation changes, the test in
 * `nutrition-showcase.test.ts` fails and the map must be updated.
 */
export const MEAL_STILLS: Record<string, Still> = {
  "Skyr-bowl med hindbær og valnødder": {
    src: "/marketing/meals/skyr-bowl.jpg",
    photographer: "Brooke Lark",
  },
  "Bagt laks med søde kartofler og asparges": {
    src: "/marketing/meals/baked-salmon.jpg",
    photographer: "Casey Lee",
  },
  "Stegte rejer med hvidløg, citron og brune ris": {
    src: "/marketing/meals/garlic-shrimp.jpg",
    photographer: "Sheri Silver",
  },
};

export type ShowcaseMeal = {
  slot: MealSlot;
  title: string;
  estKcal: number;
  estProteinG: number;
  prepMinutes: number;
  imageSrc: string;
  photographer: string;
};

export type ShowcaseNutritionDay = {
  dailyKcal: number;
  dailyProteinG: number;
  meals: ShowcaseMeal[];
  photographers: string[];
};

export function getShowcaseNutritionDay(): ShowcaseNutritionDay {
  const plan = generateMockPlan({
    profile: SHOWCASE_PROFILE,
    weekStart: SHOWCASE_WEEK_START,
  });
  const day0 = plan.meals.filter((m) => m.dayIndex === 0);
  const meals: ShowcaseMeal[] = day0.map((m) => {
    const still = MEAL_STILLS[m.title];
    if (!still) {
      throw new Error(
        `No landing still for mock-plan title "${m.title}". Update MEAL_STILLS.`,
      );
    }
    return {
      slot: m.slot,
      title: m.title,
      estKcal: m.estKcal ?? 0,
      estProteinG: m.estProteinG ?? 0,
      prepMinutes: m.prepMinutes ?? 0,
      imageSrc: still.src,
      photographer: still.photographer,
    };
  });
  return {
    dailyKcal: plan.targets.kcal,
    dailyProteinG: plan.targets.proteinG,
    meals,
    photographers: meals.map((m) => m.photographer),
  };
}
