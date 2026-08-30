/**
 * Mental Health Pillar (Søjle 5) — hand-typed interfaces mirroring
 * migration 0046. Replace with `supabase gen types` output once user
 * runs `npm run db:types` after 0046 + 0045 are applied against live DB.
 */

export type MindCheckSource = "manual" | "morning_nudge" | "evening_nudge" | "post_session";

export type MentalSessionCategory = "breathing" | "focus" | "recovery" | "debrief";

export type MentalSessionVisualPattern =
  | "box_breath_4_4_4_4"
  | "coherence_5_5"
  | "wave_4_8"
  | "still_focus"
  | "none";

export type MentalSessionCompletionContext =
  | "library"
  | "prescribed_by_coach"
  | "suggested_by_adaptive"
  | "pre_session"
  | "post_session";

export type ModerationStatus = "pending" | "clean" | "flagged" | "crisis";

export type MindCheckLog = {
  id: string;
  member_id: string;
  logged_at: string;
  logged_date: string;
  energy: number;
  stress: number;
  focus: number;
  note: string | null;
  source: MindCheckSource;
  created_at: string;
};

export type JournalEntry = {
  id: string;
  member_id: string;
  logged_at: string;
  logged_date: string;
  prompt: string | null;
  body: string;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  created_at: string;
};

export type MentalSession = {
  id: string;
  slug: string;
  category: MentalSessionCategory;
  title: string;
  subtitle: string | null;
  duration_seconds: number;
  body_md: string;
  visual_pattern: MentalSessionVisualPattern;
  audio_url: string | null;
  voice: string | null;
  generated_by: "claude" | "human" | "imported";
  prompt_seed: Record<string, unknown> | null;
  locale: "da" | "en";
  is_hero: boolean;
  published_at: string | null;
  created_at: string;
};

export type MentalSessionCompletion = {
  id: string;
  member_id: string;
  session_id: string;
  completed_at: string;
  completed_date: string;
  context: MentalSessionCompletionContext | null;
  created_at: string;
};

export type MentalCoachOutput = {
  id: string;
  member_id: string;
  for_date: string;
  body_md: string;
  prompt_seed: Record<string, unknown> | null;
  moderation_status: "clean" | "flagged";
  created_at: string;
};

export type MentalSettings = {
  member_id: string;
  buddy_share_enabled: boolean;
  cirkel_share_aggregate_enabled: boolean;
  cirkel_share_daily_enabled: boolean;
  ai_coach_enabled: boolean;
  notif_mind_check_evening: boolean;
  notif_ai_coach_morning: boolean;
  notif_buddy_mental_alert: boolean;
  last_mind_check_at: string | null;
  current_streak_days: number;
  longest_streak_days: number;
  created_at: string;
  updated_at: string;
};

export type MentalCirkel = {
  id: string;
  name: string;
  leader_id: string | null;
  max_members: number;
  created_at: string;
};

export type MentalCirkelMember = {
  cirkel_id: string;
  member_id: string;
  joined_at: string;
  daily_share_opt_in: boolean;
};

export type MentalSafetyAlertStatus = "open" | "seen" | "closed";

/**
 * Member-authored crisis summary. Never contains journal body.
 * Migration 0057. Coach-readable; member writes own row.
 */
export type MentalSafetyAlert = {
  id: string;
  member_id: string;
  summary: string;
  status: MentalSafetyAlertStatus;
  created_at: string;
  updated_at: string;
};

export type MentalSafetyAlertListItem = MentalSafetyAlert & {
  member_handle: string;
};

/**
 * Aggregate mental signal derived from mind_check_logs — used by
 * Adaptive Engine in MH-6 and AI mental coach in MH-7.
 */
export type MentalSignal = {
  energy_median_7d: number | null;
  stress_median_7d: number | null;
  focus_median_7d: number | null;
  low_for_days: number;
  freshness_days: number;
};

export const DEFAULT_MENTAL_SETTINGS: Omit<
  MentalSettings,
  "member_id" | "created_at" | "updated_at" | "last_mind_check_at"
> = {
  buddy_share_enabled: false,
  cirkel_share_aggregate_enabled: false,
  cirkel_share_daily_enabled: false,
  ai_coach_enabled: true,
  notif_mind_check_evening: true,
  notif_ai_coach_morning: true,
  notif_buddy_mental_alert: true,
  current_streak_days: 0,
  longest_streak_days: 0,
};
