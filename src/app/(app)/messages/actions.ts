"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getSession } from "@/lib/auth";
import { sendPushToMember, PUSH_ENABLED } from "@/lib/push";
import {
  getOrCreateConversation,
  getHeadCoachId,
  type MessageKind,
} from "@/lib/data/messages";

/* ---------------------------------------------------------------- *
 * Send a chat message
 *
 * Three layers of validation:
 *   1. Auth — must have a session
 *   2. Conversation participation — sender_id check + RLS join
 *   3. Kind ↔ role — clients (non-coach) can't send 'video'.
 *      Enforced both here AND in the RLS insert policy. The DB is
 *      the source of truth; this is a faster fail path with a
 *      clearer error.
 *
 * After insert, fires an opportunistic push to the OTHER participant
 * (recipient). If the recipient has no subscriptions or VAPID isn't
 * configured, the helper no-ops.
 * ---------------------------------------------------------------- */

type SendInput = {
  conversationId?: string | null;
  kind: MessageKind;
  body?: string | null;
  mediaPath?: string | null;
  mediaMime?: string | null;
  mediaDurationSec?: number | null;
};

export async function sendMessageAction(
  input: SendInput
): Promise<{ ok: boolean; messageId?: string; conversationId?: string; reason?: string }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const member = await getSession();
  if (!member) return { ok: false, reason: "auth" };

  // Role gate (defense in depth — RLS enforces this too).
  if (input.kind === "video" && !member.isCoach) {
    return { ok: false, reason: "video_not_allowed" };
  }
  if (input.kind === "text" && !(input.body && input.body.trim())) {
    return { ok: false, reason: "empty" };
  }
  if (input.kind !== "text" && !input.mediaPath) {
    return { ok: false, reason: "no_media" };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no_db" };

  // Resolve conversation: passed in (preferred), or derived for the
  // member-side first-message path. Coaches always send through an
  // existing conversation, since they reach this from a member detail
  // page that creates it on load.
  let conversationId = input.conversationId ?? null;
  let recipientId: string | null = null;

  if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("member_id, coach_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return { ok: false, reason: "no_conv" };
    recipientId = conv.member_id === member.id ? conv.coach_id : conv.member_id;
  } else {
    if (member.isCoach) return { ok: false, reason: "no_conv" };
    const coachId = await getHeadCoachId();
    if (!coachId) return { ok: false, reason: "no_coach" };
    conversationId = await getOrCreateConversation(member.id, coachId);
    if (!conversationId) return { ok: false, reason: "conv_create" };
    recipientId = coachId;
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: member.id,
      kind: input.kind,
      body: input.body ?? null,
      media_path: input.mediaPath ?? null,
      media_mime: input.mediaMime ?? null,
      media_duration_sec: input.mediaDurationSec ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.warn("[messages] insert failed:", error?.message);
    return { ok: false, reason: error?.code ?? "insert_failed" };
  }

  // Push to the recipient — fire and forget; failures don't block
  // the send. We craft the title/body so it works as a phone-lock
  // peek without leaking sensitive content.
  if (PUSH_ENABLED && recipientId) {
    const senderHandle = member.handle ?? "MakeIt";
    const previewBody =
      input.kind === "text"
        ? (input.body ?? "").slice(0, 120)
        : input.kind === "image"
        ? "📷 Foto"
        : input.kind === "audio"
        ? "🎙️ Lydbesked"
        : "🎬 Video";
    sendPushToMember(recipientId, {
      title: `Ny besked fra @${senderHandle}`,
      body: previewBody,
      url: member.isCoach ? "/messages" : `/coach/members/${member.id}`,
      tag: `chat:${conversationId}`,
    }).catch(() => undefined);
  }

  revalidatePath("/messages");
  if (recipientId && member.isCoach) {
    // Coach side — the member detail page hosts the panel.
    revalidatePath(`/coach/members/${recipientId}`);
  } else if (member.isCoach) {
    revalidatePath("/coach");
  }
  return { ok: true, messageId: inserted.id, conversationId };
}

/* ---------------------------------------------------------------- *
 * Mark every unread message in a thread as read for the current user
 *
 * Called when a participant opens the thread. RLS only lets us
 * update messages we didn't send, which is exactly what we want.
 * Returns the count of rows updated for the optional UI hint.
 * ---------------------------------------------------------------- */

export async function markThreadReadAction(
  conversationId: string
): Promise<{ ok: boolean; updated: number }> {
  if (!SUPABASE_ENABLED) return { ok: true, updated: 0 };
  const member = await getSession();
  if (!member) return { ok: false, updated: 0 };

  const supabase = await createClient();
  if (!supabase) return { ok: false, updated: 0 };

  const { data, error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", member.id)
    .is("read_at", null)
    .select("id");

  if (error) return { ok: false, updated: 0 };
  revalidatePath("/messages");
  return { ok: true, updated: data?.length ?? 0 };
}

/* ---------------------------------------------------------------- *
 * Bootstrap conversation for the member side
 *
 * Called on first /messages load. Members typically have one thread
 * (with the head coach). Coaches don't call this — their inbox is
 * driven by listConversations on the coach surface.
 * ---------------------------------------------------------------- */

export async function ensureMemberConversationAction(): Promise<{
  ok: boolean;
  conversationId?: string;
}> {
  if (!SUPABASE_ENABLED) return { ok: true };
  const member = await getSession();
  if (!member) return { ok: false };
  if (member.isCoach) return { ok: true }; // coaches don't bootstrap

  const coachId = await getHeadCoachId();
  if (!coachId) return { ok: false };

  const id = await getOrCreateConversation(member.id, coachId);
  return { ok: Boolean(id), conversationId: id ?? undefined };
}
