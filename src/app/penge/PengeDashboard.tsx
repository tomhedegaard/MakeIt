"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PRIVAT_KONTI,
  VIRK_KONTI,
  LOEN,
  PERIODS,
  RAPPORT_DATO,
  filterMonths,
  fmt,
  getPeriod,
  type Account,
  type PeriodKey,
} from "@/lib/penge/data";
import {
  CashflowBars,
  Sparkline,
  CombinedChart,
  GroupedBars,
  aggregateMonths,
  pairMonths,
  COLORS,
} from "./charts";
import styles from "./penge.module.css";

type Tab = "privat" | "virksomhed" | "tvaer";

const TABS: { key: Tab; label: string; dot: string }[] = [
  { key: "privat", label: "Privat", dot: COLORS.GREEN },
  { key: "virksomhed", label: "Virksomhed", dot: COLORS.BLUE },
  { key: "tvaer", label: "Tværsnit", dot: COLORS.GOLD },
];

function sums(months: { ind: number; ud: number }[]) {
  const ind = months.reduce((s, d) => s + d.ind, 0);
  const ud = months.reduce((s, d) => s + d.ud, 0);
  return { ind, ud, net: ind - ud };
}

function statValClass(n: number) {
  return `${styles.statVal} ${n >= 0 ? styles.statValGreen : styles.statValRed}`;
}

/** Kontosaldo med ører, fx "−947.858,37 kr." */
function fmtOere(n: number) {
  return (
    (n < 0 ? "−" : "") +
    Math.abs(n).toLocaleString("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " kr."
  );
}

const BADGE_CLASS = {
  green: "badgeGreen",
  red: "badgeRed",
  neutral: "badgeNeutral",
  gold: "badgeGold",
} as const;

function KpiCard({
  label,
  account,
  period,
  barColor,
  barWidth,
  animate,
}: {
  label: string;
  account: Account;
  period: PeriodKey;
  barColor?: string;
  barWidth: number;
  animate: boolean;
}) {
  const months = filterMonths(account.months, period);
  const { net } = sums(months);
  const isCredit = account.raadighed !== undefined;
  const saldo = isCredit ? account.raadighed! : (account.saldo ?? 0);
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiName}>{account.name}</div>
      <div className={`${styles.kpiSaldo} ${saldo >= 0 ? styles.pos : styles.neg}`}>
        {fmt(saldo)}
      </div>
      <div className={styles.kpiSub}>
        {isCredit ? "rådighedsbeløb" : `netto: ${fmt(net)}`}
      </div>
      <div className={styles.kpiCount}>{months.length} mdr.</div>
      <div
        className={styles.kpiBar}
        style={{
          width: animate ? `${barWidth}%` : "0%",
          ...(barColor ? { background: barColor } : {}),
        }}
      />
    </div>
  );
}

function AccountBlock({
  account,
  period,
  incomeColor,
  indLabel = "Indbetalt",
  udLabel = "Udbetalt",
  netLabel = "Netto",
}: {
  account: Account;
  period: PeriodKey;
  incomeColor?: string;
  indLabel?: string;
  udLabel?: string;
  netLabel?: string;
}) {
  const months = filterMonths(account.months, period);
  const { ind, ud, net } = sums(months);
  const isCredit = account.raadighed !== undefined;
  return (
    <div className={styles.accountBlock}>
      <div className={styles.accHeader}>
        <div>
          <div className={styles.accNr}>{account.nr}</div>
          <div className={styles.accName}>{account.name}</div>
        </div>
        <span className={`${styles.accBadge} ${styles[BADGE_CLASS[account.badge.tone]]}`}>
          {account.badge.label}
        </span>
      </div>
      {isCredit ? (
        <>
          <div className={styles.accStats}>
            <div>
              <div className={styles.statLabel}>Rådighedsbeløb</div>
              <div className={`${styles.statVal} ${styles.statValGreen} ${styles.statValBig}`}>
                {fmt(account.raadighed!)}
              </div>
            </div>
            <div>
              <div className={styles.statLabel}>{indLabel}</div>
              <div className={`${styles.statVal} ${styles.statValGreen}`}>{fmt(ind)}</div>
            </div>
            <div>
              <div className={styles.statLabel}>{udLabel}</div>
              <div className={`${styles.statVal} ${styles.statValRed}`}>{fmt(ud)}</div>
            </div>
          </div>
          <div className={styles.raadighedBox}>
            <span className={styles.raadighedLabel}>Aktuel kontosaldo</span>
            <span className={styles.raadighedVal}>{fmtOere(account.kontosaldo!)}</span>
          </div>
        </>
      ) : (
        <>
          <div className={styles.accStats}>
            <div>
              <div className={styles.statLabel}>{indLabel}</div>
              <div className={`${styles.statVal} ${styles.statValGreen}`}>{fmt(ind)}</div>
            </div>
            <div>
              <div className={styles.statLabel}>{udLabel}</div>
              <div className={`${styles.statVal} ${styles.statValRed}`}>{fmt(ud)}</div>
            </div>
            <div>
              <div className={styles.statLabel}>{netLabel}</div>
              <div className={statValClass(net)}>{fmt(net)}</div>
            </div>
          </div>
          {months.length > 1 && (
            <div className={styles.avgRow}>
              <span className={styles.avgLabel}>Gns. pr. måned</span>
              <span className={styles.avgVals}>
                <span className={`${styles.avgItem} ${styles.pos}`}>
                  {fmt(Math.round(ind / months.length))}
                </span>
                <span className={styles.avgSep}>/</span>
                <span className={`${styles.avgItem} ${styles.neg}`}>
                  {fmt(Math.round(ud / months.length))}
                </span>
                <span className={styles.avgSep}>/</span>
                <span className={`${styles.avgItem} ${net >= 0 ? styles.pos : styles.neg}`}>
                  {fmt(Math.round(net / months.length))}
                </span>
              </span>
            </div>
          )}
        </>
      )}
      <div className={styles.chartLabel}>Månedlig cashflow</div>
      <CashflowBars months={months} incomeColor={incomeColor} />
      <div className={styles.sparklineWrap}>
        <div className={styles.chartLabel} style={{ marginTop: 8 }}>
          Netto pr. måned
        </div>
        <Sparkline months={months} />
      </div>
    </div>
  );
}

function CombinedTotals({
  items,
}: {
  items: { label: string; value: string; cls?: string; divider?: boolean }[];
}) {
  return (
    <div className={styles.combinedTotals}>
      {items.map((it) => (
        <div
          key={it.label}
          className={`${styles.combinedTotalItem} ${it.divider ? styles.combinedTotalDivider : ""}`}
        >
          <div className={styles.combinedTotalLabel}>{it.label}</div>
          <div className={`${styles.combinedTotalVal} ${it.cls ?? ""}`}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { color: string; opacity?: number; label: string }[] }) {
  return (
    <div className={styles.combinedLegend}>
      {items.map((it) => (
        <div key={it.label} className={styles.combinedLegendItem}>
          <div
            className={styles.combinedLegendLine}
            style={{ background: it.color, opacity: it.opacity ?? 1 }}
          />
          {it.label}
        </div>
      ))}
    </div>
  );
}

export default function PengeDashboard() {
  const [tab, setTab] = useState<Tab>("privat");
  const [period, setPeriod] = useState<PeriodKey>("all");
  // KPI-bjælkerne animerer fra 0 efter mount, som i originalen
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  const privatFiltered = useMemo(
    () => PRIVAT_KONTI.map((a) => filterMonths(a.months, period)),
    [period],
  );
  const virkFiltered = useMemo(
    () => VIRK_KONTI.map((a) => filterMonths(a.months, period)),
    [period],
  );

  // KPI-bjælkebredder skaleres efter største indbetaling blandt de
  // almindelige konti (kreditten har fast bredde 35 %)
  const privatBarWidths = useMemo(() => {
    const normal = [0, 1, 2, 4];
    const maxI = Math.max(...normal.map((i) => sums(privatFiltered[i]).ind), 1);
    return PRIVAT_KONTI.map((_, i) =>
      i === 3 ? 35 : (sums(privatFiltered[i]).ind / maxI) * 75 + 10,
    );
  }, [privatFiltered]);

  const virkBarWidths = useMemo(() => {
    const maxI = Math.max(...virkFiltered.map((m) => sums(m).ind), 1);
    return virkFiltered.map((m) => (sums(m).ind / maxI) * 75 + 10);
  }, [virkFiltered]);

  const privatCombined = useMemo(() => aggregateMonths(privatFiltered), [privatFiltered]);
  const virkCombined = useMemo(() => aggregateMonths([virkFiltered[0]]), [virkFiltered]);

  const { from, to, label: periodLabel } = getPeriod(period);

  // Tværsnit: løn og omsætning vs. privat forbrug
  const loenTom = LOEN.tom.filter((d) => d.ym >= from && d.ym <= to);
  const loenDina = LOEN.dina.filter((d) => d.ym >= from && d.ym <= to);
  const loenData = pairMonths(loenTom, loenDina);
  const totalTom = loenTom.reduce((s, d) => s + d.v, 0);
  const totalDina = loenDina.reduce((s, d) => s + d.v, 0);

  const omstData = useMemo(() => {
    // Driftskonto-omsætning pr. måned vs. privat forbrug (konto 2, 3 og 5)
    const virkSerie = virkFiltered[0].map((d) => ({ ym: d.ym, l: d.l, v: d.ind }));
    const privSerie = [1, 2, 4].flatMap((i) =>
      privatFiltered[i].map((d) => ({ ym: d.ym, l: d.l, v: d.ud })),
    );
    return pairMonths(virkSerie, privSerie);
  }, [virkFiltered, privatFiltered]);
  const avgVirk = Math.round(omstData.reduce((s, d) => s + d.a, 0) / (omstData.length || 1));
  const avgPriv = Math.round(omstData.reduce((s, d) => s + d.b, 0) / (omstData.length || 1));
  const ratio = avgPriv > 0 ? Math.round((avgVirk / avgPriv) * 100) : 0;

  const pSums = sums(privatCombined);
  const pN = privatCombined.length || 1;
  const vSums = sums(virkCombined);
  const vN = virkCombined.length || 1;
  const pAvgNet = Math.round(pSums.net / pN);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>
            Samlet <em>økonomi</em>
          </h1>
          <div className={styles.headerSub}>Spar Nord · AL Bank · Privat &amp; Virksomhed</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerDate}>RAPPORT GENERERET</div>
          <div className={styles.headerPeriod}>{RAPPORT_DATO}</div>
        </div>
      </header>
      <div className={styles.goldRule} />

      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className={styles.tabDot} style={{ background: t.dot }} />
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.periodBar}>
        <span className={styles.periodLabel}>Vis periode</span>
        <div className={styles.periodPills}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`${styles.pill} ${period === p.key ? styles.pillActive : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className={styles.periodRange}>{periodLabel}</span>
      </div>

      {/* ── PRIVAT ── */}
      {tab === "privat" && (
        <div>
          <div className={`${styles.kpiStrip} ${styles.kpiCols5}`}>
            {PRIVAT_KONTI.map((a, i) => (
              <KpiCard
                key={a.id}
                label={`Privat 0${i + 1}`}
                account={a}
                period={period}
                barWidth={privatBarWidths[i]}
                barColor={a.raadighed !== undefined ? COLORS.GOLD : undefined}
                animate={animate}
              />
            ))}
          </div>
          <div className={styles.content}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionNum}>01 — 05</span>
              <h2>Private konti</h2>
            </div>
            <div className={styles.accountsGrid}>
              {PRIVAT_KONTI.map((a) => (
                <AccountBlock key={a.id} account={a} period={period} />
              ))}
            </div>

            <div className={styles.combinedSection}>
              <div className={styles.combinedHead}>
                <div className={styles.combinedHeadLeft}>
                  <span className={styles.sectionNum}>Samlet</span>
                  <h2>Privat cashflow på tværs</h2>
                </div>
                <CombinedTotals
                  items={[
                    { label: "Total ind", value: fmt(pSums.ind), cls: styles.pos },
                    { label: "Total ud", value: fmt(pSums.ud), cls: styles.neg },
                    {
                      label: "Netto",
                      value: fmt(pSums.net),
                      cls: pSums.net >= 0 ? styles.pos : styles.neg,
                    },
                    { label: "Gns. ind/mdr.", value: fmt(Math.round(pSums.ind / pN)), cls: styles.pos },
                    { label: "Gns. ud/mdr.", value: fmt(Math.round(pSums.ud / pN)), cls: styles.neg },
                    {
                      label: "Netto pr. måned",
                      value: fmt(pAvgNet),
                      cls: pAvgNet >= 0 ? styles.pos : styles.neg,
                      divider: true,
                    },
                  ]}
                />
              </div>
              <div className={styles.combinedChartOuter}>
                <CombinedChart data={privatCombined} incomeColor={COLORS.GREEN} />
                <Legend
                  items={[
                    { color: COLORS.GREEN, opacity: 0.7, label: "Indbetalinger" },
                    { color: COLORS.RED, opacity: 0.6, label: "Udbetalinger" },
                    { color: COLORS.GOLD, label: "Netto (linje)" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIRKSOMHED ── */}
      {tab === "virksomhed" && (
        <div>
          <div className={`${styles.kpiStrip} ${styles.kpiCols3}`}>
            {VIRK_KONTI.map((a, i) => (
              <KpiCard
                key={a.id}
                label={`Virksomhed 0${i + 1}`}
                account={a}
                period={period}
                barWidth={virkBarWidths[i]}
                barColor={COLORS.BLUE}
                animate={animate}
              />
            ))}
          </div>
          <div className={styles.content}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionNum}>01 — 03</span>
              <h2>Virksomhedskonti · AL Bank</h2>
            </div>
            <div className={`${styles.accountsGrid} ${styles.accountsGridCols3}`}>
              {VIRK_KONTI.map((a, i) => (
                <AccountBlock
                  key={a.id}
                  account={a}
                  period={period}
                  incomeColor={COLORS.BLUE}
                  indLabel={i === 0 ? "Omsætning ind" : "Indbetalt"}
                  udLabel={i === 0 ? "Udgifter ud" : "Udbetalt"}
                  netLabel={i === 1 ? "Saldo" : "Netto"}
                />
              ))}
            </div>

            <div className={styles.combinedSection}>
              <div className={styles.combinedHead}>
                <div className={styles.combinedHeadLeft}>
                  <span className={styles.sectionNum}>Samlet</span>
                  <h2>Driftskonto cashflow</h2>
                </div>
                <CombinedTotals
                  items={[
                    { label: "Total ind", value: fmt(vSums.ind), cls: styles.pos },
                    { label: "Total ud", value: fmt(vSums.ud), cls: styles.neg },
                    {
                      label: "Netto",
                      value: fmt(vSums.net),
                      cls: vSums.net >= 0 ? styles.pos : styles.neg,
                    },
                    { label: "Gns. omsætning/mdr.", value: fmt(Math.round(vSums.ind / vN)), cls: styles.pos },
                    { label: "Gns. udgifter/mdr.", value: fmt(Math.round(vSums.ud / vN)), cls: styles.neg },
                  ]}
                />
              </div>
              <div className={styles.combinedChartOuter}>
                <CombinedChart data={virkCombined} incomeColor={COLORS.BLUE} />
                <Legend
                  items={[
                    { color: COLORS.BLUE, opacity: 0.7, label: "Omsætning ind" },
                    { color: COLORS.RED, opacity: 0.6, label: "Udgifter ud" },
                    { color: COLORS.GOLD, label: "Netto (linje)" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TVÆRSNIT ── */}
      {tab === "tvaer" && (
        <div className={styles.content} style={{ paddingTop: 40 }}>
          <div className={styles.sectionHead} style={{ paddingTop: 0 }}>
            <span className={styles.sectionNum}>Tværsnit</span>
            <h2>Privat møder Virksomhed</h2>
          </div>
          <div className={styles.crossGrid}>
            <div className={styles.crossCard}>
              <h3>💸 Løn fra virksomhed → privat</h3>
              <GroupedBars data={loenData} colorA={COLORS.GREEN} colorB={COLORS.BLUE} />
              <div className={styles.crossStatRow}>
                <div className={styles.crossStat}>
                  <div className={styles.crossStatLabel}>Total løn (Tom)</div>
                  <div className={`${styles.crossStatVal} ${styles.pos}`}>{fmt(totalTom)}</div>
                </div>
                <div className={styles.crossStat}>
                  <div className={styles.crossStatLabel}>Total løn (hustru)</div>
                  <div className={`${styles.crossStatVal} ${styles.pos}`}>{fmt(totalDina)}</div>
                </div>
                <div className={styles.crossStat}>
                  <div className={styles.crossStatLabel}>Gns. pr. måned</div>
                  <div className={styles.crossStatVal}>
                    {fmt(Math.round((totalTom + totalDina) / (loenData.length || 1)))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.crossCard}>
              <h3>📊 Virksomhed omsætning vs. privat forbrug</h3>
              <GroupedBars
                data={omstData}
                colorA={COLORS.BLUE}
                colorB={COLORS.RED}
                opacityA={0.65}
                opacityB={0.55}
              />
              <div className={styles.crossStatRow}>
                <div className={styles.crossStat}>
                  <div className={styles.crossStatLabel}>Gns. omsætning/mdr.</div>
                  <div className={`${styles.crossStatVal} ${styles.pos}`}>{fmt(avgVirk)}</div>
                </div>
                <div className={styles.crossStat}>
                  <div className={styles.crossStatLabel}>Gns. privat ud/mdr.</div>
                  <div className={`${styles.crossStatVal} ${styles.neg}`}>{fmt(avgPriv)}</div>
                </div>
                <div className={styles.crossStat}>
                  <div className={styles.crossStatLabel}>Dækningsgrad</div>
                  <div className={styles.crossStatVal}>{ratio}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          Spar Nord · AL Bank · Privat &amp; Virksomhed · Data 2024–2026 · Anonymiseret
        </div>
        <div className={styles.footerRight}>
          <span>
            <span className={styles.legendDot} style={{ background: COLORS.GREEN }} />
            Privat
          </span>
          <span>
            <span className={styles.legendDot} style={{ background: COLORS.BLUE }} />
            Virksomhed
          </span>
          <span>
            <span className={styles.legendDot} style={{ background: COLORS.GOLD }} />
            Tværsnit
          </span>
        </div>
      </footer>
    </div>
  );
}
