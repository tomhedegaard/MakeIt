import ChartEmptyFrame from "@/components/ui/ChartEmptyFrame";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";
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
 * Strength-editorial with domain ink: axes, grid and labels stay monochrome
 * (`currentColor` + opacity), while the data itself — baseline band,
 * mean line and daily points — renders in the heart domain color
 * resolved from the /hrv data-domain scope (falls back to currentColor
 * outside it). See docs/DOMAIN_COLOR_SYSTEM.md.
 *
 * Z-order, back to front: grid → baseline band → mean area → 7-day mean
 * line → daily points → axis ticks. Sick days render as hollow
 * (outline-only) ticks.
 *
 * Empty series: a quiet charcoal frame — no invented data, no copy wall.
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
function rmssdMs(lnRmssd: number): string {
  return String(Math.round(Math.exp(lnRmssd)));
}

export default function TrendChart({
  readings,
}: {
  readings: ChartReading[];
}) {
  const model = buildTrendChartModel(readings, VIEWPORT);

  if (model.isEmpty) {
    return (
      <div className="text-fg" data-trend-chart="empty">
        <ChartEmptyFrame />
      </div>
    );
  }

  const { plot } = model;

  return (
    <div className="text-fg" data-trend-chart="ready">
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

        {/* Hairline plot frame + y-grid — monochrome, non-scaling. */}
        <rect
          x={plot.left}
          y={plot.top}
          width={plot.right - plot.left}
          height={plot.bottom - plot.top}
          fill="none"
          stroke="currentColor"
          strokeOpacity={CHART_CRAFT.frameOpacity}
          strokeWidth={CHART_CRAFT.gridWidth}
          vectorEffect="non-scaling-stroke"
        />
        {model.yTicks.map((tick, i) => (
          <line
            key={`g${i}`}
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={CHART_CRAFT.gridOpacity}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Baseline band — tint language, not a solid wash. */}
        {model.baselineBand ? (
          <path
            d={model.baselineBand.path}
            fill="var(--domain, currentColor)"
            fillOpacity={CHART_CRAFT.bandFillOpacity}
            stroke="none"
          />
        ) : null}

        {/* Soft volume under the 7-day mean. */}
        {model.meanAreaPath ? (
          <path
            d={model.meanAreaPath}
            fill="var(--domain, currentColor)"
            fillOpacity={CHART_CRAFT.areaFillOpacity}
            stroke="none"
          />
        ) : null}

        {/* Dashed personal average — the centre of the band. */}
        {model.personalAvg ? (
          <path
            d={model.personalAvg.path}
            fill="none"
            stroke="var(--domain, currentColor)"
            strokeWidth={CHART_CRAFT.avgStrokeWidth}
            strokeDasharray="5 4"
            strokeOpacity={0.55}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {/* 7-day mean line — primary data ink. */}
        {model.meanLinePath ? (
          <path
            d={model.meanLinePath}
            fill="none"
            stroke="var(--domain, currentColor)"
            strokeWidth={CHART_CRAFT.meanStrokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {/* Daily points — editorial ticks, hollow outline for sick days. */}
        {model.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={CHART_CRAFT.pointR}
            fill={p.isSick ? "none" : "var(--domain, currentColor)"}
            stroke="var(--domain, currentColor)"
            strokeWidth={p.isSick ? 1 : 0}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Y-axis ticks — faint ms-valued labels. */}
        {model.yTicks.map((tick, i) => (
          <text
            key={i}
            x={4}
            y={tick.y}
            fill="currentColor"
            fillOpacity={CHART_CRAFT.axisLabelOpacity}
            fontSize={9}
            dominantBaseline="middle"
          >
            {tick.label}
          </text>
        ))}

        {/* X-axis ticks — short date labels near the bottom. */}
        {model.xTicks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={VIEWPORT.height - 6}
            fill="currentColor"
            fillOpacity={CHART_CRAFT.axisLabelOpacity}
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
