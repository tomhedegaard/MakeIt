import { useTranslations } from "next-intl";
import DemoLoop from "../../DemoLoop";
import PhoneFrame from "../PhoneFrame";
import { Avatar, Chip, Headline, Kicker, Pill } from "./parts";

export const FORM_CHECK_DEMO_SRC = "/exercise-demos/back-squat.webm";

/**
 * Træn, form-check (reference B "Form-check", spec §3.4). The member's
 * own recording is the subject; the MoveKit loop sits beside it as a
 * labelled reference and is never presented as the member's video.
 *
 * The loop has a real pause control, so the frame is `interactive` and
 * this screen hides its own static parts from assistive tech.
 */
export default function FormCheckScreen({ width }: { width?: number }) {
  const s = useTranslations("Marketing.kalk.screens");
  const card = useTranslations("Marketing.kalk.munk.card");

  return (
    <PhoneFrame label={s("formCheck.aria")} tab="train" width={width} interactive>
      <div aria-hidden="true">
        <Kicker>{card("kicker")}</Kicker>
        <Headline>{card("lift")}</Headline>
      </div>

      <DemoLoop
        src={FORM_CHECK_DEMO_SRC}
        label={s("formCheck.videoLabel")}
        pauseLabel={s("pause")}
        playLabel={s("play")}
        tag={card("reference")}
        className="aspect-[16/11] flex-none"
        compact
      />

      <div aria-hidden="true" className="flex flex-col gap-[9px]">
        <div className="flex items-center gap-2 py-0.5 text-[10px] text-fg-dim">
          <span className="grid h-6 w-[34px] flex-none place-items-center rounded-md bg-fg text-bg">
            <svg viewBox="0 0 10 10" className="size-[9px]" fill="currentColor">
              <path d="M3 2l5 3-5 3z" />
            </svg>
          </span>
          <span>
            {card("yours")} · {s("session.set", { n: 3 }).toLowerCase()}
          </span>
          <span className="ml-auto font-mono">{s("formCheck.duration")}</span>
        </div>

        <div className="rounded-[14px_14px_14px_4px] border border-line bg-bg-2 px-[11px] py-2.5 text-[11.5px] font-medium leading-[1.4]">
          {card("final")}
        </div>

        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-display text-[16px]">
            <Avatar className="size-[22px] text-[9px]">{s("munkInitials")}</Avatar>
            {card("signed")}
          </p>
          <Chip>{card("answered")}</Chip>
        </div>

        <Pill>{s("formCheck.next")}</Pill>
      </div>
    </PhoneFrame>
  );
}
