import { getTranslations } from "next-intl/server";
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
export default async function FormCheckProgressionCard({
  progression,
}: {
  progression: FormCheckProgression;
}) {
  if (progression.count === 0) return null;

  const t = await getTranslations("Profile.progression");

  const showTrend = progression.count >= 2;
  const delta = progression.deltaSinceFirst ?? 0;
  const trendColor =
    delta > 0 ? "var(--fg)" : delta < 0 ? "var(--fg-faint)" : "var(--fg-dim)";

  return (
    <div className="surface rounded-xl p-5 md:p-6 mb-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="eyebrow mb-2">{t("eyebrow")}</div>
          <div className="flex items-baseline gap-2">
            <span className="numeric text-4xl">{progression.latestScore}</span>
            <span className="text-fg-dim text-sm">{t("latest")}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            <span>
              {progression.count === 1
                ? t("formCheckOne", { count: progression.count })
                : t("formCheckOther", { count: progression.count })}
            </span>
            {progression.averageScore != null ? (
              <span>{t("average", { value: progression.averageScore })}</span>
            ) : null}
            {showTrend ? (
              <span style={{ color: trendColor }}>
                {t("sinceFirst", { sign: delta > 0 ? "+" : "", value: delta })}
              </span>
            ) : null}
          </div>
        </div>

        {showTrend ? (
          <div
            className="text-fg/80 w-full sm:w-40"
            aria-label={t("sparklineAria")}
          >
            <Sparkline data={progression.scoreSeries} height={48} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
