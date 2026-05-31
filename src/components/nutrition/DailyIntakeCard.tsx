import type { DailyIntake } from "@/lib/data/nutrition-intake";

/**
 * Today's intake vs. target — calories + protein, each with a thin
 * progress bar. Fed by getDailyIntake(). When no target exists (no
 * plan, no profile target) the bar is omitted and only the consumed
 * number shows. The off-plan portion of the total is called out so
 * the member sees how much came from "Spiste noget andet" logs.
 */
export default function DailyIntakeCard({ intake }: { intake: DailyIntake }) {
  const {
    consumedKcal,
    consumedProtein,
    targetKcal,
    targetProtein,
    offPlanKcal,
    offPlanProtein,
  } = intake;

  return (
    <article className="surface-2 rounded-2xl p-5 lg:p-6">
      <div className="eyebrow mb-4">I dag</div>

      <div className="grid grid-cols-2 gap-5">
        <Metric label="Kalorier" unit="kcal" consumed={consumedKcal} target={targetKcal} />
        <Metric label="Protein" unit="g" consumed={consumedProtein} target={targetProtein} />
      </div>

      {offPlanKcal > 0 ? (
        <p className="text-xs text-fg-faint mt-4">
          Heraf off-plan:{" "}
          <span className="numeric text-fg-dim">{offPlanKcal} kcal</span>
          {" · "}
          <span className="numeric text-fg-dim">{offPlanProtein} g protein</span>
        </p>
      ) : null}
    </article>
  );
}

function Metric({
  label,
  unit,
  consumed,
  target,
}: {
  label: string;
  unit: string;
  consumed: number;
  target: number | null;
}) {
  const pct =
    target && target > 0
      ? Math.min(100, Math.round((consumed / target) * 100))
      : null;
  const over = target != null && consumed > target;

  return (
    <div>
      <div className="text-sm text-fg-dim">{label}</div>
      <div className="font-display text-3xl leading-[1] mt-1 numeric">
        {consumed}
        {target != null ? (
          <span className="text-fg-faint text-lg"> / {target}</span>
        ) : null}
        <span className="text-fg-faint text-sm"> {unit}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-fg/10 overflow-hidden">
        {pct != null ? (
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: over ? "var(--fg-faint)" : "var(--fg)" }}
          />
        ) : null}
      </div>
    </div>
  );
}
