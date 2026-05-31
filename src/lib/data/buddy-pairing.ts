/**
 * Crew Coaching Pyramid — buddy-pairing feature-vector fetcher (CC-2).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §5
 *
 * Shapes a `MemberFeatures[]` for one tier from live Supabase state so
 * the pure matcher (`src/lib/pairing/match.ts`) can run. The cron
 * (`/api/cron/buddy-rematch-weekly`) calls this once per tier and
 * passes the result through `assignBuddiesForTier`.
 *
 * v0 simplifications (documented, not bugs — to be tightened as the
 * pyramid scales):
 *   - timezoneOffsetHours: hardcoded to +1 (CET). The members table
 *     has no timezone column; the beta is Danish, so the hard ±2h
 *     constraint never filters out current users. Add the column +
 *     resolve via Intl when the cohort goes multinational.
 *   - trainingWeekMod4 / deload: zeroed. The program-week + deload
 *     proxies need a join into the program schema that hasn't shipped
 *     yet — the training_phase_offset factor effectively contributes
 *     equally for everyone in v0. The matcher still ranks pairs by
 *     the other four factors.
 *   - repsTrajectory: 'unknown' until we wire the reps_transactions
 *     30-day-momentum proxy. engagement_balance factor falls back to
 *     a neutral score (10) — preserves matching, just less signal.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReadinessBucket } from "@/lib/hrv/types";
import type { Database } from "@/lib/supabase/database.types";
import type {
  BuddyTier,
  GoalFocus,
  HrvPattern,
  MemberFeatures,
} from "@/lib/pairing/match";

const MS_PER_DAY = 86_400_000;
const HRV_WINDOW_DAYS = 14;
const SESSIONS_WINDOW_DAYS = 30;

/** Maps the matcher's lowercase tier names to the members.tier values
 * stored in the DB (capitalised, per the existing Tier type). */
const TIER_DB_VALUE: Record<BuddyTier, string> = {
  athlete: "Athlete",
  beast: "Beast",
  legend: "Legend",
};

/** Goal-focus passthrough — DB column is free-text but the existing
 * onboarding constrains it to these three values. Anything else
 * collapses to 'unknown' so the matcher stays robust. */
const KNOWN_GOAL_FOCUS = new Set<GoalFocus>(["strength", "hypertrophy", "hybrid"]);
function normalizeGoalFocus(raw: string | null): GoalFocus {
  if (!raw) return "unknown";
  const v = raw.toLowerCase().trim();
  return (KNOWN_GOAL_FOCUS as Set<string>).has(v) ? (v as GoalFocus) : "unknown";
}

/* ============================================================== *
 * Pure: HRV pattern classification (exported for unit testing)
 * ============================================================== */

const BUCKET_ORDINAL: Record<ReadinessBucket, number> = {
  very_low: 1,
  low: 2,
  normal: 3,
  high: 4,
  very_high: 5,
};

/**
 * Classify a chronological list of readiness buckets into an HRV
 * pattern label.
 *
 *   - unknown      — fewer than 4 readings or all null.
 *   - improving    — strictly more rising transitions than falling
 *                    by a margin of ≥2. The transition-count heuristic
 *                    is robust against noisy patterns whose half-means
 *                    happen to land favourably (e.g. very_low → normal
 *                    → high → low has a rising half-mean but is clearly
 *                    chaotic, not improving).
 *   - oscillating  — ≥3 distinct buckets in the window without a
 *                    clear rising direction.
 *   - flat         — everything else.
 *
 * Buckets are mapped to ordinals (very_low=1 .. very_high=5) so
 * transition deltas are well-defined.
 */
export function classifyHrvPattern(
  buckets: (ReadinessBucket | null)[],
): HrvPattern {
  const filtered = buckets.filter((b): b is ReadinessBucket => b !== null);
  if (filtered.length < 4) return "unknown";

  const ord = filtered.map((b) => BUCKET_ORDINAL[b]);
  let inc = 0;
  let dec = 0;
  for (let i = 1; i < ord.length; i++) {
    if (ord[i] > ord[i - 1]) inc += 1;
    else if (ord[i] < ord[i - 1]) dec += 1;
  }
  if (inc - dec >= 2) return "improving";

  const distinct = new Set(filtered).size;
  if (distinct >= 3) return "oscillating";

  return "flat";
}

/* ============================================================== *
 * Async: feature-vector fetcher
 * ============================================================== */

interface MemberRow {
  id: string;
  locale: string;
  goal_focus: string | null;
}

/**
 * Return member_ids that are currently in an active buddy pair (no
 * unpaired_at stamp). The matcher excludes these from the candidate
 * pool — they keep their existing buddy until rematch ends them.
 */
async function loadActivelyPairedIds(
  supabase: SupabaseClient<Database>,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("buddy_pairs")
    .select("member_a, member_b")
    .is("unpaired_at", null);
  if (error) throw new Error(`active pairs: ${error.message}`);
  const ids = new Set<string>();
  for (const r of data ?? []) {
    ids.add(r.member_a as string);
    ids.add(r.member_b as string);
  }
  return ids;
}

/**
 * Build MemberFeatures[] for every un-paired member at the given tier.
 * Returns an empty list if nobody qualifies. `now` is injectable for
 * tests/replays.
 */
export async function loadFeaturesForTier(
  supabase: SupabaseClient<Database>,
  tier: BuddyTier,
  now: Date = new Date(),
): Promise<MemberFeatures[]> {
  const tierValue = TIER_DB_VALUE[tier];
  const pairedIds = await loadActivelyPairedIds(supabase);

  // Pool: tier-matching, non-coach members not already in an active pair.
  const { data: memberRows, error: memErr } = await supabase
    .from("members")
    .select("id, locale, goal_focus")
    .eq("tier", tierValue)
    .eq("is_coach", false);
  if (memErr) throw new Error(`roster: ${memErr.message}`);
  const pool = ((memberRows ?? []) as MemberRow[]).filter(
    (m) => !pairedIds.has(m.id),
  );
  if (pool.length === 0) return [];

  const poolIds = pool.map((m) => m.id);

  // Batch the two heavy queries — HRV readings + completed sessions —
  // over the entire pool so we don't N+1.
  const hrvSince = new Date(now.getTime() - HRV_WINDOW_DAYS * MS_PER_DAY).toISOString();
  const sessionsSince = new Date(
    now.getTime() - SESSIONS_WINDOW_DAYS * MS_PER_DAY,
  )
    .toISOString()
    .slice(0, 10); // sessions.scheduled_for is a date

  const [readingsRes, sessionsRes] = await Promise.all([
    supabase
      .from("hrv_readings")
      .select("member_id, measured_at, readiness_bucket")
      .in("member_id", poolIds)
      .gte("measured_at", hrvSince)
      .order("measured_at", { ascending: true }),
    supabase
      .from("sessions")
      .select("member_id")
      .in("member_id", poolIds)
      .eq("status", "completed")
      .gte("scheduled_for", sessionsSince),
  ]);
  if (readingsRes.error) throw new Error(`readings: ${readingsRes.error.message}`);
  if (sessionsRes.error) throw new Error(`sessions: ${sessionsRes.error.message}`);

  // Bucket readings chronologically per member.
  const readingsByMember = new Map<string, (ReadinessBucket | null)[]>();
  for (const r of readingsRes.data ?? []) {
    const arr = readingsByMember.get(r.member_id as string) ?? [];
    arr.push((r.readiness_bucket as ReadinessBucket | null) ?? null);
    readingsByMember.set(r.member_id as string, arr);
  }

  // Count completed sessions per member.
  const sessionsByMember = new Map<string, number>();
  for (const s of sessionsRes.data ?? []) {
    const id = s.member_id as string;
    sessionsByMember.set(id, (sessionsByMember.get(id) ?? 0) + 1);
  }

  return pool.map<MemberFeatures>((m) => ({
    memberId: m.id,
    language: m.locale === "en" ? "en" : "da",
    timezoneOffsetHours: 1, // v0: hardcoded CET — see jsdoc.
    trainingWeekMod4: 0, // v0: program-week proxy not yet wired.
    deload: false, // v0: see jsdoc.
    hrvPattern: classifyHrvPattern(readingsByMember.get(m.id) ?? []),
    goalFocus: normalizeGoalFocus(m.goal_focus),
    sessionsPer30d: sessionsByMember.get(m.id) ?? 0,
    repsTrajectory: "unknown", // v0: reps-momentum proxy not yet wired.
  }));
}
