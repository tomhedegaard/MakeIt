/**
 * GDPR art. 20 — fetch member-owned rows under the caller's RLS.
 *
 * User-scoped client only. Never import createServiceClient here:
 * this path is member-triggered and must also work in demo (demo
 * short-circuits before this function).
 */

import type { createClient } from "@/lib/supabase/server";
import {
  type ExportCollectionKey,
  type ExportCollections,
  emptyExportCollections,
  redactPushSubscription,
  redactWearableConnection,
} from "@/lib/privacy/export";

type ServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

type QueryError = { message: string } | null;

async function settle(
  label: ExportCollectionKey | "members",
  query: PromiseLike<{ data: unknown; error: QueryError }>,
): Promise<{ label: string; rows: unknown[]; omitted: boolean }> {
  try {
    const { data, error } = await query;
    if (error) {
      console.warn(`[export] omit ${label}: ${error.message}`);
      return { label, rows: [], omitted: true };
    }
    if (data == null) return { label, rows: [], omitted: false };
    return {
      label,
      rows: Array.isArray(data) ? data : [data],
      omitted: false,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[export] omit ${label}: ${msg}`);
    return { label, rows: [], omitted: true };
  }
}

function asRecords(rows: unknown[]): Record<string, unknown>[] {
  return rows.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null,
  );
}

/**
 * SELECT-own (or participant) under RLS. Failed tables become [] and
 * are listed in `omitted` so the download never claims completeness.
 */
export async function fetchMemberExport(
  supabase: ServerClient,
  userId: string,
): Promise<{
  member: unknown | null;
  collections: ExportCollections;
  omitted: string[];
}> {
  const memberQ = supabase
    .from("members")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const queries: Array<
    Promise<{ label: string; rows: unknown[]; omitted: boolean }>
  > = [
    settle("members", memberQ),
    settle(
      "program_assignments",
      supabase.from("program_assignments").select("*").eq("member_id", userId),
    ),
    settle(
      "sessions",
      supabase
        .from("sessions")
        .select(
          `
        *,
        exercises:session_exercises(
          *,
          sets:session_sets(*)
        )
      `,
        )
        .eq("member_id", userId),
    ),
    settle("posts", supabase.from("posts").select("*").eq("member_id", userId)),
    settle(
      "post_comments",
      supabase.from("post_comments").select("*").eq("member_id", userId),
    ),
    settle(
      "post_reactions",
      supabase.from("post_reactions").select("*").eq("member_id", userId),
    ),
    settle(
      "reps_transactions",
      supabase.from("reps_transactions").select("*").eq("member_id", userId),
    ),
    settle(
      "reward_redemptions",
      supabase.from("reward_redemptions").select("*").eq("member_id", userId),
    ),
    settle(
      "form_checks",
      supabase.from("form_checks").select("*").eq("member_id", userId),
    ),
    settle(
      "tier_events",
      supabase.from("tier_events").select("*").eq("member_id", userId),
    ),
    settle(
      "challenge_participations",
      supabase
        .from("challenge_participants")
        .select("*")
        .eq("member_id", userId),
    ),
    settle(
      "journal_entries",
      supabase.from("journal_entries").select("*").eq("member_id", userId),
    ),
    settle(
      "mind_check_logs",
      supabase.from("mind_check_logs").select("*").eq("member_id", userId),
    ),
    settle(
      "mental_settings",
      supabase.from("mental_settings").select("*").eq("member_id", userId),
    ),
    settle(
      "mental_settings_log",
      supabase.from("mental_settings_log").select("*").eq("member_id", userId),
    ),
    settle(
      "mental_coach_outputs",
      supabase.from("mental_coach_outputs").select("*").eq("member_id", userId),
    ),
    settle(
      "mental_session_completions",
      supabase
        .from("mental_session_completions")
        .select("*")
        .eq("member_id", userId),
    ),
    settle(
      "mental_cirkel_posts",
      supabase.from("mental_cirkel_posts").select("*").eq("author_id", userId),
    ),
    settle(
      "mental_safety_alerts",
      supabase.from("mental_safety_alerts").select("*").eq("member_id", userId),
    ),
    settle(
      "hrv_readings",
      supabase.from("hrv_readings").select("*").eq("member_id", userId),
    ),
    settle(
      "hrv_settings",
      supabase.from("hrv_settings").select("*").eq("member_id", userId),
    ),
    settle(
      "hrv_lifestyle_logs",
      supabase.from("hrv_lifestyle_logs").select("*").eq("member_id", userId),
    ),
    settle(
      "hrv_wearable_connections",
      supabase
        .from("hrv_wearable_connections")
        .select(
          "id, member_id, provider, provider_user_id, token_expires_at, is_primary, status, connected_at, last_synced_at",
        )
        .eq("member_id", userId),
    ),
    settle(
      "hrv_alerts",
      supabase.from("hrv_alerts").select("*").eq("member_id", userId),
    ),
    settle(
      "nutrition_profiles",
      supabase.from("nutrition_profiles").select("*").eq("member_id", userId),
    ),
    settle(
      "nutrition_plans",
      supabase.from("nutrition_plans").select("*").eq("member_id", userId),
    ),
    settle("nutrition_meals", supabase.from("nutrition_meals").select("*")),
    settle(
      "nutrition_logs",
      supabase.from("nutrition_logs").select("*").eq("member_id", userId),
    ),
    settle(
      "nutrition_skip_days",
      supabase.from("nutrition_skip_days").select("*").eq("member_id", userId),
    ),
    settle(
      "conversations",
      supabase
        .from("conversations")
        .select("*")
        .or(`member_id.eq.${userId},coach_id.eq.${userId}`),
    ),
    settle("messages", supabase.from("messages").select("*")),
    settle(
      "weight_logs",
      supabase.from("weight_logs").select("*").eq("member_id", userId),
    ),
    settle(
      "buddy_pairs",
      supabase
        .from("buddy_pairs")
        .select("*")
        .or(`member_a.eq.${userId},member_b.eq.${userId}`),
    ),
    settle(
      "push_subscriptions",
      supabase
        .from("push_subscriptions")
        .select(
          "id, member_id, endpoint, platform, user_agent, created_at, last_seen_at",
        )
        .eq("member_id", userId),
    ),
    settle(
      "member_action_logs",
      supabase.from("member_action_logs").select("*").eq("member_id", userId),
    ),
  ];

  const settled = await Promise.all(queries);
  const collections = emptyExportCollections();
  const omitted: string[] = [];
  let member: unknown | null = null;

  for (const item of settled) {
    if (item.omitted) omitted.push(item.label);
    if (item.label === "members") {
      member = item.rows[0] ?? null;
      continue;
    }
    const key = item.label as ExportCollectionKey;
    if (key === "hrv_wearable_connections") {
      collections[key] = asRecords(item.rows).map(redactWearableConnection);
    } else if (key === "push_subscriptions") {
      collections[key] = asRecords(item.rows).map(redactPushSubscription);
    } else {
      collections[key] = item.rows;
    }
  }

  return { member, collections, omitted };
}
