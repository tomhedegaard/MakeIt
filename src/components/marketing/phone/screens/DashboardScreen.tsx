import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import PhoneFrame from "../PhoneFrame";
import {
  Avatar,
  Card,
  Chevron,
  Chip,
  EngineNote,
  Fields,
  Headline,
  Kicker,
  Label,
  Pill,
  Swap,
} from "./parts";

/** Today is Wednesday; days B, C and D fall Friday to Sunday. */
const TODAY = 2;
const PLANNED = [4, 5, 6];

/** I dag: the engine has rewritten today's session (reference B hero phone). */
export default function DashboardScreen({ width = 300, scroll = false }: { width?: number; scroll?: boolean }) {
  const t = useTranslations("Marketing.kalk");
  const s = useTranslations("Marketing.kalk.screens");
  const d = useTranslations("Dashboard.todaySession");
  const h = useTranslations("Hrv.band");

  return (
    <PhoneFrame label={s("dashboard.aria")} tab="today" width={width} scroll={scroll}>
      <div className="flex items-end justify-between gap-2 pt-0.5">
        <div>
          <Kicker>{s("dashboard.greeting")}</Kicker>
          <Headline>{s("dashboard.day")}</Headline>
        </div>
        <Chip domain="body">{s("dashboard.streak")}</Chip>
      </div>

      <EngineNote stamp={s("engineStamp")}>
        <p className="mt-[5px] text-[10.5px] leading-[1.38]">{h("engine.below")}</p>
        <Swap
          className="mt-1.5"
          from={t("hero.plateOld")}
          to={t("hero.plateNew")}
          unit={t("hero.plateUnit")}
        />
      </EngineNote>

      <Card>
        <Label className="justify-between">
          <span>{d("ariaLabel")}</span>
          <span>{s("program")}</span>
        </Label>
        <p className="mt-[5px] font-display text-[22px]">{s("dayTitle")}</p>
        <p className="mt-[3px] text-[10.5px] text-fg-dim">{s("dashboard.sessionSub")}</p>
        <Fields
          className="mt-[9px]"
          items={[
            { label: d("exercises"), value: s("dashboard.exercisesValue") },
            { label: d("sets"), value: s("dashboard.setsValue") },
            { label: d("estTime"), value: s("dashboard.timeValue") },
          ]}
        />
        <Pill className="mt-[9px]">{d("start")}</Pill>
      </Card>

      <Card className="flex items-center gap-[9px] px-2.5 py-2">
        <Avatar>{s("munkInitials")}</Avatar>
        <span className="flex-1 text-[10.5px] font-medium">{s("dashboard.munkReply")}</span>
        <Chevron />
      </Card>

      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-1.5">
        {(
          [
            ["volumeLabel", "volumeValue"],
            ["prLabel", "prValue"],
            ["repsLabel", "repsValue"],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-line bg-bg-2 px-2 py-[7px]">
            <span className="whitespace-nowrap font-mono text-[7.5px] uppercase tracking-[0.06em] text-fg-dim">
              {s(`dashboard.${label}`)}
            </span>
            <b className="block font-display text-[19px]">{s(`dashboard.${value}`)}</b>
          </div>
        ))}
      </div>
      {scroll ? (
        <>
          <div>
            <Label className="mb-1.5 justify-between">
              <span>{s("dashboard.weekLabel")}</span>
              <span>{s("dashboard.weekNote")}</span>
            </Label>
            <div className="grid grid-cols-7 gap-1">
              {s("dashboard.weekDays")
                .split(" ")
                .map((day, i) => (
                  <span
                    key={i}
                    className={cn(
                      "grid h-[30px] place-items-center rounded-[8px] border font-mono text-[9px]",
                      i === TODAY ? "border-fg bg-fg text-bg" : PLANNED.includes(i) ? "border-line-strong" : "border-line text-fg-dim",
                    )}
                  >
                    {day}
                  </span>
                ))}
            </div>
          </div>
          <Card>
            <Label>{s("dashboard.tomorrowLabel")}</Label>
            <p className="mt-1 font-display text-[20px]">{s("dashboard.tomorrow")}</p>
            <p className="text-[10.5px] text-fg-dim">{s("dashboard.tomorrowSub")}</p>
          </Card>
          <Card>
            <Label>{s("dashboard.mealLabel")}</Label>
            <p className="mt-1 text-[10.5px] font-medium">{s("dashboard.meal")}</p>
          </Card>
        </>
      ) : null}
    </PhoneFrame>
  );
}
