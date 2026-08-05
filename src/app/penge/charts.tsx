"use client";

import type { MonthCashflow, SalaryMonth } from "@/lib/penge/data";
import styles from "./penge.module.css";

const GREEN = "#1e6e42";
const RED = "#c0392b";
const GOLD = "#c9a84c";
const BLUE = "#1a3a5c";
const LINE = "#d6d0c4";
const MUTED = "#7a7569";

function nb(n: number) {
  return n.toLocaleString("da-DK");
}

/** Månedlige ind/ud-søjler med hover-tooltip */
export function CashflowBars({
  months,
  incomeColor,
}: {
  months: MonthCashflow[];
  incomeColor?: string;
}) {
  if (!months.length) {
    return (
      <div className={styles.chartWrap}>
        <div className={styles.chartBaseline} />
        <div className={styles.chartBars}>
          <span className={styles.noData}>Ingen data</span>
        </div>
      </div>
    );
  }
  const mx = Math.max(...months.map((d) => Math.max(d.ind, d.ud)), 1);
  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartBaseline} />
      <div className={styles.chartBars}>
        {months.map((d) => (
          <div key={d.ym} className={styles.barGroup}>
            {d.ind > 0 && (
              <div
                className={`${styles.bar} ${styles.barIncome}`}
                style={{
                  height: `${(d.ind / mx) * 100}%`,
                  ...(incomeColor ? { background: incomeColor } : {}),
                }}
              >
                <span className={styles.barTooltip}>
                  {d.l}: +{nb(d.ind)} kr.
                </span>
              </div>
            )}
            {d.ud > 0 && (
              <div
                className={`${styles.bar} ${styles.barExpense}`}
                style={{ height: `${(d.ud / mx) * 100}%` }}
              >
                <span className={styles.barTooltip}>
                  {d.l}: −{nb(d.ud)} kr.
                </span>
              </div>
            )}
            {!d.ind && !d.ud && (
              <div className={`${styles.bar} ${styles.barEmpty}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Netto pr. måned som lille arealkurve */
export function Sparkline({ months }: { months: MonthCashflow[] }) {
  if (months.length < 2) {
    return <svg className={styles.sparkline} viewBox="0 0 300 38" preserveAspectRatio="none" />;
  }
  const nets = months.map((d) => d.ind - d.ud);
  const mn = Math.min(...nets);
  const mx = Math.max(...nets);
  const rng = mx - mn || 1;
  const W = 300, H = 38, pd = 3;
  const tx = (i: number) => pd + (i / (nets.length - 1)) * (W - pd * 2);
  const ty = (v: number) => H - pd - ((v - mn) / rng) * (H - pd * 2);
  const zy = Math.min(H - pd, Math.max(pd, ty(0)));
  const pts = nets.map((v, i) => [tx(i), ty(v)] as const);
  let areaD = `M${pts[0][0]},${zy}`;
  pts.forEach(([x, y]) => { areaD += ` L${x},${y}`; });
  areaD += ` L${pts[pts.length - 1][0]},${zy}Z`;

  return (
    <svg className={styles.sparkline} viewBox="0 0 300 38" preserveAspectRatio="none">
      <line x1={pd} x2={W - pd} y1={zy} y2={zy} stroke={LINE} strokeWidth={0.5} />
      <path d={areaD} fill={GREEN} fillOpacity={0.08} />
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={GREEN}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {nets.map((v, i) =>
        v === mx || v === mn ? (
          <circle
            key={months[i].ym}
            cx={pts[i][0]}
            cy={pts[i][1]}
            r={2.5}
            fill={v >= 0 ? GREEN : RED}
          />
        ) : null,
      )}
    </svg>
  );
}

export type AggMonth = { ym: string; l: string; ind: number; ud: number };

/** Læg flere kontis måneder sammen pr. måned (allerede periodefiltreret) */
export function aggregateMonths(series: MonthCashflow[][]): AggMonth[] {
  const months: Record<string, AggMonth> = {};
  series.forEach((arr) =>
    arr.forEach((d) => {
      if (!months[d.ym]) months[d.ym] = { ym: d.ym, l: d.l, ind: 0, ud: 0 };
      months[d.ym].ind += d.ind;
      months[d.ym].ud += d.ud;
    }),
  );
  return Object.values(months).sort((a, b) => a.ym.localeCompare(b.ym));
}

/** Stor kombineret graf: ind/ud-søjler + nettolinje med asymmetrisk nulakse */
export function CombinedChart({
  data,
  incomeColor,
}: {
  data: AggMonth[];
  incomeColor: string;
}) {
  if (!data.length) {
    return (
      <>
        <div className={styles.combinedChartArea}>
          <svg className={styles.combinedSvg} viewBox="0 0 800 200" preserveAspectRatio="none" />
        </div>
        <div className={styles.monthLabels} />
      </>
    );
  }
  const W = 800, H = 200, pdL = 36, pdR = 10, pdT = 10, pdB = 10;
  const drawH = H - pdT - pdB;
  const n = data.length;
  const barW = (W - pdL - pdR) / n;
  const gap = barW * 0.1;
  const bw = (barW - gap * 2) / 2;

  const nets = data.map((d) => d.ind - d.ud);
  const maxBar = Math.max(...data.map((d) => Math.max(d.ind, d.ud)), 1);
  const maxNet = Math.max(...nets.map(Math.abs), 1);
  // Øverste 60 % af tegnefladen til søjler/positiv netto, nederste 40 % til
  // negativ netto — som i originalen, så nulaksen ligger fast.
  const posH = drawH * 0.6;
  const negH = drawH * 0.4;
  const zeroY = pdT + posH;

  const netPts = nets.map((v, i) => {
    const x = pdL + i * barW + barW / 2;
    const y = v >= 0 ? zeroY - (v / maxNet) * posH : zeroY + (Math.abs(v) / maxNet) * negH;
    return [x, Math.max(pdT, Math.min(H - pdB, y))] as const;
  });

  return (
    <>
      <div className={styles.combinedChartArea}>
        <svg className={styles.combinedSvg} viewBox="0 0 800 200" preserveAspectRatio="none">
          {[0.25, 0.5, 0.75, 1].map((f) => {
            const y = zeroY - f * posH;
            return (
              <g key={f}>
                <line x1={pdL} x2={W - pdR} y1={y} y2={y} stroke={LINE} strokeWidth={0.4} strokeDasharray="3,3" />
                <text x={pdL - 3} y={y + 3} fontFamily="var(--penge-font-mono), monospace" fontSize={7} fill={MUTED} textAnchor="end">
                  {Math.round((f * maxBar) / 1000)}k
                </text>
              </g>
            );
          })}
          <line x1={pdL} x2={W - pdR} y1={zeroY} y2={zeroY} stroke={MUTED} strokeWidth={1} />
          <text x={pdL - 3} y={zeroY + 3} fontFamily="var(--penge-font-mono), monospace" fontSize={7} fill={MUTED} textAnchor="end">
            0
          </text>
          {[-0.5, -1].map((f) => {
            const y = zeroY - f * negH;
            return (
              <g key={f}>
                <line x1={pdL} x2={W - pdR} y1={y} y2={y} stroke={LINE} strokeWidth={0.4} strokeDasharray="3,3" />
                <text x={pdL - 3} y={y + 3} fontFamily="var(--penge-font-mono), monospace" fontSize={7} fill={RED} textAnchor="end">
                  -{Math.round((Math.abs(f) * maxNet) / 1000)}k
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x = pdL + i * barW + gap;
            const hI = (d.ind / maxBar) * posH;
            const hU = (d.ud / maxBar) * posH;
            return (
              <g key={d.ym}>
                <rect x={x} y={zeroY - hI} width={bw} height={Math.max(hI, 0.5)} fill={incomeColor} opacity={0.65} rx={1} />
                <rect x={x + bw + 1} y={zeroY - hU} width={bw} height={Math.max(hU, 0.5)} fill={RED} opacity={0.55} rx={1} />
              </g>
            );
          })}
          {netPts.length > 1 && (
            <>
              {nets.map((v, i) => {
                if (i === 0) return null;
                const col = v >= 0 && nets[i - 1] >= 0 ? GREEN : v < 0 && nets[i - 1] < 0 ? RED : null;
                if (!col) return null;
                const [x0, y0] = netPts[i - 1];
                const [x1, y1] = netPts[i];
                return (
                  <polygon
                    key={data[i].ym}
                    points={`${x0},${y0} ${x1},${y1} ${x1},${zeroY} ${x0},${zeroY}`}
                    fill={col}
                    opacity={0.08}
                  />
                );
              })}
              <polyline
                points={netPts.map((p) => p.join(",")).join(" ")}
                fill="none"
                stroke={GOLD}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {netPts.map(([x, y], i) => (
                <circle key={data[i].ym} cx={x} cy={y} r={2.8} fill={nets[i] >= 0 ? GOLD : RED} />
              ))}
            </>
          )}
        </svg>
      </div>
      <div className={styles.monthLabels}>
        {data.map((d) => (
          <span key={d.ym} className={styles.monthLabel}>{d.l}</span>
        ))}
      </div>
    </>
  );
}

export type PairMonth = { ym: string; l: string; a: number; b: number };

/** Slå to lønserier (eller andre par-serier) sammen pr. måned */
export function pairMonths(
  serieA: SalaryMonth[],
  serieB: SalaryMonth[],
): PairMonth[] {
  const months: Record<string, PairMonth> = {};
  serieA.forEach((d) => {
    if (!months[d.ym]) months[d.ym] = { ym: d.ym, l: d.l, a: 0, b: 0 };
    months[d.ym].a += d.v;
  });
  serieB.forEach((d) => {
    if (!months[d.ym]) months[d.ym] = { ym: d.ym, l: d.l, a: 0, b: 0 };
    months[d.ym].b += d.v;
  });
  return Object.values(months).sort((a, b) => a.ym.localeCompare(b.ym));
}

/** Grupperede søjler til tværsnitskortene (2 serier pr. måned) */
export function GroupedBars({
  data,
  colorA,
  colorB,
  opacityA = 0.7,
  opacityB = 0.7,
}: {
  data: PairMonth[];
  colorA: string;
  colorB: string;
  opacityA?: number;
  opacityB?: number;
}) {
  if (!data.length) {
    return (
      <>
        <div className={styles.crossChartWrap}>
          <svg className={styles.crossSvg} viewBox="0 0 400 160" preserveAspectRatio="none" />
        </div>
        <div className={styles.monthLabels} style={{ marginTop: 4 }} />
      </>
    );
  }
  const W = 400, H = 160, pdL = 30, pdR = 10, pdT = 10, pdB = 20;
  const n = data.length;
  const barW = (W - pdL - pdR) / n;
  const gap = barW * 0.1;
  const bw = (barW - gap * 2) / 2;
  const mx = Math.max(...data.map((d) => Math.max(d.a, d.b)), 1);
  const barH = (v: number) => (v / mx) * (H - pdT - pdB);
  return (
    <>
      <div className={styles.crossChartWrap}>
        <svg className={styles.crossSvg} viewBox="0 0 400 160" preserveAspectRatio="none">
          {data.map((d, i) => {
            const x = pdL + i * barW + gap;
            return (
              <g key={d.ym}>
                {d.a > 0 && (
                  <rect x={x} y={H - pdB - barH(d.a)} width={bw} height={Math.max(barH(d.a), 0.5)} fill={colorA} opacity={opacityA} rx={1} />
                )}
                {d.b > 0 && (
                  <rect x={x + bw + 1} y={H - pdB - barH(d.b)} width={bw} height={Math.max(barH(d.b), 0.5)} fill={colorB} opacity={opacityB} rx={1} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className={styles.monthLabels} style={{ marginTop: 4 }}>
        {data.map((d) => (
          <span key={d.ym} className={styles.monthLabel}>{d.l}</span>
        ))}
      </div>
    </>
  );
}

export const COLORS = { GREEN, RED, GOLD, BLUE, LINE, MUTED };
