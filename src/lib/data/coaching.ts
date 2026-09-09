import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  copenhagenIsoMonday,
  copenhagenTodayIso,
  isoPlusDays,
} from "@/lib/dates/copenhagen";
import {
  buildWeekStrip,
  WEEK_DAY_KEYS,
  type WeekDay,
  type WeekStripSession,
} from "@/lib/dashboard/week-strip";
import { excludeSyntheticPrograms } from "@/lib/programs/synthetic";

export { WEEK_DAY_KEYS };
export type { WeekDay, WeekDayKey } from "@/lib/dashboard/week-strip";

/**
 * Data fetchers for /coaching (the Træn page). Mirrors the
 * dashboard's null-on-no-supabase contract — callers fall back to
 * a mock shape when the database isn't connected.
 */

/* ================================================================ *
 * Week strip — Mon..Sun for the current ISO week
 * ================================================================ */

export async function getWeekStrip(memberId: string): Promise<WeekDay[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const today = copenhagenTodayIso();
  // Do not clamp to the current UTC ISO week — that drops an overdue
  // Dag A and the pulse lands on Bench. Same universe as the Today pick:
  // dated sessions the member actually has (open + this horizon).
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, day_label, title, scheduled_for, status")
    .eq("member_id", memberId)
    .not("scheduled_for", "is", null)
    .order("scheduled_for", { ascending: true })
    .limit(80);

  return buildWeekStrip({
    todayIso: today,
    sessions: (sessions ?? []).map((s) => ({
      id: s.id as string,
      status: (s.status ?? "scheduled") as WeekStripSession["status"],
      scheduledFor: s.scheduled_for as string,
      dayLabel: s.day_label as string | null,
      title: s.title as string,
    })),
  });
}

/**
 * Mock-mode equivalent. Always Mon=04 ... Sun=10 like the static
 * markup that used to live in the page, with today=Tuesday so the
 * unconnected demo still looks "live".
 */
export function mockWeekStrip(): WeekDay[] {
  const monday = copenhagenIsoMonday();
  const today = copenhagenTodayIso();
  // Exercise proper names stay English; rest days leave sessionLabel
  // empty so the page can render Coaching.week.rest in the locale.
  const labels = ["Squat", "Push", "Pull", "Deadlift", "Hyper", "", ""];
  return labels.map((label, i) => {
    const iso = isoPlusDays(monday, i);
    const isRest = i >= 5;
    return {
      dayKey: WEEK_DAY_KEYS[i],
      date: Number(iso.slice(8, 10)),
      iso,
      sessionLabel: label,
      sessionId: null,
      done: i === 0,
      today: iso === today,
      rest: isRest,
    };
  });
}

/**
 * Honest calendar week — real dates, no invented Squat/Push sessions.
 * Used when connected mode has no week fetch (should be rare).
 */
export function emptyWeekStrip(): WeekDay[] {
  return buildWeekStrip({
    sessions: [],
    todayIso: copenhagenTodayIso(),
  });
}

/* ================================================================ *
 * Active program (the assignment + program join)
 * ================================================================ */

export type ActiveProgram = {
  assignmentId: string;
  programId: string;
  code: string;
  name: string;
  type: string;
  weeks: number;
  level: string | null;
  description: string | null;
  currentWeek: number;
  coachName: string | null;
};

type ProgramRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  weeks: number;
  level: string | null;
  coach: { handle: string | null; tier: string | null } | null
       | { handle: string | null; tier: string | null }[];
};

export async function getActiveProgram(
  memberId: string
): Promise<ActiveProgram | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("program_assignments")
    .select(
      `
      id, current_week, program_id,
      program:programs(id, code, name, type, description, weeks, level,
        coach:members(handle, tier))
    `
    )
    .eq("member_id", memberId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;

  const program = unwrapOne(data.program) as ProgramRow | null;
  if (!program) return null;
  const coach = unwrapOne(program.coach);

  return {
    assignmentId: data.id,
    programId: program.id,
    code: program.code,
    name: program.name,
    type: program.type,
    weeks: program.weeks,
    level: program.level,
    description: program.description,
    currentWeek: data.current_week ?? 1,
    coachName: coach?.handle ? `@${coach.handle}` : null,
  };
}

/* ================================================================ *
 * Programs library — published programs + per-member active flag
 * ================================================================ */

export type ProgramListing = {
  id: string;
  code: string;
  name: string;
  type: string;
  weeks: number;
  level: string | null;
  description: string | null;
  coachName: string | null;
  active: boolean;
  currentWeek: number | null;
  /** Blueprint day count — 0 means Start Program must stay disabled. */
  dayCount: number;
};

export async function getProgramLibrary(
  memberId: string
): Promise<ProgramListing[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Pull library + active assignment in parallel.
  const [{ data: programs }, { data: assignment }] = await Promise.all([
    supabase
      .from("programs")
      .select(
        `id, code, name, type, description, weeks, level,
         coach:members(handle, tier),
         days:program_days(id)`
      )
      .eq("is_published", true)
      .order("name", { ascending: true }),
    supabase
      .from("program_assignments")
      .select("program_id, current_week")
      .eq("member_id", memberId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!programs) return [];
  const activeProgramId = assignment?.program_id ?? null;
  const activeWeek = assignment?.current_week ?? null;

  // Seeded adaptive-demo rows stay out of the member library even if
  // an older seed left them published (default is_published=true).
  return excludeSyntheticPrograms(programs).map((p): ProgramListing => {
    const coach = unwrapOne(p.coach);
    const row = p as typeof p & { days?: { id: string }[] | null };
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      type: p.type,
      weeks: p.weeks,
      level: p.level,
      description: p.description,
      coachName: coach?.handle ? `@${coach.handle}` : null,
      active: p.id === activeProgramId,
      currentWeek: p.id === activeProgramId ? activeWeek : null,
      dayCount: (row.days ?? []).length,
    };
  });
}

/* ================================================================ *
 * Session streak — consecutive completed scheduled sessions ending
 * with the most recent past session. Skipped breaks the streak;
 * an overdue scheduled (past date, still status='scheduled') also
 * breaks it. Future scheduled sessions are ignored.
 * ================================================================ */

export async function getSessionStreak(memberId: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;

  const today = copenhagenTodayIso();
  const { data } = await supabase
    .from("sessions")
    .select("status, scheduled_for")
    .eq("member_id", memberId)
    .lte("scheduled_for", today)
    .order("scheduled_for", { ascending: false })
    .limit(60);

  if (!data) return 0;

  let streak = 0;
  for (const s of data) {
    if (s.status === "completed") {
      streak += 1;
    } else {
      // Anything else (skipped, or scheduled-but-past = missed) breaks.
      break;
    }
  }
  return streak;
}

/* ================================================================ *
 * Helpers
 * ================================================================ */

function unwrapOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}
