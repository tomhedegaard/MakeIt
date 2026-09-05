import { cn } from "@/lib/utils";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";

/**
 * Quiet charcoal plot — the empty / sparse chart state.
 *
 * Hairline frame + recess grid. No invented data, no marketing
 * sentence. Parent surfaces own any copy; this is visual only.
 */

const W = 640;
const H = 240;
const PAD_L = 28;
const PAD_R = 20;
const PAD_T = 18;
const PAD_B = 22;

const H_LINES = [0.2, 0.4, 0.6, 0.8] as const;
const V_LINES = [0.2, 0.4, 0.6, 0.8] as const;

export default function ChartEmptyFrame({
  className,
}: {
  className?: string;
}) {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      className={cn("chart-empty-frame block w-full text-fg", className)}
      data-chart-empty=""
      aria-hidden
    >
      <rect
        x={PAD_L}
        y={PAD_T}
        width={innerW}
        height={innerH}
        fill="var(--bg-2)"
        fillOpacity={0.35}
        stroke="currentColor"
        strokeOpacity={CHART_CRAFT.frameOpacity}
        strokeWidth={CHART_CRAFT.gridWidth}
        vectorEffect="non-scaling-stroke"
      />
      {H_LINES.map((t) => {
        const y = PAD_T + innerH * t;
        return (
          <line
            key={`h${t}`}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={CHART_CRAFT.gridOpacity}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {V_LINES.map((t) => {
        const x = PAD_L + innerW * t;
        return (
          <line
            key={`v${t}`}
            x1={x}
            x2={x}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke="currentColor"
            strokeOpacity={CHART_CRAFT.gridOpacity * 0.7}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
