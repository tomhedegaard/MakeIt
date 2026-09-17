import { useTranslations } from "next-intl";
import {
  MIN_GROUP_N,
  type CorrelationCard,
} from "@/lib/hrv/insights";

/**
 * Presentational correlation card — renders one V2.2 lifestyle/HRV comparison.
 *
 * Pure server-renderable component — no state, no effects, no data fetching.
 * A delta is a description of an observed difference, never advice (spec §10):
 * copy stays calm and descriptive, never prescriptive.
 *
 * Hierarchy is expressed through type weight and opacity; the kicker
 * carries the heart domain color via the /hrv data-domain scope.
 */

/** Format a percentage delta with an explicit sign — e.g. `−12%`, `+5%`, `±0%`. */
function formatDelta(deltaPct: number): string {
  if (deltaPct > 0) return `+${deltaPct}%`;
  if (deltaPct < 0) return `−${Math.abs(deltaPct)}%`;
  return "±0%";
}

export default function InsightCard({ card }: { card: CorrelationCard }) {
  const t = useTranslations("Hrv.insightCard");
  const label = t(`factor.${card.factor}.label`);

  return (
    <div className="surface-2 rounded-2xl p-5">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-domain">
        {t(`factor.${card.factor}.framing`)}
      </div>
      <div className="mt-1 font-display text-lg leading-tight text-fg">
        {label}
      </div>

      {card.status === "ok" &&
      card.deltaPct !== null &&
      card.exposedMeanRmssd !== null &&
      card.baselineMeanRmssd !== null ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="font-display text-2xl leading-tight text-fg">
            <span className="sr-only">{t("deltaSr")} </span>
            {formatDelta(card.deltaPct)}
          </div>
          <div className="flex flex-col gap-1 text-sm text-fg-dim">
            <span>
              {t.rich("with", {
                ms: card.exposedMeanRmssd,
                count: card.exposedN,
                faint: (chunks) => <span className="text-fg-faint">{chunks}</span>,
              })}
            </span>
            <span>
              {t.rich("without", {
                ms: card.baselineMeanRmssd,
                count: card.baselineN,
                faint: (chunks) => <span className="text-fg-faint">{chunks}</span>,
              })}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <div className="text-sm text-fg-dim">{t("notEnough")}</div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
            {t("needMore", {
              exposed: card.exposedN,
              baseline: card.baselineN,
              min: MIN_GROUP_N,
            })}
          </div>
        </div>
      )}
    </div>
  );
}
