"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import {
  ensureMemberConversationAction,
  markThreadReadAction,
} from "@/app/(app)/messages/actions";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import type { Message } from "@/lib/data/messages";

/**
 * Live thread view shared by client (`/messages`) and coach
 * (member detail). Three responsibilities:
 *
 *   1. Render the message list, scrolling to the bottom on new
 *      arrivals (only if the user is already near the bottom —
 *      don't yank them out of mid-scroll history reading).
 *   2. Subscribe to Supabase Realtime postgres_changes for INSERTs
 *      on `messages` filtered by conversation_id; merge into local
 *      state without a full refetch. Re-fetches the inserted row
 *      via a server fetch only if it has media (need a signed URL).
 *      For text, the realtime payload is enough to render directly.
 *   3. Mark the thread read on mount + whenever a new message
 *      arrives from the other party.
 */
export default function MessagesView({
  conversationId,
  initialMessages,
  myMemberId,
  canSendVideo,
}: {
  conversationId: string | null;
  initialMessages: Message[];
  myMemberId: string;
  canSendVideo: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const [bootPending, startBoot] = useTransition();
  const scrollRef = useRef<HTMLOListElement | null>(null);
  const isAtBottomRef = useRef(true);

  // Bootstrap the conversation if we don't have one yet (member's
  // first time on /messages — coach side always passes one in).
  useEffect(() => {
    if (convId) return;
    startBoot(async () => {
      const res = await ensureMemberConversationAction();
      if (res.ok && res.conversationId) setConvId(res.conversationId);
    });
  }, [convId]);

  // Mark the thread read on mount.
  useEffect(() => {
    if (!convId) return;
    markThreadReadAction(convId).catch(() => undefined);
  }, [convId]);

  // Realtime subscribe.
  useEffect(() => {
    if (!convId) return;
    const supabase = createBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`messages:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          // Skip if we already have it (own send echoes back via
          // server action's revalidate + realtime; dedupe by id).
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, payloadToMessage(row, myMemberId)];
          });

          // Mark read if it's incoming.
          if (row.sender_id !== myMemberId) {
            markThreadReadAction(convId).catch(() => undefined);
          }

          // For media messages we need a signed URL. The server
          // action's revalidate triggers a re-render with the full
          // signed list; in the meantime the bubble renders the
          // "kunne ikke hente" fallback, which flips to the real
          // media on the next pass.
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id ? { ...m, readAt: (row.read_at as string) ?? null } : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId, myMemberId]);

  // Track scroll position so we only auto-scroll on new messages
  // when the user is already at (or near) the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = distanceFromBottom < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new arrivals.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Sync incoming initialMessages on revalidation (e.g. signed URLs
  // refreshed after a media insert echoed via realtime). The lint
  // rule for set-state-in-effect is overly strict here — the prop
  // IS the external system we're reconciling with.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages((prev) => {
      // If the incoming list strictly extends the local list (or is
      // identical), prefer the server version so we get fresh signed
      // URLs. If the local list has unsynced rows (rare — realtime
      // beats the revalidate), merge by id.
      const byId = new Map<string, Message>();
      for (const m of initialMessages) byId.set(m.id, m);
      for (const m of prev) if (!byId.has(m.id)) byId.set(m.id, m);
      return Array.from(byId.values()).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
    });
  }, [initialMessages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ol
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
        aria-label="Beskeder"
      >
        {bootPending && messages.length === 0 ? (
          <li className="text-center text-xs font-mono text-fg-faint py-8">
            Henter…
          </li>
        ) : messages.length === 0 ? (
          <li className="text-center text-sm text-fg-dim py-8">
            Ingen beskeder endnu. Skriv en besked til at starte.
          </li>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId === myMemberId}
            />
          ))
        )}
      </ol>

      {convId ? (
        <Composer conversationId={convId} canSendVideo={canSendVideo} />
      ) : (
        <div className="border-t hairline px-4 py-4 text-center text-xs font-mono text-fg-faint">
          Initialiserer samtale…
        </div>
      )}
    </div>
  );
}

/**
 * Realtime payloads don't include joined sender info or signed
 * media URLs — we render them with placeholders until the server-
 * side revalidation backfills the full row. For text-only messages
 * this is invisible (no media to wait on); for media, the bubble
 * shows the "kunne ikke hente" fallback for one tick.
 */
function payloadToMessage(row: Record<string, unknown>, myId: string): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    senderHandle: null,
    senderIsCoach: row.sender_id === myId ? false : true, // best guess until revalidate
    kind: (row.kind as Message["kind"]) ?? "text",
    body: (row.body as string | null) ?? null,
    mediaPath: (row.media_path as string | null) ?? null,
    mediaMime: (row.media_mime as string | null) ?? null,
    mediaDurationSec: (row.media_duration_sec as number | null) ?? null,
    mediaUrl: null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}
