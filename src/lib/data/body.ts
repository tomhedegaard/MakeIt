/**
 * Body data, the pejlemærke and the number preferences (spec 2026-09-27 §S,
 * migration 0070), plus the loaders for early signs. Rules live in
 * `@/lib/health/*`; this module only reads and writes rows.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { copenhagenIsoDate } from "@/lib/data/nutrition-checkin";
import { calorieFloor } from "@/lib/nutrition/calorie-floor";
import { copenhagenDate, restingKcal, type Sex } from "@/lib/health/body-rules";
import { foodSignals, type FoodSignalInput, type FoodSignalKey } from "@/lib/health/food-signals";

export type MemberBody = {
  heightCm: number | null;
  birthYear: number | null;
  sex: Sex | null;
  pejlemaerkeKg: number | null;
  showWeightCard: boolean;
  hideNumbers: boolean;
};

export const EMPTY_BODY: MemberBody = {
  heightCm: null,
  birthYear: null,
  sex: null,
  pejlemaerkeKg: null,
  showWeightCard: false,
  hideNumbers: false,
};

type BodyRow = {
  height_cm: number | null;
  birth_year: number | null;
  sex: Sex | null;
  pejlemaerke_kg: number | string | null;
  show_weight_card: boolean;
  hide_numbers: boolean;
};

function fromRow(row: BodyRow | null): MemberBody {
  if (!row) return EMPTY_BODY;
  return {
    heightCm: row.height_cm,
    birthYear: row.birth_year,
    sex: row.sex,
    pejlemaerkeKg: row.pejlemaerke_kg === null ? null : Number(row.pejlemaerke_kg),
    showWeightCard: row.show_weight_card,
    hideNumbers: row.hide_numbers,
  };
}

export async function getMemberBody(memberId: string): Promise<MemberBody> {
  if (!SUPABASE_ENABLED) return EMPTY_BODY;
  const supabase = await createClient();
  if (!supabase) return EMPTY_BODY;
  const { data } = await supabase
    .from("member_body")
    .select("height_cm, birth_year, sex, pejlemaerke_kg, show_weight_card, hide_numbers")
    .eq("member_id", memberId)
    .maybeSingle();
  return fromRow(data as BodyRow | null);
}

/** The member's own calorie floor: sex and resting rate when known, else 1.800. */
export async function getMemberCalorieFloor(memberId: string): Promise<number> {
  const body = await getMemberBody(memberId);
  if (!body.sex) return calorieFloor();
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("weight_logs")
        .select("kg")
        .eq("member_id", memberId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const sex = body.sex === "unspecified" ? null : body.sex;
  return calorieFloor({
    sex,
    bmrKcal: restingKcal({ weightKg: data ? Number(data.kg) : null, heightCm: body.heightCm, birthYear: body.birthYear, sex }),
  });
}

/* ---------------------------------------------------------------- *
 * Early signs                                                       *
 * ---------------------------------------------------------------- */

type LogRow = {
  member_id: string;
  logged_for_date: string;
  off_plan: boolean;
  meal_id: string | null;
  kcal: number | null;
  estimate_edited: boolean | null;
  estimate_kcal_low: number | null;
  nutrition_meals: { est_kcal: number | null } | { est_kcal: number | null }[] | null;
};

/** PostgREST caps a response at 1.000 rows; read every page. */
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await page(from, from + 999);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

function isoDaysAgo(today: string, n: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Signals for one member (their own mind page) or every member a coach
 * can read (the inbox). RLS decides which rows come back.
 * ponytail: reads every member's last 16 days, paged; move the day sums
 * into SQL if the member count grows past a few thousand.
 */
export async function loadFoodSignals(memberId?: string): Promise<Map<string, FoodSignalKey[]>> {
  const out = new Map<string, FoodSignalKey[]>();
  if (!SUPABASE_ENABLED) return out;
  const supabase = await createClient();
  if (!supabase) return out;

  const today = copenhagenIsoDate();
  // One member (their own mind page) or every member RLS lets a coach read.
  const scope = memberId ? `member_id.eq.${memberId}` : "member_id.not.is.null";
  const [logs, pejle, actions, bodies] = await Promise.all([
    allRows<LogRow>((from, to) =>
      supabase
        .from("nutrition_logs")
        .select("member_id, logged_for_date, off_plan, meal_id, kcal, estimate_edited, estimate_kcal_low, nutrition_meals(est_kcal)")
        .eq("status", "eaten")
        .gte("logged_for_date", isoDaysAgo(today, 16))
        .or(scope)
        .order("id")
        .range(from, to),
    ),
    allRows<{ member_id: string; kg: number | string; created_at: string }>((from, to) =>
      supabase
        .from("pejlemaerke_changes")
        .select("member_id, kg, created_at")
        .gte("created_at", isoDaysAgo(today, 60))
        .or(scope)
        .order("created_at", { ascending: true })
        .range(from, to),
    ),
    allRows<{ member_id: string; created_at: string }>((from, to) =>
      supabase
        .from("member_action_logs")
        .select("member_id, created_at")
        .eq("action", "weight_log")
        .gte("created_at", isoDaysAgo(today, 8))
        .or(scope)
        .order("created_at")
        .range(from, to),
    ),
    allRows<{ member_id: string; sex: Sex | null }>((from, to) =>
      supabase.from("member_body").select("member_id, sex").or(scope).order("member_id").range(from, to),
    ),
  ]);

  const inputs = new Map<string, FoodSignalInput>();
  const sexOf = new Map(bodies.map((b) => [b.member_id, b.sex]));
  const input = (id: string): FoodSignalInput => {
    let i = inputs.get(id);
    if (!i) {
      const sex = sexOf.get(id);
      i = {
        today,
        floorKcal: calorieFloor({ sex: sex === "f" || sex === "m" ? sex : null }),
        days: [],
        pejlemaerke: [],
        estimates: [],
        weighIns: [],
      };
      inputs.set(id, i);
    }
    return i;
  };

  const dayTotals = new Map<string, { kcal: number; logs: number }>();
  // A day with a meal whose kcal is unknown (hidden-numbers manual log, or a
  // logged row without its meal) cannot be judged against the floor.
  const unknownDays = new Set<string>();
  for (const row of logs) {
    const id = row.member_id;
    const date = row.logged_for_date;
    const meal = Array.isArray(row.nutrition_meals) ? row.nutrition_meals[0] : row.nutrition_meals;
    const kcal = row.off_plan ? row.kcal : row.meal_id ? (meal?.est_kcal ?? null) : null;
    const key = `${id}|${date}`;
    if (kcal === null) unknownDays.add(key);
    const t = dayTotals.get(key) ?? { kcal: 0, logs: 0 };
    dayTotals.set(key, { kcal: t.kcal + (kcal ?? 0), logs: t.logs + 1 });
    if (row.off_plan && row.kcal !== null && row.estimate_kcal_low !== null) {
      input(id).estimates.push({ date, kcal: row.kcal, low: row.estimate_kcal_low, edited: !!row.estimate_edited });
    }
  }
  for (const [key, t] of dayTotals) {
    if (unknownDays.has(key)) continue;
    const [id, date] = key.split("|");
    input(id).days.push({ date, ...t });
  }
  for (const row of pejle) {
    input(row.member_id).pejlemaerke.push({ kg: Number(row.kg), at: row.created_at });
  }
  const weighIns = new Map<string, number>();
  for (const row of actions) {
    const key = `${row.member_id}|${copenhagenDate(row.created_at)}`;
    weighIns.set(key, (weighIns.get(key) ?? 0) + 1);
  }
  for (const [key, count] of weighIns) {
    const [id, date] = key.split("|");
    input(id).weighIns.push({ date, count });
  }

  for (const [id, i] of inputs) {
    const signals = foodSignals(i);
    if (signals.length) out.set(id, signals);
  }
  return out;
}

export type FoodSignalRow = { memberId: string; memberHandle: string; signals: FoodSignalKey[] };

/** Inbox rows: members with signals that no coach has marked seen in the last 14 days. */
export async function getFoodSignalInboxRows(): Promise<FoodSignalRow[]> {
  const signals = await loadFoodSignals();
  if (signals.size === 0) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const ids = [...signals.keys()];
  const [{ data: seen }, { data: members }] = await Promise.all([
    supabase.from("food_signals").select("member_id, coach_seen_until").in("member_id", ids),
    supabase.from("members").select("id, handle").in("id", ids),
  ]);
  const now = Date.now();
  const hidden = new Set(
    (seen ?? [])
      .filter((s) => s.coach_seen_until && Date.parse(s.coach_seen_until as string) > now)
      .map((s) => s.member_id as string),
  );
  const handle = new Map((members ?? []).map((m) => [m.id as string, m.handle as string]));
  return ids
    .filter((id) => !hidden.has(id))
    .map((id) => ({ memberId: id, memberHandle: handle.get(id) ?? "", signals: signals.get(id)! }));
}

/**
 * The soft question at the mind-check: shown when the member has a signal
 * and was not asked in the last 14 days. It stays for the day it was first
 * shown, so a reload does not make it vanish mid-read.
 */
export async function takeSoftFoodQuestion(memberId: string): Promise<boolean> {
  const signals = await loadFoodSignals(memberId);
  if (!signals.has(memberId)) return false;
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("member_body")
    .select("food_question_asked_at")
    .eq("member_id", memberId)
    .maybeSingle();
  const since = Date.now() - (data?.food_question_asked_at ? Date.parse(data.food_question_asked_at as string) : 0);
  if (since < 86_400_000) return true;
  if (since < 14 * 86_400_000) return false;
  const now = new Date().toISOString();
  await supabase.from("member_body").upsert({ member_id: memberId, food_question_asked_at: now, updated_at: now });
  return true;
}
