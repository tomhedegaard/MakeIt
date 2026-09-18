import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MOTOR_STEPS, type MotorStepKey } from "@/lib/marketing/kalk/motor-story";
import SleepScreen from "@/components/marketing/phone/screens/SleepScreen";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";
import MindCheckedScreen from "@/components/marketing/phone/screens/MindCheckedScreen";
import DecisionScreen from "@/components/marketing/phone/screens/DecisionScreen";
import { cn } from "@/lib/utils";
import MotorStoryRig from "./MotorStoryRig";
import NightCurve from "./NightCurve";
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
    <section id="engine" aria-labelledby="engine-heading" className="scroll-mt-[68px] py-[clamp(72px,8vw,128px)]">
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
          <NightCurve />
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
                  "lg:origin-top-left lg:[transform:scale(var(--rig-s))]",
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
        "lg:order-none lg:flex lg:min-h-[52vh] lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:border-line lg:py-10 lg:pl-10",
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

