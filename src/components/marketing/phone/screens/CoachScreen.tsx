import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import PhoneFrame from "../PhoneFrame";
import { Avatar, Headline, Kicker, Label } from "./parts";

const THREAD = [
  { key: "yesterday", divider: true },
  { key: "me0", me: true },
  { key: "clip", me: true, clip: true },
  { key: "today", divider: true },
  { key: "m1", me: false },
  { key: "m2", me: false },
  { key: "me1", me: true },
  { key: "m3", me: false },
  { key: "me2", me: true },
  { key: "m4", me: false },
] as const;

/** Munk: the coach thread after a form-check. */
export default function CoachScreen({ width, scroll }: { width?: number; scroll?: boolean }) {
  const s = useTranslations("Marketing.kalk.screens");

  return (
    <PhoneFrame label={s("coach.aria")} tab="today" width={width} scroll={scroll}>
      <div className="flex items-center gap-2.5 border-b border-line pb-2.5">
        <Avatar className="size-[34px] text-[13px]">{s("munkInitials")}</Avatar>
        <div>
          <Headline className="text-[22px]">{s("coach.title")}</Headline>
          <Kicker>{s("coach.status")}</Kicker>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {THREAD.map((msg) =>
          "divider" in msg ? (
            <Label key={msg.key} className="justify-center py-1">
              {s(`coach.${msg.key}`)}
            </Label>
          ) : "clip" in msg ? (
            <p
              key={msg.key}
              className="flex items-center gap-2 self-end rounded-[14px] rounded-br-[4px] border border-line-strong px-2.5 py-[7px] font-mono text-[9px]"
            >
              <i className="grid h-5 w-7 place-items-center rounded-md bg-fg text-bg">
                <svg viewBox="0 0 10 10" className="size-2" fill="currentColor">
                  <path d="M3 2l5 3-5 3z" />
                </svg>
              </i>
              {s(`coach.${msg.key}`)}
            </p>
          ) : (
            <p
              key={msg.key}
              className={cn(
                "max-w-[82%] rounded-[14px] px-2.5 py-[7px] text-[10.5px] leading-[1.38]",
                msg.me ? "self-end rounded-br-[4px] bg-fg text-bg" : "self-start rounded-bl-[4px] border border-line bg-bg-2",
              )}
            >
              {s(`coach.${msg.key}`)}
            </p>
          ),
        )}
      </div>

      <Label className="justify-center">{s("coach.signed")}</Label>

      <div className="flex h-[34px] items-center rounded-full border border-line-strong px-3 text-[10.5px] text-fg-dim">
        {s("coach.input")}
      </div>
    </PhoneFrame>
  );
}
