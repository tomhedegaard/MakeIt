/**
 * Pure helpers for the GDPR art. 20 export payload.
 *
 * No Supabase, no server-only — the route and data layer assemble
 * rows; this module names keys, redacts secrets, and builds the JSON
 * shape so tests can lock honesty (no "everything" slogan, art. 9
 * tables present, tokens never in the download).
 */

export const EXPORT_COLLECTION_KEYS = [
  "program_assignments",
  "sessions",
  "posts",
  "post_comments",
  "post_reactions",
  "reps_transactions",
  "reward_redemptions",
  "form_checks",
  "tier_events",
  "challenge_participations",
  "journal_entries",
  "mind_check_logs",
  "mental_settings",
  "mental_settings_log",
  "mental_coach_outputs",
  "mental_session_completions",
  "mental_cirkel_posts",
  "mental_safety_alerts",
  "hrv_readings",
  "hrv_settings",
  "hrv_lifestyle_logs",
  "hrv_wearable_connections",
  "hrv_alerts",
  "nutrition_profiles",
  "nutrition_plans",
  "nutrition_meals",
  "nutrition_logs",
  "nutrition_skip_days",
  "conversations",
  "messages",
  "weight_logs",
  "buddy_pairs",
  "push_subscriptions",
  "member_action_logs",
] as const;

export type ExportCollectionKey = (typeof EXPORT_COLLECTION_KEYS)[number];

/** Art. 9 / søjle 5 tables that must appear in the payload. */
export const ART9_EXPORT_KEYS = [
  "journal_entries",
  "mind_check_logs",
  "mental_settings",
  "mental_settings_log",
  "mental_coach_outputs",
  "mental_session_completions",
  "mental_cirkel_posts",
  "mental_safety_alerts",
  "hrv_readings",
  "hrv_settings",
  "hrv_lifestyle_logs",
  "hrv_wearable_connections",
  "hrv_alerts",
  "nutrition_profiles",
  "nutrition_plans",
  "nutrition_meals",
  "nutrition_logs",
  "nutrition_skip_days",
] as const satisfies readonly ExportCollectionKey[];

export const WEARABLE_SECRET_KEYS = ["access_token", "refresh_token"] as const;
export const PUSH_SECRET_KEYS = ["p256dh", "auth"] as const;

export type ExportMode = "connected" | "demo";

export type ExportCollections = Record<ExportCollectionKey, unknown[]>;

export type ExportPayload = {
  exportedAt: string;
  mode: ExportMode;
  note: string;
  omitted: string[];
  member: unknown | null;
} & ExportCollections;

export function emptyExportCollections(): ExportCollections {
  return Object.fromEntries(
    EXPORT_COLLECTION_KEYS.map((key) => [key, []]),
  ) as unknown as ExportCollections;
}

export function redactRowSecrets<T extends Record<string, unknown>>(
  row: T,
  keys: readonly string[],
): T {
  const out = { ...row };
  for (const key of keys) {
    delete out[key];
  }
  return out;
}

export function redactWearableConnection<T extends Record<string, unknown>>(
  row: T,
): T {
  return redactRowSecrets(row, WEARABLE_SECRET_KEYS);
}

export function redactPushSubscription<T extends Record<string, unknown>>(
  row: T,
): T {
  return redactRowSecrets(row, PUSH_SECRET_KEYS);
}

export function buildExportPayload(args: {
  exportedAt: string;
  mode: ExportMode;
  note: string;
  member: unknown | null;
  collections?: Partial<ExportCollections>;
  omitted?: string[];
}): ExportPayload {
  const collections = emptyExportCollections();
  if (args.collections) {
    for (const key of EXPORT_COLLECTION_KEYS) {
      const rows = args.collections[key];
      if (rows) collections[key] = rows;
    }
  }
  return {
    exportedAt: args.exportedAt,
    mode: args.mode,
    note: args.note,
    omitted: args.omitted ?? [],
    member: args.member,
    ...collections,
  };
}

export function isCompletenessSlogan(note: string): boolean {
  const n = note.toLowerCase();
  return (
    n.includes("alt vi gemmer") ||
    n.includes("everything we store") ||
    n.includes("everything we have")
  );
}
