"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  catalogProgramForProfile,
  type GoalFocus,
  type ExperienceLevel,
  type EquipmentLevel,
  type ProfileInput,
} from "@/lib/data/program-generator";
import { assignProgramForAuthenticatedMember } from "@/lib/data/assign-program";
import { canMemberAssignProgram } from "@/lib/programs/synthetic";
import { sendWelcomeEmail } from "@/lib/email/templates/welcome";
import { isLocale, type Locale } from "@/i18n/config";
import {
  isNextRedirectError,
  startProgramDetail,
} from "@/lib/programs/start-program-error";

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

  // 2) Materialize week 1 from the catalog blueprint (service-role,
  //    same path as Start Program). Skip if a previous attempt already
  //    persisted sessions so a retry after a timeout still lands on
  //    dashboard instead of duplicating the week. generateProgram /
  //    Claude still chooses the catalog code via catalogProgramForProfile;
  //    it does not write session rows here.
  const { count: existingSessions } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("member_id", user.id);

  const choice = catalogProgramForProfile(profile.goalFocus);
  let assignedProgramName = choice.programName;
  let firstSessionLabel: string | null = null;

  if ((existingSessions ?? 0) === 0) {
    try {
      console.info("[onboarding] step=catalog-program", {
        programCode: choice.programCode,
      });

      const { data: prog, error: progErr } = await supabase
        .from("programs")
        .select("id, code, name, is_published")
        .eq("code", choice.programCode)
        .maybeSingle();
      console.info("[onboarding] step=program-lookup", {
        programCode: choice.programCode,
        found: !!prog,
        progErr: progErr?.message ?? null,
      });

      if (
        progErr ||
        !prog ||
        !canMemberAssignProgram({
          code: prog.code,
          isPublished: prog.is_published,
        })
      ) {
        console.error("[onboarding] reject=gen program lookup", {
          userId: user.id,
          programCode: choice.programCode,
          error: progErr?.message ?? (prog ? "not_allowed" : "not_found"),
        });
        redirect("/onboarding?err=gen");
      }

      assignedProgramName = prog.name ?? choice.programName;

      const result = await assignProgramForAuthenticatedMember({
        memberId: user.id,
        programId: prog.id,
      });

      if (!result.ok) {
        console.error("[onboarding] reject=gen assign failed", {
          userId: user.id,
          error: result.error,
        });
        redirect("/onboarding?err=gen");
      }

      console.info("[onboarding] step=assign-ok", {
        userId: user.id,
        programCode: choice.programCode,
        sessionsCreated: result.sessionsCreated,
      });
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      console.error("[onboarding] reject=gen", {
        userId: user.id,
        error: startProgramDetail(err),
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

    const { data: firstSession } = await supabase
      .from("sessions")
      .select("day_label")
      .eq("member_id", user.id)
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle();
    firstSessionLabel = firstSession?.day_label ?? null;

    if (m?.email) {
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host = h.get("host") ?? "localhost:3002";
      const locale: Locale = isLocale(m.locale) ? m.locale : "da";
      await sendWelcomeEmail({
        to: m.email,
        handle: m.handle,
        programName: assignedProgramName,
        firstSessionLabel,
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
