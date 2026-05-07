"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

const ALLOWED_TAGS = ["PR", "Note", "Form-check"] as const;

/**
 * Create a new post. No-op + ok in demo mode.
 */
export async function createPostAction(formData: FormData): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  const tagRaw = String(formData.get("tag") ?? "");
  if (!content) return { ok: false };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const tag = (ALLOWED_TAGS as readonly string[]).includes(tagRaw) ? tagRaw : null;

  const { error } = await supabase.from("posts").insert({
    member_id: user.id,
    content,
    tag,
    is_pr: tag === "PR",
  });

  if (error) return { ok: false };

  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Toggle a "Reps" reaction on a post. Returns the new reacted state.
 * Demo mode: returns success without DB writes (UI handles optimism).
 */
export async function toggleReactionAction(
  postId: string
): Promise<{ ok: boolean; reacted: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true, reacted: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false, reacted: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reacted: false };

  const { data: existing } = await supabase
    .from("post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("member_id", user.id);
    return { ok: true, reacted: false };
  }

  await supabase.from("post_reactions").insert({
    post_id: postId,
    member_id: user.id,
  });

  revalidatePath("/community");
  return { ok: true, reacted: true };
}
