import type { MindCheckLog } from "@/lib/mind/types";
import { utcDateNDaysAgo } from "@/lib/mind/streak";
import { CHART_CRAFT } from "@/lib/svg/chart-craft";
import { smoothAreaPath, smoothLinePath } from "@/lib/svg/smooth-path";
import ChartEmptyFrame from "@/components/ui/ChartEmptyFrame";

/**
 * 30-day mental graph — three overlapping area+stroke series
 * (energy, stress inverted so up=good, focus). Pure SVG, server-
 * renderable. Uses logged_date as x-axis.
 *
 * Stress is inverted (5 - stress) so all three lines read "higher =
 * good". Otherwise the graph would zig-zag against the user's mental
 * model.
 *
 * Series colors are the mind-domain chart tokens (--mind-energy/
 * -stress/-focus) — a cool violet/blue/cyan family so the graph
 * reads as one domain while the three series stay distinguishable.
 * Axes stay monochrome. Fills are stacked dosage so overlap mixes
 * additively — not mix-blend-mode. See
 * docs/DOMAIN_COLOR_SYSTEM.md.
 */

const SERIES = [
  {
    key: "stress" as const,
    invert: true,
    token: "var(--mind-stress)",
  },
  {
    key: "focus" as const,
    invert: false,
    token: "var(--mind-focus)",
  },
  {
    key: "energy" as const,
    invert: false,
    token: "var(--mind-energy)",
  },
];

export type MentalGraphCopy = {
  title: string;
  energy: string;
  calm: string;
  focus: string;
  aria: string;
};

export default function MentalGraph({
  logs,
  days = 30,
  copy,
}: {
  logs: MindCheckLog[];
  days?: number;
  copy: MentalGraphCopy;
}) {
  const byDate = new Map<string, MindCheckLog>();
  for (const l of logs) byDate.set(l.logged_date, l);

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) dates.push(utcDateNDaysAgo(i));

  const points = dates.map((d, i) => ({
    i,
    date: d,
    log: byDate.get(d) ?? null,
  }));

  const hasData = points.some((p) => p.log);

  const w = 800;
  const h = 220;
  const padL = 32;
  const padR = 8;
  const padT = 16;
  const padB = 24;

  const xStep = (w - padL - padR) / Math.max(1, days - 1);
  const y = (v: number) => padT + ((5 - v) / 4) * (h - padT - padB);
  const baselineY = h - padB;

  const seriesPoints = (key: "energy" | "stress" | "focus", invert = false) =>
    points.map((p) => {
      if (!p.log) return null;
      const raw = p.log[key];
      const v = invert ? 6 - raw : raw;
      return { x: padL + p.i * xStep, y: y(v) };
    });

  const energyDots = points
    .filter((p) => p.log)
    .map((p) => ({
      cx: padL + p.i * xStep,
      cy: y(p.log!.energy),
    }));

  return (
    <div className="space-y-3" data-domain="mind">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-section">{copy.title}</h2>
        <div className="flex items-center gap-3 text-xs text-fg-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-mind-energy" aria-hidden />
            {copy.energy}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-mind-stress" aria-hidden />
            {copy.calm}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-mind-focus" aria-hidden />
            {copy.focus}
          </span>
        </div>
      </div>
      <div className="border hairline bg-bg p-4">
        {hasData ? (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-auto"
            role="img"
            aria-label={copy.aria}
          >

            <rect
              x={padL}
              y={padT}
              width={w - padL - padR}
              height={h - padT - padB}
              fill="none"
              stroke={CHART_CRAFT.frame}
              strokeWidth={CHART_CRAFT.gridWidth}
              vectorEffect="non-scaling-stroke"
            />

            {[1, 3, 5].map((v) => (
              <g key={v}>
                <line
                  x1={padL}
                  x2={w - padR}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={CHART_CRAFT.grid}
                  strokeWidth={CHART_CRAFT.gridWidth}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={padL - 6}
                  y={y(v) + 3}
                  fontSize={9}
                  textAnchor="end"
                  fill={CHART_CRAFT.label}
                >
                  {v}
                </text>
              </g>
            ))}

            {SERIES.map((s) => {
              const pts = seriesPoints(s.key, s.invert);
              return (
                <path
                  key={`${s.key}-fill`}
                  d={smoothAreaPath(pts, baselineY)}
                  // Flat tint, not a fade (Nord, spec §7.2): the three
                  // series stack as 6 % washes of their own colour.
                  fill={s.token}
                  fillOpacity={0.06}
                  stroke="none"
                />
              );
            })}

            {SERIES.map((s) => (
              <path
                key={`${s.key}-stroke`}
                d={smoothLinePath(seriesPoints(s.key, s.invert))}
                fill="none"
                stroke={s.token}
                strokeWidth={CHART_CRAFT.meanStrokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {energyDots.map((p, i) => (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={0.9}
                fill="var(--mind-energy)"
                fillOpacity={0.55}
              />
            ))}
          </svg>
        ) : (
          <ChartEmptyFrame />
        )}
      </div>
    </div>
  );
}
