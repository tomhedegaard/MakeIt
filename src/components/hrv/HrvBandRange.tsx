import type { BandRangeModel } from "@/lib/hrv/band";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";

/**
 * Compact personal-band range — same TrendChart language as /hrv/trends:
 * line track, heart-ink band fill (tint), dashed avg, today's mark.
 * Used on /hrv so the daily hero does not duplicate the full chart.
 *
 * The SVG stretches to the container (preserveAspectRatio="none"; the
 * strokes are non-scaling), and today's mark is an HTML dot on top, so
 * it stays round at any width. The band's ends carry their ms values.
 */
export default function HrvBandRange({
  model,
  label,
  lowMs,
  highMs,
}: {
  model: BandRangeModel;
  label: string;
  lowMs?: number | null;
  highMs?: number | null;
}) {
  const pct = (x: number) => `${(x / model.width) * 100}%`;
  const showEnds = model.band != null && lowMs != null && highMs != null;

  return (
    <div
      role="img"
      aria-label={label}
      data-hrv-band-range={model.state}
      // Side room so the band's end values never clip at the card edge.
      className="w-full px-5"
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${model.width} ${model.height}`}
          width="100%"
          height={model.height}
          preserveAspectRatio="none"
          aria-hidden
          className="block"
        >
          <line
            x1={model.trackX1}
            x2={model.trackX2}
            y1={model.trackY}
            y2={model.trackY}
            stroke={CHART_CRAFT.frame}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
          {model.band ? (
            <rect
              x={model.band.x}
              y={model.trackY - 6}
              width={model.band.width}
              height={12}
              fill="var(--domain, currentColor)"
              fillOpacity={CHART_CRAFT.bandFillOpacity * 1.6}
            />
          ) : null}
          {model.avgX != null ? (
            <line
              x1={model.avgX}
              x2={model.avgX}
              y1={model.trackY - 9}
              y2={model.trackY + 9}
              stroke="var(--domain, currentColor)"
              strokeWidth={CHART_CRAFT.avgStrokeWidth}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        {model.markX != null ? (
          <span
            aria-hidden
            data-hrv-band-mark
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-domain"
            style={{ left: pct(model.markX) }}
          />
        ) : null}
      </div>
      {showEnds ? (
        <div aria-hidden className="relative h-4 text-micro text-fg-dim">
          <span
            className="absolute top-0 -translate-x-full pr-1"
            style={{ left: pct(model.band!.x) }}
          >
            {lowMs}
          </span>
          <span
            className="absolute top-0 pl-1"
            style={{ left: pct(model.band!.x + model.band!.width) }}
          >
            {highMs}
          </span>
        </div>
      ) : null}
    </div>
  );
}
