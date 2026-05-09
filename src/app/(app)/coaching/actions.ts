"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getSession } from "@/lib/auth";

/**
 * Switch the member's active program.
 *
 * Pauses any currently-active assignment, then inserts a new one for
 * `programId` at week 1 with status='active'. The unique partial
 * index `idx_one_active_program_per_member` enforces at most one
 * active assignment, so the order matters: pause first, insert
 * second. A partial failure leaves the member with no active
 * program (recoverable — they can hit the button again).
 *
 * Refuses to switch if `programId` is already the active assignment;
 * that's a no-op and we'd rather not write an audit row for it.
 */
export async function startProgramAction(formData: FormData): Promise<void> {
  const programId = String(formData.get("programId") ?? "");
  if (!programId) return;

  if (!SUPABASE_ENABLED) {
    // Demo mode — pretend it worked, send the user back to the page.
    redirect("/coaching");
  }

  const member = await getSession();
  if (!member) redirect("/auth/login");

  const supabase = await createClient();
  if (!supabase) return;

  // Validate the program exists and is published — refusing to assign
  // an unpublished program (e.g. a coach-only draft).
  const { data: program } = await supabase
    .from("programs")
    .select("id, is_published")
    .eq("id", programId)
    .maybeSingle();
  if (!program || !program.is_published) return;

  // No-op if already active.
  const { data: existing } = await supabase
    .from("program_assignments")
    .select("id, program_id")
    .eq("member_id", member.id)
    .eq("status", "active")
    .maybeSingle();
  if (existing && existing.program_id === programId) {
    return;
  }

  // Pause any current active.
  if (existing) {
    await supabase
      .from("program_assignments")
      .update({ status: "paused" })
      .eq("id", existing.id);
  }

  // Insert new active.
  await supabase.from("program_assignments").insert({
    member_id: member.id,
    program_id: programId,
    status: "active",
    current_week: 1,
  });

  revalidatePath("/coaching");
  revalidatePath("/dashboard");
}
