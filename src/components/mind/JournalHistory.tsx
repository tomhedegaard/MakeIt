import type { JournalEntry } from "@/lib/mind/types";

/**
 * Owner-only journal history. Renders entries newest-first, with
 * date headers and the prompt-used. No moderation status is shown
 * publicly — that's for safety telemetry, not member-facing UI.
 */
export default function JournalHistory({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-fg-dim leading-relaxed">
        Ingen poster endnu. Hver dag du skriver én, optjener du Reps —
        og bygger en stribe der låser tier-perks op.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {entries.map((e) => (
        <article key={e.id} className="space-y-2">
          <div className="flex items-baseline gap-3">
            <time className="font-display text-lg tabular-nums" dateTime={e.logged_date}>
              {formatDanishDate(e.logged_date)}
            </time>
            {e.prompt ? (
              <span className="text-fg-dim text-sm italic">{e.prompt}</span>
            ) : null}
          </div>
          <p className="text-fg-dim leading-relaxed whitespace-pre-wrap">
            {e.body}
          </p>
        </article>
      ))}
    </div>
  );
}

function formatDanishDate(iso: string): string {
  const months = [
    "jan", "feb", "mar", "apr", "maj", "jun",
    "jul", "aug", "sep", "okt", "nov", "dec",
  ];
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  const m = months[d.getUTCMonth()] ?? "";
  return `${day}. ${m}`;
}
