import type { BandRangeModel } from "@/lib/hrv/band";

/**
 * Compact personal-band range — same TrendChart language as /hrv/trends:
 * charcoal track, heart-ink band fill (≤15%), dashed avg, today's mark.
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
        strokeOpacity={0.22}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {model.band ? (
        <rect
          x={model.band.x}
          y={model.trackY - 6}
          width={model.band.width}
          height={12}
          rx={2}
          fill="var(--domain, currentColor)"
          fillOpacity={0.16}
        />
      ) : null}
      {model.avgX != null ? (
        <line
          x1={model.avgX}
          x2={model.avgX}
          y1={model.trackY - 9}
          y2={model.trackY + 9}
          stroke="var(--domain, currentColor)"
          strokeWidth={1}
          strokeDasharray="3 3"
          strokeOpacity={0.8}
        />
      ) : null}
      {model.markX != null ? (
        <circle
          cx={model.markX}
          cy={model.trackY}
          r={3.2}
          fill="var(--domain, currentColor)"
        />
      ) : null}
    </svg>
  );
}
