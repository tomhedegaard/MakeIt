import Link from "next/link";
import { useTranslations } from "next-intl";
import type { WeeklyInsights } from "@/lib/mind/weekly-insights";

/**
 * Renders a weekly mental insights summary — current vs prior week
 * with deltas, plus consistency dial. Server-rendered.
 */
export default function WeeklyInsightsView({
  insights,
  headline,
}: {
  insights: WeeklyInsights;
  headline: string;
}) {
  const t = useTranslations("Mind.weekly");
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border hairline bg-bg-2/30 p-6 md:p-8 space-y-3">
        <div className="eyebrow">{t("eyebrow")}</div>
        <p className="font-display text-2xl md:text-3xl leading-tight">{headline}</p>
        <p className="text-fg-dim text-sm">
          {insights.weekStartDate} → {insights.weekEndDate}
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">{t("numbers")}</h2>
        <div className="grid grid-cols-3 gap-px bg-line border hairline rounded-xl overflow-hidden">
          <MetricCell
            label={t("energy")}
            current={insights.current.energyMedian}
            delta={insights.delta.energy}
            higherIsBetter
          />
          <MetricCell
            label={t("stress")}
            current={insights.current.stressMedian}
            delta={insights.delta.stress}
            higherIsBetter={false}
          />
          <MetricCell
            label={t("focus")}
            current={insights.current.focusMedian}
            delta={insights.delta.focus}
            higherIsBetter
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">{t("activity")}</h2>
        <div className="grid grid-cols-3 gap-px bg-line border hairline rounded-xl overflow-hidden">
          <CountCell
            label={t("mindCheck")}
            value={insights.current.mindCheckDays}
            unit={`/ ${insights.consistency.daysExpected}`}
            delta={insights.delta.mindCheckDays}
          />
          <CountCell
            label={t("sessions")}
            value={insights.current.sessionsCompleted}
            unit=""
            delta={insights.delta.sessionsCompleted}
          />
          <CountCell
            label={t("journal")}
            value={insights.current.journalEntries}
            unit=""
            delta={insights.delta.journalEntries}
          />
        </div>
      </section>

      <p className="text-fg-dim text-sm leading-relaxed">
        {t.rich("footer", {
          link: (chunks) => (
            <Link href="/mind/settings" className="text-fg">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

function MetricCell({
  label,
  current,
  delta,
  higherIsBetter,
}: {
  label: string;
  current: number | null;
  delta: number | null;
  higherIsBetter: boolean;
}) {
  const t = useTranslations("Mind.weekly");
  return (
    <div className="bg-bg-2/40 p-5">
      <div className="eyebrow text-xs mb-2">{label}</div>
      <div className="font-display text-3xl tabular-nums">
        {current === null ? "—" : `${current}/5`}
      </div>
      {delta !== null && delta !== 0 ? (
        <div
          className={`text-xs mt-1 ${
            (delta > 0) === higherIsBetter ? "text-ok" : "text-warn"
          }`}
        >
          {t("delta", { delta: delta > 0 ? `+${delta}` : String(delta) })}
        </div>
      ) : (
        <div className="text-fg-dim text-xs mt-1">{t("unchanged")}</div>
      )}
    </div>
  );
}

function CountCell({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number;
  unit: string;
  delta: number;
}) {
  const t = useTranslations("Mind.weekly");
  return (
    <div className="bg-bg-2/40 p-5">
      <div className="eyebrow text-xs mb-2">{label}</div>
      <div className="font-display text-3xl tabular-nums">
        {value}
        {unit ? <span className="text-fg-dim text-base ml-1">{unit}</span> : null}
      </div>
      {delta !== 0 ? (
        <div
          className={`text-xs mt-1 ${
            delta > 0 ? "text-ok" : "text-warn"
          }`}
        >
          {t("delta", { delta: delta > 0 ? `+${delta}` : String(delta) })}
        </div>
      ) : (
        <div className="text-fg-dim text-xs mt-1">{t("unchanged")}</div>
      )}
    </div>
  );
}
