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
          <div
            aria-hidden
            className="mt-6 rounded-xl border hairline h-9 w-full opacity-40"
          />
        </div>
      ) : (
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="eyebrow mb-2">{copy.latest}</div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="numeric text-7xl md:text-8xl leading-[0.85]">
              {view.latestMs ?? "—"}
              <span className="text-fg-dim text-2xl md:text-3xl ml-2">
                {copy.unit}
              </span>
            </div>
            {view.qualitative ? (
              <p
                data-qualitative={view.qualitative}
                className="font-display text-3xl md:text-4xl leading-none"
              >
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
            <div className="mt-6 space-y-2">
              <div className="eyebrow">{copy.steadyEyebrow}</div>
              <HrvBandRange model={range} label={copy.rangeLabel} />
              <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                <span>{copy.legendBand}</span>
                <span>
                  {copy.legendAvg}
                  {view.avgMs != null ? ` · ${view.avgMs} ${copy.unit}` : ""}
                </span>
              </div>
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
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
          {copy.disclaimer}
        </p>
      </div>
    </section>
  );
}
