import { cn } from "@/lib/utils";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";

/**
 * Quiet empty plot — the same chart grammar as TrendChart, with no data.
 *
 * L-shaped charcoal axes + recess horizontals + a domain-tint whisper
 * band (the track that will fill). Not a vertical cage, not a sentence.
 * Parent surfaces own any copy; this is visual only.
 */

const W = 640;
const H = 240;
const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 28;
const TICK = 5;

const H_LINES = [0.25, 0.5, 0.75] as const;
const X_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

export default function ChartEmptyFrame({
  className,
}: {
  className?: string;
}) {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const x0 = PAD_L;
  const y0 = PAD_T;
  const x1 = PAD_L + innerW;
  const y1 = PAD_T + innerH;

  const bandTop = y0 + innerH * 0.36;
  const bandH = innerH * 0.28;
  const midY = bandTop + bandH / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      className={cn("chart-empty-frame block w-full text-fg", className)}
      data-chart-empty="plot"
      aria-hidden
    >
      {/* Recess horizontals — never a vertical cage. */}
      {H_LINES.map((t) => {
        const y = y0 + innerH * t;
        return (
          <line
            key={`h${t}`}
            x1={x0}
            x2={x1}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={CHART_CRAFT.gridOpacity}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {/* Domain-tint whisper — the personal band that will appear. */}
      <rect
        data-chart-empty-band=""
        x={x0}
        y={bandTop}
        width={innerW}
        height={bandH}
        fill="var(--domain, currentColor)"
        fillOpacity={0.07}
      />
      <line
        data-chart-empty-avg=""
        x1={x0}
        x2={x1}
        y1={midY}
        y2={midY}
        stroke="var(--domain, currentColor)"
        strokeWidth={CHART_CRAFT.avgStrokeWidth}
        strokeDasharray="5 4"
        strokeOpacity={0.28}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* L-axes — charcoal, stronger than the grid. */}
      <line
        data-chart-empty-axis="y"
        x1={x0}
        x2={x0}
        y1={y0}
        y2={y1}
        stroke="currentColor"
        strokeOpacity={0.34}
        strokeWidth={CHART_CRAFT.gridWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        data-chart-empty-axis="x"
        x1={x0}
        x2={x1}
        y1={y1}
        y2={y1}
        stroke="currentColor"
        strokeOpacity={0.34}
        strokeWidth={CHART_CRAFT.gridWidth}
        vectorEffect="non-scaling-stroke"
      />

      {Y_TICKS.map((t) => {
        const y = y1 - innerH * t;
        return (
          <line
            key={`yt${t}`}
            x1={x0 - TICK}
            x2={x0}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {X_TICKS.map((t) => {
        const x = x0 + innerW * t;
        return (
          <line
            key={`xt${t}`}
            x1={x}
            x2={x}
            y1={y1}
            y2={y1 + TICK}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
