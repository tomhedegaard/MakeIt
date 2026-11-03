import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { MOTOR_STEPS } from "@/lib/marketing/landing/motor-story";
import { NIGHT_BAND, NIGHT_CURVE_PATH, NIGHT_READINGS } from "@/lib/marketing/landing/night-curve";

const AXIS = [
  { key: "t0", left: "4%", shift: "" },
  { key: "t1", left: "36.5%", shift: "-translate-x-1/2 max-sm:hidden" },
  { key: "t2", left: "79.76%", shift: "-translate-x-1/2" },
  { key: "t3", left: "96%", shift: "-translate-x-full" },
] as const;

const DOMAIN = Object.fromEntries(MOTOR_STEPS.map((s) => [s.key, s.domain])) as Record<string, string>;

/**
 * The night as an instrument (docs/LANDING_BRIEF.md, the page's peak).
 * A local Nord nat block at the top of the motor section: the clock
 * runs from 23:40 to 06:45, the night's HRV curve draws itself across
 * the whole width, and the three readings land on it, each in its
 * domain colour. All of it is driven by the block's own view timeline
 * in globals.css (`[data-night]`): the clock is two CSS counters on a
 * registered integer, the curve is `stroke-dashoffset`, the readings
 * are opacity and transform. No JS. On wide, tall screens the stage
 * holds while the night scrolls past; elsewhere the block simply
 * passes. Without view timelines the clock reads 23:40 and the curve
 * stands complete; with reduced motion everything stands at 06:45.
 *
 * The dawn (`[data-dawn]`) is anchored to this block's exit, so morning
 * breaks on the heading that follows.
 */
export default function NightStage() {
  const t = useTranslations("Marketing.landing.engine");
  const n = (k: string) => t(`night.${k}`);

  return (
    <div data-night data-theme="nat" className="bg-bg text-fg">
      <div className="night-stage mx-auto flex max-w-[1360px] flex-col justify-between gap-8 px-4 py-8 md:px-8 lg:py-10">
        <p className="flex justify-between gap-3 text-micro text-fg-dim">
          <span>
            {n("label")} · {n("t0")} → {n("t3")}
          </span>
          <span>{n("sample")}</span>
        </p>

        <p aria-hidden="true" className="night-clock font-display tracking-[-0.04em]! text-[clamp(96px,20vw,300px)] leading-[0.85]!" />

        <figure data-night-curve className="m-0">
          <svg viewBox="0 0 1000 214" aria-hidden="true" className="block h-auto w-full overflow-visible">
            {NIGHT_BAND.map((line) => (
              <line
                key={line.ms}
                x1="40"
                x2="960"
                y1={line.y}
                y2={line.y}
                strokeDasharray="3 5"
                className="stroke-line-bright"
              />
            ))}
            <line x1="40" x2="960" y1="206" y2="206" className="stroke-line-strong" />
            <path
              d={NIGHT_CURVE_PATH}
              pathLength={1}
              fill="none"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="night-path stroke-fg"
            />
            {NIGHT_READINGS.map((r) => (
              <circle
                key={r.key}
                data-domain={DOMAIN[r.key]}
                style={{ "--at": r.at } as CSSProperties}
                cx={r.cx}
                cy={r.cy}
                r="5"
                strokeWidth="2"
                className="night-dot fill-bg stroke-domain"
              />
            ))}
          </svg>
          <figcaption aria-hidden="true" className="relative mt-2.5 h-5 text-micro text-fg-dim">
            {AXIS.map((tick) => (
              <span key={tick.key} style={{ left: tick.left }} className={`absolute top-0 whitespace-nowrap ${tick.shift}`}>
                {n(tick.key)}
              </span>
            ))}
          </figcaption>
        </figure>

        <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
          {NIGHT_READINGS.map((r) => {
            const unit = r.key === "hrv" || r.key === "stress" ? t(`steps.${r.key}.unit`) : null;
            return (
              <li
                key={r.key}
                data-domain={DOMAIN[r.key]}
                style={{ "--at": r.at } as CSSProperties}
                className="night-reading border-t border-line-strong pt-4"
              >
                <p className="flex items-center gap-2.5 text-[13px] font-medium text-domain">
                  <i aria-hidden="true" className="size-2 rounded-full bg-domain" />
                  {t(`steps.${r.key}.label`)}
                  <span className="ml-auto font-normal text-fg-dim">{t(`steps.${r.key}.source`)}</span>
                </p>
                <p className="font-display mt-3 whitespace-nowrap text-[clamp(40px,4.6vw,72px)] tracking-[-0.03em]!">
                  {t(`steps.${r.key}.value`)}
                  {unit ? <small className="ml-1.5 text-[0.42em] text-fg-dim">{unit}</small> : null}
                </p>
                <p className="mt-2 max-w-[34ch] text-[15px] text-fg-dim">{t(`steps.${r.key}.note`)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
