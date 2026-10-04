import ChartEmptyFrame from "@/components/ui/ChartEmptyFrame";
import HrvBandRange from "@/components/hrv/HrvBandRange";
import {
  buildBandRangeModel,
  type HrvBandView,
  type QualitativeBand,
} from "@/lib/hrv/band";

export type HrvBandCopy = {
  eyebrow: string;
  latest: string;
  unit: string;
  avg: string;
  qualitative: Record<QualitativeBand, string>;
  emptyTitle: string;
  emptyBody: string;
  buildingTitle: string;
  buildingBody: string;
  buildingNights: string;
  steadyEyebrow: string;
  engineBelow: string;
  engineAbove: string;
  disclaimer: string;
  legendBand: string;
  legendAvg: string;
  rangeLabel: string;
};

/**
 * Daily Heart hero: large HRV, Ro/Midt/Lav, personal band, engine cue.
 * Charcoal card; heart ink only on the kicker, pulse, and data marks.
 */
export default function HrvBandHero({
  view,
  copy,
}: {
  view: HrvBandView;
  copy: HrvBandCopy;
}) {
  const range = buildBandRangeModel(view);
  const hasRange = view.bandLowMs != null && view.bandHighMs != null;
  // "Dit normalområde 54–68 ms": the band in numbers, seen and spoken.
  const rangeText = hasRange
    ? `${view.bandLowMs}–${view.bandHighMs} ${copy.unit}`
    : null;
  const rangeAria = [
    rangeText ? `${copy.rangeLabel}: ${rangeText}` : copy.rangeLabel,
    view.latestMs != null ? `${copy.latest}: ${view.latestMs} ${copy.unit}` : null,
    view.qualitative ? copy.qualitative[view.qualitative] : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <section
      data-hrv-band={view.state}
      data-domain="heart"
      className="surface-2 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-5 md:px-8 border-b hairline flex items-center gap-2">
        {view.state !== "empty" ? <span className="pulse-dot" /> : null}
        <span className="eyebrow eyebrow-domain">{copy.eyebrow}</span>
      </div>

      {view.state === "empty" ? (
        <div className="px-6 py-8 md:px-8 md:py-10">
          <h2 className="font-display text-2xl md:text-3xl leading-tight mb-3">
            {copy.emptyTitle}
          </h2>
          <p className="text-fg-dim text-sm md:text-base leading-relaxed max-w-md">
            {copy.emptyBody}
          </p>
          <div className="mt-6" aria-hidden>
            <ChartEmptyFrame />
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="eyebrow mb-2">{copy.latest}</div>
          <div className="flex items-end gap-x-8 gap-y-3 flex-wrap">
            <div className="numeric text-hero md:text-hero-lg">
              {view.latestMs ?? "—"}
              <span className="text-fg-dim text-2xl md:text-3xl ml-2">
                {copy.unit}
              </span>
            </div>
            {view.qualitative ? (
              <p
                data-qualitative={view.qualitative}
                className="inline-flex items-center gap-3 font-display text-3xl md:text-4xl leading-none"
              >
                {/* Same dot as today's mark on the band below. */}
                <span aria-hidden className="size-2.5 rounded-full bg-domain" />
                {copy.qualitative[view.qualitative]}
              </p>
            ) : (
              <p className="text-sm text-fg-dim max-w-[12rem] leading-relaxed">
                {copy.buildingNights}
              </p>
            )}
          </div>

          {view.state === "building" ? (
            <p className="text-fg-dim text-sm md:text-base mt-5 max-w-md leading-relaxed">
              {copy.buildingBody}
            </p>
          ) : (
            <div className="mt-8 max-w-2xl space-y-3">
              <p data-hrv-normal-range className="text-copy text-fg-body">
                {copy.steadyEyebrow}
                {rangeText ? (
                  <>
                    {" "}
                    <span className="numeric font-medium text-fg">{rangeText}</span>
                  </>
                ) : null}
              </p>
              <div className="-mx-5">
                <HrvBandRange
                  model={range}
                  label={rangeAria}
                  lowMs={view.bandLowMs}
                  highMs={view.bandHighMs}
                />
              </div>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-micro text-fg-dim">
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-full bg-domain" />
                  {copy.latest}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-4 bg-domain-tint border border-domain-line" />
                  {copy.legendBand}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-3 border-l border-dashed border-domain" />
                  {copy.legendAvg}
                  {view.avgMs != null ? ` · ${view.avgMs} ${copy.unit}` : ""}
                </li>
              </ul>
            </div>
          )}

          {view.engineCue ? (
            <p
              data-engine-cue={view.engineCue}
              className="text-sm md:text-base text-fg-dim leading-relaxed mt-6 max-w-lg"
            >
              {view.engineCue === "below" ? copy.engineBelow : copy.engineAbove}
            </p>
          ) : null}
        </div>
      )}

      <div className="px-6 py-3 md:px-8 border-t hairline">
        <p className="text-micro text-fg-dim leading-relaxed">
          {copy.disclaimer}
        </p>
      </div>
    </section>
  );
}
