import { useTranslations } from "next-intl";

/** Range of the bar scale, in kg. Same span as the section rulers (`Rule`). */
const SCALE_MIN = 20;
const SCALE_MAX = 180;
const LABELS = [20, 60, 100, 140, 180] as const;

const at = (kg: number) => `${((kg - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;

/**
 * The hero's one idea: this morning's top set, rewritten. 150 struck in
 * mos, 135 at full size, and the page's own kg ruler with the marker
 * sliding from the old load to the new one. The numbers are the same
 * night the motor story tells further down (`engine.steps`), so the
 * hero is the answer and #engine is the reasoning.
 *
 * Server component. The only motion is CSS (`.hero-scale` in
 * globals.css): the strike draws while the marker slides, once, and
 * `prefers-reduced-motion` shows the end state.
 */
export default function HeroScale() {
  const t = useTranslations("Marketing.landing");
  const from = Number(t("hero.plateOld"));
  const to = Number(t("hero.plateNew"));
  const unit = t("hero.plateUnit");

  return (
    <figure
      className="hero-scale w-full"
      style={{ ["--from" as string]: at(from), ["--to" as string]: at(to) }}
    >
      <figcaption className="sr-only">
        {t("hero.scaleLabel", {
          lift: t("demo.sessionTitle"),
          from: t("engine.steps.decision.from"),
          to: t("engine.steps.decision.to"),
        })}
      </figcaption>

      <div aria-hidden="true">
        <p className="flex justify-between gap-4 text-[13px] text-fg-dim">
          <span>
            <span className="text-fg">{t("demo.sessionTitle")}</span> · {t("demo.topSetLabel")}
          </span>
          <span>
            {t("engine.steps.decision.source")} · {t("engine.steps.decision.time").slice(0, 5)}
          </span>
        </p>

        <p className="mt-6 lg:mt-10">
          <span className="strike-signal font-display text-[clamp(40px,5vw,72px)] leading-none text-fg-faint">
            {from}
          </span>
        </p>
        <p className="font-display -mt-[0.06em] flex items-baseline gap-[0.08em] leading-[0.82] tracking-[-0.045em]">
          <span className="text-[clamp(150px,21vw,300px)]">{to}</span>
          <span className="text-[clamp(22px,2.2vw,32px)] tracking-normal text-fg-dim">{unit}</span>
        </p>

        <div className="hero-scale__track relative mt-8 lg:mt-12">
          <i className="hero-scale__gap" />
          <i className="hero-scale__ghost" />
          <i className="hero-scale__marker" />
          <div className="relative mt-4 h-4 text-[12px] text-fg-dim">
            {LABELS.map((kg, i) => (
              <span
                key={kg}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: at(kg) }}
              >
                {i === LABELS.length - 1 ? `${kg} ${unit}` : kg}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[13px] text-fg-dim">
          {t("engine.steps.sleep.label")} <span className="text-fg">{t("engine.steps.sleep.value")}</span>
          {" · "}
          {t("engine.steps.hrv.label")}{" "}
          <span className="text-fg">
            {t("engine.steps.hrv.value")} {t("engine.steps.hrv.unit")}
          </span>
          {" · "}
          {t("engine.steps.stress.label")}{" "}
          <span className="text-fg">
            {t("engine.steps.stress.value")}
            {t("engine.steps.stress.unit")}
          </span>
        </p>
      </div>
    </figure>
  );
}
