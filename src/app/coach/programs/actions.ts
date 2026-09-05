"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import type { ProgramSetScheme } from "@/lib/data/coach-programs";
import { assignProgramFromBlueprint } from "@/lib/programs/assign-from-blueprint";

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

  if (payload.isPublished && payload.days.length === 0) {
    return { ok: false, error: "Kan ikke publicere et program uden dage" };
  }

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

  const result = await assignProgramFromBlueprint(supabase, {
    memberId: input.memberId,
    programId: input.programId,
    startWeek: input.startWeek,
    supersedeStatus: "abandoned",
  });
  if (!result.ok) return result;

  revalidatePath("/coach/programs");
  revalidatePath(`/coach/members/${input.memberId}`);
  revalidatePath("/coaching");
  revalidatePath("/dashboard");
  return result;
}
