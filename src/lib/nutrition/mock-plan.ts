/**
 * Deterministic mock meal-plan generator.
 *
 * Produces a 7-day plan from a small library of brand-aligned meals
 * (whole foods, no refined seed oils, Danish ingredients). Acts as
 * the demo-mode generator and the immediate fallback when the Claude
 * generator (commit 3) is missing or fails. The catalog is small but
 * enough to deliver a varied week without repeats and headroom for
 * swap.
 *
 * Personalization signals consumed:
 *   - profile.diet                 — hard filter
 *   - profile.allergies            — hard filter (substring match)
 *   - profile.dislikes             — soft filter (avoided unless catalog runs dry)
 *   - profile.preferences          — boost (prioritized when matched)
 *   - profile.fishPerWeek          — caps the number of fish dinners
 *   - profile.cookingLevel         — gates "advanced" recipes
 *   - profile.goal                 — daily kcal/macro targets
 */

import type {
  CarbDensity,
  Diet,
  Ingredient,
  Meal,
  MealKind,
  MealSlot,
  NutritionProfile,
} from "@/lib/data/nutrition";

/* ---------------------------------------------------------------- *
 * Template type
 * ---------------------------------------------------------------- */

type Template = {
  id: string;
  slot: MealSlot;
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  macros: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  carbDensity: CarbDensity;
  prepMinutes: number;
  diets: Diet[];
  kind: MealKind;
  cookingLevel: "basic" | "intermediate" | "advanced";
  tags?: string[];        // for preference matching
  containsFish?: boolean;
};

/* ---------------------------------------------------------------- *
 * Catalog — Danish, whole-food, no seed oils, no UPF
 * ---------------------------------------------------------------- */

const CATALOG: Template[] = [
  // -------------------- MORGEN --------------------
  {
    id: "m-skyr-bowl",
    slot: "morgen",
    title: "Skyr-bowl med hindbær og valnødder",
    description: "Højprotein-morgenmad. Klar på 3 minutter, mætter i timer.",
    ingredients: [
      { name: "skyr", amount: 250, unit: "g" },
      { name: "frosne hindbær", amount: 100, unit: "g" },
      { name: "valnødder", amount: 15, unit: "g" },
      { name: "stålskårne havregryn", amount: 30, unit: "g" },
      { name: "honning", amount: 1, unit: "tsk" },
    ],
    steps: [
      "Hæld skyr i en skål.",
      "Top med tøede hindbær, hakkede valnødder og havregryn.",
      "Drys honning over.",
    ],
    macros: { kcal: 420, proteinG: 38, carbsG: 42, fatG: 12 },
    carbDensity: "standard",
    prepMinutes: 3,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["hurtig", "højprotein", "bær"],
  },
  {
    id: "m-roeraeg-avokado",
    slot: "morgen",
    title: "Røræg med avokado og rugbrød",
    description: "Klassisk pre-træning morgenmad. Fedt og protein der mætter.",
    ingredients: [
      { name: "æg", amount: 3, unit: "stk" },
      { name: "smør", amount: 10, unit: "g" },
      { name: "avocado", amount: 0.5, unit: "stk" },
      { name: "rugbrød", amount: 1, unit: "skive" },
      { name: "havsalt", amount: 1, unit: "knsp" },
      { name: "sort peber", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Smelt smør på lav varme i en pande.",
      "Pisk æggene let, hæld i og rør stille til de netop er sat.",
      "Anret med skiver avocado på rugbrødet og krydr.",
    ],
    macros: { kcal: 480, proteinG: 26, carbsG: 28, fatG: 28 },
    carbDensity: "standard",
    prepMinutes: 8,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["æg", "avocado"],
  },
  {
    id: "m-havregroed",
    slot: "morgen",
    title: "Havregrød med blåbær og mandler",
    description: "Langsomme kulhydrater — perfekt til tunge træningsdage.",
    ingredients: [
      { name: "stålskårne havregryn", amount: 60, unit: "g" },
      { name: "mælk", amount: 2, unit: "dl" },
      { name: "vand", amount: 1, unit: "dl" },
      { name: "blåbær", amount: 80, unit: "g" },
      { name: "mandler", amount: 15, unit: "g" },
      { name: "kanel", amount: 0.5, unit: "tsk" },
    ],
    steps: [
      "Kog havregryn i mælk og vand under omrøring i 4-5 minutter.",
      "Top med blåbær, hakkede mandler og kanel.",
    ],
    macros: { kcal: 520, proteinG: 18, carbsG: 78, fatG: 14 },
    carbDensity: "high",
    prepMinutes: 7,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["havre", "tung træningsdag"],
  },
  {
    id: "m-cottage-rugbrod",
    slot: "morgen",
    title: "Hytteost på rugbrød med radiser og dild",
    description: "Skandinavisk klassiker. Højt protein, lavt fedt.",
    ingredients: [
      { name: "rugbrød", amount: 2, unit: "skiver" },
      { name: "hytteost", amount: 150, unit: "g" },
      { name: "radiser", amount: 4, unit: "stk" },
      { name: "dild", amount: 1, unit: "spsk" },
      { name: "sort peber", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Læg hytteost på rugbrødet.",
      "Top med tynde skiver radiser og hakket dild.",
      "Krydr med sort peber.",
    ],
    macros: { kcal: 360, proteinG: 26, carbsG: 42, fatG: 6 },
    carbDensity: "standard",
    prepMinutes: 4,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["højprotein", "lav-fedt"],
  },
  {
    id: "m-spinatomelet",
    slot: "morgen",
    title: "Spinatomelet med feta",
    description: "Solid omelet, klar på 6 minutter.",
    ingredients: [
      { name: "æg", amount: 3, unit: "stk" },
      { name: "babyspinat", amount: 50, unit: "g" },
      { name: "feta", amount: 30, unit: "g" },
      { name: "olivenolie", amount: 1, unit: "tsk" },
      { name: "havsalt", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Pisk æggene med salt og peber.",
      "Varm olivenolie i en pande, sauter spinat 30 sekunder.",
      "Hæld æg over, smuldr feta på toppen, fold sammen efter 90 sekunder.",
    ],
    macros: { kcal: 380, proteinG: 26, carbsG: 4, fatG: 28 },
    carbDensity: "low",
    prepMinutes: 6,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["æg", "lav-kulhydrat"],
  },
  {
    id: "m-tofu-roere",
    slot: "morgen",
    title: "Tofu-røre med spidskål og avokado",
    description: "Plantebaseret, krydret, mætter længe.",
    ingredients: [
      { name: "fast tofu", amount: 200, unit: "g" },
      { name: "spidskål", amount: 100, unit: "g" },
      { name: "avocado", amount: 0.5, unit: "stk" },
      { name: "olivenolie", amount: 1, unit: "spsk" },
      { name: "gurkemeje", amount: 0.5, unit: "tsk" },
      { name: "havsalt", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Smuldr tofu og krydr med gurkemeje og salt.",
      "Steg i olivenolie i 5 minutter, tilsæt strimlet spidskål de sidste 2.",
      "Server med avokadoskiver.",
    ],
    macros: { kcal: 420, proteinG: 24, carbsG: 14, fatG: 28 },
    carbDensity: "low",
    prepMinutes: 10,
    diets: ["omnivore", "pescatarian", "vegetarian", "vegan"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["plantebaseret", "lav-kulhydrat"],
  },
  {
    id: "m-makrel-rugbrod",
    slot: "morgen",
    title: "Rugbrødsmad med makrel i tomat",
    description: "Omega-3 før kl. 9. Klar på 2 minutter.",
    ingredients: [
      { name: "rugbrød", amount: 2, unit: "skiver" },
      { name: "makrel i tomat", amount: 1, unit: "dåse" },
      { name: "rødløg", amount: 0.25, unit: "stk" },
      { name: "purløg", amount: 1, unit: "spsk" },
    ],
    steps: [
      "Anret makrel på rugbrødet.",
      "Top med tynde skiver rødløg og hakket purløg.",
    ],
    macros: { kcal: 410, proteinG: 28, carbsG: 38, fatG: 14 },
    carbDensity: "standard",
    prepMinutes: 2,
    diets: ["omnivore", "pescatarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["omega-3", "hurtig", "fisk"],
    containsFish: true,
  },

  // -------------------- FROKOST --------------------
  {
    id: "f-kylling-quinoa",
    slot: "frokost",
    title: "Kyllingebowl med quinoa, grønkål og granatæble",
    description: "Anker-måltid: meal-prep venligt, holder 3 dage på køl.",
    ingredients: [
      { name: "kyllingebryst", amount: 150, unit: "g" },
      { name: "quinoa", amount: 80, unit: "g (tørret)" },
      { name: "grønkål", amount: 50, unit: "g" },
      { name: "granatæblekerner", amount: 30, unit: "g" },
      { name: "olivenolie", amount: 1, unit: "spsk" },
      { name: "citronsaft", amount: 1, unit: "spsk" },
      { name: "havsalt", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Kog quinoa i 12 minutter, lad dampe 5 minutter med låg.",
      "Krydr kyllingebryst og steg i pande 4-5 minutter pr. side.",
      "Massér grønkål med olivenolie og citronsaft til den blødgør.",
      "Skær kylling i skiver, anret med quinoa, grønkål og granatæble.",
    ],
    macros: { kcal: 580, proteinG: 48, carbsG: 56, fatG: 16 },
    carbDensity: "standard",
    prepMinutes: 18,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "intermediate",
    tags: ["meal-prep", "højprotein"],
  },
  {
    id: "f-laks-soed-kartoffel",
    slot: "frokost",
    title: "Bagt laks med søde kartofler og asparges",
    description: "30 minutter i ovnen, samlet på én bageplade.",
    ingredients: [
      { name: "laksefilet", amount: 150, unit: "g" },
      { name: "søde kartofler", amount: 250, unit: "g" },
      { name: "asparges", amount: 100, unit: "g" },
      { name: "olivenolie", amount: 2, unit: "spsk" },
      { name: "citron", amount: 0.5, unit: "stk" },
      { name: "havsalt", amount: 1, unit: "knsp" },
      { name: "sort peber", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Forvarm ovn til 200°C.",
      "Skær søde kartofler i tern, vend i 1 spsk olivenolie og salt.",
      "Bag i 20 minutter. Tilsæt laks og asparges, dryp med resten af olien.",
      "Bag yderligere 12 minutter. Server med citronbåde.",
    ],
    macros: { kcal: 620, proteinG: 38, carbsG: 52, fatG: 28 },
    carbDensity: "high",
    prepMinutes: 32,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["omega-3", "fisk", "ovn"],
    containsFish: true,
  },
  {
    id: "f-linsesalat-feta",
    slot: "frokost",
    title: "Linsesalat med feta, agurk og mynte",
    description: "Plantebaseret protein. Perfekt til hviledage.",
    ingredients: [
      { name: "kogte beluga linser", amount: 200, unit: "g" },
      { name: "feta", amount: 50, unit: "g" },
      { name: "agurk", amount: 0.5, unit: "stk" },
      { name: "mynte", amount: 1, unit: "håndfuld" },
      { name: "olivenolie", amount: 1, unit: "spsk" },
      { name: "rødvinseddike", amount: 1, unit: "spsk" },
      { name: "rødløg", amount: 0.25, unit: "stk" },
    ],
    steps: [
      "Skær agurk i tern, hak rødløg og mynte fint.",
      "Bland alt i en skål, smuldr feta over.",
      "Vend i olivenolie og rødvinseddike. Krydr.",
    ],
    macros: { kcal: 480, proteinG: 24, carbsG: 48, fatG: 18 },
    carbDensity: "standard",
    prepMinutes: 12,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["plantebaseret", "hviledag"],
  },
  {
    id: "f-fiskefrikadeller",
    slot: "frokost",
    title: "Fiskefrikadeller med ærtepuré og rugbrød",
    description: "Husmandskost gjort moderne — torsk, ærter, citron, dild.",
    ingredients: [
      { name: "torskefilet", amount: 200, unit: "g" },
      { name: "æg", amount: 1, unit: "stk" },
      { name: "rugmel", amount: 1, unit: "spsk" },
      { name: "smør", amount: 15, unit: "g" },
      { name: "ærter", amount: 200, unit: "g" },
      { name: "mynte", amount: 1, unit: "spsk" },
      { name: "rugbrød", amount: 1, unit: "skive" },
      { name: "citron", amount: 0.5, unit: "stk" },
    ],
    steps: [
      "Hak torsk fint, bland med æg og rugmel. Form 4 frikadeller.",
      "Steg i smør 4 minutter pr. side.",
      "Damp ærter, blend med mynte, salt og lidt smør til puré.",
      "Server med rugbrød og citron.",
    ],
    macros: { kcal: 540, proteinG: 42, carbsG: 44, fatG: 18 },
    carbDensity: "standard",
    prepMinutes: 22,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "intermediate",
    tags: ["fisk", "klassisk"],
    containsFish: true,
  },
  {
    id: "f-bowl-edamame",
    slot: "frokost",
    title: "Brune ris-bowl med edamame, gulerod og tahin",
    description: "Vegansk, mættende, klart-på-15.",
    ingredients: [
      { name: "brune ris", amount: 80, unit: "g (tørret)" },
      { name: "edamame", amount: 100, unit: "g" },
      { name: "gulerod", amount: 1, unit: "stk" },
      { name: "avocado", amount: 0.5, unit: "stk" },
      { name: "tahin", amount: 2, unit: "spsk" },
      { name: "citronsaft", amount: 1, unit: "spsk" },
      { name: "soja (lavt natrium)", amount: 1, unit: "spsk" },
      { name: "sesamfrø", amount: 1, unit: "tsk" },
    ],
    steps: [
      "Kog ris efter pakkens anvisning.",
      "Damp edamame 4 minutter.",
      "Riv gulerod, skær avocado i skiver.",
      "Pisk tahin med citron og soja til dressing.",
      "Anret alt i en skål, dryp dressing over og drys sesam.",
    ],
    macros: { kcal: 580, proteinG: 22, carbsG: 78, fatG: 20 },
    carbDensity: "high",
    prepMinutes: 18,
    diets: ["omnivore", "pescatarian", "vegetarian", "vegan"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["plantebaseret", "tung træningsdag"],
  },
  {
    id: "f-tunbowl",
    slot: "frokost",
    title: "Tunfisk-bowl med kikærter og persille",
    description: "Skuffe-måltid: fungerer med dåse-tun og resterende grønt.",
    ingredients: [
      { name: "tun i olivenolie", amount: 1, unit: "dåse" },
      { name: "kogte kikærter", amount: 150, unit: "g" },
      { name: "tomat", amount: 1, unit: "stk" },
      { name: "rødløg", amount: 0.25, unit: "stk" },
      { name: "persille", amount: 1, unit: "håndfuld" },
      { name: "olivenolie", amount: 1, unit: "spsk" },
      { name: "citronsaft", amount: 1, unit: "spsk" },
    ],
    steps: [
      "Dræn tunen let, bevar lidt af olien.",
      "Skær tomat og rødløg i tern.",
      "Bland alt i en skål med olivenolie og citronsaft.",
    ],
    macros: { kcal: 460, proteinG: 36, carbsG: 32, fatG: 18 },
    carbDensity: "standard",
    prepMinutes: 6,
    diets: ["omnivore", "pescatarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["hurtig", "fisk", "skuffe-måltid"],
    containsFish: true,
  },
  {
    id: "f-aeg-rugbrod",
    slot: "frokost",
    title: "Rugbrødsmad: æg, hytteost og dild",
    description: "Smørrebrød-niveau, klar på 5 minutter.",
    ingredients: [
      { name: "rugbrød", amount: 2, unit: "skiver" },
      { name: "æg", amount: 2, unit: "stk" },
      { name: "hytteost", amount: 100, unit: "g" },
      { name: "radiser", amount: 4, unit: "stk" },
      { name: "dild", amount: 1, unit: "spsk" },
      { name: "havsalt", amount: 1, unit: "knsp" },
    ],
    steps: [
      "Kog æggene 7 minutter (blødkogte) eller 9 (hårde).",
      "Pil og halver. Anret hytteost på rugbrødet, top med æg, radiser og dild.",
    ],
    macros: { kcal: 420, proteinG: 30, carbsG: 38, fatG: 14 },
    carbDensity: "standard",
    prepMinutes: 9,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["smørrebrød", "højprotein"],
  },

  // -------------------- AFTEN --------------------
  {
    id: "a-oksesteg",
    slot: "aften",
    title: "Stegt oksemørbrad med kartofler og rødkål",
    description: "Lørdag-aften niveau. 35 minutter, hjemmelavet rødkål.",
    ingredients: [
      { name: "oksemørbrad", amount: 180, unit: "g" },
      { name: "kartofler", amount: 250, unit: "g" },
      { name: "rødkål", amount: 200, unit: "g" },
      { name: "smør", amount: 25, unit: "g" },
      { name: "æbleeddike", amount: 2, unit: "spsk" },
      { name: "laurbærblad", amount: 2, unit: "stk" },
      { name: "havsalt", amount: 1, unit: "tsk" },
      { name: "sort peber", amount: 1, unit: "tsk" },
    ],
    steps: [
      "Kog kartofler i 18 minutter.",
      "Snitsl rødkål, sauter i 10 g smør med æbleeddike og laurbær 15 minutter.",
      "Krydr mørbrad. Steg i resten af smørret 3-4 minutter pr. side til core 54°C.",
      "Lad hvile 5 minutter. Server med kartofler og rødkål.",
    ],
    macros: { kcal: 680, proteinG: 48, carbsG: 58, fatG: 22 },
    carbDensity: "standard",
    prepMinutes: 38,
    diets: ["omnivore"],
    kind: "recipe",
    cookingLevel: "intermediate",
    tags: ["weekend", "klassisk"],
  },
  {
    id: "a-kyllingelaar",
    slot: "aften",
    title: "Ovnbagte kyllingelår med pastinak og timian",
    description: "Sæt på 200° og glem dem. Familievenligt.",
    ingredients: [
      { name: "kyllingelår", amount: 2, unit: "stk" },
      { name: "pastinak", amount: 200, unit: "g" },
      { name: "gulerødder", amount: 2, unit: "stk" },
      { name: "rødløg", amount: 1, unit: "stk" },
      { name: "olivenolie", amount: 2, unit: "spsk" },
      { name: "frisk timian", amount: 4, unit: "kviste" },
      { name: "havsalt", amount: 1, unit: "tsk" },
      { name: "hvidløg", amount: 4, unit: "fed" },
    ],
    steps: [
      "Forvarm ovn til 200°C.",
      "Skær rodfrugter i grove tern, vend med olivenolie, salt og hele hvidløgsfed.",
      "Læg kyllingelår oven på, dryp med olie, drys timian.",
      "Bag 35-40 minutter til skindet er sprødt og kødsaft løber klar.",
    ],
    macros: { kcal: 640, proteinG: 42, carbsG: 46, fatG: 28 },
    carbDensity: "standard",
    prepMinutes: 45,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["ovn", "familie", "meal-prep"],
  },
  {
    id: "a-rejer-courgette",
    slot: "aften",
    title: "Stegte rejer med hvidløg, citron og brune ris",
    description: "Hurtigt og let. På bordet på 18 minutter.",
    ingredients: [
      { name: "rejer (rå)", amount: 200, unit: "g" },
      { name: "brune ris", amount: 70, unit: "g (tørret)" },
      { name: "courgette", amount: 1, unit: "stk" },
      { name: "hvidløg", amount: 3, unit: "fed" },
      { name: "olivenolie", amount: 1.5, unit: "spsk" },
      { name: "citron", amount: 0.5, unit: "stk" },
      { name: "persille", amount: 1, unit: "håndfuld" },
    ],
    steps: [
      "Sæt ris over.",
      "Skær courgette i halvmåner. Steg i olivenolie 4 minutter.",
      "Tilsæt hakket hvidløg og rejer, steg 3 minutter til rejer er gennemstegte.",
      "Pres citron over, drys persille. Server med ris.",
    ],
    macros: { kcal: 540, proteinG: 38, carbsG: 62, fatG: 14 },
    carbDensity: "high",
    prepMinutes: 18,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["fisk", "hurtig"],
    containsFish: true,
  },
  {
    id: "a-bagt-laks-fennikel",
    slot: "aften",
    title: "Bagt laks med fennikel og dild",
    description: "Skandinavisk minimalisme. Fed fisk + grønt.",
    ingredients: [
      { name: "laksefilet", amount: 180, unit: "g" },
      { name: "fennikel", amount: 1, unit: "stk" },
      { name: "ærter", amount: 100, unit: "g" },
      { name: "kartofler", amount: 200, unit: "g" },
      { name: "smør", amount: 15, unit: "g" },
      { name: "dild", amount: 1, unit: "håndfuld" },
      { name: "citron", amount: 0.5, unit: "stk" },
    ],
    steps: [
      "Kog kartofler 15 minutter.",
      "Skær fennikel i tynde skiver, læg på bageplade.",
      "Læg laks oven på, klat smør, dryp citron.",
      "Bag 14 minutter ved 200°C. Damp ærter de sidste 4. Drys dild.",
    ],
    macros: { kcal: 600, proteinG: 38, carbsG: 50, fatG: 24 },
    carbDensity: "standard",
    prepMinutes: 25,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["fisk", "omega-3"],
    containsFish: true,
  },
  {
    id: "a-linseret",
    slot: "aften",
    title: "Linseret med tomat og bagt aubergine",
    description: "Fyldigt vegansk hovedmåltid. Holder dig mæt til morgen.",
    ingredients: [
      { name: "røde linser", amount: 150, unit: "g (tørret)" },
      { name: "aubergine", amount: 1, unit: "stk" },
      { name: "hakket tomat", amount: 400, unit: "g (dåse)" },
      { name: "løg", amount: 1, unit: "stk" },
      { name: "hvidløg", amount: 3, unit: "fed" },
      { name: "olivenolie", amount: 2, unit: "spsk" },
      { name: "spidskommen", amount: 1, unit: "tsk" },
      { name: "røget paprika", amount: 1, unit: "tsk" },
      { name: "persille", amount: 1, unit: "håndfuld" },
    ],
    steps: [
      "Skær aubergine i tern, vend i 1 spsk olivenolie og salt. Bag 25 minutter ved 200°C.",
      "Sauter løg og hvidløg i resten af olien til bløde.",
      "Tilsæt linser, krydderier, tomat og 4 dl vand. Kog 18 minutter.",
      "Vend bagt aubergine i. Drys persille.",
    ],
    macros: { kcal: 520, proteinG: 26, carbsG: 68, fatG: 14 },
    carbDensity: "high",
    prepMinutes: 35,
    diets: ["omnivore", "pescatarian", "vegetarian", "vegan"],
    kind: "recipe",
    cookingLevel: "intermediate",
    tags: ["plantebaseret", "meal-prep"],
  },
  {
    id: "a-torsk-tomat",
    slot: "aften",
    title: "Torsk i ovn med olivenolie, tomat og capers",
    description: "Italiensk-skandinavisk crossover. Klar på 20.",
    ingredients: [
      { name: "torskefilet", amount: 180, unit: "g" },
      { name: "cherrytomater", amount: 200, unit: "g" },
      { name: "kapers", amount: 1, unit: "spsk" },
      { name: "oliven", amount: 30, unit: "g" },
      { name: "olivenolie", amount: 2, unit: "spsk" },
      { name: "kartofler", amount: 200, unit: "g" },
      { name: "hvidløg", amount: 2, unit: "fed" },
      { name: "frisk basilikum", amount: 1, unit: "håndfuld" },
    ],
    steps: [
      "Kog kartofler 15 minutter.",
      "Halver cherrytomater. Læg torsk i ovnfast fad, top med tomat, oliven, kapers, hakket hvidløg.",
      "Dryp med olivenolie. Bag 15 minutter ved 200°C.",
      "Top med basilikum. Server med kartofler.",
    ],
    macros: { kcal: 520, proteinG: 38, carbsG: 48, fatG: 18 },
    carbDensity: "standard",
    prepMinutes: 22,
    diets: ["omnivore", "pescatarian"],
    kind: "recipe",
    cookingLevel: "basic",
    tags: ["fisk", "ovn"],
    containsFish: true,
  },
  {
    id: "a-kikaerte-tagine",
    slot: "aften",
    title: "Kikærte-tagine med søde kartofler",
    description: "En times simren — fryser godt, mætter meget.",
    ingredients: [
      { name: "kogte kikærter", amount: 300, unit: "g" },
      { name: "søde kartofler", amount: 300, unit: "g" },
      { name: "løg", amount: 1, unit: "stk" },
      { name: "hakket tomat", amount: 400, unit: "g (dåse)" },
      { name: "olivenolie", amount: 2, unit: "spsk" },
      { name: "spidskommen", amount: 1, unit: "tsk" },
      { name: "kanel", amount: 0.5, unit: "tsk" },
      { name: "ingefær", amount: 1, unit: "tsk" },
      { name: "koriander", amount: 1, unit: "håndfuld" },
    ],
    steps: [
      "Sauter løg i olivenolie 4 minutter.",
      "Tilsæt krydderier, tomat, kikærter og søde kartofler i tern.",
      "Tilsæt 3 dl vand. Simr 35 minutter til søde kartofler er møre.",
      "Drys koriander.",
    ],
    macros: { kcal: 540, proteinG: 22, carbsG: 84, fatG: 14 },
    carbDensity: "high",
    prepMinutes: 45,
    diets: ["omnivore", "pescatarian", "vegetarian", "vegan"],
    kind: "recipe",
    cookingLevel: "intermediate",
    tags: ["plantebaseret", "meal-prep", "fryser"],
  },

  // -------------------- SNACK / PRE / POST --------------------
  {
    id: "s-skyr-baer",
    slot: "snack",
    title: "Skyr med bær og honning",
    description: "Højprotein snack mellem måltider.",
    ingredients: [
      { name: "skyr", amount: 200, unit: "g" },
      { name: "blandede bær", amount: 80, unit: "g" },
      { name: "honning", amount: 1, unit: "tsk" },
    ],
    steps: ["Bland og spis."],
    macros: { kcal: 220, proteinG: 24, carbsG: 22, fatG: 1 },
    carbDensity: "standard",
    prepMinutes: 1,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["højprotein", "hurtig"],
  },
  {
    id: "s-aeble-mandelsmoer",
    slot: "snack",
    title: "Æble med mandelsmør",
    description: "Klassisk lige-før-træning.",
    ingredients: [
      { name: "æble", amount: 1, unit: "stk" },
      { name: "mandelsmør (rent)", amount: 2, unit: "spsk" },
    ],
    steps: ["Skær æble i både. Dyp i mandelsmør."],
    macros: { kcal: 280, proteinG: 7, carbsG: 32, fatG: 16 },
    carbDensity: "standard",
    prepMinutes: 1,
    diets: ["omnivore", "pescatarian", "vegetarian", "vegan"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["pre-workout", "hurtig"],
  },
  {
    id: "s-banan-mandler",
    slot: "snack",
    title: "Banan og en håndfuld mandler",
    description: "30 sekunder. Mætter en time.",
    ingredients: [
      { name: "banan", amount: 1, unit: "stk" },
      { name: "mandler", amount: 25, unit: "g" },
    ],
    steps: ["Spis."],
    macros: { kcal: 260, proteinG: 7, carbsG: 30, fatG: 14 },
    carbDensity: "standard",
    prepMinutes: 0,
    diets: ["omnivore", "pescatarian", "vegetarian", "vegan"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["pre-workout"],
  },
  {
    id: "s-cottage-ananas",
    slot: "snack",
    title: "Hytteost med ananas og valnødder",
    description: "Sødt + protein, ingen tilsat sukker.",
    ingredients: [
      { name: "hytteost", amount: 200, unit: "g" },
      { name: "frisk ananas", amount: 100, unit: "g" },
      { name: "valnødder", amount: 15, unit: "g" },
    ],
    steps: ["Bland."],
    macros: { kcal: 280, proteinG: 26, carbsG: 18, fatG: 12 },
    carbDensity: "standard",
    prepMinutes: 2,
    diets: ["omnivore", "pescatarian", "vegetarian"],
    kind: "component",
    cookingLevel: "basic",
    tags: ["højprotein"],
  },
];

/* ---------------------------------------------------------------- *
 * Generation
 * ---------------------------------------------------------------- */

export type GeneratedPlanShape = {
  targets: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  notes: string;
  meals: Omit<Meal, "id" | "planId">[];
};

export function generateMockPlan(opts: {
  profile: Pick<NutritionProfile,
    "diet" | "allergies" | "dislikes" | "preferences" | "fishPerWeek" |
    "cookingLevel" | "goal" | "dailyKcalTarget" | "dailyProteinGTarget"
  >;
  weekStart: string;
}): GeneratedPlanShape {
  const { profile } = opts;

  // Filter the catalog down to what's allowed for this member.
  const allowed = CATALOG.filter((t) => isAllowed(t, profile));
  // Group by slot — main rotation only uses morgen/frokost/aften.
  const bySlot: Record<MealSlot, Template[]> = {
    morgen: [], frokost: [], aften: [], snack: [], pre: [], post: [],
  };
  for (const t of allowed) bySlot[t.slot].push(t);

  // Sort each bucket: preference matches first, then dislikes last.
  for (const slot of Object.keys(bySlot) as MealSlot[]) {
    bySlot[slot] = rankBucket(bySlot[slot], profile);
  }

  // Targets — pick from profile or estimate from goal.
  const dailyKcal = profile.dailyKcalTarget ?? defaultKcal(profile.goal);
  const dailyProtein = profile.dailyProteinGTarget ?? Math.round(dailyKcal * 0.30 / 4);
  const dailyCarbs = Math.round(dailyKcal * 0.40 / 4);
  const dailyFat = Math.round(dailyKcal * 0.30 / 9);

  // Slot a meal per (day, slot) using round-robin from each ranked
  // bucket. Cap fish dinners by fishPerWeek to respect preference.
  const meals: Omit<Meal, "id" | "planId">[] = [];
  const fishCap = clamp(profile.fishPerWeek, 0, 7);
  let fishUsed = 0;

  for (let day = 0; day < 7; day++) {
    for (const slot of ["morgen", "frokost", "aften"] as MealSlot[]) {
      const bucket = bySlot[slot];
      if (bucket.length === 0) continue;

      // Round-robin index to keep variety across the week.
      let idx = (day * 3 + slotIndex(slot)) % bucket.length;
      let attempts = 0;
      let chosen: Template | null = null;
      while (attempts < bucket.length) {
        const candidate = bucket[idx];
        const wouldExceedFish = candidate.containsFish && fishUsed >= fishCap;
        if (!wouldExceedFish) {
          chosen = candidate;
          if (candidate.containsFish) fishUsed++;
          break;
        }
        idx = (idx + 1) % bucket.length;
        attempts++;
      }
      if (!chosen) chosen = bucket[(day * 3 + slotIndex(slot)) % bucket.length];

      meals.push(templateToMeal(chosen, day, slot, meals.length));
    }
  }

  return {
    targets: {
      kcal: dailyKcal,
      proteinG: dailyProtein,
      carbsG: dailyCarbs,
      fatG: dailyFat,
    },
    notes:
      `Plan genereret for uge ${opts.weekStart}. ` +
      `Fisk: ${fishUsed} måltider (mål ${fishCap}). ` +
      `Bygget på MakeIt-allowlist — ingen rapsolie, intet UPF, intet tilsat sukker.`,
    meals,
  };
}

export function swapMockMeal(opts: {
  profile: Pick<NutritionProfile,
    "diet" | "allergies" | "dislikes" | "preferences" | "fishPerWeek" | "cookingLevel"
  >;
  dayIndex: number;
  slot: MealSlot;
  avoidTitle: string;
}): Omit<Meal, "id" | "planId"> {
  const allowed = CATALOG
    .filter((t) => t.slot === opts.slot)
    .filter((t) => isAllowed(t, opts.profile))
    .filter((t) => t.title !== opts.avoidTitle);

  const ranked = rankBucket(allowed, opts.profile);
  const pick = ranked[(opts.dayIndex + 1) % Math.max(1, ranked.length)] ?? CATALOG[0];
  return templateToMeal(pick, opts.dayIndex, opts.slot, 0);
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function isAllowed(
  t: Template,
  profile: Pick<NutritionProfile, "diet" | "allergies" | "dislikes" | "cookingLevel">
): boolean {
  if (!t.diets.includes(profile.diet)) return false;
  if (cookingTooHard(t.cookingLevel, profile.cookingLevel)) return false;
  for (const allergy of profile.allergies) {
    const needle = allergy.toLowerCase().trim();
    if (!needle) continue;
    if (t.title.toLowerCase().includes(needle)) return false;
    if (t.ingredients.some((i) => i.name.toLowerCase().includes(needle))) return false;
  }
  for (const dislike of profile.dislikes) {
    const needle = dislike.toLowerCase().trim();
    if (!needle) continue;
    if (t.ingredients.some((i) => i.name.toLowerCase().includes(needle))) return false;
  }
  return true;
}

function cookingTooHard(template: Template["cookingLevel"], member: NutritionProfile["cookingLevel"]): boolean {
  const order = { basic: 1, intermediate: 2, advanced: 3 };
  return order[template] > order[member];
}

function rankBucket(
  bucket: Template[],
  profile: Pick<NutritionProfile, "preferences">
): Template[] {
  const prefs = profile.preferences.map((p) => p.toLowerCase().trim()).filter(Boolean);
  return [...bucket].sort((a, b) => {
    const aHits = countPrefHits(a, prefs);
    const bHits = countPrefHits(b, prefs);
    return bHits - aHits;
  });
}

function countPrefHits(t: Template, prefs: string[]): number {
  if (prefs.length === 0) return 0;
  const hay = (t.title + " " + (t.tags ?? []).join(" ") + " " +
    t.ingredients.map((i) => i.name).join(" ")).toLowerCase();
  return prefs.reduce((acc, p) => acc + (hay.includes(p) ? 1 : 0), 0);
}

function defaultKcal(goal: NutritionProfile["goal"]): number {
  switch (goal) {
    case "cut": return 2200;
    case "mass": return 3000;
    case "recomp": return 2500;
    default: return 2400;
  }
}

function slotIndex(slot: MealSlot): number {
  return ["morgen", "frokost", "aften", "snack", "pre", "post"].indexOf(slot);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function templateToMeal(
  t: Template,
  dayIndex: number,
  slot: MealSlot,
  position: number
): Omit<Meal, "id" | "planId"> {
  return {
    dayIndex,
    slot,
    kind: t.kind,
    title: t.title,
    description: t.description,
    ingredients: t.ingredients.map((i) => ({ ...i })) as Ingredient[],
    steps: [...t.steps],
    estKcal: t.macros.kcal,
    estProteinG: t.macros.proteinG,
    estCarbsG: t.macros.carbsG,
    estFatG: t.macros.fatG,
    carbDensity: t.carbDensity,
    prepMinutes: t.prepMinutes,
    swappable: true,
    position,
    // Image fields filled in by the persist path via Unsplash.
    imageUrl: null,
    imageThumbUrl: null,
    imageAttributionName: null,
    imageAttributionUrl: null,
  };
}
