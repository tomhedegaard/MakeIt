/**
 * Unsplash search + cache for meal images.
 *
 * Flow per meal:
 *   1. Normalize the title (lowercase, strip punctuation, collapse
 *      whitespace) → cache lookup. Cache hit returns instantly.
 *   2. Cache miss → call Unsplash search API with a query built
 *      from the title + a "food" bias term. 2s timeout per call so
 *      a slow Unsplash response doesn't drag the whole plan
 *      generation. Pick the first landscape result.
 *   3. Persist to cache + return.
 *
 * No retries — if Unsplash is slow or down for a single meal, we
 * return null and the meal card renders its typography-only
 * fallback. The next plan generation will re-attempt that meal.
 *
 * Attribution is non-optional per Unsplash API ToS: we store the
 * photographer's name + profile URL with each cached entry and
 * render them under the image on the meal card. The UTM-tagged
 * profile URL fulfills both the photographer-credit and the
 * "link back to Unsplash" requirements in one click target.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MealImage = {
  url: string;
  thumbUrl: string;
  attributionName: string;
  attributionUrl: string;
};

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? "";
const UNSPLASH_ENABLED = Boolean(UNSPLASH_ACCESS_KEY);
const SEARCH_TIMEOUT_MS = 2000;
const UTM = "utm_source=makeit_hq&utm_medium=referral";

/**
 * Normalize a meal title for cache-key purposes. Same logic across
 * insert + lookup, so we can't drift between the two call sites.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Public entry point. Returns the image (from cache or Unsplash)
 * or null when:
 *   - The integration isn't configured (no API key)
 *   - Unsplash returns no results for this title
 *   - The request times out / fails
 */
export async function getMealImage(title: string): Promise<MealImage | null> {
  const key = normalizeTitle(title);
  if (!key) return null;

  // 1. Cache lookup. Reads via the server client (RLS lets every
  //    authenticated user read the cache). Misses cost nothing
  //    extra — the search path runs whether or not we tried this
  //    branch.
  const cached = await readCache(key);
  if (cached) return cached;

  // 2. No key — skip the API call entirely. The persist path will
  //    just leave image_url null and the meal card falls back to
  //    typography.
  if (!UNSPLASH_ENABLED) return null;

  // 3. Hit Unsplash.
  const fresh = await searchUnsplash(title);
  if (!fresh) return null;

  // 4. Write through. Best-effort — if the cache write fails we
  //    still return the result; next call will just re-query.
  await writeCache(key, fresh).catch(() => undefined);

  return fresh;
}

/**
 * Batch wrapper — fetches images for many meals in parallel with
 * a shared timeout budget. Returns a Map keyed by the original
 * title so callers can attach the result to each meal row.
 */
export async function getMealImagesBatch(
  titles: string[],
): Promise<Map<string, MealImage>> {
  const unique = Array.from(new Set(titles));
  const results = await Promise.all(
    unique.map(async (t) => [t, await getMealImage(t)] as const),
  );
  const map = new Map<string, MealImage>();
  for (const [title, image] of results) {
    if (image) map.set(title, image);
  }
  return map;
}

/* ---------------------------- cache ---------------------------- */

async function readCache(key: string): Promise<MealImage | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("meal_image_cache")
    .select("url, thumb_url, attribution_name, attribution_url")
    .eq("title_normalized", key)
    .maybeSingle();
  if (!data) return null;
  return {
    url: data.url,
    thumbUrl: data.thumb_url,
    attributionName: data.attribution_name,
    attributionUrl: data.attribution_url,
  };
}

async function writeCache(key: string, image: MealImage): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("meal_image_cache")
    .upsert(
      {
        title_normalized: key,
        url: image.url,
        thumb_url: image.thumbUrl,
        attribution_name: image.attributionName,
        attribution_url: image.attributionUrl,
        source: "unsplash",
      },
      { onConflict: "title_normalized" },
    );
}

/**
 * Danish → English food vocabulary so the simplified query has
 * a fighting chance against Unsplash's English-tagged corpus.
 * Unsplash search is overwhelmingly English; "ovnbagte kyllingelår"
 * returns near-nothing while "baked chicken thighs" returns hundreds
 * of clean food shots. Keys must be lowercase (matched against
 * lowercased title tokens).
 *
 * Not exhaustive — focus on protein, primary carb, common veg, and
 * cooking methods (baked/grilled/etc). Compound nouns like
 * "kyllingelår" are mapped as a whole so we don't have to assemble
 * from parts.
 */
const FOOD_VOCAB: Record<string, string> = {
  // Cooking methods
  ovnbagte: "baked",
  ovnbagt: "baked",
  bagt: "baked",
  bagte: "baked",
  grillede: "grilled",
  grillet: "grilled",
  stegt: "fried",
  kogte: "boiled",
  marineret: "marinated",
  rørt: "stirred",

  // Animal protein
  kylling: "chicken",
  kyllingebryst: "chicken breast",
  kyllingelår: "chicken thighs",
  kyllingelaar: "chicken thighs",
  kalkun: "turkey",
  okse: "beef",
  oksekød: "beef",
  oksekoed: "beef",
  hakket: "ground meat",
  oksekødsfars: "ground beef",
  svinekød: "pork",
  svinekoed: "pork",
  lam: "lamb",
  lammekød: "lamb",
  lammekoed: "lamb",
  æg: "eggs",
  aeg: "eggs",
  bacon: "bacon",
  skinke: "ham",

  // Fish
  laks: "salmon",
  torsk: "cod",
  ørred: "trout",
  oerred: "trout",
  makrel: "mackerel",
  tun: "tuna",
  sild: "herring",
  sardiner: "sardines",
  rejer: "shrimp",
  fisk: "fish",

  // Plant protein
  linser: "lentils",
  bønner: "beans",
  boenner: "beans",
  kikærter: "chickpeas",
  kikaerter: "chickpeas",
  edamame: "edamame",
  tofu: "tofu",
  tempeh: "tempeh",

  // Grains / carbs
  ris: "rice",
  brune: "brown",
  havre: "oats",
  havregryn: "oatmeal",
  pasta: "pasta",
  brød: "bread",
  broed: "bread",
  rugbrød: "rye bread",
  rugbroed: "rye bread",
  bulgur: "bulgur",
  quinoa: "quinoa",
  kartoffel: "potato",
  kartofler: "potatoes",
  søde: "sweet",
  soede: "sweet",
  "søde-kartofler": "sweet potatoes",

  // Vegetables
  broccoli: "broccoli",
  spinat: "spinach",
  rosenkål: "brussels sprouts",
  rosenkaal: "brussels sprouts",
  gulerod: "carrot",
  gulerødder: "carrots",
  guleroedder: "carrots",
  agurk: "cucumber",
  tomat: "tomato",
  tomater: "tomatoes",
  løg: "onion",
  loeg: "onion",
  hvidløg: "garlic",
  hvidloeg: "garlic",
  pastinak: "parsnip",
  selleri: "celery",
  blomkål: "cauliflower",
  blomkaal: "cauliflower",
  squash: "zucchini",
  aubergine: "eggplant",
  peberfrugt: "bell pepper",
  rucola: "arugula",
  salat: "salad",

  // Dairy
  skyr: "skyr yogurt",
  yoghurt: "yogurt",
  ost: "cheese",
  hytteost: "cottage cheese",
  feta: "feta",
  parmesan: "parmesan",
  smør: "butter",
  smoer: "butter",

  // Fruits / berries
  æble: "apple",
  aeble: "apple",
  æbler: "apples",
  aebler: "apples",
  banan: "banana",
  bær: "berries",
  baer: "berries",
  blåbær: "blueberries",
  blaabaer: "blueberries",
  jordbær: "strawberries",
  jordbaer: "strawberries",
  hindbær: "raspberries",
  hindbaer: "raspberries",
  citron: "lemon",

  // Herbs / spices
  timian: "thyme",
  rosmarin: "rosemary",
  persille: "parsley",
  basilikum: "basil",
  koriander: "cilantro",

  // Bowl / dish types
  bowl: "bowl",
  suppe: "soup",
  gryde: "stew",
  wok: "stir fry",
  omelet: "omelette",
  smoothie: "smoothie",
  pandekager: "pancakes",

  // Fats
  avocado: "avocado",
  oliven: "olives",
  nødder: "nuts",
  noedder: "nuts",
  valnødder: "walnuts",
  valnoedder: "walnuts",
  mandler: "almonds",
  tahin: "tahini",
};

/* ---------------------------- search --------------------------- */

type UnsplashResponse = {
  results?: Array<{
    urls?: { regular?: string; small?: string };
    user?: {
      name?: string;
      username?: string;
      links?: { html?: string };
    };
  }>;
};

/**
 * Multi-stage query ladder. Stops at the first hit, so the more
 * specific queries run first. Each step is a separate API call —
 * worst case 3 calls per uncached meal.
 */
async function searchUnsplash(title: string): Promise<MealImage | null> {
  const queries = buildQueryLadder(title);
  for (const q of queries) {
    const hit = await queryOnce(q);
    if (hit) return hit;
  }
  return null;
}

function buildQueryLadder(title: string): string[] {
  const ladder: string[] = [];

  // Step 1: Translate Danish food keywords → English, build query
  // from those. "Ovnbagte kyllingelår med pastinak og timian" →
  // ["baked", "chicken thighs", "parsnip", "thyme"] → "baked
  // chicken thighs food" (cap at 3 keywords so the query stays
  // focused). This is the highest-quality match because Unsplash's
  // corpus is English-dominant.
  const tokens = tokenize(title);
  const english: string[] = [];
  for (const tok of tokens) {
    const en = FOOD_VOCAB[tok];
    if (en && !english.includes(en)) english.push(en);
  }
  if (english.length > 0) {
    ladder.push(`${english.slice(0, 3).join(" ")} food`);
  }

  // Step 2: Full Danish title with "food meal" — long shot for
  // English-only meal names that slipped through the vocab, or
  // for occasional Danish-tagged photos.
  ladder.push(`${title} food meal`);

  // Step 3: Generic fallback — never returns nothing. Ensures every
  // meal card gets a visual rather than a checkerboard of "has
  // image" / "doesn't have image."
  ladder.push("healthy meal bowl");

  return ladder;
}

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .normalize("NFC")
    .replace(/[,.;:!?()]/g, " ")
    .replace(/-/g, " ") // split "ris-bowl" into ris + bowl
    .split(/\s+/)
    .filter(Boolean);
}

async function queryOnce(rawQuery: string): Promise<MealImage | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const q = encodeURIComponent(rawQuery);
    const url = `https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=landscape&content_filter=high`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept-Version": "v1",
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) return null;
    const data = (await response.json()) as UnsplashResponse;
    const hit = data.results?.[0];
    if (!hit?.urls?.regular || !hit.user?.name || !hit.user.links?.html) {
      return null;
    }

    return {
      url: hit.urls.regular,
      thumbUrl: hit.urls.small ?? hit.urls.regular,
      attributionName: hit.user.name,
      attributionUrl: `${hit.user.links.html}?${UTM}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
