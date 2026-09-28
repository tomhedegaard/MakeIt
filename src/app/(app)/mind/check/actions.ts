"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { submitMindCheck } from "@/lib/data/mind";

const Schema = z.object({
  energy: z.coerce.number().int().min(1).max(5),
  stress: z.coerce.number().int().min(1).max(5),
  focus: z.coerce.number().int().min(1).max(5),
  note: z.string().max(280).nullable().optional(),
  source: z
    .enum(["manual", "morning_nudge", "evening_nudge", "post_session"])
    .default("manual"),
});

export async function submitMindCheckAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const member = await getSession();
  if (!member) return { error: "not_authed" };

  const raw = {
    energy: formData.get("energy"),
    stress: formData.get("stress"),
    focus: formData.get("focus"),
    note: (formData.get("note") as string | null)?.trim() || null,
    source: (formData.get("source") as string | null) ?? "manual",
  };

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const result = await submitMindCheck(member.id, {
    energy: parsed.data.energy,
    stress: parsed.data.stress,
    focus: parsed.data.focus,
    note: parsed.data.note ?? null,
    source: parsed.data.source,
  });

  if (!result.ok) return { error: result.error };

  console.info("[mind] mind_check_logged", {
    memberId: member.id,
    source: parsed.data.source,
    energy: parsed.data.energy,
    stress: parsed.data.stress,
    focus: parsed.data.focus,
  });

  revalidatePath("/mind");
  revalidatePath("/mind/check");
  revalidatePath("/dashboard");
  return { ok: true };
}
