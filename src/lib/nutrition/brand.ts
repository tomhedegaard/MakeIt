/**
 * MakeIt brand nutrition policy.
 *
 * The plan generator (Claude or mock) must produce meals that pull
 * from the ALLOWLIST and avoid the DISALLOWLIST. This is the actual
 * differentiator vs. generic meal-planner apps — every list app
 * generates a plan, only ours refuses to put refined seed oils,
 * ultra-processed snacks, and sugar-bombed "protein" products on the
 * plate.
 *
 * Lists are intentionally Danish-first (matches member language) but
 * include common English aliases the AI might emit so the validator
 * catches them on either spelling. Keep the lists pragmatic, not
 * exhaustive — the constraint engine + a strong system prompt are
 * what enforce the policy in practice.
 */

/* ---------------------------------------------------------------- *
 * Allowlist — the food we want on the plate
 * ---------------------------------------------------------------- */

export const ALLOWLIST = {
  proteins: {
    animal: [
      "æg", "kylling", "kalkun", "and", "oksekød", "hakket okse", "lammekød",
      "vildt", "rådyr", "kalv", "skinke", "kyllingelever",
    ],
    fish: [
      "torsk", "kuller", "rødspætte", "laks", "ørred", "makrel",
      "sild", "sardiner", "tun", "ansjoser", "rejer", "muslinger", "blæksprutte",
    ],
    plant: [
      "linser", "kikærter", "sorte bønner", "kidneybønner", "edamame",
      "tofu", "tempeh", "ærteprotein",
    ],
    dairy: [
      "skyr", "hytteost", "græsk yoghurt", "cottage cheese", "kvark", "feta",
      "parmesan", "mozzarella",
    ],
  },
  carbs: {
    grains: [
      "havregryn", "stålskårne havregryn", "byg", "perlebyg", "boghvede",
      "quinoa", "brune ris", "fuldkornsris", "vildris", "bulgur",
      "fuldkornspasta", "rugbrød", "fuldkornsrugbrød", "surdejsbrød",
      "fuldkorns tortilla",
    ],
    roots: [
      "kartofler", "søde kartofler", "rødbede", "gulerødder", "pastinak",
      "selleri", "persillerod", "jordskokker",
    ],
    fruit: [
      "æble", "pære", "blåbær", "hindbær", "jordbær", "brombær", "solbær",
      "banan", "appelsin", "citron", "lime", "kiwi", "abrikos", "fersken",
      "blomme", "vandmelon",
    ],
  },
  fats: {
    oils: [
      "ekstra jomfru olivenolie", "olivenolie", "smør", "ghee", "kokosolie",
      "avokadoolie",
    ],
    nuts: [
      "mandler", "valnødder", "hasselnødder", "pekannødder", "paranødder",
      "pistacie", "cashew",
    ],
    seeds: [
      "græskarkerner", "solsikkekerner", "sesamfrø", "chiafrø", "hørfrø",
      "hampefrø",
    ],
    whole: ["avocado", "oliven", "kakao 70%+"],
  },
  veg: {
    cruciferous: ["broccoli", "blomkål", "rosenkål", "grønkål", "spidskål", "rødkål", "hvidkål"],
    leafy: ["spinat", "rucola", "salat", "romaine", "vandkarse"],
    alliums: ["løg", "rødløg", "skalotteløg", "porre", "hvidløg", "forårsløg"],
    other: [
      "tomat", "agurk", "peberfrugt", "courgette", "aubergine", "asparges",
      "fennikel", "champignon", "shiitake", "østershatte", "ærter", "bønner",
      "majs", "radiser", "selleri",
    ],
  },
  herbs: [
    "persille", "dild", "basilikum", "koriander", "mynte", "timian",
    "rosmarin", "oregano", "purløg", "estragon",
  ],
  spices: [
    "sort peber", "havsalt", "spidskommen", "koriander frø", "kanel",
    "kardemomme", "muskatnød", "paprika", "røget paprika", "chili", "ingefær",
    "gurkemeje", "fennikelfrø", "laurbærblad",
  ],
  pantry: [
    "æbleeddike", "balsamico", "rødvinseddike", "soja (lavt natrium)", "tamari",
    "fiskesauce", "dijon sennep", "tomatpuré", "kokosmælk", "tahin",
    "honning (rå)", "ahornsirup",
  ],
  drinks: [
    "vand", "danskvand", "te", "kaffe (sort)", "espresso", "kefir",
  ],
};

/* ---------------------------------------------------------------- *
 * Disallowlist — the food we keep off the plate
 * ---------------------------------------------------------------- */

export const DISALLOWLIST = {
  // Refined seed oils — high-omega-6, oxidation risk, brand veto
  oils: [
    "solsikkeolie", "rapsolie", "rapsolie raffineret", "majsolie", "sojaolie",
    "vindrueolie", "bomuldsfrøolie", "saflorolie", "rismarvsolie",
    "sunflower oil", "canola oil", "rapeseed oil", "soybean oil",
    "corn oil", "vegetable oil", "blandingsolie", "margarine",
  ],
  // Ultra-processed foods — anything with 5+ ingredients you can't pronounce
  upf: [
    "morgenmadsflakes", "frosties", "cornflakes med sukker", "müsli med tilsat sukker",
    "energibarer (industri)", "proteinbarer (industri)",
    "frugtyoghurt med tilsat sukker", "smagstilsat skyr (med tilsat sukker)",
    "pålægschokolade", "snickers", "mars", "twix", "kitkat",
    "doritos", "cheetos", "lay's", "kims chips", "pringles",
    "mikrobølge popcorn", "instant nudler", "bouillonterning (industri)",
    "færdig pizza", "frosne nuggets", "frosne fiskepinde", "pølsehorn",
    "donut", "kage (industri)", "vingummi", "lakrids (sukker)", "slik",
  ],
  meats: [
    "leverpostej (industri)", "cocktailpølser", "frankfurter (industri)",
    "salami (industri)", "bacon (med nitrit)", "skinke (med nitrit)",
    "fastfood burger", "fastfood nuggets",
  ],
  drinks: [
    "energidrik", "sodavand", "cola", "fanta", "sprite", "iste (sukker)",
    "frugtsaft (industri)", "smoothie (industri)", "milkshake (industri)",
    "alkoholfri øl med tilsat sukker",
  ],
  sweeteners: [
    "high fructose corn syrup", "fruktose-glukose sirup", "isoglukose",
    "aspartam", "sukralose", "acesulfam-K", "saccharin", "neotam",
    "maltodextrin", "dextrose", "invertsukker",
  ],
  additives: [
    // Common UPF tells — shorthand list, the AI prompt expands on these
    "transfedt", "delvist hærdet", "hydrogeneret",
  ],
};

/* ---------------------------------------------------------------- *
 * Brand voice — used in system prompts and member-facing copy
 * ---------------------------------------------------------------- */

export const BRAND_VOICE = `MakeIt-måltider er hele madvarer, sammensat enkelt. Aldrig industriprodukter.
Olivenolie og smør, ikke rapsolie. Skyr og hytteost, ikke proteinbarer. Sild,
makrel og laks 2-3 gange om ugen. Grønt fylder halvdelen af tallerkenen. Protein
er midten. Komplekse kulhydrater matcher træningen — mere på tunge dage, mindre
på hviledage. Maden skal smage af noget. Kogetider er korte. Ingredienser få.`;

/* ---------------------------------------------------------------- *
 * Validator — quick check whether an ingredient string looks
 * disallowed. Used post-generation as a guardrail in case the model
 * slips. Word-boundary regex match: "cola" matches "cola" or
 * "coca-cola" but NOT "rucola" / "broccoli" (the substring approach
 * we had before would happily flag those as soft-drinks). False
 * positives like that were rejecting otherwise perfectly clean
 * Claude-generated plans and forcing fallback to the mock generator.
 *
 * Word boundaries in JS regex treat hyphens, spaces, and punctuation
 * as breaks — so multi-word terms ("high fructose corn syrup") still
 * match correctly when present as a phrase in the ingredient name.
 * ---------------------------------------------------------------- */

export function flagDisallowed(ingredient: string): {
  flagged: boolean;
  category: keyof typeof DISALLOWLIST | null;
  match: string | null;
} {
  const needle = ingredient.toLowerCase();
  for (const [category, list] of Object.entries(DISALLOWLIST) as Array<
    [keyof typeof DISALLOWLIST, string[]]
  >) {
    for (const term of list) {
      const escaped = term
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(needle)) {
        return { flagged: true, category, match: term };
      }
    }
  }
  return { flagged: false, category: null, match: null };
}

/* ---------------------------------------------------------------- *
 * Allowlist flattener — used to seed the AI prompt with the catalog
 * the planner is allowed to reach for. We keep it grouped in source
 * but flatten on demand so the prompt sees a clean, scannable list.
 * ---------------------------------------------------------------- */

export function flattenAllowlist(): string {
  const lines: string[] = [];
  for (const [topKey, value] of Object.entries(ALLOWLIST)) {
    if (Array.isArray(value)) {
      lines.push(`${topKey}: ${value.join(", ")}`);
    } else {
      for (const [subKey, subValue] of Object.entries(value)) {
        lines.push(`${topKey}.${subKey}: ${(subValue as string[]).join(", ")}`);
      }
    }
  }
  return lines.join("\n");
}

/* ---------------------------------------------------------------- *
 * Supplement nudge — the auto-suggestion logic the user asked for.
 * Returns a list of plain-language nudges based on the member's
 * profile and weekly fish intake. Keep this conservative — we never
 * recommend pills as a substitute for food.
 * ---------------------------------------------------------------- */

export type SupplementNudge = {
  id: string;
  title: string;
  why: string;
  necessity: "consider" | "useful" | "high-value";
};

export function suggestSupplements(opts: {
  fishPerWeek: number;
  diet: "omnivore" | "pescatarian" | "vegetarian" | "vegan";
  trainingDaysPerWeek: number;
  isWinter?: boolean;
}): SupplementNudge[] {
  const out: SupplementNudge[] = [];

  if (opts.fishPerWeek < 2 && opts.diet !== "vegan") {
    out.push({
      id: "omega-3",
      title: "Omega-3 (fiskeolie eller alger)",
      why: "Du spiser fed fisk under 2 gange/uge. Omega-3 fra fisk er svær at erstatte med plantemad alene.",
      necessity: "useful",
    });
  }
  if (opts.diet === "vegan" || opts.diet === "vegetarian") {
    out.push({
      id: "b12",
      title: "Vitamin B12",
      why: "Plantebaseret kost dækker stort set aldrig B12 uden supplement.",
      necessity: "high-value",
    });
    out.push({
      id: "algae-omega-3",
      title: "Algeolie (omega-3 vegansk)",
      why: "Alger giver direkte EPA/DHA — det får du ikke fra hørfrø alene.",
      necessity: "useful",
    });
  }
  if (opts.isWinter !== false) {
    out.push({
      id: "d3",
      title: "Vitamin D3 (oktober–april)",
      why: "Sundhedsstyrelsen anbefaler D3 i vinterhalvåret. Solen klarer det fra maj til september.",
      necessity: "high-value",
    });
  }
  if (opts.trainingDaysPerWeek >= 3) {
    out.push({
      id: "creatine",
      title: "Kreatin monohydrat (3-5 g/dag)",
      why: "Bedst dokumenterede styrke-tilskud der findes. Sikkert, billigt, virker.",
      necessity: "high-value",
    });
  }
  return out;
}
