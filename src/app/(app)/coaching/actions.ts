"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getSession } from "@/lib/auth";
import { canMemberAssignProgram } from "@/lib/programs/synthetic";
import { assignProgramForAuthenticatedMember } from "@/lib/data/assign-program";
import { isEmptyDaysError } from "@/lib/programs/assign-from-blueprint";
import {
  isNextRedirectError,
  startProgramDetail,
} from "@/lib/programs/start-program-error";

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
  /** Raw assign / lookup message — painted under the alert for Testy. */
  detail?: string;
};

function failure(
  error: StartProgramError,
  detail?: string | null,
): StartProgramResult {
  const trimmed = typeof detail === "string" ? detail.trim() : "";
  return trimmed ? { ok: false, error, detail: trimmed } : { ok: false, error };
}

/**
 * Switch the member's active program and materialize week-1 sessions
 * from the catalog blueprint (service-role write after auth).
 *
 * Policy checks (`canMemberAssignProgram`, already-active no-op)
 * stay on the user-scoped client. The assignment flip + session
 * wave use `assignProgramForAuthenticatedMember` so the write is
 * not bound by user-scoped timeouts / RLS. Member id comes from
 * `getSession()` — never from the form.
 *
 * Remaining weeks are generated later by `maybeAdvanceWeek`.
 * Coach assign still materializes the full remaining-week wave.
 */
export async function startProgramAction(
  programId: string,
): Promise<StartProgramResult> {
  const id = programId.trim();
  if (!id) return failure("not_found", "empty program id");

  if (!SUPABASE_ENABLED) {
    // Demo mode — no blueprint to materialize; the button still
    // gets a structured success so it does not look dead.
    return { ok: true, sessionsCreated: 0 };
  }

  const member = await getSession();
  if (!member) redirect("/auth/login");

  const supabase = await createClient();
  if (!supabase) return failure("unavailable", "createClient returned null");

  // Validate the program exists, is published, and is not a synthetic
  // seed row (ADAPTIVE-DEMO*). Unpublished drafts and demo programs
  // are coach/script-only — members cannot self-assign them.
  const { data: program, error: programErr } = await supabase
    .from("programs")
    .select("id, code, is_published")
    .eq("id", id)
    .maybeSingle();
  if (programErr) {
    console.error("[startProgramAction] program lookup failed", programErr);
    return failure("failed", programErr.message);
  }
  if (
    !program ||
    !canMemberAssignProgram({
      code: program.code,
      isPublished: program.is_published,
    })
  ) {
    return failure(
      program ? "not_allowed" : "not_found",
      program
        ? `not_allowed code=${program.code} published=${program.is_published}`
        : `not_found id=${id}`,
    );
  }

  // No-op if already active.
  const { data: existing, error: existingErr } = await supabase
    .from("program_assignments")
    .select("id, program_id")
    .eq("member_id", member.id)
    .eq("status", "active")
    .maybeSingle();
  if (existingErr) {
    console.error(
      "[startProgramAction] active assignment lookup failed",
      existingErr,
    );
    return failure("failed", existingErr.message);
  }
  if (existing && existing.program_id === id) {
    return { ok: true, sessionsCreated: 0 };
  }

  try {
    const result = await assignProgramForAuthenticatedMember({
      memberId: member.id,
      programId: id,
    });

    if (!result.ok) {
      console.error("[startProgramAction] assign failed", result.error);
      if (isEmptyDaysError(result.error)) {
        return failure("empty_days", result.error);
      }
      return failure("failed", result.error);
    }

    revalidatePath("/coaching");
    revalidatePath("/dashboard");
    return result;
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    console.error("[startProgramAction] assign threw", err);
    return failure("failed", startProgramDetail(err));
  }
}
