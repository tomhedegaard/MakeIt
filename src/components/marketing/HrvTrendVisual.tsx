"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
 *  - Farve: sitet er bevidst monokromt, så identitet kodes ALDRIG i
 *    farve her. Én serie ⇒ ingen legende; overskriften navngiver den.
 *    Dage under baseline markeres med ring/størrelse, ikke kulør — det
 *    virker også i s/h-print og ved farveblindhed.
 *  - Mærker: 2px middellinje, recessivt gitter, kun ét direkte label
 *    (seneste værdi). Hover giver crosshair + aflæsning.
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
    <figure className="surface-2 rounded-lg p-5 md:p-6">
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
        {/* Recessivt gitter */}
        {model.yTicks.map((tick) => (
          <line
            key={`y${tick.y}`}
            x1={24}
            x2={WIDTH - 24}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}

        {/* Baseline-bånd — referenceområdet, ikke en serie */}
        {model.baselineBand ? (
          <path
            d={model.baselineBand.path}
            fill="var(--fg)"
            opacity={0.07}
          />
        ) : null}

        {/* Daglige aflæsninger */}
        {model.points.map((p, i) => {
          const low = readings[i].lnRmssd < BASELINE_LN - SWC;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={low ? 4 : 2.5}
              fill={low ? "none" : "var(--fg-dim)"}
              stroke={low ? "var(--fg)" : "none"}
              strokeWidth={low ? 1.5 : 0}
            />
          );
        })}

        {/* 7-dages gennemsnit — hovedlinjen */}
        <path
          d={model.meanLinePath}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Crosshair + aktivt punkt */}
        <line
          x1={activePoint.x}
          x2={activePoint.x}
          y1={24}
          y2={HEIGHT - 24}
          stroke="var(--line-bright)"
          strokeWidth={1}
        />
        <circle
          cx={activePoint.x}
          cy={activePoint.y}
          r={5}
          fill="var(--fg)"
          stroke="var(--bg)"
          strokeWidth={2}
        />

        {/* Y-akse: kun yderpunkterne, så tallene ikke støjer */}
        {[model.yTicks[0], model.yTicks[model.yTicks.length - 1]].map((tick) => (
          <text
            key={`lbl${tick.y}`}
            x={26}
            y={tick.y - 6}
            className="font-mono"
            fontSize={10}
            fill="var(--fg-faint)"
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
