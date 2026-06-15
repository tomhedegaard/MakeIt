import {
  MIN_GROUP_N,
  type CorrelationCard,
  type InsightFactor,
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

/** Danish label for each factor. */
const FACTOR_LABEL: Record<InsightFactor, string> = {
  alcohol: "Alkohol",
  sleep: "Søvn",
};

/** Danish framing — what the two groups being compared actually are. */
const FACTOR_FRAMING: Record<InsightFactor, string> = {
  alcohol: "Dage med alkohol vs. uden",
  sleep: "Nætter under 7 t vs. 7 t+",
};

/** Format a percentage delta with an explicit sign — e.g. `−12%`, `+5%`, `±0%`. */
function formatDelta(deltaPct: number): string {
  if (deltaPct > 0) return `+${deltaPct}%`;
  if (deltaPct < 0) return `−${Math.abs(deltaPct)}%`;
  return "±0%";
}

export default function InsightCard({ card }: { card: CorrelationCard }) {
  const label = FACTOR_LABEL[card.factor];

  return (
    <div className="surface-2 rounded-2xl p-5">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-domain">
        {FACTOR_FRAMING[card.factor]}
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
            <span className="sr-only">HRV-forskel: </span>
            {formatDelta(card.deltaPct)}
          </div>
          <div className="flex flex-col gap-1 text-sm text-fg-dim">
            <span>
              Med: {card.exposedMeanRmssd} ms
              <span className="text-fg-faint"> · {card.exposedN} dage</span>
            </span>
            <span>
              Uden: {card.baselineMeanRmssd} ms
              <span className="text-fg-faint"> · {card.baselineN} dage</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <div className="text-sm text-fg-dim">Ikke nok data endnu</div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
            {card.exposedN} med · {card.baselineN} uden — brug for mindst{" "}
            {MIN_GROUP_N} i hver gruppe
          </div>
        </div>
      )}
    </div>
  );
}
