import Sparkline from "@/components/ui/Sparkline";
import type { FormCheckProgression } from "@/app/(app)/profile/page";

/**
 * "Look how far you've come" card at the top of the form-check
 * section on /profile. The full member history is below it, but this
 * is what gives the retention payoff — see your score climb across
 * months of coaching.
 *
 * Renders nothing for empty history (the list below shows the empty
 * state). Renders a stat-row when there's just one form-check (no
 * trend yet, but show the score). Adds sparkline + delta from 2+.
 */
export default function FormCheckProgressionCard({
  progression,
}: {
  progression: FormCheckProgression;
}) {
  if (progression.count === 0) return null;

  const showTrend = progression.count >= 2;
  const delta = progression.deltaSinceFirst ?? 0;
  const trendColor =
    delta > 0 ? "var(--fg)" : delta < 0 ? "var(--fg-faint)" : "var(--fg-dim)";

  return (
    <div className="surface rounded-xl p-5 md:p-6 mb-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="eyebrow mb-2">Progression</div>
          <div className="flex items-baseline gap-2">
            <span className="numeric text-4xl">{progression.latestScore}</span>
            <span className="text-fg-dim text-sm">/ 100 seneste</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            <span>
              {progression.count}{" "}
              {progression.count === 1 ? "form-check" : "form-checks"}
            </span>
            {progression.averageScore != null ? (
              <span>Snit {progression.averageScore}</span>
            ) : null}
            {showTrend ? (
              <span style={{ color: trendColor }}>
                {delta > 0 ? "+" : ""}
                {delta} siden første
              </span>
            ) : null}
          </div>
        </div>

        {showTrend ? (
          <div
            className="text-fg/80 w-full sm:w-40"
            aria-label="Score-udvikling over tid"
          >
            <Sparkline data={progression.scoreSeries} height={48} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
