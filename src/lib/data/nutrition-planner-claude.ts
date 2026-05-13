/**
 * Claude Sonnet 4.6 meal-plan generator.
 *
 * Plug-in pattern: when ANTHROPIC_API_KEY is missing or the call fails,
 * returns null so the action layer falls back to the deterministic
 * mock generator. The brand allowlist + disallowlist live in
 * src/lib/nutrition/brand.ts and are injected into the system prompt
 * so the model never has to guess what's on policy.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  BRAND_VOICE,
  flagDisallowed,
  flattenAllowlist,
} from "@/lib/nutrition/brand";
import type { NutritionProfile } from "@/lib/data/nutrition";
import type { GeneratedPlanShape } from "@/lib/nutrition/mock-plan";

/* ---------------------------------------------------------------- *
 * Output schema — what the model must return
 * ---------------------------------------------------------------- */

const IngredientSchema = z.object({
  name: z.string().min(2).max(60),
  amount: z.number().min(0).max(2000),
  unit: z.string().min(1).max(20),
});

const MealSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  slot: z.enum(["morgen", "frokost", "aften", "snack", "pre", "post"]),
  kind: z.enum(["recipe", "component"]),
  title: z.string().min(3).max(80),
  description: z.string().min(5).max(220),
  ingredients: z.array(IngredientSchema).min(1).max(16),
  steps: z.array(z.string().min(3).max(220)).max(8),
  estKcal: z.number().int().min(80).max(1500),
  estProteinG: z.number().int().min(0).max(140),
  estCarbsG: z.number().int().min(0).max(220),
  estFatG: z.number().int().min(0).max(120),
  carbDensity: z.enum(["low", "standard", "high"]),
  prepMinutes: z.number().int().min(0).max(120),
});

const PlanSchema = z.object({
  notes: z.string().min(10).max(500),
  targets: z.object({
    kcal: z.number().int().min(1500).max(4500),
    proteinG: z.number().int().min(80).max(280),
    carbsG: z.number().int().min(60).max(450),
    fatG: z.number().int().min(40).max(180),
  }),
  meals: z.array(MealSchema).min(15).max(28),
});

type ParsedPlan = z.infer<typeof PlanSchema>;

/* ---------------------------------------------------------------- *
 * System prompt — frozen, cacheable, injects brand policy
 * ---------------------------------------------------------------- */

const ALLOWLIST_BLOCK = flattenAllowlist();

const SYSTEM_PROMPT = `Du er head nutrition-coach for MakeIt // HQ — en dansk styrketræningsplatform.
Du planlægger ugentlige måltidsplaner for medlemmer der træner styrke 3-5 gange om ugen.

# Brand-stemme

${BRAND_VOICE}

# Politik (HARD CONSTRAINTS — ingen undtagelser)

INGEN raffinerede frøolier: solsikkeolie, rapsolie, majsolie, sojaolie, vindrueolie,
bomuldsfrøolie, saflorolie, "vegetabilsk olie", margarine. Brug olivenolie, smør,
ghee, kokosolie, avokadoolie.

INGEN ultra-processeret mad (UPF): morgenmadsflakes med tilsat sukker, industrielle
proteinbarer, pålægschokolade, slik, chips, sodavand, energidrik, færdigpizza,
nuggets, frosne fiskepinde, industri-pølser, pålæg med nitrit, frugtyoghurt med
tilsat sukker.

INGEN syntetiske sødemidler: aspartam, sukralose, acesulfam-K, saccharin.
INGEN high-fructose corn syrup, fruktose-glukose sirup, isoglukose, maltodextrin.

Honning og ahornsirup i små mængder OK. Kakao 70%+ OK.

# Allowlist — vælg hovedingredienser herfra når muligt

${ALLOWLIST_BLOCK}

Du kan godt bruge ingredienser uden for denne liste, så længe de er HELE madvarer
(en ingrediens, kort holdbarhed, ikke industrielt processeret) og ikke står på
disallowlisten ovenfor.

# Plan-struktur

Generér en plan for én uge (7 dage, mandag = dayIndex 0). For hver dag tre
hovedmåltider: morgen, frokost, aften. Du må gerne tilføje 1-2 snacks/pre/post
hvis det giver mening for medlemmets mål.

Hybrid model:
  - kind="recipe": rigtige opskrifter med 6-12 ingredienser og 4-7 trin. Brug
    disse til 3-4 måltider om ugen, gerne i weekend og på dage hvor medlemmet
    har tid (cookDays).
  - kind="component": sammensatte bowls eller hurtige måltider. 4-7 ingredienser,
    1-3 trin. Resten af ugen.

Variér gennem ugen. Aldrig samme titel to dage i træk. Genbrug gerne én anker-
opskrift som leftovers (samme titel + "(leftovers)" på dayIndex+1).

# Macro-targets

Sæt daglige targets baseret på medlemmets goal:
  - cut:      ~2200 kcal, høj protein (2.0-2.4g/kg), moderat fedt
  - recomp:   ~2500 kcal, høj protein, moderat carbs
  - maintain: ~2400 kcal, balanceret 30/40/30 protein/carb/fat
  - mass:     ~3000 kcal, høj carbs (4-5g/kg), 1.8g/kg protein, fedt fylder resten

Hvis medlemmet har sat dailyKcalTarget eller dailyProteinGTarget i profilen,
respektér dem.

# Carb density

Sæt carbDensity på hvert måltid:
  - "low":      <30g carbs (æg-baseret, salat, kød + grønt)
  - "standard": 30-60g carbs
  - "high":     >60g carbs (havregrød, ris-bowl, søde kartofler)

Sigt efter at lægge "high"-måltider på 2-3 dage om ugen — dem hvor medlemmet
typisk har de tunge sessioner. Hvis du ikke kender træningskalender, antag
mandag og torsdag er tunge.

# Personalisering

Allergier: hard-stop. Aldrig på tallerkenen. Tjek både titel og ingrediens-navn
på dansk og engelsk.

Dislikes: undgå når der findes et alternativ. Aldrig OK at servere mere end én
gang.

Preferences: prioritér disse ingredienser/temaer. Mindst halvdelen af ugens
måltider bør indeholde mindst én af medlemmets foretrukne ingredienser.

Diet:
  - omnivore: alt under allowlist
  - pescatarian: ingen kød, fisk OK
  - vegetarian: ingen kød eller fisk, æg + mejeri OK
  - vegan: udelukkende plantebaseret

Cooking level: 'basic' = max 4 trin, 'intermediate' = op til 6, 'advanced' = op til 8.

Husstand: ingredient-mængder skal være per portion (1 person). Vi multiplicerer
selv i indkøbslisten.

Fish/week: respektér grænsen — antallet af måltider med fed fisk (laks, makrel,
sild, sardiner, ørred, ansjoser) må ikke overstige profile.fishPerWeek.

# Output

Returnér KUN via submit_plan tool'et. Ingen prosa-svar. Notes-feltet er en kort
opsummering på dansk (1-2 sætninger) der nævner hvor mange fisk-måltider, om
nogen anker-opskrifter går igen som leftovers, og hvad der gjorde planen særligt
tilpasset dette medlem.`;

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export type GeneratePlanOpts = {
  profile: NutritionProfile;
  weekStart: string;
};

export async function generatePlanWithClaude(
  opts: GeneratePlanOpts
): Promise<GeneratedPlanShape | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // 50s timeout — initial benchmark showed Claude rounds-trips at
  // 25s edge with the 7-day structured-output schema; we were
  // timing out on the first few generations and falling back to
  // mock. Doubling the budget gives the model headroom for cache
  // misses + cold starts while staying inside Vercel's 60s ceiling
  // on the function. maxRetries: 0 so the SDK doesn't silently
  // extend the hang via retries (our mock fallback covers retry-
  // worthy errors anyway).
  const client = new Anthropic({
    apiKey,
    timeout: 50_000,
    maxRetries: 0,
  });

  const userMessage = buildUserMessage(opts);

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      // 5000 is plenty for 21 meals × ~200 tokens each + targets +
      // notes. 8000 was overshooting and adding ~10s of generation
      // time without buying us additional headroom for the schema.
      max_tokens: 5000,
      // Cache the system prompt — it's the same for every plan
      // generation, and the brand policy block is the bulk of the
      // tokens. Cuts cost and latency for every member after the
      // first request in a 5-minute window.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
      output_config: {
        format: zodOutputFormat(PlanSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) return null;

    // Post-validate ingredients against the disallowlist. If any
    // ingredient slips through, log it and reject the plan. The
    // action layer will fall back to the mock generator.
    const disallowed = scanDisallowed(parsed);
    if (disallowed.length > 0) {
      console.warn(
        `[nutrition-planner-claude] Plan rejected — ${disallowed.length} disallowed ingredient(s):`,
        disallowed.slice(0, 3)
      );
      return null;
    }

    return shapeForPersistence(parsed);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[nutrition-planner-claude] Anthropic API error ${err.status}: ${err.message}`
      );
    } else {
      console.warn("[nutrition-planner-claude] Failed:", err);
    }
    return null;
  }
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function buildUserMessage(opts: GeneratePlanOpts): string {
  const { profile, weekStart } = opts;
  return [
    `Plan-uge: ${weekStart} (mandag).`,
    "",
    "Medlem-profil:",
    `  goal: ${profile.goal}`,
    `  diet: ${profile.diet}`,
    `  mealsPerDay: ${profile.mealsPerDay}`,
    `  householdSize: ${profile.householdSize}`,
    `  cookingLevel: ${profile.cookingLevel}`,
    `  budgetLevel: ${profile.budgetLevel}`,
    `  fishPerWeek: ${profile.fishPerWeek}`,
    `  dailyKcalTarget: ${profile.dailyKcalTarget ?? "auto (sæt fra goal)"}`,
    `  dailyProteinGTarget: ${profile.dailyProteinGTarget ?? "auto"}`,
    `  cookDays: ${profile.cookDays.length ? profile.cookDays.join(", ") : "ikke angivet — antag weekend"}`,
    "",
    `Allergier (HARD-stop): ${profile.allergies.length ? profile.allergies.join(", ") : "ingen"}`,
    `Dislikes: ${profile.dislikes.length ? profile.dislikes.join(", ") : "ingen"}`,
    `Foretrukne ingredienser: ${profile.preferences.length ? profile.preferences.join(", ") : "ingen specifikke"}`,
    "",
    "Generér ugeplanen og returnér via submit_plan.",
  ].join("\n");
}

function scanDisallowed(plan: ParsedPlan): Array<{ meal: string; ingredient: string; match: string }> {
  const hits: Array<{ meal: string; ingredient: string; match: string }> = [];
  for (const meal of plan.meals) {
    for (const ing of meal.ingredients) {
      const flag = flagDisallowed(ing.name);
      if (flag.flagged && flag.match) {
        hits.push({ meal: meal.title, ingredient: ing.name, match: flag.match });
      }
    }
  }
  return hits;
}

function shapeForPersistence(parsed: ParsedPlan): GeneratedPlanShape {
  return {
    targets: parsed.targets,
    notes: parsed.notes,
    meals: parsed.meals.map((m, i) => ({
      dayIndex: m.dayIndex,
      slot: m.slot,
      kind: m.kind,
      title: m.title,
      description: m.description,
      ingredients: m.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
      steps: [...m.steps],
      estKcal: m.estKcal,
      estProteinG: m.estProteinG,
      estCarbsG: m.estCarbsG,
      estFatG: m.estFatG,
      carbDensity: m.carbDensity,
      prepMinutes: m.prepMinutes,
      swappable: true,
      position: i,
      // Image fields are null at generation time — the persist
      // path looks them up via Unsplash before insert.
      imageUrl: null,
      imageThumbUrl: null,
      imageAttributionName: null,
      imageAttributionUrl: null,
    })),
  };
}
