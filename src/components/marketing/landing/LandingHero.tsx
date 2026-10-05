import { useTranslations } from "next-intl";
import Link from "next/link";
import { PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import HeroScale from "@/components/marketing/landing/HeroScale";

/**
 * Nord hero: H1, one sentence, one CTA, and one picture of what HQ does.
 * The right column is this morning's top set, rewritten (`HeroScale`):
 * 150 struck, 135 at full size, the marker on the page's kg ruler. The
 * slider demo that used to sit here now lives in the motor story
 * (#engine), where the visitor has the reasoning before they try it.
 */
export default function LandingHero() {
  const t = useTranslations("Marketing.landing.hero");

  return (
    <section aria-labelledby="hero-heading" className="relative">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 px-4 md:px-8 lg:min-h-[calc(100svh-68px)] xl:max-h-[900px] lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col justify-center pb-6 pt-8 lg:pb-14 lg:pt-12">
          <h1
            id="hero-heading"
            className="font-display max-w-[9.5em] text-[clamp(52px,6.6vw,104px)] leading-[0.88]!"
          >
            {t("heading")}
          </h1>
          <p className="mt-4 max-w-[30ch] text-[clamp(17px,1.45vw,21px)] text-fg-dim lg:mt-7">{t("sub")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-9">
            <Link href={PUBLIC_WAITLIST_HREF} className="btn btn-primary h-12! px-6!">
              {t("cta")}
            </Link>
            <a
              href="#engine"
              className="border-b border-line-bright pb-0.5 text-[13px] no-underline hover:border-fg"
            >
              {t("link")} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="relative flex flex-col justify-center border-t border-line pb-12 pt-8 lg:border-l lg:border-t-0 lg:py-14 lg:pl-12">
          <HeroScale />
        </div>
      </div>
    </section>
  );
}
