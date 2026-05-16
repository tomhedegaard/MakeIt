"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import type { ProgramSetScheme } from "@/lib/data/coach-programs";

/* ---------------------------------------------------------------- *
 * Create
 * ---------------------------------------------------------------- */

export async function createProgramAction(input: {
  code: string;
  name: string;
  type: string;
  weeks: number;
  level: string;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: false, error: "Supabase ikke konfigureret" };

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: "Kode og navn er påkrævet" };
  if (!Number.isFinite(input.weeks) || input.weeks < 1 || input.weeks > 52) {
    return { ok: false, error: "Uger skal være mellem 1 og 52" };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  const { error } = await supabase.from("programs").insert({
    code,
    name,
    type: input.type,
    weeks: input.weeks,
    level: input.level || null,
    is_published: false, // drafts start unpublished
  });

  if (error) {
    const dup = error.code === "23505";
    return {
      ok: false,
      error: dup
        ? `Koden "${code}" findes allerede — vælg en anden.`
        : error.message,
    };
  }

  revalidatePath("/coach/programs");
  return { ok: true, code };
}

/* ---------------------------------------------------------------- *
 * Save (diff create/update/delete on days + day-exercises)
 * ---------------------------------------------------------------- */

export type DayExerciseInput = {
  id: string | null;
  exerciseId: string | null;
  exerciseName: string;
  cue: string | null;
  position: number;
  sets: ProgramSetScheme[];
};

export type DayInput = {
  id: string | null;
  position: number;
  dayLabel: string;
  title: string;
  estimatedMinutes: number | null;
  exercises: DayExerciseInput[];
};

export type ProgramSavePayload = {
  programId: string;
  name: string;
  type: string;
  description: string | null;
  weeks: number;
  level: string | null;
  isPublished: boolean;
  days: DayInput[];
};

export async function saveProgramAction(
  payload: ProgramSavePayload,
): Promise<{ ok: boolean; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  // 1. Program metadata
  const { error: pErr } = await supabase
    .from("programs")
    .update({
      name: payload.name,
      type: payload.type,
      description: payload.description,
      weeks: payload.weeks,
      level: payload.level,
      is_published: payload.isPublished,
    })
    .eq("id", payload.programId);
  if (pErr) return { ok: false, error: pErr.message };

  // 2. Diff days — delete those dropped from the payload.
  const { data: existingDays } = await supabase
    .from("program_days")
    .select("id")
    .eq("program_id", payload.programId);

  const keepDayIds = new Set(
    payload.days.map((d) => d.id).filter((id): id is string => !!id),
  );
  const daysToDelete = (existingDays ?? [])
    .filter((d) => !keepDayIds.has(d.id))
    .map((d) => d.id);
  if (daysToDelete.length > 0) {
    // Cascade drops program_day_exercises.
    await supabase.from("program_days").delete().in("id", daysToDelete);
  }

  // 3. Update / insert each day, then diff its exercises.
  for (const day of payload.days) {
    let dayId = day.id;
    if (dayId) {
      await supabase
        .from("program_days")
        .update({
          position: day.position,
          day_label: day.dayLabel,
          title: day.title,
          estimated_minutes: day.estimatedMinutes,
        })
        .eq("id", dayId);
    } else {
      const { data: inserted } = await supabase
        .from("program_days")
        .insert({
          program_id: payload.programId,
          position: day.position,
          day_label: day.dayLabel,
          title: day.title,
          estimated_minutes: day.estimatedMinutes,
        })
        .select("id")
        .single();
      dayId = inserted?.id ?? null;
      if (!dayId) continue;
    }

    const { data: existingEx } = await supabase
      .from("program_day_exercises")
      .select("id")
      .eq("program_day_id", dayId);
    const keepExIds = new Set(
      day.exercises.map((e) => e.id).filter((id): id is string => !!id),
    );
    const exToDelete = (existingEx ?? [])
      .filter((e) => !keepExIds.has(e.id))
      .map((e) => e.id);
    if (exToDelete.length > 0) {
      await supabase.from("program_day_exercises").delete().in("id", exToDelete);
    }

    for (const ex of day.exercises) {
      const row = {
        program_day_id: dayId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.exerciseName,
        cue: ex.cue,
        position: ex.position,
        sets: ex.sets,
      };
      if (ex.id) {
        await supabase
          .from("program_day_exercises")
          .update(row)
          .eq("id", ex.id);
      } else {
        await supabase.from("program_day_exercises").insert(row);
      }
    }
  }

  revalidatePath("/coach/programs");
  revalidatePath(`/coach/programs`);
  return { ok: true };
}

/* ---------------------------------------------------------------- *
 * Assign — generate a member's sessions from the program blueprint
 * ---------------------------------------------------------------- */

export async function assignProgramAction(input: {
  programId: string;
  memberId: string;
  startWeek: number;
}): Promise<{ ok: boolean; sessionsCreated?: number; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: true, sessionsCreated: 0 };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  const startWeek = Math.max(1, Math.floor(input.startWeek || 1));

  // Load the program + blueprint tree.
  const { data: program } = await supabase
    .from("programs")
    .select(
      `
      id, weeks,
      days:program_days(
        id, position, day_label, title, estimated_minutes,
        exercises:program_day_exercises(
          id, exercise_id, exercise_name, cue, position, sets
        )
      )
    `,
    )
    .eq("id", input.programId)
    .maybeSingle();

  if (!program) return { ok: false, error: "Program ikke fundet" };

  type Bp = {
    weeks: number;
    days: {
      position: number;
      day_label: string;
      title: string;
      estimated_minutes: number | null;
      exercises: {
        exercise_id: string | null;
        exercise_name: string;
        cue: string | null;
        position: number;
        sets: unknown;
      }[];
    }[];
  };
  const bp = program as unknown as Bp;
  const days = (bp.days ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  if (days.length === 0) {
    return { ok: false, error: "Programmet har ingen dage at generere fra" };
  }

  // Supersede any existing active assignment for this member.
  await supabase
    .from("program_assignments")
    .update({ status: "abandoned" })
    .eq("member_id", input.memberId)
    .eq("status", "active");

  const { error: aErr } = await supabase.from("program_assignments").insert({
    member_id: input.memberId,
    program_id: input.programId,
    status: "active",
    current_week: startWeek,
  });
  if (aErr) return { ok: false, error: aErr.message };

  // --- Wave 1: sessions. One per (week, day) from startWeek..weeks.
  type SessionSeed = { week: number; dayIdx: number };
  const sessionRows: Record<string, unknown>[] = [];
  const sessionSeeds: SessionSeed[] = [];
  for (let week = startWeek; week <= bp.weeks; week++) {
    days.forEach((day, dayIdx) => {
      sessionRows.push({
        member_id: input.memberId,
        program_id: input.programId,
        week,
        day_label: day.day_label,
        title: day.title,
        estimated_minutes: day.estimated_minutes,
        status: "scheduled",
      });
      sessionSeeds.push({ week, dayIdx });
    });
  }

  if (sessionRows.length === 0) {
    return { ok: true, sessionsCreated: 0 };
  }

  const { data: insertedSessions, error: sErr } = await supabase
    .from("sessions")
    .insert(sessionRows)
    .select("id");
  if (sErr || !insertedSessions) {
    return { ok: false, error: sErr?.message ?? "Kunne ikke oprette sessioner" };
  }

  // --- Wave 2: session_exercises. Returned rows track input order.
  const exerciseRows: Record<string, unknown>[] = [];
  const exerciseSeeds: { dayIdx: number; exIdx: number }[] = [];
  insertedSessions.forEach((session, i) => {
    const { dayIdx } = sessionSeeds[i];
    days[dayIdx].exercises
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach((ex, exIdx) => {
        exerciseRows.push({
          session_id: session.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          cue: ex.cue,
          position: ex.position,
        });
        exerciseSeeds.push({ dayIdx, exIdx });
      });
  });

  if (exerciseRows.length > 0) {
    const { data: insertedEx, error: eErr } = await supabase
      .from("session_exercises")
      .insert(exerciseRows)
      .select("id");
    if (eErr || !insertedEx) {
      return { ok: false, error: eErr?.message ?? "Kunne ikke oprette øvelser" };
    }

    // --- Wave 3: session_sets.
    const setRows: Record<string, unknown>[] = [];
    insertedEx.forEach((sx, i) => {
      const { dayIdx, exIdx } = exerciseSeeds[i];
      const sortedEx = days[dayIdx].exercises
        .slice()
        .sort((a, b) => a.position - b.position);
      const sets = Array.isArray(sortedEx[exIdx]?.sets)
        ? (sortedEx[exIdx].sets as Record<string, unknown>[])
        : [];
      sets.forEach((set, setIdx) => {
        setRows.push({
          session_exercise_id: sx.id,
          position: setIdx + 1,
          target_reps: numOr(set.reps, null),
          target_weight: numOr(set.weight, null),
          target_rpe: set.rpe == null ? null : numOr(set.rpe, null),
          rest_sec: numOr(set.rest_sec, null),
        });
      });
    });
    if (setRows.length > 0) {
      const { error: setErr } = await supabase
        .from("session_sets")
        .insert(setRows);
      if (setErr) return { ok: false, error: setErr.message };
    }
  }

  revalidatePath("/coach/programs");
  revalidatePath(`/coach/members/${input.memberId}`);
  revalidatePath("/coaching");
  revalidatePath("/dashboard");
  return { ok: true, sessionsCreated: insertedSessions.length };
}

function numOr(v: unknown, fallback: number | null): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
