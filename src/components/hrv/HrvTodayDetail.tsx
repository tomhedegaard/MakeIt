import { getLocale, getTranslations } from "next-intl/server";
import TrendChart from "@/components/hrv/TrendChart";
import NarrativeBand from "@/components/ui/NarrativeBand";
import type { HrvBandView } from "@/lib/hrv/band";
import { intlLocaleTag } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * HRV "I dag" below the hero (spec §6.3): 14 nights with the band, the
 * source, the last mornings, HQ's note as a fortællebånd and the latest
 * weekly insight. Numbers come from the same series as the hero; nothing
 * here is invented. Two columns from lg (Tom valgte variant B, 2026-10-04).
 */
export default async function HrvTodayDetail({
  view,
  engineNote,
  source,
  weekly,
}: {
  view: HrvBandView;
  /** HQ's reading of the night (copy.engineBelow/Above), or null. */
  engineNote: string | null;
  /** "Oura · synket 05:14", or a demo label. */
  source: string | null;
  weekly: { day: string; text: string } | null;
}) {
  const t = await getTranslations("Hrv.today");
  const locale = intlLocaleTag(await getLocale());
  const nights = view.readings.slice(-14);
  const mornings = view.readings.slice(-4);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const belowStreak = (() => {
    if (view.bandLowMs == null) return 0;
    let n = 0;
    for (let i = view.readings.length - 1; i >= 0; i--) {
      if (Math.exp(view.readings[i].lnRmssd) < view.bandLowMs) n++;
      else break;
    }
    return n;
  })();

  const chart = (
    <section aria-labelledby="hrv-nights" className="surface-2 p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 id="hrv-nights" className="font-display text-section">{t("nightsTitle")}</h2>
        {source ? <span className="text-micro text-fg-dim border hairline px-2 py-1">{source}</span> : null}
      </div>
      <TrendChart readings={nights} />
    </section>
  );

  const recent = (
    <section aria-labelledby="hrv-recent" className="surface-2">
      <h2 id="hrv-recent" className="font-display text-section px-5 pt-5 pb-3">{t("recentTitle")}</h2>
      <ul className="divide-y divide-line border-t hairline">
        {mornings.map((r, i) => {
          const isToday = i === mornings.length - 1;
          const ms = Math.round(Math.exp(r.lnRmssd));
          const label = isToday ? t("today") : weekday.format(new Date(r.measuredAt));
          const below = view.bandLowMs != null && ms < view.bandLowMs;
          return (
            <li key={r.measuredAt} className="flex items-baseline justify-between px-5 py-3">
              <span className={cn("text-copy first-letter:uppercase", isToday ? "text-fg" : "text-fg-dim")}>{label}</span>
              <span className="numeric text-card">
                {ms} <span className="text-meta text-fg-dim">ms</span>
                {below ? <span className="sr-only"> {t("belowBand")}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const note = engineNote ? (
    <NarrativeBand kicker={t("noteKicker")} title={t("noteTitle")}>
      <p>
        {belowStreak >= 2 ? `${t("belowStreak", { count: belowStreak })} ` : ""}
        {engineNote}
      </p>
      <p className="mt-2">{t("noteHuman")}</p>
    </NarrativeBand>
  ) : null;

  const insight = weekly ? (
    <section aria-label={t("weekTitle")} className="surface-2 p-5">
      <p className="eyebrow mb-1">{t("weekKicker", { day: weekly.day })}</p>
      <p className="text-copy text-fg-body">{weekly.text}</p>
    </section>
  ) : null;

  return (
    <div data-hrv-layout="split" className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6">
        {chart}
        {note}
      </div>
      <div className="space-y-6">
        {recent}
        {insight}
      </div>
    </div>
  );
}
