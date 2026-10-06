"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { adultMetadata, hasAdultConfirmation } from "@/lib/auth/age";
import { checkPejlemaerke, type Sex } from "@/lib/health/body-rules";

export type BodyInput = {
  heightCm: number | null;
  birthYear: number | null;
  sex: Sex | null;
  pejlemaerkeKg: number | null;
  showWeightCard: boolean;
  hideNumbers: boolean;
  /** The "Jeg er fyldt 18 år" box, for accounts from before the 18+ gate. */
  confirmAdult: boolean;
};

export type BodyError = "auth" | "adult" | "invalid" | "needsHeight" | "belowHealthy" | "unknown";

const inRange = (v: number | null, lo: number, hi: number) => v === null || (Number.isFinite(v) && v >= lo && v <= hi);

/**
 * Krop (spec §S): body data, the pejlemærke and the number preferences.
 * The pejlemærke and the weight card need a confirmed 18+; a pejlemærke
 * under BMI 18,5 is refused (the database refuses it too, 0070).
 */
export async function saveBodyAction(input: BodyInput): Promise<{ ok: true } | { ok: false; error: BodyError }> {
  if (!SUPABASE_ENABLED) return { ok: true };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "unknown" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const year = new Date().getFullYear();
  const sexOk = input.sex === null || ["f", "m", "unspecified"].includes(input.sex);
  if (
    !sexOk ||
    !inRange(input.heightCm, 120, 230) ||
    !inRange(input.birthYear, 1900, year - 18) ||
    !inRange(input.pejlemaerkeKg, 30, 300)
  ) {
    return { ok: false, error: "invalid" };
  }

  const pejlemaerkeKg = input.pejlemaerkeKg === null ? null : Math.round(input.pejlemaerkeKg * 10) / 10;
  if (pejlemaerkeKg !== null || input.showWeightCard) {
    if (!hasAdultConfirmation(user.user_metadata)) {
      if (!input.confirmAdult) return { ok: false, error: "adult" };
      const { error } = await supabase.auth.updateUser({ data: adultMetadata() });
      if (error) return { ok: false, error: "unknown" };
    }
  }
  if (pejlemaerkeKg !== null) {
    const check = checkPejlemaerke(pejlemaerkeKg, input.heightCm);
    if (!check.ok) return { ok: false, error: check.reason };
  }

  const { data: before } = await supabase
    .from("member_body")
    .select("pejlemaerke_kg")
    .eq("member_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("member_body").upsert({
    member_id: user.id,
    height_cm: input.heightCm,
    birth_year: input.birthYear,
    sex: input.sex,
    pejlemaerke_kg: pejlemaerkeKg,
    show_weight_card: input.showWeightCard,
    hide_numbers: input.hideNumbers,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "unknown" };

  const previous = before?.pejlemaerke_kg == null ? null : Number(before.pejlemaerke_kg);
  if (pejlemaerkeKg !== null && pejlemaerkeKg !== previous) {
    await supabase.from("pejlemaerke_changes").insert({ member_id: user.id, kg: pejlemaerkeKg });
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
  return { ok: true };
}
