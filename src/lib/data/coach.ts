import { createClient } from "@/lib/supabase/server";

/* ---------------------------------------------------------------- *
 * Types
 * ---------------------------------------------------------------- */

export type CoachOverview = {
  totalMembers: number;
  activeAssignments: number;
  pendingFormChecks: number;
  sessionsThisWeek: number;
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

export type FormCheckRow = {
  id: string;
  memberId: string;
  memberHandle: string;
  exerciseName: string | null;
  aiScore: number | null;
  aiHeadline: string | null;
  aiPos: string[];
  aiNeg: string[];
  aiFix: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  coachNotes: string | null;
  videoUrl: string | null;       // Time-limited signed playback URL (1h)
  createdAt: string;
};

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
  pendingFormChecks: 4,
  sessionsThisWeek: 642,
};

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

const MOCK_FORM_CHECKS: FormCheckRow[] = [
  {
    id: "fc-1", memberId: "m-nina", memberHandle: "nina_dl",
    exerciseName: "Conventional Deadlift",
    aiScore: 79,
    aiHeadline: "Stærkt løft — hyperekstension på toppen",
    aiPos: ["Bar holder kontakt med kroppen hele vejen op", "Lats engageret fra setup", "God pace — ingen tøven ved knæene"],
    aiNeg: ["Hyperextension i lock-out (læn 5° tilbage)", "Hofte stiger marginalt før skuldrene"],
    aiFix: "Lås ud med squeeze i baller, ikke ved at læne tilbage. Tænk \"stå op\" frem for \"læn tilbage\".",
    reviewedAt: null, reviewedBy: null, coachNotes: null, videoUrl: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
  {
    id: "fc-2", memberId: "m-maria", memberHandle: "maria.lift",
    exerciseName: "Paused Bench",
    aiScore: 87,
    aiHeadline: "Solid pause-bench — kontroller ekscentrisk lidt mere",
    aiPos: ["Solid pause i bunden", "Ben i gulvet hele sættet", "Lige bar-path"],
    aiNeg: ["Lidt for hurtig på vej ned — accelerer i stedet for at kontrollere"],
    aiFix: "Tæl 3 sek på vej ned næste gang. Brug mindre vægt hvis nødvendigt — kvaliteten betyder mere.",
    reviewedAt: null, reviewedBy: null, coachNotes: null, videoUrl: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "fc-3", memberId: "m-kasper", memberHandle: "kasper_s",
    exerciseName: "Back Squat",
    aiScore: 84,
    aiHeadline: "Solid sæt — let knæ-valgus i hullet",
    aiPos: ["Bardepth ramt på alle 3 reps", "Konsistent bar-path", "God spinal kontrol"],
    aiNeg: ["Højre knæ kollapser let indad på rep 2 og 3"],
    aiFix: "Driv knæene aktivt udad i bunden (\"spread the floor\"). Hold 1 sek pause i bunden næste sæt.",
    reviewedAt: null, reviewedBy: null, coachNotes: null, videoUrl: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "fc-4", memberId: "m-frederik", memberHandle: "frederik",
    exerciseName: "Romanian Deadlift",
    aiScore: 72,
    aiHeadline: "Godt forsøg — manglende hofte-engagement",
    aiPos: ["Ryggen flad", "God ROM"],
    aiNeg: ["Bevæger sig mest fra knæene — RDL skal være hofte-dominant", "Bar drifter en smule fremad"],
    aiFix: "Tænk \"skub bagdelen mod væggen\" frem for \"bøj knæene\". Hofterne bagud — knæene holder kun en let bøjning.",
    reviewedAt: null, reviewedBy: null, coachNotes: null, videoUrl: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
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
    formChecks: MOCK_FORM_CHECKS.filter((f) => f.memberId === id),
  };
}

/* ---------------------------------------------------------------- *
 * Public API — fall back to mocks when SUPABASE not configured
 * ---------------------------------------------------------------- */

export async function getCoachOverview(): Promise<CoachOverview> {
  const supabase = await createClient();
  if (!supabase) return MOCK_OVERVIEW;

  const [members, assignments, formChecks, sessions] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("program_assignments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("form_checks").select("id", { count: "exact", head: true }).is("coach_reviewed_at", null),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", weekStart()),
  ]);

  return {
    totalMembers: members.count ?? 0,
    activeAssignments: assignments.count ?? 0,
    pendingFormChecks: formChecks.count ?? 0,
    sessionsThisWeek: sessions.count ?? 0,
  };
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
    supabase.from("form_checks").select("id, exercise_name, ai_score, ai_headline, ai_pos, ai_neg, ai_fix, video_url, coach_reviewed_at, coach_reviewed_by, coach_notes, created_at").eq("member_id", memberId).order("created_at", { ascending: false }).limit(10),
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
    formChecks: (fcRes.data ?? []).map((f) => ({
      id: f.id,
      memberId,
      memberHandle: m.handle,
      exerciseName: f.exercise_name,
      aiScore: f.ai_score,
      aiHeadline: f.ai_headline,
      aiPos: Array.isArray(f.ai_pos) ? (f.ai_pos as string[]) : [],
      aiNeg: Array.isArray(f.ai_neg) ? (f.ai_neg as string[]) : [],
      aiFix: f.ai_fix,
      reviewedAt: f.coach_reviewed_at,
      reviewedBy: f.coach_reviewed_by,
      coachNotes: f.coach_notes,
      videoUrl: f.video_url ? signedByPath.get(f.video_url) ?? null : null,
      createdAt: f.created_at,
    })),
  };
}

export async function getPendingFormChecks(limit = 30): Promise<FormCheckRow[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_FORM_CHECKS;

  const { data } = await supabase
    .from("form_checks")
    .select(`
      id, exercise_name, ai_score, ai_headline, ai_pos, ai_neg, ai_fix,
      video_url, created_at,
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
    return {
      id: f.id,
      memberId: m?.id ?? "",
      memberHandle: m?.handle ?? "—",
      exerciseName: f.exercise_name,
      aiScore: f.ai_score,
      aiHeadline: f.ai_headline,
      aiPos: Array.isArray(f.ai_pos) ? (f.ai_pos as string[]) : [],
      aiNeg: Array.isArray(f.ai_neg) ? (f.ai_neg as string[]) : [],
      aiFix: f.ai_fix,
      reviewedAt: f.coach_reviewed_at,
      reviewedBy: f.coach_reviewed_by,
      coachNotes: f.coach_notes,
      videoUrl: f.video_url ? signedByPath.get(f.video_url) ?? null : null,
      createdAt: f.created_at,
    };
  });
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

/* ---------------------------------------------------------------- */

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // ISO Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
