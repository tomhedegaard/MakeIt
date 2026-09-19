import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Headline, Kicker, Label, Row } from "./parts";

/** Hypnogram from bedtime to wake-up; y 10 awake, 32 REM, 54 light, 76 deep. */
const HYPNOGRAM =
  "M34 10H42V54H58V76H72V54H88V32H98V54H112V76H122V54H142V10H148V54H166V32H180V54H196V10H202V54H222V32H240";
const STAGE_Y = [
  ["awake", 10],
  ["rem", 32],
  ["light", 54],
  ["deep", 76],
] as const;

/** Bar tops for the last seven nights; the last one is tonight. */
const NIGHTS = [18, 12, 22, 16, 20, 26, 30];

/** Søvn i nat (reference A state 1). */
export default function SleepScreen({ width, scroll = false }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");

  return (
    <PhoneFrame label={s("sleep.aria")} tab="today" width={width} scroll={scroll}>
      <div data-domain="mind" className="mt-1">
        <Kicker domain="mind" dot>
          {t("engine.steps.sleep.label")} · {t("engine.night.label")}
        </Kicker>
        <Headline className="mt-1 text-[44px] normal-case!">{t("engine.steps.sleep.value")}</Headline>
        <p className="mt-1 text-[10.5px] text-fg-dim">{s("sleep.goal")}</p>
      </div>

      <Card className="pb-2">
        <svg viewBox="0 0 240 92" className="w-full" data-domain="mind">
          {STAGE_Y.map(([key, y]) => (
            <g key={key}>
              <line x1="34" y1={y} x2="240" y2={y} className="stroke-line" />
              <text x="0" y={y + 2.5} fontSize="7" className="fill-fg-dim font-mono">
                {s(`sleep.${key}`)}
              </text>
            </g>
          ))}
          <path d={HYPNOGRAM} fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-domain" />
          <text x="34" y="91" fontSize="6.5" className="fill-fg-dim font-mono">
            {s("sleep.start")}
          </text>
          <text x="240" y="91" fontSize="6.5" textAnchor="end" className="fill-fg-dim font-mono">
            {s("sleep.end")}
          </text>
        </svg>
      </Card>

      <div>
        <Row k={s("sleep.inBed")} v={s("sleep.start")} />
        <Row k={s("sleep.deepSleep")} v={s("sleep.deepValue")} />
        <Row k={s("sleep.rem")} v={s("sleep.remValue")} />
        <Row k={s("sleep.awake")} v={s("sleep.awakeValue")} last />
      </div>

      <Card className="pb-2">
        <Label>{s("sleep.nights")}</Label>
        <svg viewBox="0 0 240 64" className="mt-1.5 w-full" data-domain="mind">
          <line x1="0" y1="14" x2="240" y2="14" strokeDasharray="3 3" className="stroke-line-bright" />
          {NIGHTS.map((top, i) => (
            <rect
              key={i}
              x={4 + i * 34}
              y={top}
              width="22"
              height={58 - top}
              rx="3"
              className={i === NIGHTS.length - 1 ? "fill-domain" : "fill-domain-line"}
            />
          ))}
        </svg>
      </Card>

      <p className="text-[9.5px] leading-[1.4] text-fg-dim">{s("sleep.synced")}</p>
      {scroll ? (
        <>
          <Card>
            <Label>{s("sleep.tipLabel")}</Label>
            <p className="mt-1 text-[10.5px] leading-[1.38]">{s("sleep.tip")}</p>
          </Card>
        </>
      ) : null}
    </PhoneFrame>
  );
}
