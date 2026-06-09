"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { postToCirkel } from "@/lib/data/mind";

const Schema = z.object({
  cirkel_id: z.string().min(1),
  body: z.string().min(1).max(600),
  share_mind_check: z.enum(["0", "1"]).default("0"),
});

export async function postToCirkelAction(
  formData: FormData,
): Promise<{ ok: true; postId: string } | { error: string }> {
  const member = await getSession();
  if (!member) return { error: "not_authed" };
  if (member.tier !== "Beast" && member.tier !== "Legend") {
    return { error: "tier_locked" };
  }

  const parsed = Schema.safeParse({
    cirkel_id: formData.get("cirkel_id"),
    body: formData.get("body"),
    share_mind_check: formData.get("share_mind_check") ?? "0",
  });
  if (!parsed.success) return { error: "invalid_input" };

  const result = await postToCirkel({
    authorId: member.id,
    cirkelId: parsed.data.cirkel_id,
    body: parsed.data.body,
    shareMindCheck: parsed.data.share_mind_check === "1",
  });

  if (!result.ok) return { error: result.error };

  console.info("[mind] cirkel_participation_posted", {
    memberId: member.id,
    cirkelId: parsed.data.cirkel_id,
    postId: result.postId,
  });

  revalidatePath("/mind/cirkler");
  return { ok: true, postId: result.postId };
}
