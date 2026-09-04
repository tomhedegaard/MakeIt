"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
import { isLocale, type Locale } from "@/i18n/config";

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

  console.info("[onboarding] step=validate", { goalRaw, levelRaw, equipRaw, freqRaw });

  if (!GOALS.includes(goalRaw as GoalFocus)) {
    console.info("[onboarding] reject=goal", { goalRaw });
    redirect("/onboarding?err=goal");
  }
  if (!LEVELS.includes(levelRaw as ExperienceLevel)) {
    console.info("[onboarding] reject=level", { levelRaw });
    redirect("/onboarding?err=level");
  }
  if (!EQUIP.includes(equipRaw as EquipmentLevel)) {
    console.info("[onboarding] reject=equip", { equipRaw });
    redirect("/onboarding?err=equip");
  }
  if (freqRaw < 2 || freqRaw > 6) {
    console.info("[onboarding] reject=freq", { freqRaw });
    redirect("/onboarding?err=freq");
  }

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
    console.info("[onboarding] step=demo-mode-skip-persist");
    redirect("/dashboard");
  }

  const supabase = await createClient();
  if (!supabase) {
    console.info("[onboarding] reject=no-supabase-client");
    redirect("/onboarding?err=auth");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.info("[onboarding] reject=no-auth-user");
    redirect("/login");
  }

  console.info("[onboarding] step=auth-ok", { userId: user.id });

  // 1) Save profile — capture the updated row so we can verify the
  //    write actually persisted (not just that no error was returned).
  const { data: updatedRow, error: profErr } = await supabase
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
    })
    .eq("id", user.id)
    .select("id, onboarded_at, goal_focus");

  console.info("[onboarding] step=members-update", {
    userId: user.id,
    profErr: profErr?.message ?? null,
    rowsUpdated: updatedRow?.length ?? 0,
    persistedOnboardedAt: updatedRow?.[0]?.onboarded_at ?? null,
    persistedGoalFocus: updatedRow?.[0]?.goal_focus ?? null,
  });

  if (profErr) {
    console.error("[onboarding] reject=save", { userId: user.id, error: profErr.message });
    redirect("/onboarding?err=save");
  }

  // Defense in depth: even if no error, verify the row was actually updated.
  // If the trigger didn't create a members row, .update() returns no error
  // but matches 0 rows. The user would loop forever on /onboarding.
  if (!updatedRow || updatedRow.length === 0) {
    console.error("[onboarding] reject=no-members-row", { userId: user.id });
    // Self-heal: insert the missing row so the next attempt succeeds.
    const { error: insertErr } = await supabase
      .from("members")
      .insert({
        id: user.id,
        handle:
          (user.email?.split("@")[0] ?? "lifter")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "") || "lifter",
        email: user.email,
        display_name: user.user_metadata?.display_name ?? null,
        goal_focus: profile.goalFocus,
        experience_level: profile.experienceLevel,
        weekly_frequency: profile.weeklyFrequency,
        equipment_level: profile.equipmentLevel,
        max_squat_kg: profile.maxSquatKg,
        max_bench_kg: profile.maxBenchKg,
        max_deadlift_kg: profile.maxDeadliftKg,
        max_ohp_kg: profile.maxOhpKg,
        notes_injuries: profile.notesInjuries,
      });
    console.info("[onboarding] self-heal-insert", {
      userId: user.id,
      insertErr: insertErr?.message ?? null,
    });
    if (insertErr) redirect("/onboarding?err=save");
  }

  // 2) Generate program week 1 — skip if a previous attempt already
  //    persisted sessions so a retry after a timeout still lands on
  //    dashboard instead of duplicating the week.
  const { count: existingSessions } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("member_id", user.id);

  let generated: Awaited<ReturnType<typeof generateProgram>> | null = null;

  if ((existingSessions ?? 0) === 0) {
    try {
      console.info("[onboarding] step=generate-program-start");
      generated = await generateProgram(profile);
      console.info("[onboarding] step=generate-program-ok", {
        programCode: generated.programCode,
        sessionCount: generated.sessions.length,
      });

      // Resolve program template id (matching code)
      const { data: prog } = await supabase
        .from("programs")
        .select("id")
        .eq("code", generated.programCode)
        .maybeSingle();
      console.info("[onboarding] step=program-lookup", {
        programCode: generated.programCode,
        found: !!prog,
      });

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
    } catch (err) {
      console.error("[onboarding] reject=gen", {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      redirect("/onboarding?err=gen");
    }
  } else {
    console.info("[onboarding] step=sessions-already-exist", {
      userId: user.id,
      existingSessions,
    });
  }

  // Stamp onboarded_at only after the program exists (or already did).
  const { error: stampErr } = await supabase
    .from("members")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  if (stampErr) {
    console.error("[onboarding] reject=stamp", {
      userId: user.id,
      error: stampErr.message,
    });
    redirect("/onboarding?err=save");
  }

  // Welcome email — best-effort, never blocks the redirect.
  try {
    const { data: m } = await supabase
      .from("members")
      .select("email, handle, locale")
      .eq("id", user.id)
      .maybeSingle();

    if (m?.email) {
      const firstSession = generated?.sessions[0];
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host = h.get("host") ?? "localhost:3002";
      const locale: Locale = isLocale(m.locale) ? m.locale : "da";
      await sendWelcomeEmail({
        to: m.email,
        handle: m.handle,
        programName: generated?.programName ?? "MakeIt",
        firstSessionLabel: firstSession?.dayLabel ?? null,
        baseUrl: `${proto}://${host}`,
        locale,
      });
    }
  } catch (err) {
    console.warn("[onboarding] welcome email failed:", err);
  }

  revalidatePath("/dashboard");
  console.info("[onboarding] step=success-redirect-dashboard", { userId: user.id });
  redirect("/dashboard");
}
