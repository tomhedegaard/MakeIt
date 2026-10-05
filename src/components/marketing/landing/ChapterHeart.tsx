import { useTranslations } from "next-intl";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";

/**
 * Hjerte: from the watch to the session. A plain `data-theme="nat"`
 * block (dark on the light page, like the access band), the four
 * devices as type, this morning's reading in heart red, and the app's
 * HRV screen. The numbers are the same night the motor story reads.
 */
export default function ChapterHeart() {
  const t = useTranslations("Marketing.landing.chapters.heart");
  const hrv = useTranslations("Marketing.landing.engine.steps.hrv");
  const devices = t.raw("devices") as string[];

  return (
    <section id="hrv" aria-labelledby="hrv-heading" data-theme="nat" data-domain="heart" className="scroll-mt-[68px] bg-bg text-fg">
      <div className="mx-auto grid max-w-[1360px] gap-14 px-4 py-[clamp(72px,9vw,140px)] md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-24">
        <div>
          <h2 id="hrv-heading" className="font-display max-w-[9em] text-[clamp(48px,7vw,112px)] leading-[0.9]!">
            {t("heading")}
          </h2>
          <p className="mt-6 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>

          <p className="mt-12 text-[13px] text-fg-dim">{t("devicesLabel")}</p>
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-5">
            {devices.map((device) => (
              <li key={device} className="font-display text-[clamp(26px,2.8vw,40px)] leading-none">
                {device}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-micro text-fg-dim">{t("appleNote")}</p>

          <div className="mt-12">
            <p className="text-[13px] text-fg-dim">{t("synced")}</p>
            <p className="font-display mt-2 flex items-baseline gap-3 leading-[0.85] text-domain">
              <span className="text-[clamp(96px,13vw,200px)] tracking-[-0.04em]">{hrv("value")}</span>
              <span className="text-[clamp(24px,2.4vw,36px)]">{hrv("unit")}</span>
            </p>
            <p className="mt-4 text-[clamp(16px,1.3vw,19px)]">{t("band")}</p>
            <p className="mt-1 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-fg-dim">{hrv("note")}</p>
            <a
              href="#engine"
              className="mt-8 inline-block border-b border-line-bright pb-0.5 text-[13px] no-underline hover:border-fg"
            >
              {t("link")} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div className="flex justify-center">
          <HrvScreen width={280} />
        </div>
      </div>
    </section>
  );
}
