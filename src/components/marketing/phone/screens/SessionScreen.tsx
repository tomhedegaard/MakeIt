import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Label, Pill, Row } from "./parts";
import { Check, Minus, Plus } from "lucide-react";
import { ICON } from "@/components/ui/icon";

/**
 * Træn, live session (reference B "Session (dark)"). Design rule: the
 * session state is always dark, so the frame always gets `dark`.
 */
export default function SessionScreen({ width, scroll = false }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.landing");
  const s = useTranslations("Marketing.landing.screens");
  const se = useTranslations("Session");
  const weight = t("hero.plateNew");
  const setValue = s("session.setValue");

  return (
    <PhoneFrame label={s("session.aria")} tab="train" width={width} scroll={scroll} dark>
      <div className="flex items-center justify-between">
        <Label>{s("program")}</Label>
        <Label>{s("session.day")}</Label>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>{se("exercise.position", { current: 1, total: 5 })}</Label>
          <Label className="text-fg">{se("topBar.setsCount", { completed: 7, total: 16 })}</Label>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-line-strong">
          <i className="block h-full w-[44%] bg-signal" />
        </div>
      </div>

      <p className="mt-[3px] font-display text-[40px]">
        {t("engine.steps.decision.lift")}
      </p>

      <div className="flex gap-[5px]">
        {[`${weight} ${t("hero.plateUnit")}`, s("session.targetReps"), s("session.targetRpe")].map(
          (target, i) => (
            <span
              key={target}
              className={
                i === 0
                  ? "bg-fg px-2 py-[5px] text-[10px] text-bg"
                  : "border border-line-strong px-2 py-[5px] text-[10px]"
              }
            >
              {target}
            </span>
          ),
        )}
      </div>

      <div className="flex flex-col">
        {[1, 2, 3].map((n) => {
          const current = n === 3;
          return (
            <div
              key={n}
              className="grid grid-cols-[34px_1fr_auto] items-center border-b border-line-strong py-1.5 text-[10px]"
            >
              {current ? (
                <span className="font-medium">{n}</span>
              ) : (
                <span className="grid size-3.5 place-items-center rounded-full bg-fg text-bg">
                  <Check {...ICON} className="size-2" />
                </span>
              )}
              <span className={current ? "" : "text-fg-dim"}>
                {s("session.set", { n })}
                {current ? (
                  <em className="ml-1 not-italic lowercase text-signal">{se("sets.now")}</em>
                ) : null}
              </span>
              <span className={current ? "" : "text-fg-dim"}>{setValue}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: se("steppers.weight"), value: weight },
          { label: se("steppers.reps"), value: "3" },
        ].map((st) => (
          <div key={st.label} className="border border-line-strong bg-bg-3 px-2 py-1.5">
            <Label>{st.label}</Label>
            <div className="mt-0.5 flex items-center justify-between">
              <StepButton sign="minus" />
              <b className="font-display text-[26px]">{st.value}</b>
              <StepButton sign="plus" />
            </div>
          </div>
        ))}
      </div>

      <Pill>{se("cta.logSet")}</Pill>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 border border-dashed border-line-strong px-2.5 py-2 text-[10px]">
          <span className="size-2.5 flex-none rounded-full bg-danger" />
          <span>
            {se("exercise.formCheck", { set: 3 })} · {s("session.sendTo")}
          </span>
        </div>
        <svg viewBox="0 0 34 34" className="size-[34px] flex-none">
          <circle cx="17" cy="17" r="14" fill="none" strokeWidth="3" className="stroke-line-strong" />
          <circle
            cx="17"
            cy="17"
            r="14"
            fill="none"
            className="stroke-fg"
            strokeWidth="3"
            strokeDasharray="88"
            strokeDashoffset="30"
            strokeLinecap="square"
            transform="rotate(-90 17 17)"
          />
          <text x="17" y="19.5" textAnchor="middle" fontSize="7.5" className="fill-fg">
            {s("session.restValue")}
          </text>
        </svg>
      </div>
      <Label className="-mt-1 justify-end">
        {se("cta.rest")} {s("session.restValue")}
      </Label>
      {scroll ? (
        <>
          <div>
            <Label className="mb-1">{s("session.nextLabel")}</Label>
            {([1, 2, 3, 4] as const).map((n) => (
              <Row key={n} k={s(`session.next${n}`)} v={s(`session.next${n}v`)} last={n === 4} className="border-line-strong" />
            ))}
          </div>
          <div className="border border-dashed border-line-strong px-2.5 py-2">
            <Label>{s("session.noteLabel")}</Label>
            <p className="mt-1 text-[10.5px]">{s("session.note")}</p>
          </div>
        </>
      ) : null}
    </PhoneFrame>
  );
}

function StepButton({ sign }: { sign: "minus" | "plus" }) {
  return (
    <i className="grid size-[22px] place-items-center rounded-full border border-line-strong">
      {sign === "plus" ? <Plus {...ICON} className="size-[9px]" /> : <Minus {...ICON} className="size-[9px]" />}
    </i>
  );
}
