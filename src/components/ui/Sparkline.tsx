/**
 * Tiny SVG sparkline. Strokes in currentColor so callers control
 * theming via the wrapping element. Renders nothing for <2 points.
 */
import { cn } from "@/lib/utils";

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
      <div
        className={cn(
          "h-14 flex items-end text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint",
          className
        )}
      >
        Ikke nok data endnu
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Pad the y-range slightly so the line never grazes the top/bottom edge.
  const pad = 4;
  const yScale = (height - pad * 2) / range;
  const xStep = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * xStep;
      const y = height - pad - (v - min) * yScale;
      return `${x},${y}`;
    })
    .join(" ");

  // Filled area below the line for a subtle volume cue.
  const areaPath =
    `M 0,${height} L ${points.split(" ").join(" L ")} L ${width},${height} Z`;

  const lastX = (data.length - 1) * xStep;
  const lastY = height - pad - (data[data.length - 1] - min) * yScale;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full h-14", className)}
      aria-hidden
    >
      <path d={areaPath} fill="currentColor" opacity="0.06" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLastPoint ? (
        <circle cx={lastX} cy={lastY} r="3" fill="currentColor" />
      ) : null}
    </svg>
  );
}
