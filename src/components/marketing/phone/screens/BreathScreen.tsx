import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Card, Headline, Kicker, Label, Pill, Row } from "./parts";

/** Minutes per evening this week (bar heights). */
const WEEK_MINUTES = [12, 24, 0, 24, 36, 12, 24];

/** Sind: a guided 4-7-8 breathing round, paused on the hold. */
export default function BreathScreen({ width, scroll }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");
  const br = (key: string) => s(`breath.${key}`);

  return (
    <PhoneFrame label={br("aria")} tab="mind" width={width} scroll={scroll}>
      <div>
        <Kicker domain="mind" dot>
          {t("systems.mind.kicker")}
        </Kicker>
        <Headline className="mt-1">{br("title")}</Headline>
        <p className="mt-0.5 text-[10.5px] text-fg-dim">{br("sub")}</p>
      </div>

      <div data-domain="mind" className="relative mx-auto my-1 grid size-[168px] place-items-center">
        <i className="absolute inset-0 rounded-full bg-domain-tint" />
        <i className="absolute inset-[18px] rounded-full border-2 border-domain-line" />
        <i className="absolute inset-[40px] rounded-full bg-domain" />
        <p className="relative text-center text-bg">
          <span className="block font-mono text-[9px] uppercase tracking-[0.12em]">{br("phase")}</span>
          <span className="block font-display text-[40px] leading-none">{br("count")}</span>
        </p>
      </div>

      <div className="flex justify-center gap-1.5 font-mono text-[9px]">
        {(["in", "hold", "out"] as const).map((k) => (
          <span
            key={k}
            className={
              "rounded-full border px-2 py-1 " + (k === "hold" ? "border-fg bg-fg text-bg" : "border-line text-fg-dim")
            }
          >
            {br(k)}
          </span>
        ))}
      </div>
      <Label className="justify-center">{br("round")}</Label>
      <Pill ghost>{br("stop")}</Pill>

      <div>
        <Label className="mb-1">{br("libraryLabel")}</Label>
        <Row k={br("l1")} v={br("l1v")} />
        <Row k={br("l2")} v={br("l2v")} />
        <Row k={br("l3")} v={br("l3v")} last />
      </div>

      <Card>
        <Label className="justify-between">
          <span>{br("weekLabel")}</span>
          <span>{br("weekValue")}</span>
        </Label>
        <div data-domain="mind" className="mt-2 flex h-10 items-end gap-1.5">
          {WEEK_MINUTES.map((h, i) => (
            <i key={i} style={{ height: h }} className="block flex-1 rounded-[3px] bg-domain" />
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-[1.38] text-fg-dim">{br("note")}</p>
      </Card>    </PhoneFrame>
  );
}
