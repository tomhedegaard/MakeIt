import { useTranslations } from "next-intl";
import type { JournalEntry } from "@/lib/mind/types";

/**
 * Owner-only journal history. Renders entries newest-first, with
 * date headers and the prompt-used. No moderation status is shown
 * publicly — that's for safety telemetry, not member-facing UI.
 */
export default function JournalHistory({ entries }: { entries: JournalEntry[] }) {
  const t = useTranslations("Mind.journalHistory");
  if (entries.length === 0) {
    return <p className="text-fg-dim leading-relaxed">{t("empty")}</p>;
  }

  return (
    <div className="space-y-10">
      {entries.map((e) => (
        <article key={e.id} className="space-y-2">
          <div className="flex items-baseline gap-3">
            <time className="font-display text-lg tabular-nums" dateTime={e.logged_date}>
              {formatShortDate(e.logged_date, t)}
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

/** `12. maj` in Danish, `12 May` in English: both come from messages. */
function formatShortDate(
  iso: string,
  t: ReturnType<typeof useTranslations<"Mind.journalHistory">>,
): string {
  const months = t.raw("months") as string[];
  const d = new Date(iso + "T00:00:00Z");
  return t("date", { day: d.getUTCDate(), month: months[d.getUTCMonth()] ?? "" });
}
