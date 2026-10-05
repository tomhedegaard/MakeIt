import { useTranslations } from "next-intl";
import MindScreen from "@/components/marketing/phone/screens/MindScreen";
import BreathScreen from "@/components/marketing/phone/screens/BreathScreen";
import BreathDemo from "./BreathDemo";

/**
 * Sind: a quiet field in the mind tint (the full blue was too loud for
 * this chapter), blue heading, four things the app does for the head,
 * and two app screens overlapping.
 */
export default function ChapterMind() {
  const t = useTranslations("Marketing.landing.chapters.mind");
  const items = t.raw("items") as { t: string; d: string }[];

  return (
    <section id="mind" aria-labelledby="mind-heading" className="scroll-mt-[68px] overflow-x-clip bg-mind-tint text-fg">
      <div className="mx-auto grid max-w-[1360px] gap-14 px-4 py-[clamp(72px,9vw,140px)] md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-24">
        <div>
          <h2 id="mind-heading" className="font-display max-w-[9em] text-[clamp(48px,7vw,112px)] leading-[0.9]! text-mind">
            {t("heading")}
          </h2>
          <p className="mt-6 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-body">{t("sub")}</p>
          <div className="mt-10 border-y border-mind-line py-6">
            <BreathDemo
              labels={{
                start: t("start"),
                again: t("again"),
                stop: t("stop"),
                phases: { in: t("phases.in"), hold: t("phases.hold"), out: t("phases.out") },
                done: t("done"),
                hint: t("hint"),
              }}
            />
          </div>
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.t} className="border-t border-mind-line py-5">
                <p className="font-display text-[clamp(22px,2.2vw,30px)] leading-none">{item.t}</p>
                <p className="mt-2 max-w-[34ch] text-[15px] text-fg-dim">{item.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center">
          <MindScreen width={240} />
          <div className="-ml-16 mt-24 hidden sm:block">
            <BreathScreen width={240} />
          </div>
        </div>
      </div>
    </section>
  );
}
