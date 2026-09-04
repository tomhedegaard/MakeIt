import MunkMark from "@/components/brand/MunkMark";
import { liftLabel, type FormQueueItem } from "@/lib/form-queue/queue";

export type FormCheckThreadCopy = {
  eyebrow: string;
  pending: string;
  reviewed: string;
  voice: string;
  youFilmed: string;
  munkReply: string;
};

/**
 * Athlete thread under a lift — film + Munk craft (text and/or voice).
 * Bound to one exercise; not a general inbox dump.
 */
export default function FormCheckThread({
  items,
  copy,
}: {
  items: FormQueueItem[];
  copy: FormCheckThreadCopy;
}) {
  if (items.length === 0) return null;

  return (
    <section
      data-form-thread=""
      className="mt-4 border-t hairline pt-4 space-y-3"
    >
      <div className="eyebrow">{copy.eyebrow}</div>
      <ol className="space-y-2">
        {items.map((item) => {
          const reviewed = item.status === "reviewed" && item.reviewedAt;
          return (
            <li
              key={item.id}
              data-form-thread-item={item.id}
              data-form-thread-status={item.status}
              data-queue-type={item.type}
              className="surface rounded-xl px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{liftLabel(item)}</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                  {reviewed ? copy.reviewed : copy.pending}
                </span>
              </div>
              <p className="text-xs text-fg-dim">{copy.youFilmed}</p>
              {reviewed ? (
                <div data-munk-reply="" className="space-y-2 pt-1">
                  <MunkMark />
                  <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                    {copy.munkReply}
                  </p>
                  {item.coachNotes ? (
                    <p className="text-sm text-fg-dim leading-relaxed">
                      {item.coachNotes}
                    </p>
                  ) : null}
                  {item.voiceNoteUrl ? (
                    <div
                      data-munk-voice=""
                      className="flex items-center gap-2 text-xs text-fg-dim"
                    >
                      <span aria-hidden>🎙️</span>
                      <span>{copy.voice}</span>
                      {item.voiceNoteDurationSec ? (
                        <span className="numeric text-fg-faint">
                          {item.voiceNoteDurationSec}s
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
