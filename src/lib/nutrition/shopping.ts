/**
 * Shopping-list aggregator.
 *
 * Pure derivation off the week's meals — no schema, no DB. Walks
 * every ingredient across the plan, sums amounts when (name, unit)
 * matches, multiplies by household size, and groups by the brand
 * allowlist category so the printed list reads in the same order
 * the supermarket is laid out (proteins → carbs → fats → veg →
 * herbs → spices → pantry → other).
 */

import { ALLOWLIST } from "@/lib/nutrition/brand";
import type { Ingredient, Meal } from "@/lib/data/nutrition";

/* ---------------------------------------------------------------- *
 * Categories
 * ---------------------------------------------------------------- */

export type ShoppingCategory =
  | "proteins"
  | "fish"
  | "dairy"
  | "carbs"
  | "veg"
  | "fats"
  | "herbs"
  | "spices"
  | "pantry"
  | "other";

const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  proteins: "Kød & æg",
  fish:     "Fisk",
  dairy:    "Mejeri",
  carbs:    "Korn, kartofler & frugt",
  veg:      "Grønt",
  fats:     "Fedt & nødder",
  herbs:    "Friske krydderurter",
  spices:   "Krydderier",
  pantry:   "Tørvarer & pantry",
  other:    "Andet",
};

const CATEGORY_ORDER: ShoppingCategory[] = [
  "proteins", "fish", "dairy", "carbs", "veg", "fats",
  "herbs", "spices", "pantry", "other",
];

export function shoppingCategoryLabel(c: ShoppingCategory): string {
  return CATEGORY_LABELS[c];
}

/* ---------------------------------------------------------------- *
 * Ingredient → category map (built once from the allowlist)
 * ---------------------------------------------------------------- */

type Lookup = Array<{ needle: string; category: ShoppingCategory }>;

const LOOKUP: Lookup = buildLookup();

function buildLookup(): Lookup {
  const out: Lookup = [];
  // Proteins — animal + plant lump together; fish gets its own bucket
  for (const term of ALLOWLIST.proteins.animal) push(term, "proteins");
  for (const term of ALLOWLIST.proteins.fish)   push(term, "fish");
  for (const term of ALLOWLIST.proteins.plant)  push(term, "proteins");
  for (const term of ALLOWLIST.proteins.dairy)  push(term, "dairy");
  // Carbs
  for (const term of ALLOWLIST.carbs.grains)    push(term, "carbs");
  for (const term of ALLOWLIST.carbs.roots)     push(term, "carbs");
  for (const term of ALLOWLIST.carbs.fruit)     push(term, "carbs");
  // Fats — oils into pantry, nuts/seeds/whole into fats
  for (const term of ALLOWLIST.fats.oils)       push(term, "pantry");
  for (const term of ALLOWLIST.fats.nuts)       push(term, "fats");
  for (const term of ALLOWLIST.fats.seeds)      push(term, "fats");
  for (const term of ALLOWLIST.fats.whole)      push(term, "fats");
  // Veg — flatten subgroups
  for (const term of ALLOWLIST.veg.cruciferous) push(term, "veg");
  for (const term of ALLOWLIST.veg.leafy)       push(term, "veg");
  for (const term of ALLOWLIST.veg.alliums)     push(term, "veg");
  for (const term of ALLOWLIST.veg.other)       push(term, "veg");
  // Herbs / spices / pantry
  for (const term of ALLOWLIST.herbs)           push(term, "herbs");
  for (const term of ALLOWLIST.spices)          push(term, "spices");
  for (const term of ALLOWLIST.pantry)          push(term, "pantry");
  // Sort longest needle first so "søde kartofler" wins over "kartofler".
  out.sort((a, b) => b.needle.length - a.needle.length);
  return out;
  function push(term: string, category: ShoppingCategory) {
    out.push({ needle: term.toLowerCase(), category });
  }
}

function categoryFor(ingredientName: string): ShoppingCategory {
  const hay = ingredientName.toLowerCase();
  for (const { needle, category } of LOOKUP) {
    if (hay.includes(needle)) return category;
  }
  return "other";
}

/* ---------------------------------------------------------------- *
 * Aggregation
 * ---------------------------------------------------------------- */

export type ShoppingItem = {
  /** stable id for localStorage check-state, derived from name+unit */
  key: string;
  name: string;
  amount: number;
  unit: string;
  /** number of meals this item appears in — surfaces "use across N meals" */
  mealCount: number;
};

export type ShoppingGroup = {
  category: ShoppingCategory;
  label: string;
  items: ShoppingItem[];
};

export type ShoppingList = {
  groups: ShoppingGroup[];
  totalItems: number;
  servings: number; // households served — multiplier applied
};

export function aggregateShopping(opts: {
  meals: Meal[];
  householdSize: number;
}): ShoppingList {
  const servings = Math.max(1, opts.householdSize);
  // key = `${normName}|${normUnit}` so different units stay separate
  const bucket = new Map<
    string,
    { name: string; amount: number; unit: string; mealCount: number; category: ShoppingCategory }
  >();

  for (const meal of opts.meals) {
    for (const ing of meal.ingredients ?? []) {
      const norm = normalizeIngredient(ing);
      if (!norm) continue;
      const key = `${norm.name.toLowerCase()}|${norm.unit.toLowerCase()}`;
      const existing = bucket.get(key);
      if (existing) {
        existing.amount += norm.amount;
        existing.mealCount += 1;
      } else {
        bucket.set(key, {
          name: norm.name,
          amount: norm.amount,
          unit: norm.unit,
          mealCount: 1,
          category: categoryFor(norm.name),
        });
      }
    }
  }

  // Apply household multiplier + round to sensible precision.
  const groups = new Map<ShoppingCategory, ShoppingItem[]>();
  for (const [key, v] of bucket) {
    const scaled = v.amount * servings;
    const item: ShoppingItem = {
      key,
      name: v.name,
      amount: roundAmount(scaled, v.unit),
      unit: v.unit,
      mealCount: v.mealCount,
    };
    const arr = groups.get(v.category) ?? [];
    arr.push(item);
    groups.set(v.category, arr);
  }

  // Sort items alphabetically inside each group, return categories
  // in the curated supermarket order.
  const out: ShoppingGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = groups.get(cat);
    if (!items || items.length === 0) continue;
    items.sort((a, b) => a.name.localeCompare(b.name, "da"));
    out.push({ category: cat, label: CATEGORY_LABELS[cat], items });
  }

  return {
    groups: out,
    totalItems: Array.from(bucket.keys()).length,
    servings,
  };
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function normalizeIngredient(ing: Ingredient): { name: string; amount: number; unit: string } | null {
  const name = (ing.name ?? "").trim();
  const unit = normalizeUnit(ing.unit ?? "");
  if (!name || !Number.isFinite(ing.amount)) return null;
  return { name, amount: ing.amount, unit };
}

function normalizeUnit(raw: string): string {
  const t = raw.trim().toLowerCase();
  // Collapse common variants so the bucket key matches.
  const map: Record<string, string> = {
    "stk.": "stk",
    "spsk.": "spsk",
    "tsk.": "tsk",
    "ml": "ml",
    "g": "g",
    "kg": "kg",
    "dl": "dl",
    "l": "l",
    "håndfuld": "håndfuld",
    "knsp": "knsp",
    "knsp.": "knsp",
  };
  return map[t] ?? raw.trim();
}

function roundAmount(n: number, unit: string): number {
  // Whole-number units → round to integer
  if (unit === "stk" || unit === "knsp" || unit === "skiver" || unit === "skive") {
    return Math.round(n);
  }
  // Spoons/handfuls → 0.5 precision
  if (unit === "spsk" || unit === "tsk" || unit === "håndfuld") {
    return Math.round(n * 2) / 2;
  }
  // Volume / weight → 1-unit precision below 100, 5-unit above
  if (n < 10) return Math.round(n * 10) / 10;
  if (n < 100) return Math.round(n);
  return Math.round(n / 5) * 5;
}
