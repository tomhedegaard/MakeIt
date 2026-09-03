import { createClient } from "@/lib/supabase/server";
import type { AlertConditionsMet } from "@/lib/hrv/alert";
import {
  demoFormQueueItems,
  pendingFormQueue,
  type FormQueueItem,
} from "@/lib/form-queue/queue";
import {
  buildNeedsAttention,
  demoNeedsAttention,
  type NeedsAttentionModel,
} from "@/lib/coach/needs-attention";

/* ---------------------------------------------------------------- *
 * Types
 * ---------------------------------------------------------------- */

export type CoachOverview = {
  totalMembers: number;
  activeAssignments: number;
  pendingFormChecks: number;
  sessionsThisWeek: number;
  pendingRedemptions: number;
};

export type PendingRedemption = {
  id: string;
  memberHandle: string;
  memberId: string;
  rewardName: string;
  costReps: number;
  status: "pending" | "approved" | "shipped" | "fulfilled" | "cancelled";
  redeemedAt: string;
};

export type MemberSummary = {
  id: string;
  handle: string;
  tier: string;
  programCode: string | null;
  programWeek: number | null;
  lastSessionDate: string | null;
};

export type SessionRow = {
  id: string;
  dayLabel: string;
  status: "scheduled" | "active" | "completed" | "skipped";
  scheduledFor: string | null;
  completedAt: string | null;
  week: number | null;
};

export type RepsTx = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
};

export type FormCheckRow = FormQueueItem;

export interface HrvAlertRow {
  id: string;
  memberId: string;
  memberHandle: string;
  triggeredAt: string;
  conditionsMet: AlertConditionsMet;
}

/**
 * An open hrv_alerts row that was emitted by the adaptive engine
 * (conditions_met.source = 'adaptive_v0'). Carries enough context for
 * the coach to approve / reject the engine's proposal without
 * additional round-trips.
 */
export interface AdaptiveAlertRow {
  alertId: string;
  modifierId: string;
  memberId: string;
  memberHandle: string;
  triggeredAt: string;
  action:
    | "paused_session"
    | "deload_week_insertion"
    | "escalate_to_coach"
    | "top_set_reduction"
    | "volume_reduction"
    | "exercise_swap_variant"
    | "session_shorten";
  confidence: number | null;
  reasons: string[];
  explanationDa: string;
  sessionId: string | null;
}

const FORM_CHECK_BUCKET = "form-check-videos";

export type MemberDetail = {
  id: string;
  handle: string;
  tier: string;
  joinedAt: string;
  isCoach: boolean;
  goalFocus: string | null;
  experienceLevel: string | null;
  weeklyFrequency: number | null;
  equipmentLevel: string | null;
  maxSquatKg: number | null;
  maxBenchKg: number | null;
  maxDeadliftKg: number | null;
  maxOhpKg: number | null;
  notesInjuries: string | null;
  programCode: string | null;
  programName: string | null;
  programWeek: number | null;
  programWeeks: number | null;
  programStatus: string | null;
  recentSessions: SessionRow[];
  repsBalance: number;
  recentTx: RepsTx[];
  formChecks: FormCheckRow[];
};

/* ---------------------------------------------------------------- *
 * Demo-mode mocks
 * ---------------------------------------------------------------- */

const MOCK_OVERVIEW: CoachOverview = {
  totalMembers: 412,
  activeAssignments: 188,
    pendingFormChecks: pendingFormQueue(MOCK_FORM_CHECKS).length,
  sessionsThisWeek: 642,
  pendingRedemptions: 3,
};

const MOCK_PENDING_REDEMPTIONS: PendingRedemption[] = [
  { id: "rd-mock-1", memberId: "m-nina",   memberHandle: "nina_dl",    rewardName: "Limited Cuff — Olive", costReps: 1200, status: "pending", redeemedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: "rd-mock-2", memberId: "m-kasper", memberHandle: "kasper_s",   rewardName: "1:1 Form-check med Mikael", costReps: 2000, status: "pending", redeemedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "rd-mock-3", memberId: "m-maria",  memberHandle: "maria.lift", rewardName: "Custom-broderet strap", costReps: 3500, status: "approved", redeemedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString() },
];

const MOCK_MEMBERS: MemberSummary[] = [
  { id: "m-nina",     handle: "nina_dl",    tier: "Beast",   programCode: "STR-12", programWeek: 6, lastSessionDate: "2026-05-04" },
  { id: "m-kasper",   handle: "kasper_s",   tier: "Athlete", programCode: "STR-12", programWeek: 8, lastSessionDate: "2026-05-04" },
  { id: "m-maria",    handle: "maria.lift", tier: "Beast",   programCode: "HYP-08", programWeek: 4, lastSessionDate: "2026-05-03" },
  { id: "m-frederik", handle: "frederik",   tier: "Lifter",  programCode: "HYP-08", programWeek: 2, lastSessionDate: "2026-05-02" },
  { id: "m-signe",    handle: "signe",      tier: "Athlete", programCode: "PWR-10", programWeek: 5, lastSessionDate: "2026-05-04" },
  { id: "m-oliver",   handle: "oliver",     tier: "Lifter",  programCode: "STR-12", programWeek: 1, lastSessionDate: "2026-05-01" },
  { id: "m-tobias",   handle: "tobias",     tier: "Athlete", programCode: "DL-06",  programWeek: 3, lastSessionDate: "2026-05-04" },
  { id: "m-anders",   handle: "anders",     tier: "Lifter",  programCode: null,     programWeek: null, lastSessionDate: null },
];

const MOCK_FORM_CHECKS: FormCheckRow[] = demoFormQueueItems();

const MOCK_HRV_ALERTS: HrvAlertRow[] = [
  {
    id: "hrv-nina",
    memberId: "m-nina",
    memberHandle: "nina_dl",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    conditionsMet: {
      warm_up_active: false,
      sustained_low_readiness: { consecutive_days_low: 3 },
      rhr_spike: null,
      lifestyle_flags: {
        sick: false,
        stressed: true,
        short_sleep: true,
        high_alcohol: false,
      },
    },
  },
];

const MOCK_ADAPTIVE_ALERTS: AdaptiveAlertRow[] = [
  {
    alertId: "eng-nina",
    modifierId: "mod-nina",
    memberId: "m-nina",
    memberHandle: "nina_dl",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    action: "top_set_reduction",
    confidence: 0.78,
    reasons: ["hrv_low", "low_feeling"],
    explanationDa:
      "Nattens HRV ligger under båndet — Motoren letter dagens topsæt.",
    sessionId: "sess-2026-05-05",
  },
  {
    alertId: "eng-kasper",
    modifierId: "mod-kasper",
    memberId: "m-kasper",
    memberHandle: "kasper_s",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    action: "escalate_to_coach",
    confidence: 0.71,
    reasons: ["rpe_drift_rising"],
    explanationDa: "RPE er steget over tre pas — stall-flag til Munk.",
    sessionId: null,
  },
];

function memberDetailMock(id: string): MemberDetail | null {
  const summary = MOCK_MEMBERS.find((m) => m.id === id);
  if (!summary) return null;
  return {
    id: summary.id,
    handle: summary.handle,
    tier: summary.tier,
    joinedAt: "2025-11-04",
    isCoach: false,
    goalFocus: summary.programCode === "HYP-08" ? "hypertrophy" : summary.programCode === "DL-06" ? "deadlift_spec" : "strength",
    experienceLevel: summary.tier === "Beast" || summary.tier === "Legend" ? "advanced" : summary.tier === "Athlete" ? "intermediate" : "beginner",
    weeklyFrequency: 4,
    equipmentLevel: "full",
    maxSquatKg: 140, maxBenchKg: 100, maxDeadliftKg: 175, maxOhpKg: 60,
    notesInjuries: summary.handle === "frederik" ? "Lidt ømhed i højre skulder — undgår tunge OHP." : null,
    programCode: summary.programCode,
    programName: summary.programCode === "STR-12" ? "PR-Block" : summary.programCode === "HYP-08" ? "Build Phase" : summary.programCode === "DL-06" ? "Deadlift Specialization" : null,
    programWeek: summary.programWeek,
    programWeeks: summary.programCode === "DL-06" ? 6 : summary.programCode === "HYP-08" ? 8 : 12,
    programStatus: summary.programCode ? "active" : null,
    recentSessions: [
      { id: "s1", dayLabel: "Dag A — Squat",    status: "completed", scheduledFor: "2026-05-04", completedAt: "2026-05-04T18:32:00Z", week: summary.programWeek },
      { id: "s2", dayLabel: "Dag B — Bench",    status: "completed", scheduledFor: "2026-05-02", completedAt: "2026-05-02T18:10:00Z", week: summary.programWeek },
      { id: "s3", dayLabel: "Dag C — Deadlift", status: "scheduled", scheduledFor: "2026-05-06", completedAt: null,                    week: summary.programWeek },
    ],
    repsBalance: 1420,
    recentTx: [
      { id: "t1", delta: 250, reason: "Session completed",   createdAt: "2026-05-04T18:32:00Z" },
      { id: "t2", delta: 250, reason: "Session completed",   createdAt: "2026-05-02T18:10:00Z" },
    ],
    formChecks: MOCK_FORM_CHECKS.filter(
      (f) => f.memberId === id || (id === "mock-munk" && f.memberId === "mock-munk"),
    ),
  };
}

/* ---------------------------------------------------------------- *
 * Public API — fall back to mocks when SUPABASE not configured
 * ---------------------------------------------------------------- */

export async function getCoachOverview(): Promise<CoachOverview> {
  const supabase = await createClient();
  if (!supabase) return MOCK_OVERVIEW;

  const [members, assignments, formChecks, sessions, redemptions] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("program_assignments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("form_checks").select("id", { count: "exact", head: true }).is("coach_reviewed_at", null),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", weekStart()),
    supabase
      .from("reward_redemptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "approved"]),
  ]);

  return {
    totalMembers: members.count ?? 0,
    activeAssignments: assignments.count ?? 0,
    pendingFormChecks: formChecks.count ?? 0,
    sessionsThisWeek: sessions.count ?? 0,
    pendingRedemptions: redemptions.count ?? 0,
  };
}

export async function getPendingRedemptions(limit = 30): Promise<PendingRedemption[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_PENDING_REDEMPTIONS;

  const { data } = await supabase
    .from("reward_redemptions")
    .select(`
      id, reward_name_snapshot, cost_reps, status, redeemed_at,
      member:members(id, handle)
    `)
    .in("status", ["pending", "approved"])
    .order("redeemed_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return data.map((r) => {
    const m = Array.isArray(r.member) ? r.member[0] : r.member;
    return {
      id: r.id,
      memberId: m?.id ?? "",
      memberHandle: m?.handle ?? "—",
      rewardName: r.reward_name_snapshot,
      costReps: r.cost_reps,
      status: r.status as PendingRedemption["status"],
      redeemedAt: r.redeemed_at,
    };
  });
}

export async function getMembersSummary(): Promise<MemberSummary[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_MEMBERS;

  const { data: members } = await supabase
    .from("members")
    .select(`
      id, handle, tier,
      program_assignments!program_assignments_member_id_fkey (
        current_week, status,
        programs:programs (code)
      )
    `)
    .order("handle");

  if (!members) return [];

  // Last completed session per member — separate query for simplicity.
  const { data: lastSessions } = await supabase
    .from("sessions")
    .select("member_id, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const lastByMember = new Map<string, string>();
  for (const s of lastSessions ?? []) {
    if (s.member_id && !lastByMember.has(s.member_id)) {
      lastByMember.set(s.member_id, s.completed_at?.slice(0, 10) ?? "");
    }
  }

  return members.map((m) => {
    const pa = (m.program_assignments as Array<{ current_week: number; status: string; programs: { code: string } | { code: string }[] | null }> | null) ?? [];
    const active = pa.find((p) => p.status === "active");
    const program = active ? (Array.isArray(active.programs) ? active.programs[0] : active.programs) : null;
    return {
      id: m.id,
      handle: m.handle,
      tier: m.tier,
      programCode: program?.code ?? null,
      programWeek: active?.current_week ?? null,
      lastSessionDate: lastByMember.get(m.id) ?? null,
    };
  });
}

export async function getMemberDetail(memberId: string): Promise<MemberDetail | null> {
  const supabase = await createClient();
  if (!supabase) return memberDetailMock(memberId);

  const { data: m } = await supabase
    .from("members")
    .select(`
      id, handle, tier, joined_at, is_coach,
      goal_focus, experience_level, weekly_frequency, equipment_level,
      max_squat_kg, max_bench_kg, max_deadlift_kg, max_ohp_kg, notes_injuries,
      program_assignments!program_assignments_member_id_fkey (
        status, current_week,
        programs:programs (code, name, weeks)
      )
    `)
    .eq("id", memberId)
    .maybeSingle();

  if (!m) return null;

  const pa = (m.program_assignments as Array<{ status: string; current_week: number; programs: { code: string; name: string; weeks: number } | { code: string; name: string; weeks: number }[] | null }> | null) ?? [];
  const active = pa.find((p) => p.status === "active") ?? pa[0];
  const program = active ? (Array.isArray(active.programs) ? active.programs[0] : active.programs) : null;

  const [sessRes, balRes, txRes, fcRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, day_label, status, scheduled_for, completed_at, week")
      .eq("member_id", memberId)
      .order("scheduled_for", { ascending: false })
      .limit(10),
    supabase.from("member_reps_balance").select("balance").eq("member_id", memberId).maybeSingle(),
    supabase.from("reps_transactions").select("id, delta, reason, created_at").eq("member_id", memberId).order("created_at", { ascending: false }).limit(10),
    supabase.from("form_checks").select("id, exercise_name, ai_score, ai_headline, ai_pos, ai_neg, ai_fix, ai_drafted_reply, video_url, coach_reviewed_at, coach_reviewed_by, coach_notes, created_at").eq("member_id", memberId).order("created_at", { ascending: false }).limit(10),
  ]);

  // Sign storage paths in one batch.
  const fcPaths = (fcRes.data ?? [])
    .map((f) => f.video_url)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const signedByPath = await batchSignVideoUrls(supabase, fcPaths);

  return {
    id: m.id,
    handle: m.handle,
    tier: m.tier,
    joinedAt: m.joined_at,
    isCoach: !!m.is_coach,
    goalFocus: m.goal_focus,
    experienceLevel: m.experience_level,
    weeklyFrequency: m.weekly_frequency,
    equipmentLevel: m.equipment_level,
    maxSquatKg: m.max_squat_kg != null ? Number(m.max_squat_kg) : null,
    maxBenchKg: m.max_bench_kg != null ? Number(m.max_bench_kg) : null,
    maxDeadliftKg: m.max_deadlift_kg != null ? Number(m.max_deadlift_kg) : null,
    maxOhpKg: m.max_ohp_kg != null ? Number(m.max_ohp_kg) : null,
    notesInjuries: m.notes_injuries,
    programCode: program?.code ?? null,
    programName: program?.name ?? null,
    programWeek: active?.current_week ?? null,
    programWeeks: program?.weeks ?? null,
    programStatus: active?.status ?? null,
    recentSessions: (sessRes.data ?? []).map((s) => ({
      id: s.id,
      dayLabel: s.day_label ?? "",
      status: s.status,
      scheduledFor: s.scheduled_for,
      completedAt: s.completed_at,
      week: s.week,
    })),
    repsBalance: balRes.data?.balance ?? 0,
    recentTx: (txRes.data ?? []).map((t) => ({
      id: t.id, delta: t.delta, reason: t.reason, createdAt: t.created_at,
    })),
    formChecks: (fcRes.data ?? []).map((f) =>
      toFormCheckRow({
        id: f.id,
        memberId,
        memberHandle: m.handle,
        exerciseName: f.exercise_name,
        aiScore: f.ai_score,
        aiHeadline: f.ai_headline,
        aiPos: Array.isArray(f.ai_pos) ? (f.ai_pos as string[]) : [],
        aiNeg: Array.isArray(f.ai_neg) ? (f.ai_neg as string[]) : [],
        aiFix: f.ai_fix,
        aiDraftedReply: f.ai_drafted_reply,
        reviewedAt: f.coach_reviewed_at,
        reviewedBy: f.coach_reviewed_by,
        coachNotes: f.coach_notes,
        videoUrl: f.video_url ? signedByPath.get(f.video_url) ?? null : null,
        createdAt: f.created_at,
      }),
    ),
  };
}

export async function getPendingFormChecks(limit = 30): Promise<FormCheckRow[]> {
  const supabase = await createClient();
  if (!supabase) return pendingFormQueue(MOCK_FORM_CHECKS);

  const { data } = await supabase
    .from("form_checks")
    .select(`
      id, exercise_name, ai_score, ai_headline, ai_pos, ai_neg, ai_fix,
      ai_drafted_reply, video_url, created_at,
      coach_reviewed_at, coach_reviewed_by, coach_notes,
      member:members(id, handle)
    `)
    .is("coach_reviewed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Sign storage paths in a single batch where possible.
  const paths = data
    .map((f) => f.video_url)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const signedByPath = await batchSignVideoUrls(supabase, paths);

  return data.map((f) => {
    const m = Array.isArray(f.member) ? f.member[0] : f.member;
    return toFormCheckRow({
      id: f.id,
      memberId: m?.id ?? "",
      memberHandle: m?.handle ?? "—",
      exerciseName: f.exercise_name,
      aiScore: f.ai_score,
      aiHeadline: f.ai_headline,
      aiPos: Array.isArray(f.ai_pos) ? (f.ai_pos as string[]) : [],
      aiNeg: Array.isArray(f.ai_neg) ? (f.ai_neg as string[]) : [],
      aiFix: f.ai_fix,
      aiDraftedReply: f.ai_drafted_reply,
      reviewedAt: f.coach_reviewed_at,
      reviewedBy: f.coach_reviewed_by,
      coachNotes: f.coach_notes,
      videoUrl: f.video_url ? signedByPath.get(f.video_url) ?? null : null,
      createdAt: f.created_at,
    });
  });
}

export async function getOpenHrvAlerts(limit = 30): Promise<HrvAlertRow[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_HRV_ALERTS;

  // Fetch all open alerts and filter out adaptive-engine + leftover
  // mental_safety payloads in TS. Mental safety no longer writes
  // hrv_alerts (0057); the filter is defense against any leftover rows.
  const { data } = await supabase
    .from("hrv_alerts")
    .select("id, triggered_at, conditions_met, member:members!inner(id, handle)")
    .eq("status", "open")
    .order("triggered_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return data
    .filter((a) => {
      const cm = a.conditions_met as { source?: string } | null;
      return cm?.source !== "adaptive_v0" && cm?.source !== "mental_safety";
    })
    .map((a) => {
      const m = Array.isArray(a.member) ? a.member[0] : a.member;
      return {
        id: a.id as string,
        memberId: m?.id ?? "",
        memberHandle: m?.handle ?? "—",
        triggeredAt: a.triggered_at as string,
        conditionsMet: a.conditions_met as unknown as AlertConditionsMet,
      };
    });
}

/**
 * Adaptive-engine alerts awaiting Munk's review. Joins back to the
 * `hrv_session_modifiers` row via the existing `session_modifier_id`
 * FK so the coach UI can render the action, the explanation, and the
 * session it targets without additional queries.
 *
 * Filters to `status='open'` (idempotency) and `reviewed_by IS NULL`
 * on the modifier — once a coach signs off, the alert disappears
 * from this queue regardless of approve/reject choice.
 *
 * Mirrors the shape + auth model of getOpenHrvAlerts; RLS
 * `coach_manages_alerts for all using is_current_user_coach()`
 * authorises the read.
 */
export async function getOpenAdaptiveAlerts(
  limit = 30
): Promise<AdaptiveAlertRow[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_ADAPTIVE_ALERTS;

  // Two-step fetch — PostgREST struggles to infer the alert→modifier
  // join shape (the FK lives on hrv_alerts but the relationship
  // doesn't surface cleanly through embedded select), so we fetch
  // alerts first and the matching modifiers in a single batch.
  const { data: alertRows } = await supabase
    .from("hrv_alerts")
    .select(
      "id, triggered_at, conditions_met, session_modifier_id, member:members!inner(id, handle)"
    )
    .eq("status", "open")
    .not("session_modifier_id", "is", null)
    .order("triggered_at", { ascending: false })
    .limit(limit);
  if (!alertRows) return [];

  // Filter early to adaptive_v0 only — saves the second round-trip
  // when the queue is mostly legacy detect-alerts.
  type AlertCondShape = {
    source?: string;
    action?: AdaptiveAlertRow["action"];
    confidence?: number | null;
    reasons?: string[];
    explanation_da?: string;
    session_id?: string | null;
  };
  const adaptiveAlerts = alertRows.filter((a) => {
    const cm = a.conditions_met as AlertCondShape | null;
    return cm?.source === "adaptive_v0";
  });
  if (adaptiveAlerts.length === 0) return [];

  const modifierIds = adaptiveAlerts
    .map((a) => a.session_modifier_id as string | null)
    .filter((id): id is string => id !== null);
  if (modifierIds.length === 0) return [];

  const { data: modifierRows } = await supabase
    .from("hrv_session_modifiers")
    .select("id, reviewed_by, session_id")
    .in("id", modifierIds);
  const modifiersById = new Map<
    string,
    { reviewed_by: string | null; session_id: string | null }
  >();
  for (const m of modifierRows ?? []) {
    modifiersById.set(m.id as string, {
      reviewed_by: (m.reviewed_by as string | null) ?? null,
      session_id: (m.session_id as string | null) ?? null,
    });
  }

  const rows: AdaptiveAlertRow[] = [];
  for (const a of adaptiveAlerts) {
    const cm = a.conditions_met as AlertCondShape | null;
    if (!cm) continue;

    const memberArr = Array.isArray(a.member) ? a.member[0] : a.member;
    const modifierId = a.session_modifier_id as string | null;
    if (!modifierId) continue;
    const mod = modifiersById.get(modifierId);
    if (!mod || mod.reviewed_by !== null) continue;

    rows.push({
      alertId: a.id as string,
      modifierId,
      memberId: memberArr?.id ?? "",
      memberHandle: memberArr?.handle ?? "—",
      triggeredAt: a.triggered_at as string,
      action: cm.action ?? "escalate_to_coach",
      confidence: cm.confidence ?? null,
      reasons: Array.isArray(cm.reasons) ? cm.reasons : [],
      explanationDa: cm.explanation_da ?? "",
      sessionId: cm.session_id ?? mod.session_id ?? null,
    });
  }
  return rows;
}

/**
 * Generate signed URLs for an array of storage paths (1-hour expiry).
 * Uses createSignedUrls (plural) when supported, falls back to per-path.
 */
async function batchSignVideoUrls(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  paths: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  try {
    const { data } = await supabase.storage
      .from(FORM_CHECK_BUCKET)
      .createSignedUrls(paths, 3600);
    if (data) {
      for (const item of data) {
        if (item.path && item.signedUrl) {
          result.set(item.path, item.signedUrl);
        }
      }
    }
  } catch {
    // Fallback: sign one by one. Slower but tolerant of any single
    // failed path (e.g. file deleted) so the rest still play.
    for (const p of paths) {
      try {
        const { data } = await supabase.storage
          .from(FORM_CHECK_BUCKET)
          .createSignedUrl(p, 3600);
        if (data?.signedUrl) result.set(p, data.signedUrl);
      } catch {
        // skip
      }
    }
  }
  return result;
}

export async function getNeedsAttentionModel(): Promise<NeedsAttentionModel> {
  const supabase = await createClient();
  if (!supabase) return demoNeedsAttention();

  const [pending, adaptive, hrv, skipped] = await Promise.all([
    getPendingFormChecks(50),
    getOpenAdaptiveAlerts(50),
    getOpenHrvAlerts(50),
    getRecentSkippedSessions(20),
  ]);

  return buildNeedsAttention({
    skipped,
    pendingForm: pending.map((f) => ({
      id: f.id,
      memberId: f.memberId,
      memberHandle: f.memberHandle,
      exerciseName: f.exerciseName,
      setIndex: f.setIndex,
    })),
    engineFlags: [
      ...adaptive.map((a) => ({
        id: a.alertId,
        memberId: a.memberId,
        memberHandle: a.memberHandle,
        lift: null,
        detail: a.action.replace(/_/g, " "),
        href: `/coach/queue#engine-${a.alertId}`,
      })),
      ...hrv.map((a) => ({
        id: a.id,
        memberId: a.memberId,
        memberHandle: a.memberHandle,
        lift: null,
        detail: a.conditionsMet.sustained_low_readiness
          ? `HRV · ${a.conditionsMet.sustained_low_readiness.consecutive_days_low} dage lav`
          : "HRV-flag",
        href: `/coach/queue#engine-${a.id}`,
      })),
    ],
  });
}

export async function getRecentSkippedSessions(limit = 20): Promise<
  Array<{
    id: string;
    memberId: string;
    memberHandle: string;
    lift?: string | null;
    detail: string;
  }>
> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("sessions")
    .select("id, day_label, member:members!inner(id, handle)")
    .eq("status", "skipped")
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return data.map((s) => {
    const m = Array.isArray(s.member) ? s.member[0] : s.member;
    return {
      id: s.id as string,
      memberId: m?.id ?? "",
      memberHandle: m?.handle ?? "—",
      lift: (s.day_label as string | null) ?? null,
      detail: (s.day_label as string | null) ?? "sprunget pas",
    };
  });
}

function parseSetIndex(exerciseName: string | null): {
  name: string;
  setIndex: number;
} {
  const raw = exerciseName ?? "Form-check";
  const match = raw.match(/^(.*?)(?:\s*·\s*sæt\s+(\d+))$/i);
  if (!match) return { name: raw, setIndex: 0 };
  return { name: match[1].trim(), setIndex: Number(match[2]) };
}

function toFormCheckRow(input: {
  id: string;
  memberId: string;
  memberHandle: string;
  exerciseName: string | null;
  aiScore: number | null;
  aiHeadline: string | null;
  aiPos: string[];
  aiNeg: string[];
  aiFix: string | null;
  aiDraftedReply: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  coachNotes: string | null;
  videoUrl: string | null;
  createdAt: string;
}): FormCheckRow {
  const parsed = parseSetIndex(input.exerciseName);
  return {
    id: input.id,
    type: "form_check",
    memberId: input.memberId,
    memberHandle: input.memberHandle,
    exerciseName: parsed.name,
    setIndex: parsed.setIndex,
    sessionId: null,
    status: input.reviewedAt ? "reviewed" : "pending",
    reviewedAt: input.reviewedAt,
    reviewedBy: input.reviewedBy,
    coachNotes: input.coachNotes,
    voiceNoteUrl: null,
    voiceNoteDurationSec: null,
    aiScore: input.aiScore,
    aiHeadline: input.aiHeadline,
    aiPos: input.aiPos,
    aiNeg: input.aiNeg,
    aiFix: input.aiFix,
    aiDraftedReply: input.aiDraftedReply,
    videoUrl: input.videoUrl,
    createdAt: input.createdAt,
  };
}

/* ---------------------------------------------------------------- */

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // ISO Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
