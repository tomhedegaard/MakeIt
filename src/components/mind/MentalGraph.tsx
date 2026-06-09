import type { MindCheckLog } from "@/lib/mind/types";
import { utcDateNDaysAgo } from "@/lib/mind/streak";

/**
 * 30-day mental graph — three lines (energy, stress inverted so up=good,
 * focus). Pure SVG, server-renderable. Uses logged_date as x-axis.
 *
 * Stress is inverted (5 - stress) so all three lines read "higher = good".
 * Otherwise the graph would zig-zag against the user's mental model.
 */
export default function MentalGraph({
  logs,
  days = 30,
}: {
  logs: MindCheckLog[];
  days?: number;
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

  const w = 800;
  const h = 220;
  const padL = 32;
  const padR = 8;
  const padT = 16;
  const padB = 24;

  const xStep = (w - padL - padR) / Math.max(1, days - 1);
  const y = (v: number) => padT + ((5 - v) / 4) * (h - padT - padB);

  const path = (key: "energy" | "stress" | "focus", invert = false) => {
    let d = "";
    let started = false;
    for (const p of points) {
      if (!p.log) {
        started = false;
        continue;
      }
      const raw = p.log[key];
      const v = invert ? 6 - raw : raw;
      const px = padL + p.i * xStep;
      const py = y(v);
      d += started ? ` L ${px.toFixed(1)} ${py.toFixed(1)}` : `M ${px.toFixed(1)} ${py.toFixed(1)}`;
      started = true;
    }
    return d;
  };

  const energyDots = points
    .filter((p) => p.log)
    .map((p) => ({
      cx: padL + p.i * xStep,
      cy: y(p.log!.energy),
    }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Mental graf — sidste 30 dage</h2>
        <div className="flex items-center gap-3 text-xs text-fg-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-300" />
            Energi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-sky-300" />
            Ro (omvendt stress)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-300" />
            Fokus
          </span>
        </div>
      </div>
      <div className="rounded-2xl border hairline bg-bg-2/40 p-4">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          role="img"
          aria-label="Mental graf — energi, ro, fokus de seneste 30 dage"
        >
          {/* gridlines at 1, 3, 5 */}
          {[1, 3, 5].map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="2 4"
              />
              <text
                x={padL - 6}
                y={y(v) + 3}
                fontSize={9}
                textAnchor="end"
                fill="currentColor"
                opacity={0.4}
              >
                {v}
              </text>
            </g>
          ))}

          <path d={path("stress", true)} fill="none" stroke="rgb(125 211 252)" strokeWidth={1.5} />
          <path d={path("focus")} fill="none" stroke="rgb(110 231 183)" strokeWidth={1.5} />
          <path d={path("energy")} fill="none" stroke="rgb(253 224 71)" strokeWidth={1.5} />

          {energyDots.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={2} fill="rgb(253 224 71)" />
          ))}
        </svg>
      </div>
    </div>
  );
}
