/**
 * Tiny SVG sparkline. Strokes in currentColor so callers control
 * theming via the wrapping element. Empty / sparse series render a
 * quiet charcoal frame — no text wall.
 */
import { cn } from "@/lib/utils";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";
import { smoothAreaPath, smoothLinePath } from "@/lib/svg/smooth-path";
import ChartEmptyFrame from "@/components/ui/ChartEmptyFrame";

export default function Sparkline({
  data,
  width = 240,
  height = 56,
  className,
  showLastPoint = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  showLastPoint?: boolean;
}) {
  if (!data || data.length < 2) {
    return (
      <ChartEmptyFrame
        className={cn("h-14", className)}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = 4;
  const yScale = (height - pad * 2) / range;
  const xStep = width / (data.length - 1);

  const pts = data.map((v, i) => ({
    x: i * xStep,
    y: height - pad - (v - min) * yScale,
  }));

  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full h-14", className)}
      aria-hidden
      data-sparkline=""
    >
      <path
        d={smoothAreaPath(pts, height)}
        fill="currentColor"
        fillOpacity={CHART_CRAFT.areaFillOpacity}
      />
      <path
        d={smoothLinePath(pts)}
        fill="none"
        stroke="currentColor"
        strokeWidth={CHART_CRAFT.sparkStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLastPoint ? (
        <circle
          cx={last.x}
          cy={last.y}
          r={CHART_CRAFT.lastPointR}
          fill="currentColor"
        />
      ) : null}
    </svg>
  );
}
