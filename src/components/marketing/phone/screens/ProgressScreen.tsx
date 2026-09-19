import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Fields, Headline, Kicker, Label, Row } from "./parts";

/** e1RM over twelve weeks, from 148 to 162 kg (y 70 is 148, y 8 is 162). */
const E1RM = "M0 70 L22 66 L44 67 L66 58 L88 54 L110 56 L132 44 L154 38 L176 40 L198 26 L220 18 L240 8";

/** Weekly volume bars; week 4 of each block is lighter. */
const VOLUME = [30, 36, 42, 22, 34, 40, 46, 24, 38, 44, 50, 26];

/** Træn: fremgang (back squat e1RM, PRs, volume). */
export default function ProgressScreen({ width, scroll }: { width?: number; scroll?: boolean }) {
  const s = useTranslations("Marketing.kalk.screens");
  const unit = useTranslations("Marketing.kalk.hero")("plateUnit");

  return (
    <PhoneFrame label={s("progress.aria")} tab="train" width={width} scroll={scroll}>
      <div data-domain="body">
        <Kicker domain="body" dot>
          {s("progress.lift")}
        </Kicker>
        <Headline className="mt-1">{s("progress.title")}</Headline>
      </div>

      <Card>
        <p className="font-display text-[52px]">
          {s("progress.value")}
          <small className="ml-1 font-mono text-[12px] font-medium normal-case">{unit}</small>
        </p>
        <Label>{s("progress.delta")}</Label>
        <svg viewBox="0 0 240 80" preserveAspectRatio="none" className="mt-2 h-[70px] w-full" data-domain="body">
          {[8, 39, 70].map((y) => (
            <line key={y} x1="0" x2="240" y1={y} y2={y} className="stroke-line" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={E1RM} fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-domain" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between font-mono text-[8px] text-fg-dim">
          <span>{s("progress.weeks")}</span>
          <span>{s("time")}</span>
        </div>
      </Card>

      <div>
        <Label className="mb-1">{s("progress.prsLabel")}</Label>
        <Row k={s("progress.pr1")} v={s("progress.pr1v")} />
        <Row k={s("progress.pr2")} v={s("progress.pr2v")} />
        <Row k={s("progress.pr3")} v={s("progress.pr3v")} last />
      </div>

      <Card>
        <Label>{s("progress.volumeLabel")}</Label>
        <div data-domain="body" className="mt-2 flex h-[54px] items-end gap-[5px]">
          {VOLUME.map((h, i) => (
            <i
              key={i}
              style={{ height: h }}
              className={"block flex-1 rounded-[2px] " + (i === VOLUME.length - 1 ? "bg-domain" : "bg-domain-line")}
            />
          ))}
        </div>
      </Card>

      <div>
        <Label className="mb-1.5">{s("progress.otherLabel")}</Label>
        <Fields
          items={[
            { label: s("progress.dl"), value: s("progress.dlv") },
            { label: s("progress.bp"), value: s("progress.bpv") },
            { label: s("progress.ohp"), value: s("progress.ohpv") },
          ]}
        />
      </div>
      <Card>
        <Label>{s("progress.streakLabel")}</Label>
        <p className="mt-1 text-[10.5px] font-medium">{s("progress.streak")}</p>
      </Card>    </PhoneFrame>
  );
}
