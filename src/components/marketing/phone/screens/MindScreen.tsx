import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Headline, Kicker, Label, Pill, Row } from "./parts";

const SCALES = [
  { key: "energy", filled: 3 },
  { key: "stress", filled: 2 },
  { key: "focus", filled: 4 },
] as const;

/** Bar heights for the last seven days; the last one is today. */
const WEEK = [22, 28, 18, 28, 34, 24, 22];

/** Sind: the 60 second mind-check (reference B "Sind"). */
export default function MindScreen({ width, scroll = false }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");

  return (
    <PhoneFrame label={s("mind.aria")} tab="mind" width={width} scroll={scroll}>
      <div>
        <Kicker domain="mind">{t("systems.mind.kicker")}</Kicker>
        <Headline className="text-[34px]">{s("mind.title")}</Headline>
      </div>

      <p className="text-[12px] font-medium leading-[1.38]">{t("systems.mind.text")}</p>

      <Card className="py-1.5">
        <div data-domain="mind">
          {SCALES.map((scale, row) => (
            <div
              key={scale.key}
              className={
                "grid grid-cols-[52px_repeat(5,1fr)] items-center gap-1 py-[5px]" +
                (row > 0 ? " border-t border-line" : "")
              }
            >
              <span className="font-mono text-[9px] tracking-[0.04em]">
                {t(`systems.mind.${scale.key}`)}
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <i
                  key={n}
                  className={
                    "grid h-5 place-items-center rounded-lg border font-mono text-[9px] not-italic " +
                    (n <= scale.filled
                      ? "border-domain bg-domain text-bg-2"
                      : "border-line bg-bg-2 text-fg-dim")
                  }
                >
                  {n}
                </i>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <div>
        <Label className="mb-[5px]">{s("mind.journal")}</Label>
        <div className="min-h-[44px] rounded-[10px] border border-line bg-bg-2 px-2.5 py-2 text-[10.5px]">
          {s("mind.journalEntry")}
        </div>
      </div>

      <Pill>{s("mind.checkIn")}</Pill>

      <Card>
        <Label>{s("mind.week")}</Label>
        <svg viewBox="0 0 200 36" className="mt-1.5 h-8 w-full" data-domain="mind">
          {WEEK.map((height, i) => (
            <rect
              key={i}
              x={4 + i * 29}
              y={36 - height}
              width="18"
              height={height}
              rx="3"
              className={i === WEEK.length - 1 ? "fill-signal" : "fill-domain"}
            />
          ))}
        </svg>
      </Card>
      {scroll ? (
        <>
          <Card>
            <Label>{s("mind.suggestLabel")}</Label>
            <p className="mt-1 font-display text-[20px]">{s("mind.suggest")}</p>
            <p className="text-[10.5px] text-fg-dim">{s("mind.suggestSub")}</p>
          </Card>
          <Row k={s("mind.streakLabel")} v={s("mind.streak")} last />
        </>
      ) : null}
    </PhoneFrame>
  );
}
