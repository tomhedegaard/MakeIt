import { useTranslations } from "next-intl";
import Link from "next/link";
import { PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import EngineDemo from "@/components/marketing/kalk/EngineDemo";

/**
 * Kalk hero (reference B `.hero`, `.stage`): H1, one sentence, one CTA,
 * and the motor demo itself. No eyebrow, no stats band.
 *
 * The right column used to be a still life of the plate numbers the
 * engine had already changed. It is now the engine: three sliders and
 * the real rule function, so the first thing on the page is the thing
 * the page is selling. The column frame is unchanged, so the hero keeps
 * its rhythm.
 */
export default function KalkHero() {
  const t = useTranslations("Marketing.kalk.hero");

  return (
    <section aria-labelledby="hero-heading" className="relative">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 px-4 md:px-8 lg:min-h-[calc(100svh-68px)] xl:max-h-[900px] lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col justify-center pb-9 pt-11 lg:pb-14 lg:pt-12">
          <h1
            id="hero-heading"
            className="font-display max-w-[9.5em] text-[clamp(56px,7.4vw,118px)] leading-[0.86]!"
          >
            {t("heading")}
          </h1>
          <p className="mt-7 max-w-[30ch] text-[clamp(18px,1.45vw,21px)] text-fg-dim">{t("sub")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href={PUBLIC_WAITLIST_HREF} className="btn btn-primary h-12! px-6!">
              {t("cta")}
            </Link>
            <a
              href="#engine"
              className="border-b border-line-bright pb-0.5 font-mono text-[13px] uppercase tracking-[0.06em] no-underline hover:border-fg"
            >
              {t("link")} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center border-t border-line pb-9 pt-7 lg:border-l lg:border-t-0 lg:py-7 lg:pl-10">
          <EngineDemo />
        </div>
      </div>
    </section>
  );
}
