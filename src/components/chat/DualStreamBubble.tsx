import MotorGlyph from "@/components/adaptive/MotorGlyph";
import MunkMark from "@/components/brand/MunkMark";
import type { StreamMessage } from "@/lib/data/message-streams";
import type { DualStreamCopy } from "./DualStreamMessages";

export default function DualStreamBubble({
  message,
  copy,
}: {
  message: StreamMessage;
  copy: DualStreamCopy;
}) {
  const motor = message.stream === "motor";
  return (
    <li
      data-stream-bubble={message.stream}
      data-propose={message.propose ? "true" : undefined}
      className="flex flex-col items-start gap-1"
    >
      {motor ? (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <MotorGlyph className="size-3" />
          {message.propose ? copy.propose : copy.motorTitle}
        </span>
      ) : message.senderIsCoach ? (
        <MunkMark name={message.senderHandle ?? "Munk"} />
      ) : (
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          @{message.senderHandle}
        </span>
      )}

      <div className="max-w-full rounded-2xl border hairline px-4 py-3 bg-bg-2">
        {message.kind === "audio" ? (
          <div data-munk-voice="" className="flex items-center gap-2 text-sm">
            <span aria-hidden>🎙️</span>
            <span>{copy.voice}</span>
            {message.mediaDurationSec ? (
              <span className="numeric text-fg-faint text-xs">
                {message.mediaDurationSec}s
              </span>
            ) : null}
          </div>
        ) : null}
        {message.body ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.body}
          </p>
        ) : null}
      </div>
    </li>
  );
}
