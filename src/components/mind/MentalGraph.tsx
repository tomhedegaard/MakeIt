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

/** Colour plus a dash pattern, so the series hold apart without colour. */
const SERIES = [
  {
    key: "stress" as const,
    invert: true,
    token: "var(--mind-stress)",
    dash: "6 4",
  },
  {
    key: "focus" as const,
    invert: false,
    token: "var(--mind-focus)",
    dash: "1 4",
  },
  {
    key: "energy" as const,
    invert: false,
    token: "var(--mind-energy)",
    dash: undefined,
  },
];

export type MentalGraphCopy = {
  title: string;
  energy: string;
  calm: string;
  focus: string;
  aria: string;
  tableCaption?: string;
  colDate?: string;
  scale?: string;
};

/** "2026-10-04" → "4/10", the same short date as the HRV trend chart. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

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

  // A viewBox near phone width, so the chart keeps real height at 375 px.
  // Axis labels are HTML beside the SVG and never scale below 12 px.
  const w = 480;
  const h = 200;
  const padL = 4;
  const padR = 4;
  const padT = 8;
  const padB = 8;

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-display text-section">{copy.title}</h2>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-fg-dim">
          {[SERIES[2], SERIES[0], SERIES[1]].map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <svg width="20" height="6" viewBox="0 0 20 6" aria-hidden>
                <line
                  x1="1"
                  x2="19"
                  y1="3"
                  y2="3"
                  stroke={s.token}
                  strokeWidth={2}
                  strokeDasharray={s.dash}
                  strokeLinecap="round"
                />
              </svg>
              {s.key === "energy"
                ? copy.energy
                : s.key === "stress"
                  ? copy.calm
                  : copy.focus}
            </li>
          ))}
        </ul>
      </div>
      <div className="border hairline bg-bg p-4">
        {hasData ? (
          <>
            <div className="grid grid-cols-[auto_1fr] gap-x-2">
              <div className="relative w-3 text-micro text-fg-dim" aria-hidden>
                {[1, 3, 5].map((v) => (
                  <span
                    key={v}
                    className="absolute right-0 -translate-y-1/2 tabular"
                    style={{ top: `${(y(v) / h) * 100}%` }}
                  >
                    {v}
                  </span>
                ))}
              </div>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="block w-full h-auto"
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
                    strokeWidth={CHART_CRAFT.meanStrokeWidth + 0.4}
                    strokeDasharray={s.dash}
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
                    r={2}
                    fill="var(--mind-energy)"
                    fillOpacity={0.55}
                  />
                ))}
              </svg>
              <div />
              <div
                className="flex justify-between pt-1 text-micro text-fg-dim"
                aria-hidden
              >
                <span>{shortDate(dates[0]!)}</span>
                <span>{shortDate(dates[dates.length - 1]!)}</span>
              </div>
            </div>
            <table className="sr-only">
              <caption>
                {copy.tableCaption ?? copy.title}
                {copy.scale ? ` (${copy.scale})` : ""}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{copy.colDate ?? ""}</th>
                  <th scope="col">{copy.energy}</th>
                  <th scope="col">{copy.calm}</th>
                  <th scope="col">{copy.focus}</th>
                </tr>
              </thead>
              <tbody>
                {points
                  .filter((p) => p.log)
                  .map((p) => (
                    <tr key={p.date}>
                      <td>{shortDate(p.date)}</td>
                      <td>{p.log!.energy}</td>
                      <td>{6 - p.log!.stress}</td>
                      <td>{p.log!.focus}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        ) : (
          <ChartEmptyFrame />
        )}
      </div>
    </div>
  );
}
