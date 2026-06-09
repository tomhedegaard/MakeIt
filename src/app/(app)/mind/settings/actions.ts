"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { setMentalSettingFlag } from "@/lib/data/mind";

const Schema = z.object({
  field: z.enum([
    "buddy_share_enabled",
    "cirkel_share_aggregate_enabled",
    "cirkel_share_daily_enabled",
    "ai_coach_enabled",
    "notif_mind_check_evening",
    "notif_ai_coach_morning",
    "notif_buddy_mental_alert",
  ]),
  value: z.enum(["0", "1"]),
});

export async function setMentalToggleAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const member = await getSession();
  if (!member) return { error: "not_authed" };

  const parsed = Schema.safeParse({
    field: formData.get("field"),
    value: formData.get("value"),
  });
  if (!parsed.success) return { error: "invalid_input" };

  const result = await setMentalSettingFlag(
    member.id,
    parsed.data.field,
    parsed.data.value === "1",
  );
  if (!result.ok) return { error: result.error };

  console.info("[mind] mental_setting_toggled", {
    memberId: member.id,
    field: parsed.data.field,
    value: parsed.data.value === "1",
  });

  revalidatePath("/mind/settings");
  return { ok: true };
}
