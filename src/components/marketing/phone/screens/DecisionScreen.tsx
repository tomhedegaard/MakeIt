import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Chip, Headline, Kicker, Label, Pill, Row } from "./parts";

/**
 * Motoren: the rewritten session (reference A state 4), with the
 * why-chips (A2) and "Behold original" as the secondary action (C1).
 */
export default function DecisionScreen({ width }: { width?: number }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");
  const d = useTranslations("Dashboard.todaySession");
  const step = (k: string) => t(`engine.steps.${k}`);

  const diffs = [
    { label: s("decision.topSet"), from: step("decision.from"), to: step("decision.to") },
    { label: s("decision.backoff"), from: s("decision.backoffFrom"), to: s("decision.backoffTo") },
    { label: d("estTime"), from: s("dashboard.timeValue"), to: s("decision.timeTo") },
  ];

  return (
    <PhoneFrame label={s("decision.aria")} tab="train" width={width}>
      <div data-domain="body" className="mt-1">
        <Kicker domain="body" dot>
          {s("engineStamp")}
        </Kicker>
        <Headline className="mt-1 text-[28px]">{s("decision.heading")}</Headline>
        <p className="mt-1 text-[10.5px] text-fg-dim">
          {s("dayTitle")} · {s("program")}
        </p>
      </div>

      <div>
        {diffs.map((row, i) => (
          <div
            key={row.label}
            className={
              "grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-2 border-t border-line py-[7px]" +
              (i === diffs.length - 1 ? " border-b" : "")
            }
          >
            <span className="text-[10.5px]">{row.label}</span>
            <s className="font-mono text-[10px] text-fg-dim decoration-signal decoration-2">{row.from}</s>
            <span className="font-mono text-[10px] text-fg-dim">→</span>
            <b className="font-mono text-[11px] font-semibold">{row.to}</b>
          </div>
        ))}
      </div>

      <Card>
        <Label>{s("decision.why")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Chip domain="mind">
            {step("sleep.label")} {step("sleep.value")}
          </Chip>
          <Chip domain="heart">
            {step("hrv.label")} {step("hrv.value")} {step("hrv.unit")}
          </Chip>
          <Chip domain="mind">
            {step("stress.label")} {step("stress.value")}
            {step("stress.unit")}
          </Chip>
        </div>
      </Card>

      <div className="flex flex-col gap-1.5">
        <Pill>{d("start")}</Pill>
        <Pill ghost className="h-[30px]">
          {t("engine.keepOriginal")}
        </Pill>
      </div>

      <div>
        <Label className="mb-1">{s("decision.restOfWeek")}</Label>
        <Row k={s("decision.dayB")} v={s("decision.dayBStatus")} />
        <Row k={s("decision.dayC")} v={s("decision.dayCStatus")} last />
      </div>

      <p className="text-[9.5px] leading-[1.4] text-fg-dim">{t("engine.disclaimer")}</p>
    </PhoneFrame>
  );
}
