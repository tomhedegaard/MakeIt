import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import PhoneFrame from "../PhoneFrame";
import { Card, Headline, Kicker, Label, Row } from "./parts";

const WEEKS = ["w1", "w2", "w3", "w4"] as const;
const DAYS = ["dayA", "dayB", "dayC", "dayD"] as const;
const EXERCISES = ["ex1", "ex2", "ex3", "ex4"] as const;

/** Træn: the block, this week and what comes next. */
export default function BlockScreen({ width, scroll }: { width?: number; scroll?: boolean }) {
  const s = useTranslations("Marketing.kalk.screens");
  const b = (key: string) => s(`block.${key}`);

  return (
    <PhoneFrame label={b("aria")} tab="train" width={width} scroll={scroll}>
      <div data-domain="body">
        <Kicker domain="body" dot>
          {b("block")}
        </Kicker>
        <Headline className="mt-1">{b("title")}</Headline>
        <p className="mt-0.5 text-[10.5px] text-fg-dim">{b("weekOf")}</p>
      </div>

      <div data-domain="body" className="grid grid-cols-4 gap-1.5">
        {WEEKS.map((w, i) => {
          const now = i === WEEKS.length - 1;
          return (
            <div
              key={w}
              className={cn(
                "rounded-[10px] border px-2 py-1.5",
                now ? "border-fg bg-fg text-bg" : "border-line bg-bg-2",
              )}
            >
              <span className="block font-mono text-[8px] uppercase tracking-[0.08em] opacity-70">{b(w)}</span>
              <i className={cn("mt-1.5 block h-1 rounded-full", now ? "bg-signal" : "bg-domain")} />
            </div>
          );
        })}
      </div>

      <div>
        <Label className="mb-1">{b("daysLabel")}</Label>
        {DAYS.map((d, i) => (
          <Row
            key={d}
            k={b(d)}
            v={b(`${d}Status`)}
            last={i === DAYS.length - 1}
            className={i === 0 ? "[&>span:last-child]:text-signal" : undefined}
          />
        ))}
      </div>

      <Card>
        <Label>{b("exercisesLabel")}</Label>
        <div className="mt-1">
          {EXERCISES.map((e, i) => (
            <Row key={e} k={b(e)} v={b(`${e}v`)} last={i === EXERCISES.length - 1} />
          ))}
        </div>
      </Card>

      <Card>
        <Label>{b("deloadLabel")}</Label>
        <p className="mt-1 text-[10.5px] leading-[1.38]">{b("deload")}</p>
      </Card>

      <Card>
        <Label>{b("nextLabel")}</Label>
        <p className="mt-1 text-[10.5px] leading-[1.38]">{b("next")}</p>
      </Card>    </PhoneFrame>
  );
}
