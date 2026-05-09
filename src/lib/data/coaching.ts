import "server-only";
import { createClient } from "@/lib/supabase/server";
import { currentIsoMonday } from "@/lib/data/nutrition";

/**
 * Data fetchers for /coaching (the Træn page). Mirrors the
 * dashboard's null-on-no-supabase contract — callers fall back to
 * a mock shape when the database isn't connected.
 */

/* ================================================================ *
 * Week strip — Mon..Sun for the current ISO week
 * ================================================================ */

export type WeekDay = {
  /** Mon..Søn — display label */
  label: string;
  /** Day-of-month (1..31) */
  date: number;
  /** YYYY-MM-DD for click-through */
  iso: string;
  /** Compressed session label, e.g. "Squat" / "Push" / "Hvile" */
  sessionLabel: string;
  /** Session id if a session is scheduled, for the link */
  sessionId: string | null;
  /** Status flags driving the dot variant */
  done: boolean;
  today: boolean;
  rest: boolean;
};

const DA_DAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

export async function getWeekStrip(memberId: string): Promise<WeekDay[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const monday = currentIsoMonday();
  const sunday = isoPlusDays(monday, 6);
  const today = todayIso();

  // Pull all sessions in the window in one shot.
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, day_label, title, scheduled_for, status")
    .eq("member_id", memberId)
    .gte("scheduled_for", monday)
    .lte("scheduled_for", sunday);

  const byDate = new Map<
    string,
    { id: string; dayLabel: string | null; title: string; status: string }
  >();
  for (const s of sessions ?? []) {
    if (!s.scheduled_for) continue;
    // First session per day wins — programs typically only have one
    // scheduled session per date.
    if (!byDate.has(s.scheduled_for)) {
      byDate.set(s.scheduled_for, {
        id: s.id,
        dayLabel: s.day_label,
        title: s.title,
        status: s.status,
      });
    }
  }

  const out: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = isoPlusDays(monday, i);
    const session = byDate.get(iso);
    const date = Number(iso.slice(8, 10));
    const isRest = !session;
    out.push({
      label: DA_DAYS[i],
      date,
      iso,
      sessionLabel: session
        ? compressSessionLabel(session.dayLabel, session.title)
        : "Hvile",
      sessionId: session?.id ?? null,
      done: session?.status === "completed",
      today: iso === today,
      rest: isRest,
    });
  }
  return out;
}

/**
 * Mock-mode equivalent. Always Mon=04 ... Sun=10 like the static
 * markup that used to live in the page, with today=Tuesday so the
 * unconnected demo still looks "live".
 */
export function mockWeekStrip(): WeekDay[] {
  const monday = currentIsoMonday();
  const today = todayIso();
  const labels = ["Squat", "Push", "Pull", "Deadlift", "Hyper", "Hvile", "Aktiv"];
  return labels.map((label, i) => {
    const iso = isoPlusDays(monday, i);
    const isRest = i >= 5;
    return {
      label: DA_DAYS[i],
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
         coach:members(handle, tier)`
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

  return programs.map((p): ProgramListing => {
    const coach = unwrapOne(p.coach);
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

  const today = todayIso();
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

function isoPlusDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  // Europe/Copenhagen-aware "today" so the strip flips at local midnight.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * "Dag A — Squat" → "Squat". "Squat — Top set" → "Squat". Picks the
 * shortest meaningful chunk so the day-strip stays compact.
 */
function compressSessionLabel(
  dayLabel: string | null,
  title: string
): string {
  const candidates = [dayLabel, title].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  for (const c of candidates) {
    // Pull text after an em-dash if present (handles "Dag A — Squat")
    const m = c.match(/—\s*(.+)$/);
    const tail = m ? m[1] : c;
    // First word, max 12 chars
    const word = tail.trim().split(/\s+/)[0] ?? tail;
    if (word) return word.slice(0, 12);
  }
  return "—";
}
