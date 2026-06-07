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
 * Demo mode: stored in cookie. Connected mode: stored on members row.
 */
export async function hasAcknowledgedMentalDisclaimer(
  memberId: string,
): Promise<boolean> {
  if (!SUPABASE_ENABLED) {
    const c = await cookies();
    return c.get(MIND_DISCLAIMER_COOKIE)?.value === "1";
  }

  const supabase = await createClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("members")
    .select("acknowledged_mental_disclaimer_at")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    console.warn("[mind] disclaimer read failed", error.message);
    return false;
  }
  const row = data as { acknowledged_mental_disclaimer_at?: string | null } | null;
  return !!row?.acknowledged_mental_disclaimer_at;
}

/**
 * Mark the disclaimer as acknowledged.
 * Idempotent — re-acknowledging is a no-op.
 */
export async function acknowledgeMentalDisclaimer(memberId: string): Promise<void> {
  if (!SUPABASE_ENABLED) {
    const c = await cookies();
    c.set(MIND_DISCLAIMER_COOKIE, "1", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return;
  }

  const supabase = await createClient();
  if (!supabase) return;

  const { error } = await mindDb(supabase)
    .from("members")
    .update({ acknowledged_mental_disclaimer_at: new Date().toISOString() })
    .eq("id", memberId)
    .is("acknowledged_mental_disclaimer_at", null);

  if (error) {
    console.warn("[mind] disclaimer ack failed", error.message);
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
      moderation: "clean" | "crisis";
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
  const moderation_status: "clean" | "crisis" = flag.isCrisis ? "crisis" : "clean";

  if (!SUPABASE_ENABLED) {
    const entry: JournalEntry = {
      id: `demo-${Date.now()}`,
      member_id: memberId,
      logged_at: new Date().toISOString(),
      logged_date: new Date().toISOString().slice(0, 10),
      prompt: input.prompt,
      body: trimmedBody,
      moderation_status,
      moderation_reason: flag.isCrisis ? flag.categories.join(",") : null,
      created_at: new Date().toISOString(),
    };
    console.info("[mind] demo-mode submitJournalEntry", {
      memberId,
      moderation_status,
      categories: flag.categories,
    });
    return {
      ok: true,
      entry,
      moderation: moderation_status,
      crisisCategories: flag.categories,
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
        moderation_reason: flag.isCrisis ? flag.categories.join(",") : null,
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
  if (!flag.isCrisis) {
    try {
      const svc = await createClient();
      if (svc) {
        // The award helper is typed against the generated Database — fine to
        // pass the cookie-backed server client; insert RLS allows owner.
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
    crisisCategories: flag.categories,
  };
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
} | null> {
  if (!SUPABASE_ENABLED) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const today = new Date().toISOString().slice(0, 10);
  const slug = `personal-${memberId}-${today}`;

  const { data, error } = await mindDb(supabase)
    .from("mental_sessions")
    .select("id, slug, title, subtitle, body_md, visual_pattern, duration_seconds, category")
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
