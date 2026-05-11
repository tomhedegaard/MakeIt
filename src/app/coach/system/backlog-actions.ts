"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import type {
  BacklogKind,
  BacklogPriority,
  BacklogStatus,
} from "@/lib/data/backlog";

const KINDS = new Set<BacklogKind>(["feature", "change", "fix"]);
const PRIORITIES = new Set<BacklogPriority>([
  "low",
  "medium",
  "high",
  "critical",
]);
const STATUSES = new Set<BacklogStatus>([
  "open",
  "in_progress",
  "done",
  "wontfix",
]);

/** Defense-in-depth alongside RLS and the page-level admin gate. */
async function requireAdminClient() {
  const member = await getSession();
  if (!member?.isAdmin) redirect("/coach");
  const supabase = await createClient();
  if (!supabase) redirect("/coach");
  return { supabase, member };
}

export async function createBacklogItemAction(formData: FormData) {
  const { supabase, member } = await requireAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "feature");
  const priorityRaw = String(formData.get("priority") ?? "medium");
  const description = String(formData.get("description") ?? "").trim();

  // Silent no-op on invalid input — the form has client-side
  // constraints + the DB has CHECK constraints; this is a third
  // belt-and-braces validation, not a user-facing error path.
  if (title.length < 3 || title.length > 200) return;
  if (!KINDS.has(kindRaw as BacklogKind)) return;
  if (!PRIORITIES.has(priorityRaw as BacklogPriority)) return;
  if (description.length > 2000) return;

  await supabase.from("backlog_items").insert({
    title,
    kind: kindRaw,
    priority: priorityRaw,
    description: description || null,
    created_by: member.id,
  });

  revalidatePath("/coach/system");
}

export async function updateBacklogStatusAction(formData: FormData) {
  const { supabase } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.has(status as BacklogStatus)) return;

  await supabase
    .from("backlog_items")
    .update({ status })
    .eq("id", id);

  revalidatePath("/coach/system");
}

export async function deleteBacklogItemAction(formData: FormData) {
  const { supabase } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("backlog_items").delete().eq("id", id);
  revalidatePath("/coach/system");
}
