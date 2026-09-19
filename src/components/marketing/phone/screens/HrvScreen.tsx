import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, EngineNote, Fields, Headline, Kicker, Label, Row } from "./parts";

const HRV_LINE =
  "M0 32 L18.5 21.3 L36.9 26.7 L55.4 16 L73.8 29.3 L92.3 24 L110.8 18.7 L129.2 34.7 L147.7 26.7 L166.2 21.3 L184.6 40 L203.1 48 L221.5 53.3 L236 58.7";

/** Hjerte: HRV against the member's own band (reference B "HRV"). */
export default function HrvScreen({ width, scroll = false }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");
  const h = useTranslations("Hrv.band");

  return (
    <PhoneFrame label={s("hrv.aria")} tab="today" width={width} scroll={scroll}>
      <div>
        <Kicker domain="heart">{t("systems.heart.kicker")}</Kicker>
        <Headline>{s("hrv.title")}</Headline>
      </div>

      <Card>
        <Label>{h("latest")}</Label>
        <p className="mt-1 font-display text-[52px]">
          {t("engine.steps.hrv.value")}
          <small className="ml-1 font-mono text-[12px] font-medium normal-case">{t("engine.steps.hrv.unit")}</small>
        </p>
        <Label className="mt-1.5">
          {h("avg")} {s("hrv.avgValue")}
        </Label>
        <div data-domain="heart">
          <svg viewBox="0 0 240 80" preserveAspectRatio="none" className="mt-2 h-[64px] w-full">
            <rect x="0" y="8" width="240" height="32" className="fill-domain-tint" />
            <line
              x1="0"
              y1="24"
              x2="240"
              y2="24"
              className="stroke-line-bright"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={HRV_LINE}
              fill="none"
              className="stroke-domain"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-1 flex justify-between font-mono text-[8px] text-fg-dim">
            <span>{s("hrv.range")}</span>
            <span>{t("engine.night.label")}</span>
          </div>
          <div className="mt-1.5 flex gap-2.5 font-mono text-[8.5px] text-fg-dim">
            <span className="flex items-center gap-1">
              <i className="inline-block h-1.5 w-2.5 rounded-sm bg-domain-line" />
              {h("legendBand")}
            </span>
            <span className="flex items-center gap-1">
              <i className="inline-block h-0.5 w-2.5 rounded-sm bg-domain" />
              {t("engine.steps.hrv.label")}
            </span>
          </div>
        </div>
      </Card>

      <EngineNote stamp={s("engineStamp")}>
        <p className="mt-[5px] text-[10.5px] leading-[1.38]">{h("engine.below")}</p>
      </EngineNote>

      <Fields
        items={[
          { label: t("engine.steps.sleep.label"), value: s("hrv.sleepValue") },
          { label: s("hrv.rhrLabel"), value: s("hrv.rhrValue") },
          { label: s("hrv.sourceLabel"), value: t("engine.steps.hrv.source") },
        ]}
      />

      <p className="text-[9.5px] leading-[1.4] text-fg-dim">{t("engine.disclaimer")}</p>
      {scroll ? (
        <>
          <div>
            <Label className="mb-1">{s("hrv.morningsLabel")}</Label>
            <Row k={s("hrv.m1")} v={s("hrv.m1v")} />
            <Row k={s("hrv.m2")} v={s("hrv.m2v")} />
            <Row k={s("hrv.m3")} v={s("hrv.m3v")} />
            <Row k={s("hrv.m4")} v={s("hrv.m4v")} last />
          </div>
        </>
      ) : null}
    </PhoneFrame>
  );
}
