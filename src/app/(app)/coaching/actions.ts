"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getSession } from "@/lib/auth";
import { canMemberAssignProgram } from "@/lib/programs/synthetic";
import {
  assignProgramFromBlueprint,
  isEmptyDaysError,
} from "@/lib/programs/assign-from-blueprint";

export type StartProgramError =
  | "empty_days"
  | "not_allowed"
  | "not_found"
  | "unavailable"
  | "failed";

export type StartProgramResult = {
  ok: boolean;
  sessionsCreated?: number;
  error?: StartProgramError;
};

/**
 * Switch the member's active program and materialize sessions from
 * the catalog blueprint (same remaining-week wave as coach assign).
 *
 * Pauses any currently-active assignment (member path — coach
 * abandons). The unique partial index
 * `idx_one_active_program_per_member` enforces at most one active
 * assignment.
 *
 * Refuses unpublished / synthetic codes, empty blueprints (no
 * assignment write), and a no-op if `programId` is already active.
 */
export async function startProgramAction(
  programId: string,
): Promise<StartProgramResult> {
  const id = programId.trim();
  if (!id) return { ok: false, error: "not_found" };

  if (!SUPABASE_ENABLED) {
    // Demo mode — no blueprint to materialize; the button still
    // gets a structured success so it does not look dead.
    return { ok: true, sessionsCreated: 0 };
  }

  const member = await getSession();
  if (!member) redirect("/auth/login");

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "unavailable" };

  // Validate the program exists, is published, and is not a synthetic
  // seed row (ADAPTIVE-DEMO*). Unpublished drafts and demo programs
  // are coach/script-only — members cannot self-assign them.
  const { data: program } = await supabase
    .from("programs")
    .select("id, code, is_published")
    .eq("id", id)
    .maybeSingle();
  if (
    !program ||
    !canMemberAssignProgram({
      code: program.code,
      isPublished: program.is_published,
    })
  ) {
    return { ok: false, error: program ? "not_allowed" : "not_found" };
  }

  // No-op if already active.
  const { data: existing } = await supabase
    .from("program_assignments")
    .select("id, program_id")
    .eq("member_id", member.id)
    .eq("status", "active")
    .maybeSingle();
  if (existing && existing.program_id === id) {
    return { ok: true, sessionsCreated: 0 };
  }

  const result = await assignProgramFromBlueprint(supabase, {
    memberId: member.id,
    programId: id,
    startWeek: 1,
    supersedeStatus: "paused",
  });

  if (!result.ok) {
    if (isEmptyDaysError(result.error)) {
      return { ok: false, error: "empty_days" };
    }
    return { ok: false, error: "failed" };
  }

  revalidatePath("/coaching");
  revalidatePath("/dashboard");
  return result;
}
