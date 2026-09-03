import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import HrvSubNav from "@/components/hrv/HrvSubNav";
import TrendChart from "@/components/hrv/TrendChart";
import { getSession } from "@/lib/auth";
import { getHrvReadingSeries } from "@/lib/data/hrv";
import type { ChartReading } from "@/lib/hrv/trend-chart";
import type { ReadinessBucket } from "@/lib/hrv/types";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { buildHrvBandView } from "@/lib/hrv/band";
import { demoSteadySeries } from "@/lib/hrv/demo-series";
import { loadHrvBandCopy } from "@/lib/ui/sprint-a-copy";

/**
 * `/hrv/trends` — a member's HRV trend chart + readiness-bucket distribution.
 *
 * Reads the member's primary-connection reading history via
 * `getHrvReadingSeries`, then renders ONE of three states by series length
 * (spec §6):
 *  - Empty (0 readings) → a faint axis scaffold + reassurance copy.
 *  - Provisional (1–13 readings) → the trend chart while the baseline builds.
 *  - Active (≥14 readings) → the full chart + a 30-day bucket distribution.
 *
 * Demo mode (`getHrvReadingSeries` returns `[]`) falls into the empty state.
 *
 * The shared `HrvSubNav` at the top links between the three `/hrv` pages.
 */

/** Ordered readiness buckets for the distribution row. */
const BUCKET_ORDER: ReadinessBucket[] = [
  "very_low",
  "low",
  "normal",
  "high",
  "very_high",
];

/** Danish labels for each readiness bucket. */
const BUCKET_LABEL: Record<ReadinessBucket, string> = {
  very_low: "Langt under",
  low: "Under",
  normal: "Normal",
  high: "Over",
  very_high: "Langt over",
};

/** Window, in days, for the readiness-bucket distribution. */
const DISTRIBUTION_DAYS = 30;

export default async function HrvTrendsPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const t = await getTranslations("Hrv.trends");
  const fetched = await getHrvReadingSeries(member.id);
  const series = fetched.length === 0 && !SUPABASE_ENABLED
    ? demoSteadySeries()
    : fetched;
  const band = buildHrvBandView(series);
  const bandCopy = await loadHrvBandCopy({
    count: band.nightsCollected,
    needed: band.nightsNeeded,
  });

  const state =
    series.length === 0
      ? "empty"
      : series.length < 14
        ? "provisional"
        : "active";

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container className="py-8 lg:py-12 space-y-8">
        <HrvSubNav />

        {state === "empty" ? (
          <StateEmpty copy={bandCopy} />
        ) : state === "provisional" ? (
          <StateProvisional series={series} copy={bandCopy} />
        ) : (
          <StateActive series={series} copy={bandCopy} />
        )}
      </Container>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Empty — 0 readings                                               */
/* ---------------------------------------------------------------- */

function StateEmpty({ copy }: { copy: Awaited<ReturnType<typeof loadHrvBandCopy>> }) {
  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-7 md:px-8 md:py-10">
        <div className="eyebrow eyebrow-domain mb-3">{copy.eyebrow}</div>
        {/* Faint chart-axis scaffold — placeholder for the trend chart. */}
        <div
          aria-hidden
          className="rounded-xl border hairline aspect-[8/3] w-full flex items-end"
        >
          <div className="grid grid-cols-6 w-full h-full opacity-30">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-r hairline last:border-r-0" />
            ))}
          </div>
        </div>
        <p className="text-fg-dim text-sm md:text-base leading-relaxed mt-6 max-w-md">
          {copy.emptyBody}
        </p>
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-4">
          {copy.disclaimer}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Provisional — 1–13 readings                                      */
/* ---------------------------------------------------------------- */

function StateProvisional({
  series,
  copy,
}: {
  series: ChartReading[];
  copy: Awaited<ReturnType<typeof loadHrvBandCopy>>;
}) {
  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 md:px-8 border-b hairline flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="eyebrow eyebrow-domain">{copy.buildingTitle}</span>
      </div>
      <div className="px-6 py-7 md:px-8 md:py-9">
        <TrendChart readings={series} />
        <p className="text-fg-dim text-sm md:text-base leading-relaxed mt-6 max-w-md">
          {copy.buildingBody}
        </p>
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-4">
          {copy.disclaimer}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Active — >= 14 readings                                          */
/* ---------------------------------------------------------------- */

function StateActive({
  series,
  copy,
}: {
  series: ChartReading[];
  copy: Awaited<ReturnType<typeof loadHrvBandCopy>>;
}) {
  const dist = bucketDistribution(series);
  const band = buildHrvBandView(series);
  const latestMs = band.latestMs;
  const qualitative = band.qualitative
    ? copy.qualitative[band.qualitative]
    : null;

  return (
    <div className="space-y-8">
      <section
        id="band"
        className="surface-2 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 md:px-8 border-b hairline flex items-center justify-between gap-3 flex-wrap">
          <span className="eyebrow eyebrow-domain">{copy.steadyEyebrow}</span>
          {latestMs != null ? (
            <div className="flex items-baseline gap-2">
              <span className="numeric text-3xl md:text-4xl leading-none">
                {latestMs}
                <span className="text-fg-dim text-sm ml-1">{copy.unit}</span>
              </span>
              {qualitative ? (
                <span
                  data-qualitative={band.qualitative}
                  className="font-display text-xl"
                >
                  {qualitative}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="px-6 py-7 md:px-8 md:py-9">
          <TrendChart readings={series} />
          <div className="flex items-center gap-4 mt-4 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            <span>{copy.legendBand}</span>
            <span>{copy.legendAvg}</span>
          </div>
          {band.engineCue ? (
            <p
              data-engine-cue={band.engineCue}
              className="text-sm md:text-base text-fg-dim leading-relaxed mt-5 max-w-lg"
            >
              {band.engineCue === "below" ? copy.engineBelow : copy.engineAbove}
            </p>
          ) : null}
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-4">
            {copy.disclaimer}
          </p>
        </div>
      </section>

      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 md:px-8 border-b hairline">
          <span className="eyebrow">Readiness-fordeling</span>
        </div>
        <div className="px-6 py-7 md:px-8 md:py-9 space-y-3">
          {BUCKET_ORDER.map((bucket) => {
            const share = dist.total > 0 ? dist.counts[bucket] / dist.total : 0;
            const pct = Math.round(share * 100);
            return (
              <div key={bucket} className="flex items-center gap-4">
                <span className="text-xs text-fg-dim w-24 shrink-0">
                  {BUCKET_LABEL[bucket]}
                </span>
                <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full bg-fg"
                    style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="numeric text-xs text-fg-dim w-10 text-right shrink-0">
                  {pct}%
                </span>
              </div>
            );
          })}
          <p className="text-fg-dim text-sm leading-relaxed pt-3">
            {dist.total > 0 ? (
              <>
                Dine sidste {DISTRIBUTION_DAYS} dage: {dist.normalPct}% normal,{" "}
                {dist.underPct}% under, {dist.overPct}% over.
              </>
            ) : (
              <>Ingen readiness-data i de sidste {DISTRIBUTION_DAYS} dage.</>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Bucket distribution over the last 30 days                        */
/* ---------------------------------------------------------------- */

type BucketDistribution = {
  counts: Record<ReadinessBucket, number>;
  total: number;
  normalPct: number;
  underPct: number;
  overPct: number;
};

/**
 * Tally each readiness bucket over the last `DISTRIBUTION_DAYS` days of the
 * series — readings whose `measuredAt` is within that window of the latest
 * reading. Readings with a `null` bucket are skipped.
 */
function bucketDistribution(series: ChartReading[]): BucketDistribution {
  const counts: Record<ReadinessBucket, number> = {
    very_low: 0,
    low: 0,
    normal: 0,
    high: 0,
    very_high: 0,
  };

  const latestMs = new Date(series[series.length - 1].measuredAt).getTime();
  const cutoffMs = latestMs - DISTRIBUTION_DAYS * 24 * 60 * 60 * 1000;

  let total = 0;
  for (const r of series) {
    if (r.readinessBucket == null) continue;
    if (new Date(r.measuredAt).getTime() < cutoffMs) continue;
    counts[r.readinessBucket] += 1;
    total += 1;
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    counts,
    total,
    normalPct: pct(counts.normal),
    underPct: pct(counts.very_low + counts.low),
    overPct: pct(counts.high + counts.very_high),
  };
}
