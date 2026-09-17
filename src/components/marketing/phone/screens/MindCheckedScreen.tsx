import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Headline, Kicker, Label, Pill } from "./parts";

const SCALES = [
  { key: "energy", value: "energyValue", filled: 3, fill: "bg-mind-energy", strong: false },
  { key: "stress", value: "stressValue", filled: 4, fill: "bg-mind-stress", strong: true },
  { key: "focus", value: "focusValue", filled: 3, fill: "bg-mind-focus", strong: false },
] as const;

/** Stress over the last seven days (1 to 5); the last point is last night. */
const STRESS_LINE = "M8 60L52 60L96 44L140 60L184 60L228 44L272 12";

/** Sind: last night's mind-check (reference A state 3). */
export default function MindCheckedScreen({ width }: { width?: number }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");

  return (
    <PhoneFrame label={s("mindChecked.aria")} tab="mind" width={width}>
      <div data-domain="mind" className="mt-1">
        <Kicker domain="mind" dot>
          {t("systems.mind.kicker")} · {s("mind.title")}
        </Kicker>
        <Headline className="mt-1 text-[30px]">{s("mindChecked.heading")}</Headline>
        <p className="mt-1 text-[10.5px] text-fg-dim">{t("systems.mind.text")}</p>
      </div>

      <div>
        {SCALES.map((scale, i) => (
          <div
            key={scale.key}
            className={
              "grid grid-cols-[52px_1fr_28px] items-center gap-2 border-t border-line py-[7px]" +
              (i === SCALES.length - 1 ? " border-b" : "")
            }
          >
            <span className="text-[10.5px]">{t(`systems.mind.${scale.key}`)}</span>
            <span className="grid grid-cols-5 gap-[3px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <i
                  key={n}
                  className={"h-1.5 rounded-full " + (n <= scale.filled ? scale.fill : "bg-line-strong")}
                />
              ))}
            </span>
            <span
              className={
                "text-right font-mono text-[10px] " + (scale.strong ? "font-semibold text-fg" : "text-fg-dim")
              }
            >
              {s(`mindChecked.${scale.value}`)}
            </span>
          </div>
        ))}
      </div>

      <Card className="pb-2">
        <svg viewBox="0 0 280 84" className="w-full">
          {[12, 44, 76].map((y) => (
            <line key={y} x1="0" y1={y} x2="280" y2={y} className="stroke-line" />
          ))}
          <path d={STRESS_LINE} fill="none" strokeWidth="2.4" strokeLinejoin="round" className="stroke-mind-stress" />
          <circle cx="272" cy="12" r="4" strokeWidth="2" className="fill-bg-2 stroke-mind-stress" />
        </svg>
        <p className="mt-1 text-[9.5px] leading-[1.4] text-fg-dim">{s("mindChecked.trend")}</p>
      </Card>

      <Card>
        <Label>{s("mind.journal")}</Label>
        <p className="mt-1 text-[10px] text-fg-dim">{s("mindChecked.journalEntry")}</p>
      </Card>

      <Pill ghost>{s("mindChecked.checkedIn")}</Pill>
    </PhoneFrame>
  );
}
