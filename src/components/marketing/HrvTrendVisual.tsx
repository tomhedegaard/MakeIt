"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";
import {
  buildTrendChartModel,
  type ChartReading,
} from "@/lib/hrv/trend-chart";

/**
 * HRV-trendgraf til landingssiden (UX-audit B2).
 *
 * Siden havde ikke ét billede eller én graf — kun typografi. Det her er
 * det ene visuelle lag der KAN bygges i kode uden foto-assets: den
 * faktiske graf medlemmet ser hver morgen.
 *
 * Integritet: geometrien kommer fra `buildTrendChartModel` — præcis
 * samme rene funktion som in-app-fladen bruger (og som har tests). Kun
 * dataene er eksempeldata, og det står på figuren. Ingen opdigtede
 * akser, ingen "marketing-kurve" tegnet i hånden.
 *
 * Designvalg efter dataviz-proceduren:
 *  - Form: udvikling over tid, én serie (daglig RMSSD) + 7-dages
 *    gennemsnit + baseline-bånd som referenceområde.
 *  - Farve: akser/gitter forbliver monokrome. Data-blæk er heart-domæne
 *    (`data-domain="heart"`) — samme sprog som in-app TrendChart.
 *    Dage under baseline markeres med hul ring, ikke en anden kulør.
 *  - Mærker: hairline middellinje, recessivt gitter, kun ét direkte
 *    label (seneste værdi). Hover giver crosshair + aflæsning;
 *    prefers-reduced-motion låser på seneste punkt.
 *
 * Data er deterministiske (faste datoer, ingen Math.random) så server-
 * og klient-render giver samme DOM.
 */
const WIDTH = 640;
const HEIGHT = 260;
const DAYS = 30;
const BASELINE_LN = 4.02; // ≈ 56 ms
const SWC = 0.14;

/** Deterministisk 30-dages eksempelserie med en belastet uge midtvejs. */
function buildExampleReadings(): ChartReading[] {
  const raw: number[] = [];
  for (let i = 0; i < DAYS; i++) {
    const wave = 0.12 * Math.sin(i / 3.1) + 0.06 * Math.sin(i / 1.7);
    const strain = i >= 12 && i <= 17 ? 0.22 : 0;
    raw.push(BASELINE_LN + wave - strain);
  }

  return raw.map((lnRmssd, i) => {
    const window = raw.slice(Math.max(0, i - 6), i + 1);
    const rolling =
      i >= 6 ? window.reduce((a, b) => a + b, 0) / window.length : null;
    // Faste datoer — ingen Date.now(), så SSR og klient matcher.
    const day = String(i + 1).padStart(2, "0");
    return {
      measuredAt: `2026-05-${day}T05:30:00.000Z`,
      lnRmssd,
      rolling7dMeanLnRmssd: rolling,
      baseline60dMeanLnRmssd: BASELINE_LN,
      baseline60dSwc: SWC,
      readinessBucket: null,
      isSick: false,
    };
  });
}

export default function HrvTrendVisual() {
  const t = useTranslations("Marketing.hrvChart");
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const readings = useMemo(() => buildExampleReadings(), []);
  const model = useMemo(
    () => buildTrendChartModel(readings, { width: WIDTH, height: HEIGHT }),
    [readings]
  );

  const active = hover ?? readings.length - 1;
  const activeReading = readings[active];
  const activePoint = model.points[active];
  const activeMs = Math.round(Math.exp(activeReading.lnRmssd));
  const belowBaseline = activeReading.lnRmssd < BASELINE_LN - SWC;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    model.points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const label = t("aria", {
    days: DAYS,
    low: Math.round(Math.exp(Math.min(...readings.map((r) => r.lnRmssd)))),
    high: Math.round(Math.exp(Math.max(...readings.map((r) => r.lnRmssd)))),
  });

  return (
    <figure className="surface-2 rounded-lg p-5 md:p-6" data-domain="heart">
      <figcaption className="flex items-baseline justify-between gap-4 mb-4">
        <span className="eyebrow">{t("title")}</span>
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          {t("exampleData")}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto touch-app"
        role="img"
        aria-label={label}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <rect
          x={model.plot.left}
          y={model.plot.top}
          width={model.plot.right - model.plot.left}
          height={model.plot.bottom - model.plot.top}
          fill="none"
          stroke="currentColor"
          strokeOpacity={CHART_CRAFT.frameOpacity}
          strokeWidth={CHART_CRAFT.gridWidth}
          vectorEffect="non-scaling-stroke"
        />
        {model.yTicks.map((tick) => (
          <line
            key={`y${tick.y}`}
            x1={model.plot.left}
            x2={model.plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={CHART_CRAFT.gridOpacity}
            strokeWidth={CHART_CRAFT.gridWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {model.baselineBand ? (
          <path
            d={model.baselineBand.path}
            fill="var(--domain, currentColor)"
            fillOpacity={CHART_CRAFT.bandFillOpacity}
          />
        ) : null}

        {model.meanAreaPath ? (
          <path
            d={model.meanAreaPath}
            fill="var(--domain, currentColor)"
            fillOpacity={CHART_CRAFT.areaFillOpacity}
            stroke="none"
          />
        ) : null}

        {model.points.map((p, i) => {
          const low = readings[i].lnRmssd < BASELINE_LN - SWC;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={low ? CHART_CRAFT.lastPointR : CHART_CRAFT.pointR}
              fill={low ? "none" : "var(--domain, currentColor)"}
              stroke="var(--domain, currentColor)"
              strokeWidth={low ? 1 : 0}
              strokeOpacity={low ? 0.85 : 1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <path
          d={model.meanLinePath}
          fill="none"
          stroke="var(--domain, currentColor)"
          strokeWidth={CHART_CRAFT.meanStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        <line
          x1={activePoint.x}
          x2={activePoint.x}
          y1={model.plot.top}
          y2={model.plot.bottom}
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth={CHART_CRAFT.gridWidth}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={activePoint.x}
          cy={activePoint.y}
          r={CHART_CRAFT.lastPointR}
          fill="var(--domain, currentColor)"
          stroke="var(--bg)"
          strokeWidth={1.25}
        />

        {[model.yTicks[0], model.yTicks[model.yTicks.length - 1]].map((tick) => (
          <text
            key={`lbl${tick.y}`}
            x={model.plot.left + 4}
            y={tick.y - 6}
            className="font-mono"
            fontSize={10}
            fill="currentColor"
            fillOpacity={CHART_CRAFT.axisLabelOpacity}
          >
            {tick.label}
          </text>
        ))}
      </svg>

      <div className="mt-4 pt-4 border-t hairline flex items-baseline justify-between gap-4">
        <span className="text-sm text-fg-dim">
          {new Date(activeReading.measuredAt).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          })}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="numeric text-2xl tabular-nums">{activeMs}</span>
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            {belowBaseline ? t("belowBaseline") : t("withinBaseline")}
          </span>
        </span>
      </div>
    </figure>
  );
}
