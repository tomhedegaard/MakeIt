"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { submitJournalEntry } from "@/lib/data/mind";
import { notifyGuardiansOfCrisis } from "@/lib/youth/notices";

const Schema = z.object({
  body: z.string().min(1).max(2000),
  prompt_key: z.string().max(64).nullable().optional(),
  prompt_text: z.string().max(280).nullable().optional(),
});

export async function submitJournalEntryAction(
  formData: FormData,
):
  Promise<
    | { ok: true; moderation: "clean" | "flagged" | "crisis"; guardianNotified: boolean }
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

  // MakeIt Ung (spec afsnit 5): crisis language from a young member
  // tells their guardian at once. The notice never carries the text.
  // Adults have no active guardianship, so this is a no-op for them.
  const guardianNotified =
    result.moderation === "crisis" ? await notifyGuardiansOfCrisis(member.id) : false;

  console.info("[mind] journal_entry_submitted", {
    memberId: member.id,
    length: parsed.data.body.length,
    moderation: result.moderation,
    crisisCategories: result.crisisCategories,
  });

  revalidatePath("/mind/journal");
  return { ok: true, moderation: result.moderation, guardianNotified };
}
