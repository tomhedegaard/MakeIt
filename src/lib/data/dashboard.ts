import { createClient } from "@/lib/supabase/server";

/**
 * Data fetchers for the Today / dashboard view.
 * All functions return null when Supabase is disabled (demo mode);
 * callers fall back to mock data in that case.
 */

export type TodayCard = {
  id: string;
  programCode: string;
  programName?: string;
  week: number;
  isDeload: boolean;
  dayLabel: string;
  title: string;
  estimatedMinutes: number;
  exerciseCount: number;
  setCount: number;
  exercises: { name: string; setCount: number }[];
};

export type UpcomingSession = {
  id: string;
  scheduledFor: string | null;
  dayLabel: string;
  title: string;
  estimatedMinutes: number;
};

export type CrewItem = {
  id: string;
  who: string;
  tier: string;
  what: string;
  when: string;
  pr: boolean;
};

export type MemberStats = {
  /** Volume (kg) lifted in the rolling last 28 days */
  volumeKg: number;
  /** Volume (kg) in the previous 28-56 day window, for trend */
  volumeKgPrev: number;
  /** PR count in the rolling last 28 days */
  prs4w: number;
  /** PR count in the previous 28-56 day window */
  prsPrev: number;
  /** Reps balance, all-time (existing) */
  repsBalance: number;
  /** Consecutive completed scheduled sessions ending today */
  streakDays: number;
};

type SessionRow = {
  id: string;
  week: number | null;
  day_label: string | null;
  title: string;
  estimated_minutes: number | null;
  scheduled_for: string | null;
  program: { code: string; name: string } | { code: string; name: string }[] | null;
  exercises: {
    id: string;
    exercise_name: string;
    sets: { id: string }[];
  }[];
};

function unwrapProgram(p: SessionRow["program"]) {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export async function getTodayCard(memberId: string): Promise<TodayCard | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id, week, day_label, title, estimated_minutes, scheduled_for,
      program:programs(code, name),
      exercises:session_exercises(id, exercise_name, sets:session_sets(id))
    `
    )
    .eq("member_id", memberId)
    .in("status", ["scheduled", "active"])
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle<SessionRow>();

  if (error || !data) return null;

  const exercises = data.exercises ?? [];
  const setCount = exercises.reduce((a, e) => a + (e.sets?.length ?? 0), 0);
  const program = unwrapProgram(data.program);

  const week = data.week ?? 1;
  return {
    id: data.id,
    programCode: program?.code ?? "—",
    programName: program?.name,
    week,
    isDeload: week > 0 && week % 4 === 0,
    dayLabel: data.day_label ?? "",
    title: data.title,
    estimatedMinutes: data.estimated_minutes ?? 0,
    exerciseCount: exercises.length,
    setCount,
    exercises: exercises.map((e) => ({
      name: e.exercise_name,
      setCount: e.sets?.length ?? 0,
    })),
  };
}

export async function getUpcomingSessions(
  memberId: string,
  limit = 3
): Promise<UpcomingSession[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Skip the active/today's session — we want sessions AFTER today.
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("sessions")
    .select("id, scheduled_for, day_label, title, estimated_minutes")
    .eq("member_id", memberId)
    .eq("status", "scheduled")
    .gt("scheduled_for", today)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    scheduledFor: d.scheduled_for,
    dayLabel: d.day_label ?? "",
    title: d.title,
    estimatedMinutes: d.estimated_minutes ?? 0,
  }));
}

export async function getRecentFeed(limit = 3): Promise<CrewItem[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id, content, tag, is_pr, created_at,
      member:members(handle, tier)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((p) => {
    const m = Array.isArray(p.member) ? p.member[0] : p.member;
    return {
      id: p.id,
      who: m ? `@${m.handle}` : "@member",
      tier: m?.tier ?? "Lifter",
      what: p.content,
      when: humanWhen(p.created_at as string),
      pr: !!p.is_pr,
    };
  });
}

export async function getMemberStats(memberId: string): Promise<MemberStats | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Two windows: rolling [now-28d, now] and previous [now-56d, now-28d].
  // Returning both lets the UI show a trend arrow without a second
  // round-trip. ISO strings used everywhere for storage comparison.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const winCurr = new Date(now - 28 * day).toISOString();
  const winPrev = new Date(now - 56 * day).toISOString();

  // Reps balance via the materialized-style view (all-time)
  // + sets in the last 56 days (covers both windows in one query)
  // + post counts for both windows in parallel
  const [balanceRes, setsRes, prsCurrRes, prsPrevRes, streakRes] =
    await Promise.all([
      supabase
        .from("member_reps_balance")
        .select("balance")
        .eq("member_id", memberId)
        .maybeSingle(),
      supabase
        .from("session_sets")
        .select(
          "logged_weight, logged_reps, logged_at, session_exercise:session_exercises!inner(session:sessions!inner(member_id))"
        )
        .gte("logged_at", winPrev)
        .filter("session_exercise.session.member_id", "eq", memberId),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId)
        .eq("is_pr", true)
        .gte("created_at", winCurr),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId)
        .eq("is_pr", true)
        .gte("created_at", winPrev)
        .lt("created_at", winCurr),
      // Inline the streak walk to avoid coupling the dashboard to /coaching.
      // Same heuristic as getSessionStreak: consecutive completed sessions
      // walking back from today; first non-completed (skipped or overdue
      // scheduled) breaks the streak.
      supabase
        .from("sessions")
        .select("status, scheduled_for")
        .eq("member_id", memberId)
        .lte("scheduled_for", new Date().toISOString().slice(0, 10))
        .order("scheduled_for", { ascending: false })
        .limit(60),
    ]);

  // Bucket sets by window using their logged_at timestamp.
  let volumeKg = 0;
  let volumeKgPrev = 0;
  for (const r of setsRes.data ?? []) {
    const w = Number(r.logged_weight ?? 0);
    const reps = Number(r.logged_reps ?? 0);
    const kg = w * reps;
    if (!r.logged_at) continue;
    if (r.logged_at >= winCurr) volumeKg += kg;
    else volumeKgPrev += kg;
  }

  // Walk session streak inline.
  let streakDays = 0;
  for (const s of streakRes.data ?? []) {
    if (s.status === "completed") streakDays += 1;
    else break;
  }

  return {
    volumeKg,
    volumeKgPrev,
    prs4w: prsCurrRes.count ?? 0,
    prsPrev: prsPrevRes.count ?? 0,
    repsBalance: balanceRes.data?.balance ?? 0,
    streakDays,
  };
}

function humanWhen(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "lige nu";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
