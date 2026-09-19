import { useTranslations } from "next-intl";
import PhoneFrame from "../PhoneFrame";
import { Avatar, Card, Headline, Kicker, Label, Row } from "./parts";

const POSTS = ["p1", "p2", "p3", "p4", "p5"] as const;

/** Crew: today's feed, your tier and the week's reps. */
export default function CrewScreen({ width, scroll }: { width?: number; scroll?: boolean }) {
  const s = useTranslations("Marketing.kalk.screens");
  const c = (key: string) => s(`crew.${key}`);

  return (
    <PhoneFrame label={c("aria")} tab="crew" width={width} scroll={scroll}>
      <div>
        <Kicker>{c("tier")}</Kicker>
        <Headline className="mt-1">{c("title")}</Headline>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <i className="block h-full w-[25%] bg-signal" />
        </div>
      </div>

      <Label>{c("feedLabel")}</Label>
      {POSTS.map((p) => (
        <Card key={p} className="flex items-start gap-2.5 px-2.5 py-2">
          <Avatar>{c(`${p}i`)}</Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold">{c(p)}</p>
            <p className="text-[10.5px] leading-[1.35]">{c(`${p}t`)}</p>
            <p className="mt-1 font-mono text-[8.5px] text-fg-dim">{c(`${p}m`)}</p>
          </div>
          <span className="rounded-full border border-line-strong px-2 py-[3px] font-mono text-[8.5px] uppercase tracking-[0.08em]">
            {c("cheer")}
          </span>
        </Card>
      ))}

      <div>
        <Label className="mb-1">{c("boardLabel")}</Label>
        <Row k={c("b1")} v={c("b1v")} />
        <Row k={c("b2")} v={c("b2v")} className="[&>span]:font-semibold [&>span]:text-fg" />
        <Row k={c("b3")} v={c("b3v")} last />
      </div>

      <Card>
        <Label>{c("schoolLabel")}</Label>
        <p className="mt-1 text-[10.5px] leading-[1.38]">{c("school")}</p>
      </Card>    </PhoneFrame>
  );
}
