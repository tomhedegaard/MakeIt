import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import { formatNumber } from "@/lib/utils";
import Progress from "@/components/ui/Progress";
import type { DailyIntake } from "@/lib/data/nutrition-intake";

type T = Awaited<ReturnType<typeof getTranslations<"Nutrition.intake">>>;

/**
 * Today's intake vs. target — calories + protein, each with the shared
 * mos progress bar. Fed by getDailyIntake(). When no target exists (no
 * plan, no profile target) the bar is omitted and only the consumed
 * number shows. The off-plan portion of the total is called out so
 * the member sees how much came from "Spiste noget andet" logs.
 */
export default async function DailyIntakeCard({ intake }: { intake: DailyIntake }) {
  const t = await getTranslations("Nutrition.intake");
  const tag = intlLocaleTag(await getLocale());
  const fmt = (n: number) => formatNumber(n, tag);
  const {
    consumedKcal,
    consumedProtein,
    targetKcal,
    targetProtein,
    offPlanKcal,
    offPlanProtein,
  } = intake;

  return (
    <article className="surface-2 p-5 lg:p-6">
      <div className="eyebrow mb-4">{t("eyebrow")}</div>

      <div className="grid grid-cols-2 gap-5">
        <Metric t={t} fmt={fmt} label={t("kcal")} unit="kcal" consumed={consumedKcal} target={targetKcal} />
        <Metric t={t} fmt={fmt} label={t("protein")} unit="g" consumed={consumedProtein} target={targetProtein} />
      </div>

      {offPlanKcal > 0 ? (
        <p className="text-meta text-fg-dim mt-4">
          {t("offPlan")}{" "}
          <span className="numeric text-fg-body">{fmt(offPlanKcal)} kcal</span>
          {" · "}
          <span className="numeric text-fg-body">
            {t("offPlanProtein", { protein: fmt(offPlanProtein) })}
          </span>
        </p>
      ) : null}
    </article>
  );
}

function Metric({
  t,
  fmt,
  label,
  unit,
  consumed,
  target,
}: {
  t: T;
  fmt: (n: number) => string;
  label: string;
  unit: string;
  consumed: number;
  target: number | null;
}) {
  return (
    <div>
      <div className="text-meta text-fg-dim">{label}</div>
      <div className="font-display text-section mt-1 numeric">
        {fmt(consumed)}
        {target != null ? (
          <span className="text-fg-dim text-copy"> / {fmt(target)}</span>
        ) : null}
        <span className="text-fg-dim text-meta"> {unit}</span>
      </div>
      {target != null && target > 0 ? (
        <Progress
          className="mt-2"
          value={Math.min(consumed, target)}
          max={target}
          label={label}
          valueText={t("progress", { consumed: fmt(consumed), target: fmt(target), unit })}
        />
      ) : (
        <div className="mt-2 h-1 bg-line" aria-hidden />
      )}
    </div>
  );
}
