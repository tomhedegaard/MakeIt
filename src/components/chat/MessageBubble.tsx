"use client";

import type { Message } from "@/lib/data/messages";

/**
 * One message bubble. Layout flips by `mine`:
 *   - mine: right-aligned, accent surface
 *   - theirs: left-aligned, subtle surface
 *
 * Coaches sending video are flagged with a small "Coach"-eyebrow on
 * the bubble so the recipient knows it's an authored video, not a
 * shared link. Audio uses a native <audio> control to keep parity
 * with system playback (Bluetooth, lockscreen, etc).
 */
export default function MessageBubble({
  message,
  mine,
}: {
  message: Message;
  mine: boolean;
}) {
  const align = mine ? "items-end" : "items-start";
  const bubbleStyle: React.CSSProperties = mine
    ? {
        background: "var(--bg-3)",
        borderColor: "var(--line-bright)",
      }
    : {
        background: "var(--bg-2)",
      };

  return (
    <li className={`flex flex-col ${align}`}>
      {!mine && message.senderHandle ? (
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mb-1 px-1">
          @{message.senderHandle}
          {message.senderIsCoach ? " · coach" : ""}
        </div>
      ) : null}

      <div
        className="max-w-[85%] sm:max-w-[70%] rounded-2xl border hairline overflow-hidden"
        style={bubbleStyle}
      >
        {message.kind === "image" && message.mediaUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={message.mediaUrl}
            alt={message.body ?? "Foto"}
            className="block w-full h-auto max-h-96 object-cover"
            loading="lazy"
          />
        ) : null}

        {message.kind === "video" && message.mediaUrl ? (
          <video
            src={message.mediaUrl}
            controls
            playsInline
            preload="metadata"
            className="block w-full h-auto max-h-[480px] bg-black"
          />
        ) : null}

        {message.kind === "audio" && message.mediaUrl ? (
          <div className="px-3 py-3 flex items-center gap-2">
            <audio
              src={message.mediaUrl}
              controls
              preload="metadata"
              className="w-full"
            />
            {message.mediaDurationSec ? (
              <span className="text-[10px] font-mono text-fg-faint shrink-0">
                {formatDuration(message.mediaDurationSec)}
              </span>
            ) : null}
          </div>
        ) : null}

        {(message.kind === "text" && message.body) ||
        (message.kind !== "text" && message.body) ? (
          <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.body}
          </p>
        ) : null}

        {/* Fallback: media kind but no signed URL (storage hiccup) */}
        {message.kind !== "text" && !message.mediaUrl ? (
          <p className="px-4 py-3 text-xs font-mono text-fg-dim">
            Kunne ikke hente medie · prøv at refreshe
          </p>
        ) : null}
      </div>

      <div className="text-[10px] font-mono text-fg-faint mt-1 px-1 flex items-center gap-1.5">
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
        {mine ? (
          <span aria-label={message.readAt ? "Set" : "Sendt"} title={message.readAt ? "Set" : "Sendt"}>
            {message.readAt ? "✓✓" : "✓"}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
