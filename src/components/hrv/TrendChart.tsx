import {
  buildTrendChartModel,
  type ChartReading,
} from "@/lib/hrv/trend-chart";

/**
 * SVG-native trend chart of a member's HRV history (V1.x §Task 3).
 *
 * Pure server-renderable presentational component — no state, no effects,
 * no client island. All geometry comes from `buildTrendChartModel`; this
 * component is a thin renderer that only emits SVG elements from the model.
 *
 * Strength-editorial with domain ink: axes and labels stay monochrome
 * (`currentColor` + opacity), while the data itself — baseline band,
 * mean line and daily points — renders in the heart domain color
 * resolved from the /hrv data-domain scope (falls back to currentColor
 * outside it). See docs/DOMAIN_COLOR_SYSTEM.md.
 *
 * Z-order, back to front: baseline band → 7-day mean line → daily points
 * → axis ticks. Sick days render as hollow (outline-only) dots.
 *
 * Accessibility: an SVG `<title>`/`<desc>` plus a visually-hidden data-table
 * fallback give non-visual users the underlying readings.
 */

/** Fixed SVG coordinate space — the element scales to its container width. */
const VIEWPORT = { width: 640, height: 240 };

/** Format an ISO timestamp as a short Danish date for the fallback table. */
function tableDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

/** lnRMSSD → whole-millisecond RMSSD. */
function rmssdMs(lnRmssd: number): number {
  return Math.round(Math.exp(lnRmssd));
}

export default function TrendChart({
  readings,
}: {
  readings: ChartReading[];
}) {
  const model = buildTrendChartModel(readings, VIEWPORT);

  // The /hrv/trends page owns the rich empty state — a simple guard is fine.
  if (model.isEmpty) return null;

  return (
    <div className="text-fg">
      <svg
        viewBox={`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`}
        width="100%"
        height="auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="trendchart-title trendchart-desc"
        className="block w-full"
      >
        <title id="trendchart-title">HRV-trend</title>
        <desc id="trendchart-desc">
          Daglig HRV (RMSSD) med 7-dages gennemsnitslinje og 60-dages
          baseline-bånd. {readings.length} målinger.
        </desc>

        {/* 1. Baseline band — translucent domain-ink region behind everything. */}
        {model.baselineBand ? (
          <path
            d={model.baselineBand.path}
            fill="var(--domain, currentColor)"
            fillOpacity={0.15}
            stroke="none"
          />
        ) : null}

        {/* 1b. Dashed personal average — the centre of the band. */}
        {model.personalAvg ? (
          <path
            d={model.personalAvg.path}
            fill="none"
            stroke="var(--domain, currentColor)"
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.72}
            strokeLinecap="round"
          />
        ) : null}

        {/* 2. 7-day mean line — primary data ink. */}
        {model.meanLinePath ? (
          <path
            d={model.meanLinePath}
            fill="none"
            stroke="var(--domain, currentColor)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {/* 3. Daily points — filled dot, or hollow outline for sick days. */}
        {model.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={p.isSick ? "none" : "var(--domain, currentColor)"}
            stroke="var(--domain, currentColor)"
            strokeWidth={p.isSick ? 1 : 0}
          />
        ))}

        {/* 4. Y-axis ticks — faint ms-valued labels. */}
        {model.yTicks.map((tick, i) => (
          <text
            key={i}
            x={4}
            y={tick.y}
            fill="currentColor"
            fillOpacity={0.45}
            fontSize={9}
            dominantBaseline="middle"
          >
            {tick.label}
          </text>
        ))}

        {/* 5. X-axis ticks — short date labels near the bottom. */}
        {model.xTicks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={VIEWPORT.height - 6}
            fill="currentColor"
            fillOpacity={0.45}
            fontSize={9}
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}
      </svg>

      {/* Visually-hidden data-table fallback for non-visual users. */}
      <table className="sr-only">
        <caption>HRV-målinger: dato og RMSSD</caption>
        <thead>
          <tr>
            <th scope="col">Dato</th>
            <th scope="col">RMSSD (ms)</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r, i) => (
            <tr key={i}>
              <td>{tableDate(r.measuredAt)}</td>
              <td>{rmssdMs(r.lnRmssd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
