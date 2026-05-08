"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { extractMentions } from "@/lib/text/mentions";
import { sendMentionEmail } from "@/lib/email/templates/mention";
import { getComments, type Comment } from "@/lib/data/community";

const ALLOWED_TAGS = ["PR", "Note", "Form-check"] as const;

/** Create a new post. No-op + ok in demo mode. */
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

/** Toggle a "Reps" reaction on a post. */
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

/**
 * Load comments for a post. Used by PostCard's expansion via a
 * server-side fetch; cheaper than wiring a route handler.
 */
export async function loadCommentsAction(postId: string): Promise<Comment[]> {
  const list = await getComments(postId, 50);
  return list ?? [];
}

/**
 * Add a comment. Side-effect: parses @mentions and emails any matched
 * crew-members (best-effort, never blocks the success path).
 */
export async function addCommentAction(input: {
  postId: string;
  content: string;
}): Promise<{ ok: boolean }> {
  const content = input.content.trim().slice(0, 1000);
  if (!content) return { ok: false };

  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("post_comments").insert({
    post_id: input.postId,
    member_id: user.id,
    content,
  });
  if (error) return { ok: false };

  // Mention notifications — best-effort, fire and continue.
  try {
    const handles = extractMentions(content);
    if (handles.length > 0) {
      const lower = handles.map((h) => h.toLowerCase());

      // Fetch matching members + author handle + post body in parallel.
      const [authorRes, mentionsRes, postRes] = await Promise.all([
        supabase.from("members").select("handle, tier").eq("id", user.id).maybeSingle(),
        supabase
          .from("members")
          .select("id, handle, email, notif_mention")
          .filter("handle", "in", `(${handles.map((h) => `"${h}"`).join(",")})`)
          .or(lower.map((h) => `handle.ilike.${h}`).join(",")),
        supabase
          .from("posts")
          .select("content, member_id")
          .eq("id", input.postId)
          .maybeSingle(),
      ]);

      const author = authorRes.data;
      const mentioned = mentionsRes.data ?? [];
      const postCtx = postRes.data?.content?.slice(0, 120) ?? null;

      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host = h.get("host") ?? "localhost:3002";
      const baseUrl = `${proto}://${host}`;

      // Skip self-mention; skip rows missing email; respect notif pref.
      for (const target of mentioned) {
        if (!target.email || target.id === user.id) continue;
        if (target.notif_mention === false) continue;
        await sendMentionEmail({
          to: target.email,
          recipientHandle: target.handle,
          authorHandle: author?.handle ?? "member",
          authorTier: author?.tier ?? null,
          commentContent: content,
          postContext: postCtx,
          baseUrl,
        });
      }
    }
  } catch (err) {
    console.warn("[community] mention email path failed:", err);
  }

  revalidatePath("/community");
  return { ok: true };
}
