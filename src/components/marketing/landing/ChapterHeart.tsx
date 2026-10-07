import { useTranslations } from "next-intl";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";
import HeartLive from "./HeartLive";
import DeviceStage from "./DeviceStage";
import { DEVICE_SOON } from "@/lib/marketing/landing/devices";

/**
 * Hjerte: from the watch to the session. A plain `data-theme="nat"`
 * block (dark on the light page, like the access band), the four
 * devices and fourteen nights as one interactive island (`HeartLive`),
 * and the app's HRV screen beside the chosen watch's sync card (`DeviceStage`). The
 * section's `data-device` (server default WHOOP, then HeartLive) decides
 * which device the stage and the phone's source field show. The numbers
 * are the same night the motor story reads.
 */
export default function ChapterHeart() {
  const t = useTranslations("Marketing.landing.chapters.heart");
  const hrv = useTranslations("Marketing.landing.engine.steps.hrv");
  const devices = t.raw("devices") as string[];

  return (
    <section id="hrv" aria-labelledby="hrv-heading" data-theme="nat" data-domain="heart" data-device="0" className="scroll-mt-[68px] bg-bg text-fg">
      <div className="mx-auto grid max-w-[1360px] gap-14 px-4 py-[clamp(72px,9vw,140px)] md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-24">
        <div>
          <h2 id="hrv-heading" className="font-display max-w-[9em] text-[clamp(48px,7vw,112px)] leading-[0.9]!">
            {t("heading")}
          </h2>
          <p className="mt-6 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>

          <div className="mt-12">
            <HeartLive
              labels={{
                devicesLabel: t("devicesLabel"),
                devices,
                appleNote: t("appleNote"),
                syncedFrom: t.raw("syncedFrom") as string,
                soon: DEVICE_SOON,
                unit: hrv("unit"),
                chartLabel: t("chartLabel"),
                night: t.raw("night") as string,
                tonight: t("tonight"),
                inBand: t("inBand"),
                below: t("below"),
                above: t("above"),
                hint: t("hint"),
                hintTouch: t("hintTouch"),
              }}
            />
          </div>

          <div className="mt-10">
            <p className="text-[clamp(16px,1.3vw,19px)]">{t("band")}</p>
            <p className="mt-1 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-fg-dim">{hrv("note")}</p>
            <a
              href="#engine"
              className="mt-8 inline-block border-b border-line-bright pb-0.5 text-[13px] no-underline hover:border-fg"
            >
              {t("link")} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-end sm:justify-center lg:sticky lg:top-28">
          <DeviceStage devices={devices} reads={t("reads")} syncedAt={t("syncedAt")} soon={t("soon")} />
          <HrvScreen width={280} sources={devices.map((d, i) => (DEVICE_SOON[i] ? t("soonShort") : d))} />
        </div>
      </div>
    </section>
  );
}
