"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { submitJournalEntry } from "@/lib/data/mind";

const Schema = z.object({
  body: z.string().min(1).max(2000),
  prompt_key: z.string().max(64).nullable().optional(),
  prompt_text: z.string().max(280).nullable().optional(),
});

export async function submitJournalEntryAction(
  formData: FormData,
):
  Promise<
    | { ok: true; moderation: "clean" | "crisis" }
    | { error: string }
  > {
  const member = await getSession();
  if (!member) return { error: "not_authed" };

  const parsed = Schema.safeParse({
    body: formData.get("body"),
    prompt_key: formData.get("prompt_key") ?? null,
    prompt_text: formData.get("prompt_text") ?? null,
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const result = await submitJournalEntry(member.id, {
    body: parsed.data.body,
    prompt: parsed.data.prompt_text ?? null,
  });

  if (!result.ok) return { error: result.error };

  console.info("[mind] journal_entry_submitted", {
    memberId: member.id,
    length: parsed.data.body.length,
    moderation: result.moderation,
    crisisCategories: result.crisisCategories,
  });

  revalidatePath("/mind/journal");
  return { ok: true, moderation: result.moderation };
}
