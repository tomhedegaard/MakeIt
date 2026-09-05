import type { BandRangeModel } from "@/lib/hrv/band";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";

/**
 * Compact personal-band range — same TrendChart language as /hrv/trends:
 * charcoal track, heart-ink band fill (tint), dashed avg, today's mark.
 * Used on /hrv so the daily hero does not duplicate the full chart.
 */
export default function HrvBandRange({
  model,
  label,
}: {
  model: BandRangeModel;
  label: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      width="100%"
      height={model.height}
      role="img"
      aria-label={label}
      data-hrv-band-range={model.state}
      className="block"
    >
      <line
        x1={model.trackX1}
        x2={model.trackX2}
        y1={model.trackY}
        y2={model.trackY}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={CHART_CRAFT.gridWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {model.band ? (
        <rect
          x={model.band.x}
          y={model.trackY - 5}
          width={model.band.width}
          height={10}
          rx={1}
          fill="var(--domain, currentColor)"
          fillOpacity={CHART_CRAFT.bandFillOpacity}
        />
      ) : null}
      {model.avgX != null ? (
        <line
          x1={model.avgX}
          x2={model.avgX}
          y1={model.trackY - 8}
          y2={model.trackY + 8}
          stroke="var(--domain, currentColor)"
          strokeWidth={CHART_CRAFT.avgStrokeWidth}
          strokeDasharray="3 3"
          strokeOpacity={0.7}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {model.markX != null ? (
        <circle
          cx={model.markX}
          cy={model.trackY}
          r={CHART_CRAFT.lastPointR}
          fill="var(--domain, currentColor)"
        />
      ) : null}
    </svg>
  );
}
