"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  generateProgram,
  type GoalFocus,
  type ExperienceLevel,
  type EquipmentLevel,
  type ProfileInput,
} from "@/lib/data/program-generator";
import { sendWelcomeEmail } from "@/lib/email/templates/welcome";

const GOALS: GoalFocus[] = [
  "strength",
  "hypertrophy",
  "hybrid",
  "deadlift_spec",
];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const EQUIP: EquipmentLevel[] = ["full", "home_rack", "minimal"];

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0 || n > 600) return null;
  return n;
}

export async function completeOnboardingAction(formData: FormData) {
  const goalRaw = String(formData.get("goal") ?? "");
  const levelRaw = String(formData.get("experience") ?? "");
  const equipRaw = String(formData.get("equipment") ?? "");
  const freqRaw = Number(formData.get("frequency") ?? 4);

  if (!GOALS.includes(goalRaw as GoalFocus)) redirect("/onboarding?err=goal");
  if (!LEVELS.includes(levelRaw as ExperienceLevel)) redirect("/onboarding?err=level");
  if (!EQUIP.includes(equipRaw as EquipmentLevel)) redirect("/onboarding?err=equip");
  if (freqRaw < 2 || freqRaw > 6) redirect("/onboarding?err=freq");

  const profile: ProfileInput = {
    goalFocus: goalRaw as GoalFocus,
    experienceLevel: levelRaw as ExperienceLevel,
    weeklyFrequency: freqRaw,
    equipmentLevel: equipRaw as EquipmentLevel,
    maxSquatKg: num(formData.get("maxSquat")),
    maxBenchKg: num(formData.get("maxBench")),
    maxDeadliftKg: num(formData.get("maxDeadlift")),
    maxOhpKg: num(formData.get("maxOhp")),
    notesInjuries: String(formData.get("injuries") ?? "").slice(0, 500) || null,
  };

  if (!SUPABASE_ENABLED) {
    // Demo mode: nothing to persist; just send the user to dashboard.
    redirect("/dashboard");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/onboarding?err=auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1) Save profile
  const { error: profErr } = await supabase
    .from("members")
    .update({
      goal_focus: profile.goalFocus,
      experience_level: profile.experienceLevel,
      weekly_frequency: profile.weeklyFrequency,
      equipment_level: profile.equipmentLevel,
      max_squat_kg: profile.maxSquatKg,
      max_bench_kg: profile.maxBenchKg,
      max_deadlift_kg: profile.maxDeadliftKg,
      max_ohp_kg: profile.maxOhpKg,
      notes_injuries: profile.notesInjuries,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profErr) redirect("/onboarding?err=save");

  // 2) Generate program week 1
  const generated = await generateProgram(profile);

  // Resolve program template id (matching code)
  const { data: prog } = await supabase
    .from("programs")
    .select("id")
    .eq("code", generated.programCode)
    .maybeSingle();

  // 3) Active program assignment
  if (prog) {
    await supabase.from("program_assignments").upsert(
      {
        member_id: user.id,
        program_id: prog.id,
        current_week: 1,
        status: "active",
      },
      { onConflict: "member_id" }
    );
  }

  // 4) Insert sessions + exercises + sets in a tight loop. RLS is fine
  //    because each row has member_id = auth.uid() (or is keyed off a
  //    session row that does).
  for (const s of generated.sessions) {
    const d = new Date();
    d.setDate(d.getDate() + s.scheduledOffsetDays);

    const { data: sessionRow } = await supabase
      .from("sessions")
      .insert({
        member_id: user.id,
        program_id: prog?.id ?? null,
        week: 1,
        day_label: s.dayLabel,
        title: s.title,
        estimated_minutes: s.estimatedMinutes,
        status: "scheduled",
        scheduled_for: d.toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (!sessionRow) continue;

    for (let i = 0; i < s.exercises.length; i++) {
      const ex = s.exercises[i];
      const { data: exRow } = await supabase
        .from("session_exercises")
        .insert({
          session_id: sessionRow.id,
          exercise_name: ex.name,
          cue: ex.cue,
          position: i + 1,
        })
        .select("id")
        .single();
      if (!exRow) continue;

      await supabase.from("session_sets").insert(
        ex.sets.map((set, j) => ({
          session_exercise_id: exRow.id,
          position: j + 1,
          target_reps: set.reps,
          target_weight: set.weight,
          target_rpe: set.rpe,
          rest_sec: set.restSec,
        }))
      );
    }
  }

  // Welcome email — best-effort, never blocks the redirect.
  try {
    const { data: m } = await supabase
      .from("members")
      .select("email, handle")
      .eq("id", user.id)
      .maybeSingle();

    if (m?.email) {
      const firstSession = generated.sessions[0];
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host = h.get("host") ?? "localhost:3002";
      await sendWelcomeEmail({
        to: m.email,
        handle: m.handle,
        programName: generated.programName,
        firstSessionLabel: firstSession?.dayLabel ?? null,
        baseUrl: `${proto}://${host}`,
      });
    }
  } catch (err) {
    console.warn("[onboarding] welcome email failed:", err);
  }

  redirect("/dashboard");
}
