import "server-only";
import { createClient } from "@/lib/supabase/server";

const CHAT_MEDIA_BUCKET = "chat-media";

/* ================================================================ *
 * Types
 * ================================================================ */

export type MessageKind = "text" | "image" | "audio" | "video";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  /** Sender handle for the bubble label, joined in. */
  senderHandle: string | null;
  /** Whether the sender is a coach — drives bubble alignment + style. */
  senderIsCoach: boolean;
  kind: MessageKind;
  body: string | null;
  mediaPath: string | null;
  mediaMime: string | null;
  mediaDurationSec: number | null;
  /** Time-limited signed URL (1h) when media exists, null otherwise. */
  mediaUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type Conversation = {
  id: string;
  memberId: string;
  coachId: string;
  /** Other-party display info for inbox lists. */
  otherHandle: string | null;
  otherTier: string | null;
  lastMessageAt: string | null;
  /** Number of messages from the other party with read_at = null. */
  unreadCount: number;
  /** Preview of the most recent message (text, or "[foto]" / "[video]" / "[lyd]"). */
  lastPreview: string | null;
};

/* ================================================================ *
 * Head coach lookup
 *
 * For v1 we have a single head coach (members.is_coach=true). Future:
 * a member's assigned coach could be derived from program_assignments
 * → programs.coach_id, or a dedicated members.coach_id column.
 * Returns null if no coach exists or if Supabase is unavailable.
 * ================================================================ */

export async function getHeadCoachId(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("is_coach", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/* ================================================================ *
 * Find or create the (member, coach) conversation
 *
 * Idempotent on the unique (member_id, coach_id) index. The caller
 * should typically be the member opening their inbox or the coach
 * opening a member detail page; either one creates the row if absent.
 * ================================================================ */

export async function getOrCreateConversation(
  memberId: string,
  coachId: string
): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("member_id", memberId)
    .eq("coach_id", coachId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: inserted } = await supabase
    .from("conversations")
    .insert({ member_id: memberId, coach_id: coachId })
    .select("id")
    .single();
  return inserted?.id ?? null;
}

/* ================================================================ *
 * List messages in a conversation, oldest first
 *
 * Joins sender for display. Signs media URLs in one batch call to
 * Storage so the client doesn't re-issue signs per bubble.
 * ================================================================ */

export async function listMessages(
  conversationId: string,
  limit = 200
): Promise<Message[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("messages")
    .select(
      `
      id, conversation_id, sender_id, kind, body,
      media_path, media_mime, media_duration_sec,
      read_at, created_at,
      sender:members(handle, is_coach)
    `
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!data) return [];

  // Batch-sign media paths.
  const paths = data
    .map((m) => m.media_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    try {
      const { data: signed } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .createSignedUrls(paths, 3600);
      if (signed) {
        for (const item of signed) {
          if (item.path && item.signedUrl) {
            signedByPath.set(item.path, item.signedUrl);
          }
        }
      }
    } catch {
      // Skip — bubbles render with a fallback "kunne ikke hente" state.
    }
  }

  return data.map((m): Message => {
    const sender = unwrapOne(m.sender) as
      | { handle: string | null; is_coach: boolean | null }
      | null;
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderHandle: sender?.handle ?? null,
      senderIsCoach: Boolean(sender?.is_coach),
      kind: m.kind as MessageKind,
      body: m.body,
      mediaPath: m.media_path,
      mediaMime: m.media_mime,
      mediaDurationSec: m.media_duration_sec,
      mediaUrl: m.media_path ? signedByPath.get(m.media_path) ?? null : null,
      readAt: m.read_at,
      createdAt: m.created_at,
    };
  });
}

/* ================================================================ *
 * Per-member inbox (list of conversations)
 *
 * Used both client-side (a member typically has just one row) and
 * coach-side (the coach has one row per member who's ever messaged).
 * Sorts by most recent activity.
 * ================================================================ */

export async function listConversations(
  forMemberId: string
): Promise<Conversation[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  // Pull conversations where this user is a participant — RLS
  // enforces the same condition, but the explicit OR lets us share
  // this fetcher for both member and coach.
  const { data: convs } = await supabase
    .from("conversations")
    .select(
      `
      id, member_id, coach_id, last_message_at,
      member:members!conversations_member_id_fkey(handle, tier),
      coach:members!conversations_coach_id_fkey(handle, tier)
    `
    )
    .or(`member_id.eq.${forMemberId},coach_id.eq.${forMemberId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (!convs || convs.length === 0) return [];
  const ids = convs.map((c) => c.id);

  // One query for unread counts + last preview, bucketed client-side.
  // We pull the recent slice (last 50 messages across these convs)
  // to derive previews. Members with very long histories: that's
  // fine, last_message_at sort means previews come from the tail.
  const { data: tail } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, kind, body, read_at, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
    .limit(50 * Math.max(1, ids.length));

  const preview = new Map<string, string>();
  const unread = new Map<string, number>();
  for (const m of tail ?? []) {
    if (!preview.has(m.conversation_id)) {
      preview.set(m.conversation_id, kindToPreview(m.kind, m.body));
    }
    if (m.read_at == null && m.sender_id !== forMemberId) {
      unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
    }
  }

  return convs.map((c): Conversation => {
    const isMe = c.member_id === forMemberId;
    const other = unwrapOne(isMe ? c.coach : c.member) as
      | { handle: string | null; tier: string | null }
      | null;
    return {
      id: c.id,
      memberId: c.member_id,
      coachId: c.coach_id,
      otherHandle: other?.handle ?? null,
      otherTier: other?.tier ?? null,
      lastMessageAt: c.last_message_at,
      unreadCount: unread.get(c.id) ?? 0,
      lastPreview: preview.get(c.id) ?? null,
    };
  });
}

/* ================================================================ *
 * Total unread count for the AppShell badge
 *
 * Lightweight count(*) so it's cheap to call on every nav render.
 * ================================================================ */

export async function getUnreadCount(forMemberId: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;

  // Two-step rather than a join: get the conversation ids the user
  // participates in, then count unread messages in them where the
  // sender isn't the user. Keeps the count(*) on a single index.
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`member_id.eq.${forMemberId},coach_id.eq.${forMemberId}`);

  if (!convs || convs.length === 0) return 0;
  const ids = convs.map((c) => c.id);

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .is("read_at", null)
    .neq("sender_id", forMemberId);

  return count ?? 0;
}

/* ================================================================ *
 * Helpers
 * ================================================================ */

function unwrapOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function kindToPreview(kind: string, body: string | null): string {
  if (kind === "text") return (body ?? "").slice(0, 80);
  if (kind === "image") return "📷 Foto";
  if (kind === "audio") return "🎙️ Lydbesked";
  if (kind === "video") return "🎬 Video";
  return body ?? "";
}
