import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  currentIsoMonday,
  type Meal,
  type MealSlot,
} from "@/lib/data/nutrition";

/* ---------------------------------------------------------------- *
 * Types
 * ---------------------------------------------------------------- */

export type CheckInState = "due" | "logged" | "skipped" | "upcoming" | "no-plan";

export type DailyCheckIn = {
  /** What the card should display — `due` is the action state. */
  state: CheckInState;
  /** Today's date in YYYY-MM-DD */
  dateIso: string;
  /** The slot to log against, or the next slot when state="upcoming" */
  slot: MealSlot | null;
  /** Time-window label for the active/next slot, e.g. "06–11" */
  slotWindow: string | null;
  /** The planned meal for that slot, if a plan exists */
  meal: Meal | null;
  /**
   * Existing log row for this date+slot, if any. Drives the
   * "already logged" state and lets the card show what was eaten.
   */
  existingLogId: string | null;
  /** Consecutive days with at least one log (eaten OR skipped). */
  streakDays: number;
  /** Today's logged meals so far (for the "X/3 logget i dag" pip) */
  loggedToday: number;
  mealsToday: number;
};

/* ---------------------------------------------------------------- *
 * Slot windows (Europe/Copenhagen)
 *
 * The "active" slot is what the card prompts for right now. Outside
 * any window (e.g. mid-afternoon between frokost and aften) we surface
 * the next upcoming slot as a preview rather than nagging.
 * ---------------------------------------------------------------- */

type SlotWindow = { slot: MealSlot; from: number; to: number; label: string };

const SLOT_WINDOWS: SlotWindow[] = [
  { slot: "morgen",  from: 6,  to: 11, label: "06–11" },
  { slot: "frokost", from: 11, to: 15, label: "11–15" },
  { slot: "aften",   from: 17, to: 22, label: "17–22" },
];

/** Returns the active slot for the given local hour, or null if outside any window. */
function activeSlot(hour: number): SlotWindow | null {
  return SLOT_WINDOWS.find((w) => hour >= w.from && hour < w.to) ?? null;
}

/** Returns the next slot the member will encounter today, or null after aften. */
function nextSlotAfter(hour: number): SlotWindow | null {
  return SLOT_WINDOWS.find((w) => w.from > hour) ?? null;
}

function copenhagenHour(): number {
  // toLocaleString("en-GB" + Europe/Copenhagen + hour-only) is the
  // simplest cross-runtime way to get the local hour. 00 is midnight,
  // 23 is the last hour. Returns "24" at midnight on some Nodes — clamp.
  const raw = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "numeric",
    hour12: false,
  });
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 12;
  return Math.min(23, Math.max(0, n));
}

function copenhagenIsoDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // already YYYY-MM-DD
}

function copenhagenDayIndex(): number {
  // 0 = Mon, 6 = Sun (matches plan storage)
  const wd = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export async function getDailyCheckIn(memberId: string): Promise<DailyCheckIn> {
  const dateIso = copenhagenIsoDate();
  const hour = copenhagenHour();
  const dayIndex = copenhagenDayIndex();

  const empty: DailyCheckIn = {
    state: "no-plan",
    dateIso,
    slot: null,
    slotWindow: null,
    meal: null,
    existingLogId: null,
    streakDays: 0,
    loggedToday: 0,
    mealsToday: 0,
  };

  const supabase = await createClient();
  if (!supabase) return empty;

  // Find this week's plan (don't pull all meals — only what we need
  // for today's slot lookup + total count).
  const { data: plan } = await supabase
    .from("nutrition_plans")
    .select("id")
    .eq("member_id", memberId)
    .eq("week_start", currentIsoMonday())
    .is("archived_at", null)
    .maybeSingle();

  if (!plan) {
    // No plan, but we still want to surface streak from past logs.
    const streakDays = await computeStreak(memberId, dateIso, supabase);
    return { ...empty, streakDays };
  }

  // Today's meals only.
  const { data: todayMeals } = await supabase
    .from("nutrition_meals")
    .select("*")
    .eq("plan_id", plan.id)
    .eq("day_index", dayIndex);

  // Today's logs only.
  const { data: todayLogs } = await supabase
    .from("nutrition_logs")
    .select("id, logged_for_slot, status")
    .eq("member_id", memberId)
    .eq("logged_for_date", dateIso);

  const meals = (todayMeals ?? []) as Array<{
    id: string;
    plan_id: string;
    day_index: number;
    slot: MealSlot;
    kind: "recipe" | "component";
    title: string;
    description: string | null;
    ingredients: unknown;
    steps: unknown;
    est_kcal: number | null;
    est_protein_g: number | null;
    est_carbs_g: number | null;
    est_fat_g: number | null;
    carb_density: "low" | "standard" | "high";
    prep_minutes: number | null;
    swappable: boolean;
    position: number;
  }>;
  const logs = (todayLogs ?? []) as Array<{
    id: string;
    logged_for_slot: MealSlot | null;
    status: "eaten" | "skipped" | null;
  }>;

  // Count main-meal coverage for the day pip. Only morgen/frokost/
  // aften count toward "X/3 logget" — snacks/pre/post are bonus.
  const MAIN_SLOTS: MealSlot[] = ["morgen", "frokost", "aften"];
  const mealsToday = meals.filter((m) => MAIN_SLOTS.includes(m.slot)).length;
  const loggedToday = new Set(
    logs
      .filter((l) => l.logged_for_slot && MAIN_SLOTS.includes(l.logged_for_slot))
      .map((l) => l.logged_for_slot)
  ).size;

  // Pick which slot to surface: active window first, then next-up.
  const window = activeSlot(hour) ?? nextSlotAfter(hour);
  const isPreview = !activeSlot(hour);

  if (!window) {
    // After aften — nothing to log for today. Show the streak only.
    const streakDays = await computeStreak(memberId, dateIso, supabase);
    return { ...empty, state: "logged", streakDays, loggedToday, mealsToday };
  }

  const meal = meals.find((m) => m.slot === window.slot) ?? null;
  const existingLog = logs.find((l) => l.logged_for_slot === window.slot) ?? null;

  let state: CheckInState;
  if (existingLog) {
    state = existingLog.status === "skipped" ? "skipped" : "logged";
  } else if (isPreview) {
    state = "upcoming";
  } else {
    state = "due";
  }

  const streakDays = await computeStreak(memberId, dateIso, supabase);

  return {
    state,
    dateIso,
    slot: window.slot,
    slotWindow: window.label,
    meal: meal
      ? {
          id: meal.id,
          planId: meal.plan_id,
          dayIndex: meal.day_index,
          slot: meal.slot,
          kind: meal.kind,
          title: meal.title,
          description: meal.description,
          ingredients: (meal.ingredients ?? []) as Meal["ingredients"],
          steps: (meal.steps ?? []) as Meal["steps"],
          estKcal: meal.est_kcal,
          estProteinG: meal.est_protein_g,
          estCarbsG: meal.est_carbs_g,
          estFatG: meal.est_fat_g,
          carbDensity: meal.carb_density,
          prepMinutes: meal.prep_minutes,
          swappable: meal.swappable,
          position: meal.position,
        }
      : null,
    existingLogId: existingLog?.id ?? null,
    streakDays,
    loggedToday,
    mealsToday,
  };
}

/* ---------------------------------------------------------------- *
 * Streak
 * ---------------------------------------------------------------- */

/**
 * Consecutive days (including today if anything is logged today)
 * with at least one log row. Skipped logs count — the goal is daily
 * check-in habit, not perfect adherence. Capped at 365 to bound the
 * walk on long-running members. Walks backwards from today's date.
 */
async function computeStreak(
  memberId: string,
  todayIso: string,
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>
): Promise<number> {
  const cap = 365;
  const horizonStart = isoMinusDays(todayIso, cap);
  const { data } = await supabase
    .from("nutrition_logs")
    .select("logged_for_date")
    .eq("member_id", memberId)
    .gte("logged_for_date", horizonStart)
    .lte("logged_for_date", todayIso);

  if (!data || data.length === 0) return 0;

  const days = new Set<string>();
  for (const r of data) {
    if (typeof r.logged_for_date === "string") days.add(r.logged_for_date);
  }

  // Walk back from today; if today isn't logged, start from yesterday
  // so a fresh-day visit before logging doesn't show "0 dage".
  let cursor = todayIso;
  if (!days.has(cursor)) cursor = isoMinusDays(cursor, 1);
  let streak = 0;
  while (streak < cap && days.has(cursor)) {
    streak += 1;
    cursor = isoMinusDays(cursor, 1);
  }
  return streak;
}

function isoMinusDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
