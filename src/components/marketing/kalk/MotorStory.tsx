import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MOTOR_STEPS, type MotorStepKey } from "@/lib/marketing/kalk/motor-story";
import SleepScreen from "@/components/marketing/phone/screens/SleepScreen";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";
import MindCheckedScreen from "@/components/marketing/phone/screens/MindCheckedScreen";
import DecisionScreen from "@/components/marketing/phone/screens/DecisionScreen";
import { cn } from "@/lib/utils";
import MotorStoryRig from "./MotorStoryRig";
import Rule from "./Rule";

const PHONE_WIDTH = 288;

/**
 * Per step: where it sits in the stacked mobile flow (line, then its
 * phone) and the classes that light it up when the rig picks it.
 * Written out in full so Tailwind can see every class.
 */
const STEP_STYLE: Record<
  MotorStepKey,
  { lineOrder: string; stateOrder: string; lineOn: string; tickOn: string; stateOn: string }
> = {
  sleep: {
    lineOrder: "order-1",
    stateOrder: "order-2",
    lineOn: "lg:group-data-[active=sleep]/rr:text-fg!",
    tickOn: "lg:group-data-[active=sleep]/rr:scale-150 lg:group-data-[active=sleep]/rr:bg-fg!",
    stateOn: "lg:group-data-[active=sleep]/rig:opacity-100",
  },
  hrv: {
    lineOrder: "order-3",
    stateOrder: "order-4",
    lineOn: "lg:group-data-[active=hrv]/rr:text-fg!",
    tickOn: "lg:group-data-[active=hrv]/rr:scale-150 lg:group-data-[active=hrv]/rr:bg-fg!",
    stateOn: "lg:group-data-[active=hrv]/rig:opacity-100",
  },
  stress: {
    lineOrder: "order-5",
    stateOrder: "order-6",
    lineOn: "lg:group-data-[active=stress]/rr:text-fg!",
    tickOn: "lg:group-data-[active=stress]/rr:scale-150 lg:group-data-[active=stress]/rr:bg-fg!",
    stateOn: "lg:group-data-[active=stress]/rig:opacity-100",
  },
  decision: {
    lineOrder: "order-7",
    stateOrder: "order-8",
    lineOn: "lg:group-data-[active=decision]/rr:text-fg!",
    tickOn: "lg:group-data-[active=decision]/rr:scale-150 lg:group-data-[active=decision]/rr:bg-fg!",
    stateOn: "lg:group-data-[active=decision]/rig:opacity-100",
  },
};

const SCREENS: Record<MotorStepKey, ReactNode> = {
  sleep: <SleepScreen width={PHONE_WIDTH} />,
  hrv: <HrvScreen width={PHONE_WIDTH} />,
  stress: <MindCheckedScreen width={PHONE_WIDTH} />,
  decision: <DecisionScreen width={PHONE_WIDTH} />,
};

/**
 * Morning report (spec §4 A1, C2, C3): the night as a chart, four
 * report lines, and the phone that follows them. Server component; only
 * the rig is a client island.
 */
export default function MotorStory() {
  const t = useTranslations("Marketing.kalk.engine");

  return (
    <section id="engine" aria-labelledby="engine-heading" className="scroll-mt-[68px] py-[clamp(80px,10vw,150px)]">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <Rule />

        <div className="mt-[clamp(48px,6vw,90px)] grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end lg:gap-16">
          <div>
            <p className="eyebrow mb-5 inline-flex items-center gap-2.5 before:h-0.5 before:w-7 before:bg-fg">
              {t("eyebrow")}
            </p>
            <h2 id="engine-heading" className="font-display text-[clamp(46px,6.4vw,96px)]">
              {t("heading")}
            </h2>
            <p className="mt-6 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
          </div>
          <NightChart />
        </div>

        <div
          data-motor-story
          className="group/rr mt-16 flex flex-col lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-[clamp(40px,7vw,120px)]"
        >
          <div className="contents lg:block">
            {MOTOR_STEPS.map((step) => (
              <ReportLine key={step.key} step={step.key} domain={step.domain} />
            ))}
          </div>

          <MotorStoryRig>
            {MOTOR_STEPS.map((step) => (
              <div
                key={step.key}
                data-state={step.key}
                className={cn(
                  "mx-auto mb-16 w-fit lg:pointer-events-none lg:absolute lg:inset-0 lg:order-none lg:m-0 lg:opacity-0",
                  "transition-opacity duration-500 motion-reduce:transition-none",
                  STEP_STYLE[step.key].stateOrder,
                  STEP_STYLE[step.key].stateOn,
                )}
              >
                {SCREENS[step.key]}
              </div>
            ))}
          </MotorStoryRig>
        </div>

        <p className="mt-10 max-w-[52ch] font-mono text-[11px] tracking-[0.04em] text-fg-dim lg:mt-24">
          {t("keepOriginalNote")} {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}

function ReportLine({ step, domain }: { step: MotorStepKey; domain: string }) {
  const t = useTranslations("Marketing.kalk.engine.steps");
  const style = STEP_STYLE[step];
  const unit = step === "hrv" || step === "stress" ? t(`${step}.unit`) : null;
  const dimmable = cn(
    "transition-colors duration-400 motion-reduce:transition-none lg:group-data-[active]/rr:text-fg-dim",
    style.lineOn,
  );

  return (
    <article
      data-step={step}
      data-domain={domain}
      className={cn(
        "relative border-t border-line-strong pb-9 pt-7",
        "lg:order-none lg:flex lg:min-h-[82vh] lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:border-line lg:py-10 lg:pl-10",
        style.lineOrder,
      )}
    >
      <i
        aria-hidden="true"
        className={cn(
          "absolute -left-1 top-[calc(50%-90px)] hidden size-[7px] rounded-full border border-line-bright bg-bg lg:block",
          "transition duration-400 motion-reduce:transition-none",
          style.tickOn,
        )}
      />
      <p className="flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-dim">
        <span className="text-fg">{t(`${step}.time`)}</span>
        <span>{t(`${step}.source`)}</span>
      </p>
      <h3 className="mt-7 flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.16em] text-domain">
        <i aria-hidden="true" className="size-2 rounded-full bg-domain" />
        {t(`${step}.label`)}
      </h3>
      <p
        className={cn(
          "font-display mt-3 text-[clamp(56px,9vw,132px)] normal-case! tracking-[-0.03em]!",
          step === "decision" ? "whitespace-normal" : "whitespace-nowrap",
          dimmable,
        )}
      >
        {t(`${step}.value`)}
        {unit ? (
          <small className={cn("text-[0.42em] tracking-normal text-fg-dim", step === "hrv" && "ml-2")}>{unit}</small>
        ) : null}
      </p>
      {step === "decision" ? (
        <p className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 font-mono text-[clamp(20px,2vw,28px)]">
          <span>{t("decision.lift")}</span>
          <s className="text-fg-dim decoration-signal decoration-2">{t("decision.from")}</s>
          <span aria-hidden="true" className="text-fg-dim">
            →
          </span>
          <b className={cn("font-semibold", dimmable)}>{t("decision.to")}</b>
        </p>
      ) : null}
      <p className="mt-4 max-w-[40ch] text-[clamp(16px,1.3vw,19px)] text-fg-dim">{t(`${step}.note`)}</p>
    </article>
  );
}

/** Band lines at 68 and 54 ms, i.e. the member's own band. */
const BAND = [
  { ms: "68", y: 47.1 },
  { ms: "54", y: 73.9 },
] as const;

const SLEEP_PATH =
  "M40 140H94.1V172H137.4V188H234.8V172H299.8V156H343.1V172H418.8V188H483.8V172H559.5V156H613.6V172H700.2V156H743.5V172H776V140H797.6";
const HRV_PATH =
  "M40 67.6L50.8 66.5L61.6 66.5L72.5 66.7L83.3 64.1L94.1 60.7L104.9 62.6L115.8 61.6L126.6 63.1L137.4 62.5L148.2 63.2L159.1 65.1L169.9 66.6L180.7 67.4L191.5 63.6L202.4 63.3L213.2 64.8L224 61.7L234.8 58.7L245.6 59.9L256.5 62.8L267.3 64.7L278.1 66.7L288.9 66.6L299.8 68.2L310.6 68.4L321.4 68.4L332.2 66.5L343.1 63L353.9 61.3L364.7 62.1L375.5 62.7L386.4 62.5L397.2 63.2L408 64.1L418.8 66.4L429.6 66.8L440.5 62.8L451.3 65L462.1 64.4L472.9 63L483.8 60.8L494.6 63.4L505.4 65.2L516.2 66.8L527.1 67.3L537.9 67.6L548.7 64.8L559.5 63.5L570.4 62.6L581.2 67.5L592 71.3L602.8 70L613.6 68.1L624.5 69.5L635.3 70.1L646.1 74.4L656.9 75.4L667.8 72.9L678.6 71.8L689.4 71.1L700.2 69.9L711.1 73.9L721.9 77.9L732.7 80.8L743.5 80.9L754.4 80.1L765.2 78.1L776 78.1L786.8 78.8L797.6 85.4";

const AXIS = [
  { key: "t0", left: "4%", shift: "" },
  { key: "t1", left: "36.5%", shift: "-translate-x-1/2 max-sm:hidden" },
  { key: "t2", left: "79.76%", shift: "-translate-x-full sm:-translate-x-1/2 text-fg" },
  { key: "t3", left: "96%", shift: "-translate-x-full" },
] as const;

/** Last night as one strip (reference C `.strip`). Only the data ink carries a domain colour. */
function NightChart() {
  const t = useTranslations("Marketing.kalk.engine");
  const n = (k: string) => t(`night.${k}`);

  return (
    <figure className="m-0 rounded-[22px] border border-line bg-bg-2 px-[18px] pb-[22px] pt-5 sm:px-7 sm:pb-7 sm:pt-[26px]">
      <div className="mb-[18px] flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-dim">
        <span>
          {n("label")} · {n("t0")} → {n("t3")}
        </span>
        <span>{n("sample")}</span>
      </div>

      <svg viewBox="0 0 1000 214" aria-hidden="true" className="block h-auto w-full overflow-visible">
        {BAND.map((line) => (
          <g key={line.ms}>
            <line x1="40" x2="960" y1={line.y} y2={line.y} strokeDasharray="3 5" className="stroke-line-bright" />
            <text x="964" y={line.y} dy="3.5" fontSize="10" className="fill-fg-dim font-mono">
              {line.ms}
            </text>
          </g>
        ))}
        <line x1="40" x2="960" y1="206" y2="206" className="stroke-line-strong" />

        <g data-domain="mind">
          <path d={SLEEP_PATH} fill="none" strokeWidth="1.6" strokeLinejoin="round" strokeOpacity=".75" className="stroke-domain" />
          <line x1="40" x2="40" y1="10" y2="206" strokeOpacity=".5" className="stroke-domain" />
          <circle cx="40" cy="140" r="5" strokeWidth="2" className="fill-bg-2 stroke-domain" />
        </g>

        <g data-domain="heart">
          <path d={HRV_PATH} fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-domain" />
        </g>
        <line x1="797.6" x2="797.6" y1="0" y2="206" strokeOpacity=".55" className="stroke-fg" />
        <g data-domain="heart">
          <circle cx="797.6" cy="85.4" r="5" className="fill-domain" />
        </g>
        <text x="797.6" y="85.4" dx="-12" dy="22" fontSize="13" textAnchor="end" className="fill-fg font-mono">
          {t("steps.hrv.value")} {t("steps.hrv.unit")}
        </text>

        <g data-domain="body">
          <line x1="960" x2="960" y1="10" y2="206" strokeOpacity=".5" className="stroke-domain" />
          <circle cx="960" cy="120" r="5" strokeWidth="2" className="fill-bg-2 stroke-domain" />
        </g>
      </svg>

      <div aria-hidden="true" className="relative mt-2.5 h-5 font-mono text-[11px] text-fg-dim">
        {AXIS.map((tick) => (
          <span key={tick.key} style={{ left: tick.left }} className={cn("absolute top-0 whitespace-nowrap", tick.shift)}>
            {n(tick.key)}
          </span>
        ))}
      </div>

      <div aria-hidden="true" className="mt-[18px] flex flex-wrap gap-x-[18px] gap-y-2 font-mono text-[11px] tracking-[0.06em] text-fg-dim">
        <span data-domain="heart" className="inline-flex items-center gap-2">
          <i className="h-0.5 w-4 rounded-sm bg-domain" />
          {n("legendHrv")}
        </span>
        <span data-domain="mind" className="inline-flex items-center gap-2">
          <i className="h-0.5 w-4 rounded-sm bg-domain" />
          {n("legendSleep")}
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="h-0.5 w-4 bg-[repeating-linear-gradient(90deg,var(--line-bright)_0_3px,transparent_3px_6px)]" />
          {n("legendBand")}
        </span>
      </div>
    </figure>
  );
}
