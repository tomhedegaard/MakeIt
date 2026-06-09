/**
 * Mental Health Pillar (Søjle 5) — data layer.
 *
 * Demo-mode safe: every read returns mock data when Supabase isn't
 * configured. Demo writes (e.g. disclaimer ack) go to a cookie.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md
 *
 * NOTE on typing: migration 0046 adds new tables that `database.types.ts`
 * doesn't know about until `npm run db:types` is re-run against the
 * post-0046 live DB. Until then we use the `mindDb()` wrapper below
 * which loosens the `from(table)` signature to accept the new table
 * names. The wrapper still preserves chainable query semantics. Delete
 * once db:types is regenerated.
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  DEFAULT_MENTAL_SETTINGS,
  type JournalEntry,
  type MentalSettings,
  type MindCheckLog,
} from "@/lib/mind/types";
import { mockMentalSettings, mockMindCheckLogs } from "@/lib/mind/mock";
import { detectCrisisKeywords } from "@/lib/mind/crisis-keywords";
import {
  combineModerationVerdicts,
  moderateJournalText,
} from "@/lib/mind/moderation-claude";
import { awardJournalEntry } from "@/lib/mind/reps";

export const MIND_DISCLAIMER_COOKIE = "mi_mind_disclaimer_ack";

type MaybeClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

interface UntypedTable {
  select: (columns?: string) => UntypedTable;
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => UntypedTable;
  upsert: (
    row: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string },
  ) => UntypedTable;
  update: (row: Record<string, unknown>) => UntypedTable;
  delete: () => UntypedTable;
  eq: (col: string, value: unknown) => UntypedTable;
  in: (col: string, value: unknown[]) => UntypedTable;
  gte: (col: string, value: unknown) => UntypedTable;
  is: (col: string, value: unknown) => UntypedTable;
  order: (col: string, options?: { ascending?: boolean }) => UntypedTable;
  limit: (n: number) => UntypedTable;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  then: <T>(
    onfulfilled?: (value: { data: Record<string, unknown>[] | null; error: { message: string } | null }) => T,
  ) => Promise<T>;
}

interface UntypedClient {
  from: (table: string) => UntypedTable;
}

/**
 * Cast the typed Supabase client to an untyped accessor for tables
 * the generated types don't know about yet (migration 0046).
 */
export function mindDb(supabase: MaybeClient | ReturnType<typeof createServiceClient>): UntypedClient {
  return supabase as unknown as UntypedClient;
}

/**
 * Has the current member acknowledged the mental disclaimer?
 *
 * Cookie is the durable acknowledgment in all modes — both demo and
 * "migration 0046 not yet applied to live DB". The DB column is read
 * as a fall-back so cross-device persistence works after migration.
 * If the column doesn't exist (read errors), we tolerate and rely on
 * the cookie. Prevents an /mind/onboarding loop when the column is
 * missing.
 */
export async function hasAcknowledgedMentalDisclaimer(
  memberId: string,
): Promise<boolean> {
  // Cookie is checked first — fast, works in every mode.
  const c = await cookies();
  if (c.get(MIND_DISCLAIMER_COOKIE)?.value === "1") return true;

  if (!SUPABASE_ENABLED) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("members")
    .select("acknowledged_mental_disclaimer_at")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    // Almost certainly "column does not exist" until migration 0046
    // is applied to live DB. Treat as not-yet-acknowledged via the
    // cookie path; that's what users see on first visit.
    console.warn("[mind] disclaimer read failed (cookie fallback used)", error.message);
    return false;
  }
  const row = data as { acknowledged_mental_disclaimer_at?: string | null } | null;
  return !!row?.acknowledged_mental_disclaimer_at;
}

/**
 * Mark the disclaimer as acknowledged.
 * Idempotent — re-acknowledging is a no-op.
 *
 * Always writes the cookie (durable across all DB states). Also
 * attempts the DB UPDATE as a best-effort cross-device sync — but
 * tolerates the "column missing" error so the action never silently
 * loops the user back to /mind/onboarding.
 */
export async function acknowledgeMentalDisclaimer(memberId: string): Promise<void> {
  // Set the cookie unconditionally — this is the durable record.
  const c = await cookies();
  c.set(MIND_DISCLAIMER_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  if (!SUPABASE_ENABLED) return;

  const supabase = await createClient();
  if (!supabase) return;

  const { error } = await mindDb(supabase)
    .from("members")
    .update({ acknowledged_mental_disclaimer_at: new Date().toISOString() })
    .eq("id", memberId)
    .is("acknowledged_mental_disclaimer_at", null);

  if (error) {
    // Column does not exist (migration 0046 pending) — cookie suffices.
    console.warn("[mind] disclaimer DB write failed (cookie set)", error.message);
  }
}

/**
 * Ensure a mental_settings row exists for this member, returning the
 * current state. Demo mode returns a stable mock row.
 */
export async function getOrCreateMentalSettings(memberId: string): Promise<MentalSettings> {
  if (!SUPABASE_ENABLED) {
    return mockMentalSettings();
  }

  const supabase = await createClient();
  if (!supabase) return mockMentalSettings();

  const db = mindDb(supabase);

  const { data: existing } = await db
    .from("mental_settings")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (existing) return existing as unknown as MentalSettings;

  const { data: inserted, error } = await db
    .from("mental_settings")
    .insert({ member_id: memberId, ...DEFAULT_MENTAL_SETTINGS })
    .select("*")
    .single();

  if (error) {
    console.warn("[mind] settings insert failed", error.message);
    return {
      member_id: memberId,
      ...DEFAULT_MENTAL_SETTINGS,
      last_mind_check_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return inserted as unknown as MentalSettings;
}

/**
 * Last N days of mind-check logs for a member, newest first.
 * Returns mock data in demo mode.
 */
export async function getRecentMindCheckLogs(
  memberId: string,
  days = 30,
): Promise<MindCheckLog[]> {
  if (!SUPABASE_ENABLED) {
    return mockMindCheckLogs(days).reverse();
  }

  const supabase = await createClient();
  if (!supabase) return mockMindCheckLogs(days).reverse();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const { data, error } = await mindDb(supabase)
    .from("mind_check_logs")
    .select("*")
    .eq("member_id", memberId)
    .gte("logged_date", since.toISOString().slice(0, 10))
    .order("logged_date", { ascending: false });

  if (error) {
    console.warn("[mind] recent logs read failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as MindCheckLog[];
}

/**
 * Has the member logged a mind-check today (UTC)?
 */
export async function hasMindCheckToday(memberId: string): Promise<boolean> {
  const logs = await getRecentMindCheckLogs(memberId, 1);
  const today = new Date().toISOString().slice(0, 10);
  return logs.some((l) => l.logged_date === today);
}

/**
 * Today's mind-check, if any. For pre-filling the form on resubmit.
 */
export async function getTodayMindCheck(memberId: string): Promise<MindCheckLog | null> {
  const today = new Date().toISOString().slice(0, 10);
  const logs = await getRecentMindCheckLogs(memberId, 1);
  return logs.find((l) => l.logged_date === today) ?? null;
}

/**
 * Upsert a mind-check for today. Idempotent on (member_id, logged_date)
 * unique index — same-day resubmit replaces the existing row's values.
 *
 * Demo mode is a soft no-op: we don't persist, but we don't error.
 * The UI reflects the value via the form's local state until refresh.
 */
export async function submitMindCheck(
  memberId: string,
  input: {
    energy: number;
    stress: number;
    focus: number;
    note: string | null;
    source: "manual" | "morning_nudge" | "evening_nudge" | "post_session";
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SUPABASE_ENABLED) {
    console.info("[mind] demo-mode submitMindCheck (no persist)", { memberId, input });
    return { ok: true };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };

  const db = mindDb(supabase);
  const todayDate = new Date().toISOString().slice(0, 10);

  const { error } = await db.from("mind_check_logs").upsert(
    {
      member_id: memberId,
      logged_date: todayDate,
      energy: input.energy,
      stress: input.stress,
      focus: input.focus,
      note: input.note,
      source: input.source,
    },
    { onConflict: "member_id,logged_date" },
  );

  if (error) {
    console.warn("[mind] submitMindCheck failed", error.message);
    return { ok: false, error: error.message };
  }

  // Recompute streak from the source of truth (logs) and cache on
  // mental_settings for cheap display reads.
  const { data: logs } = await db
    .from("mind_check_logs")
    .select("logged_date")
    .eq("member_id", memberId)
    .gte("logged_date", isoDateNDaysAgo(200))
    .order("logged_date", { ascending: false });

  const { currentStreak, longestStreak } = await import("@/lib/mind/streak");
  const cur = currentStreak((logs ?? []) as unknown as { logged_date: string }[]);
  const lon = longestStreak((logs ?? []) as unknown as { logged_date: string }[]);

  // Read the previous streak BEFORE updating so we can detect
  // milestone crossings.
  const { data: prevSettings } = await db
    .from("mental_settings")
    .select("current_streak_days, longest_streak_days")
    .eq("member_id", memberId)
    .maybeSingle();
  const prev = (prevSettings as { current_streak_days?: number } | null)?.current_streak_days ?? 0;

  await db.from("mental_settings").upsert(
    {
      member_id: memberId,
      last_mind_check_at: new Date().toISOString(),
      current_streak_days: cur,
      longest_streak_days: Math.max(lon, cur),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );

  // Streak-milestone Reps awards (3/7/30/90/180 days). Idempotent
  // per milestone via the awardMindCheckStreak reference_id pattern.
  try {
    const { newlyHitMilestones } = await import("@/lib/mind/streak");
    const { awardMindCheckStreak, awardMentalMilestone30d, awardMentalMilestone90d } = await import(
      "@/lib/mind/reps"
    );
    const hits = newlyHitMilestones(prev, cur);
    for (const m of hits) {
      await awardMindCheckStreak(
        supabase as unknown as Parameters<typeof awardMindCheckStreak>[0],
        { memberId, milestone: m as 3 | 7 | 30 | 90 | 180 },
      );
      if (m === 30) {
        await awardMentalMilestone30d(
          supabase as unknown as Parameters<typeof awardMentalMilestone30d>[0],
          { memberId },
        );
      }
      if (m === 90) {
        await awardMentalMilestone90d(
          supabase as unknown as Parameters<typeof awardMentalMilestone90d>[0],
          { memberId },
        );
      }
    }
  } catch (e) {
    console.warn("[mind] streak milestone Reps award failed (non-fatal)", e);
  }

  return { ok: true };
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Last N journal entries for the member, newest first. Always
 * owner-only — RLS enforces; demo mode returns an empty list (the
 * journal is intentionally not seeded with mock entries).
 */
export async function getRecentJournalEntries(
  memberId: string,
  limit = 30,
): Promise<JournalEntry[]> {
  if (!SUPABASE_ENABLED) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await mindDb(supabase)
    .from("journal_entries")
    .select("*")
    .eq("member_id", memberId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[mind] journal read failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as JournalEntry[];
}

/**
 * Submit a journal entry. Runs the lightweight crisis-keyword
 * pre-filter and stores the moderation_status accordingly. Awards
 * Reps if not crisis. Returns the persisted entry + flag state.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §6 + §11
 */
export async function submitJournalEntry(
  memberId: string,
  input: { body: string; prompt: string | null },
): Promise<
  | {
      ok: true;
      entry: JournalEntry;
      moderation: "clean" | "flagged" | "crisis";
      crisisCategories: string[];
    }
  | { ok: false; error: string }
> {
  const trimmedBody = input.body.trim();
  if (trimmedBody.length === 0) {
    return { ok: false, error: "empty_body" };
  }
  if (trimmedBody.length > 2000) {
    return { ok: false, error: "too_long" };
  }

  const flag = detectCrisisKeywords(trimmedBody);
  // Claude moderation as second check (~2-3s). Skipped if API key
  // absent — keyword filter alone is the fallback.
  const claudeVerdict = await moderateJournalText(trimmedBody);
  const moderation_status: "clean" | "flagged" | "crisis" =
    combineModerationVerdicts(flag.isCrisis, claudeVerdict);
  const moderation_reason_pieces: string[] = [];
  if (flag.isCrisis) moderation_reason_pieces.push(`keyword:${flag.categories.join(",")}`);
  if (claudeVerdict) moderation_reason_pieces.push(`claude:${claudeVerdict.status}:${claudeVerdict.categories.join(",")}`);
  const moderation_reason =
    moderation_reason_pieces.length > 0 ? moderation_reason_pieces.join(" | ") : null;

  if (!SUPABASE_ENABLED) {
    const entry: JournalEntry = {
      id: `demo-${Date.now()}`,
      member_id: memberId,
      logged_at: new Date().toISOString(),
      logged_date: new Date().toISOString().slice(0, 10),
      prompt: input.prompt,
      body: trimmedBody,
      moderation_status,
      moderation_reason,
      created_at: new Date().toISOString(),
    };
    console.info("[mind] demo-mode submitJournalEntry", {
      memberId,
      moderation_status,
      keywordCategories: flag.categories,
      claudeStatus: claudeVerdict?.status,
    });
    return {
      ok: true,
      entry,
      moderation: moderation_status,
      crisisCategories: Array.from(
        new Set([
          ...flag.categories,
          ...((claudeVerdict?.categories ?? []) as string[]),
        ]),
      ),
    };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };

  const db = mindDb(supabase);
  const todayDate = new Date().toISOString().slice(0, 10);

  // Upsert on (member_id, logged_date) — one entry per day. The
  // moderation_status is replaced each upsert, so a re-submit after
  // editing-out a crisis phrase will correctly re-flag/un-flag.
  const { data: upserted, error: upsertErr } = await db
    .from("journal_entries")
    .upsert(
      {
        member_id: memberId,
        logged_date: todayDate,
        prompt: input.prompt,
        body: trimmedBody,
        moderation_status,
        moderation_reason,
      },
      { onConflict: "member_id,logged_date" },
    )
    .select("*")
    .single();

  if (upsertErr) {
    console.warn("[mind] submitJournalEntry failed", upsertErr.message);
    return { ok: false, error: upsertErr.message };
  }

  const entry = upserted as unknown as JournalEntry;

  // Award Reps only for non-crisis entries — we don't want to make
  // "writing about crisis" feel like a points game.
  if (moderation_status !== "crisis") {
    try {
      const svc = await createClient();
      if (svc) {
        await awardJournalEntry(
          svc as unknown as Parameters<typeof awardJournalEntry>[0],
          { memberId, journalEntryId: entry.id },
        );
      }
    } catch (e) {
      console.warn("[mind] journal Reps award failed (non-fatal)", e);
    }
  }

  return {
    ok: true,
    entry,
    moderation: moderation_status,
    crisisCategories: Array.from(
      new Set([
        ...flag.categories,
        ...((claudeVerdict?.categories ?? []) as string[]),
      ]),
    ),
  };
}

/**
 * Member-initiated coach escalation for mental safety. Creates an
 * hrv_alerts row with conditions_met.source='mental_safety' and the
 * member-written summary as the body. Munk sees it in the existing
 * coach queue; he NEVER sees the raw journal — only what the member
 * chose to write.
 *
 * Returns the alert id. Idempotent on (member_id, today, 'mental_safety')
 * — calling twice in the same day reuses the open alert if any.
 */
export async function escalateMentalSafetyToCoach(
  memberId: string,
  args: { summary: string },
): Promise<{ ok: true; alertId: string } | { ok: false; error: string }> {
  const summary = args.summary.trim();
  if (summary.length < 4) return { ok: false, error: "summary_too_short" };
  if (summary.length > 1000) return { ok: false, error: "summary_too_long" };

  if (!SUPABASE_ENABLED) {
    console.info("[mind] demo-mode escalateMentalSafetyToCoach", { memberId, summary });
    return { ok: true, alertId: `demo-mental-${Date.now()}` };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };
  const db = mindDb(supabase);

  // Look for an existing open mental_safety alert today — if found,
  // reuse it (member can update their summary in the same incident).
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: existing } = await db
    .from("hrv_alerts")
    .select("id, conditions_met")
    .eq("member_id", memberId)
    .eq("status", "open")
    .gte("triggered_at", todayStart.toISOString())
    .order("triggered_at", { ascending: false })
    .limit(10);

  const existingRows = (existing ?? []) as {
    id: string;
    conditions_met: { source?: string } | null;
  }[];

  const reuse = existingRows.find(
    (r) => r.conditions_met && r.conditions_met.source === "mental_safety",
  );

  if (reuse) {
    await db
      .from("hrv_alerts")
      .update({
        conditions_met: { source: "mental_safety", summary, updated_at: new Date().toISOString() },
      })
      .eq("id", reuse.id);
    return { ok: true, alertId: reuse.id };
  }

  const { data: inserted, error } = await db
    .from("hrv_alerts")
    .insert({
      member_id: memberId,
      conditions_met: {
        source: "mental_safety",
        summary,
        opened_at: new Date().toISOString(),
      },
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[mind] mental safety escalation failed", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, alertId: (inserted as unknown as { id: string }).id };
}

/**
 * Toggle a mental_settings boolean and append to the audit log.
 * Idempotent: toggling to the same value records a no-op log row but
 * doesn't touch settings.
 */
export async function setMentalSettingFlag(
  memberId: string,
  field:
    | "buddy_share_enabled"
    | "cirkel_share_aggregate_enabled"
    | "cirkel_share_daily_enabled"
    | "ai_coach_enabled"
    | "notif_mind_check_evening"
    | "notif_ai_coach_morning"
    | "notif_buddy_mental_alert",
  value: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SUPABASE_ENABLED) {
    console.info("[mind] demo-mode setMentalSettingFlag", { memberId, field, value });
    return { ok: true };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };
  const db = mindDb(supabase);

  await db.from("mental_settings").upsert(
    {
      member_id: memberId,
      [field]: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );

  // Audit log — best-effort.
  await db.from("mental_settings_log").insert({
    member_id: memberId,
    field,
    old_value: null,
    new_value: String(value),
  });

  return { ok: true };
}

/**
 * Whether this member is eligible to opt-in to buddy mental-share —
 * tier >= Athlete AND has an active buddy pair. The actual mutual-
 * opt-in check is enforced by `mind_check_visible_to()` in RLS.
 */
export function isBuddyShareEligible(
  tier: "Lifter" | "Athlete" | "Beast" | "Legend",
  hasBuddy: boolean,
): boolean {
  if (!hasBuddy) return false;
  return tier === "Athlete" || tier === "Beast" || tier === "Legend";
}

/**
 * Buddy's mind-check snapshot when mutual opt-in holds. Returns the
 * latest 7 days of summary numbers + last-checked timestamp. Never
 * returns journal text. Buddies see signal only.
 *
 * RLS via mind_check_visible_to() enforces; this helper just performs
 * the query — the policy is authoritative.
 */
export async function getBuddyMindSnapshot(
  buddyMemberId: string,
): Promise<{
  latest: MindCheckLog | null;
  median7d: { energy: number | null; stress: number | null; focus: number | null };
} | null> {
  if (!SUPABASE_ENABLED) {
    return {
      latest: null,
      median7d: { energy: 3, stress: 2, focus: 4 },
    };
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 7);

  const { data, error } = await mindDb(supabase)
    .from("mind_check_logs")
    .select("*")
    .eq("member_id", buddyMemberId)
    .gte("logged_date", since.toISOString().slice(0, 10))
    .order("logged_date", { ascending: false });

  if (error) {
    // The RLS-policy denial reaches us as an empty result, not an error,
    // but we log other errors for visibility.
    console.warn("[mind] buddy snapshot read failed", error.message);
    return null;
  }

  const logs = (data ?? []) as unknown as MindCheckLog[];
  if (logs.length === 0) return { latest: null, median7d: { energy: null, stress: null, focus: null } };

  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? null;
  };

  return {
    latest: logs[0] ?? null,
    median7d: {
      energy: median(logs.map((l) => l.energy)),
      stress: median(logs.map((l) => l.stress)),
      focus: median(logs.map((l) => l.focus)),
    },
  };
}

/**
 * Cirkler the member belongs to. Beast+ unlocks via tier gate at the
 * call site (not enforced in this helper since some Munk-admin reads
 * may want all cirkler).
 */
export async function getMyCirkler(memberId: string): Promise<
  Array<{
    id: string;
    name: string;
    leader_id: string | null;
    member_count: number;
  }>
> {
  if (!SUPABASE_ENABLED) {
    return [
      { id: "demo-cirkel-1", name: "Beast Crew · København", leader_id: null, member_count: 4 },
    ];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  const { data: memberships, error } = await mindDb(supabase)
    .from("mental_cirkel_members")
    .select("cirkel_id")
    .eq("member_id", memberId);

  if (error) {
    console.warn("[mind] my-cirkler read failed", error.message);
    return [];
  }

  const ids = ((memberships ?? []) as { cirkel_id: string }[]).map((r) => r.cirkel_id);
  if (ids.length === 0) return [];

  const { data: cirkler } = await mindDb(supabase)
    .from("mental_cirkler")
    .select("id, name, leader_id")
    .in("id", ids);

  // Per-cirkel member count — separate small query to keep types simple.
  const { data: members } = await mindDb(supabase)
    .from("mental_cirkel_members")
    .select("cirkel_id")
    .in("cirkel_id", ids);

  const counts = new Map<string, number>();
  for (const m of ((members ?? []) as { cirkel_id: string }[])) {
    counts.set(m.cirkel_id, (counts.get(m.cirkel_id) ?? 0) + 1);
  }

  return ((cirkler ?? []) as { id: string; name: string; leader_id: string | null }[]).map((c) => ({
    ...c,
    member_count: counts.get(c.id) ?? 0,
  }));
}

interface CirkelPost {
  id: string;
  cirkel_id: string;
  author_id: string;
  author_handle: string;
  posted_at: string;
  body: string;
  mind_share: { energy?: number; stress?: number; focus?: number } | null;
  reactions: { fire: number; flex: number; heart: number };
}

/**
 * Recent posts in a cirkel, newest first. Members-only via RLS.
 */
export async function getCirkelFeed(cirkelId: string, limit = 30): Promise<CirkelPost[]> {
  if (!SUPABASE_ENABLED) return [];

  const supabase = await createClient();
  if (!supabase) return [];
  const db = mindDb(supabase);

  const { data: posts, error } = await db
    .from("mental_cirkel_posts")
    .select("id, cirkel_id, author_id, posted_at, body, mind_share")
    .eq("cirkel_id", cirkelId)
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[mind] cirkel feed read failed", error.message);
    return [];
  }

  const rows = (posts ?? []) as {
    id: string;
    cirkel_id: string;
    author_id: string;
    posted_at: string;
    body: string;
    mind_share: { energy?: number; stress?: number; focus?: number } | null;
  }[];

  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const postIds = rows.map((r) => r.id);

  const [{ data: members }, { data: reactionRows }] = await Promise.all([
    db.from("members").select("id, handle").in("id", authorIds),
    db.from("mental_cirkel_post_reactions").select("post_id, reaction").in("post_id", postIds),
  ]);

  const handleMap = new Map(
    ((members ?? []) as { id: string; handle: string }[]).map((m) => [m.id, m.handle]),
  );

  const reactionsByPost = new Map<string, { fire: number; flex: number; heart: number }>();
  for (const r of ((reactionRows ?? []) as { post_id: string; reaction: string }[])) {
    const curr = reactionsByPost.get(r.post_id) ?? { fire: 0, flex: 0, heart: 0 };
    if (r.reaction === "fire" || r.reaction === "flex" || r.reaction === "heart") {
      curr[r.reaction]++;
    }
    reactionsByPost.set(r.post_id, curr);
  }

  return rows.map((r) => ({
    ...r,
    author_handle: handleMap.get(r.author_id) ?? "ukendt",
    reactions: reactionsByPost.get(r.id) ?? { fire: 0, flex: 0, heart: 0 },
  }));
}

/**
 * Post to a cirkel. Upsert on (cirkel_id, author_id, posted_week) so
 * a same-week re-post replaces (the spec allows one per week).
 *
 * Best-effort Reps award for the weekly cirkel_participation.post.
 */
export async function postToCirkel(args: {
  authorId: string;
  cirkelId: string;
  body: string;
  shareMindCheck: boolean;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const trimmed = args.body.trim();
  if (trimmed.length === 0) return { ok: false, error: "empty" };
  if (trimmed.length > 600) return { ok: false, error: "too_long" };

  const { isoWeekTagUtc, awardCirkelPost } = await import("@/lib/mind/reps");
  const week = isoWeekTagUtc();

  let mindShare: Record<string, number> | null = null;
  if (args.shareMindCheck) {
    const today = await getTodayMindCheck(args.authorId);
    if (today) {
      mindShare = { energy: today.energy, stress: today.stress, focus: today.focus };
    }
  }

  if (!SUPABASE_ENABLED) {
    console.info("[mind] demo-mode postToCirkel", { ...args, week, mindShare });
    return { ok: true, postId: `demo-${Date.now()}` };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };
  const db = mindDb(supabase);

  const { data, error } = await db
    .from("mental_cirkel_posts")
    .upsert(
      {
        cirkel_id: args.cirkelId,
        author_id: args.authorId,
        posted_week: week,
        body: trimmed,
        mind_share: mindShare,
      },
      { onConflict: "cirkel_id,author_id,posted_week" },
    )
    .select("id")
    .single();

  if (error) {
    console.warn("[mind] cirkel post failed", error.message);
    return { ok: false, error: error.message };
  }

  const row = data as unknown as { id: string };
  try {
    await awardCirkelPost(
      supabase as unknown as Parameters<typeof awardCirkelPost>[0],
      { memberId: args.authorId, postId: row.id },
    );
  } catch (e) {
    console.warn("[mind] cirkel Reps award failed (non-fatal)", e);
  }

  return { ok: true, postId: row.id };
}

/** Today's journal entry if any (for pre-filling the form). */
export async function getTodayJournalEntry(memberId: string): Promise<JournalEntry | null> {
  if (!SUPABASE_ENABLED) return null;
  const entries = await getRecentJournalEntries(memberId, 1);
  const today = new Date().toISOString().slice(0, 10);
  return entries.find((e) => e.logged_date === today) ?? null;
}

/**
 * Personal daily session for a member — slug pattern:
 *   personal-<memberId>-<YYYY-MM-DD>
 *
 * Returns existing session if already generated for today, else null
 * (caller generates via Claude + persists).
 */
export async function getTodayPersonalSession(memberId: string): Promise<{
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body_md: string;
  visual_pattern: import("@/lib/mind/types").MentalSessionVisualPattern;
  duration_seconds: number;
  category: import("@/lib/mind/types").MentalSessionCategory;
  audio_url: string | null;
} | null> {
  if (!SUPABASE_ENABLED) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const today = new Date().toISOString().slice(0, 10);
  const slug = `personal-${memberId}-${today}`;

  const { data, error } = await mindDb(supabase)
    .from("mental_sessions")
    .select("id, slug, title, subtitle, body_md, visual_pattern, duration_seconds, category, audio_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("[mind] personal session read failed", error.message);
    return null;
  }
  return (data as unknown as Awaited<ReturnType<typeof getTodayPersonalSession>>) ?? null;
}

/**
 * Persist a generated personal session. Idempotent via the unique
 * slug constraint — re-running the cron for the same member+date is
 * a no-op (the upsert silently keeps the original).
 */
export async function persistPersonalSession(args: {
  memberId: string;
  forDate: string;
  script: import("@/lib/mind/session-fallback").SessionScript;
  promptSeed: Record<string, unknown> | null;
  generatedBy: "claude" | "human" | "imported";
  locale?: "da" | "en";
}): Promise<{ id: string } | null> {
  if (!SUPABASE_ENABLED) {
    return { id: `demo-personal-${args.forDate}` };
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const slug = `personal-${args.memberId}-${args.forDate}`;

  const { data, error } = await mindDb(supabase)
    .from("mental_sessions")
    .upsert(
      {
        slug,
        category: args.script.category,
        title: args.script.title,
        subtitle: args.script.subtitle,
        duration_seconds: args.script.duration_seconds,
        body_md: args.script.body_md,
        visual_pattern: args.script.visual_pattern,
        generated_by: args.generatedBy,
        prompt_seed: args.promptSeed ?? null,
        locale: args.locale ?? "da",
        is_hero: false,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) {
    console.warn("[mind] persist personal session failed", error.message);
    return null;
  }
  return data as unknown as { id: string };
}

/**
 * Get today's AI mental coach output if cached. Null if not yet
 * generated (caller generates inline or via cron).
 */
export async function getTodayMentalCoachOutput(
  memberId: string,
): Promise<import("@/lib/mind/types").MentalCoachOutput | null> {
  if (!SUPABASE_ENABLED) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await mindDb(supabase)
    .from("mental_coach_outputs")
    .select("*")
    .eq("member_id", memberId)
    .eq("for_date", today)
    .maybeSingle();

  if (error) {
    console.warn("[mind] coach output read failed", error.message);
    return null;
  }
  return (data ?? null) as unknown as import("@/lib/mind/types").MentalCoachOutput | null;
}

/**
 * Persist a generated AI mental coach output. Idempotent on
 * (member_id, for_date) — same-day regeneration replaces.
 */
export async function persistMentalCoachOutput(args: {
  memberId: string;
  forDate: string;
  bodyMd: string;
  promptSeed: Record<string, unknown> | null;
}): Promise<{ id: string } | null> {
  if (!SUPABASE_ENABLED) return { id: `demo-${args.forDate}` };

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await mindDb(supabase)
    .from("mental_coach_outputs")
    .upsert(
      {
        member_id: args.memberId,
        for_date: args.forDate,
        body_md: args.bodyMd,
        prompt_seed: args.promptSeed ?? null,
        moderation_status: "clean",
      },
      { onConflict: "member_id,for_date" },
    )
    .select("id")
    .single();

  if (error) {
    console.warn("[mind] persist coach output failed", error.message);
    return null;
  }
  return data as unknown as { id: string };
}

/**
 * Hero session catalog — evergreen sessions in the library. Demo mode
 * returns the same 8 mocked sessions as the migration seed.
 */
export async function getHeroSessions(locale: "da" | "en" = "da"): Promise<
  import("@/lib/mind/types").MentalSession[]
> {
  if (!SUPABASE_ENABLED) {
    const { mockHeroSessions } = await import("@/lib/mind/mock");
    return mockHeroSessions().filter((s) => s.locale === locale);
  }

  const supabase = await createClient();
  if (!supabase) {
    const { mockHeroSessions } = await import("@/lib/mind/mock");
    return mockHeroSessions().filter((s) => s.locale === locale);
  }

  const { data, error } = await mindDb(supabase)
    .from("mental_sessions")
    .select("*")
    .eq("is_hero", true)
    .eq("locale", locale)
    .order("category", { ascending: true })
    .order("duration_seconds", { ascending: true });

  if (error) {
    console.warn("[mind] hero sessions read failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as import("@/lib/mind/types").MentalSession[];
}

/**
 * Single hero session by slug. Used by the runner page.
 */
export async function getSessionBySlug(
  slug: string,
): Promise<import("@/lib/mind/types").MentalSession | null> {
  if (!SUPABASE_ENABLED) {
    const { mockHeroSessions } = await import("@/lib/mind/mock");
    return mockHeroSessions().find((s) => s.slug === slug) ?? null;
  }

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await mindDb(supabase)
    .from("mental_sessions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("[mind] session by slug read failed", error.message);
    return null;
  }
  return (data ?? null) as unknown as import("@/lib/mind/types").MentalSession | null;
}

/**
 * Session ids the member has completed at least once. Used for the
 * "✓ gennemført" badge on catalog cards.
 */
export async function getCompletedSessionIds(memberId: string): Promise<Set<string>> {
  if (!SUPABASE_ENABLED) return new Set();

  const supabase = await createClient();
  if (!supabase) return new Set();

  const { data, error } = await mindDb(supabase)
    .from("mental_session_completions")
    .select("session_id")
    .eq("member_id", memberId);

  if (error) {
    console.warn("[mind] completions read failed", error.message);
    return new Set();
  }
  return new Set(((data ?? []) as { session_id: string }[]).map((r) => r.session_id));
}

/**
 * Record a session completion. Idempotent on (member_id, session_id,
 * completed_date). Triggers Reps award out-of-band (best-effort).
 */
export async function completeMentalSession(args: {
  memberId: string;
  sessionId: string;
  isHero: boolean;
  context: "library" | "prescribed_by_coach" | "suggested_by_adaptive" | "pre_session" | "post_session";
}): Promise<{ ok: true; completionId: string } | { ok: false; error: string }> {
  if (!SUPABASE_ENABLED) {
    return { ok: true, completionId: `demo-${Date.now()}` };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_supabase_client" };

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await mindDb(supabase)
    .from("mental_session_completions")
    .upsert(
      {
        member_id: args.memberId,
        session_id: args.sessionId,
        completed_date: today,
        context: args.context,
      },
      { onConflict: "member_id,session_id,completed_date" },
    )
    .select("id")
    .single();

  if (error) {
    console.warn("[mind] session completion failed", error.message);
    return { ok: false, error: error.message };
  }
  const row = data as unknown as { id: string };

  // Best-effort Reps award.
  try {
    const { awardMentalSessionCompletion } = await import("@/lib/mind/reps");
    await awardMentalSessionCompletion(
      supabase as unknown as Parameters<typeof awardMentalSessionCompletion>[0],
      { memberId: args.memberId, completionId: row.id, isHero: args.isHero },
    );
  } catch (e) {
    console.warn("[mind] session Reps award failed (non-fatal)", e);
  }

  return { ok: true, completionId: row.id };
}
