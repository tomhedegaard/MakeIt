import { useTranslations } from "next-intl";
import Link from "next/link";
import { PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import DashboardScreen from "@/components/marketing/phone/screens/DashboardScreen";

/** Rack lines behind the plate numbers; 150 is the old top set, 135 the new one. */
const STAGE_LINES = [
  { kg: "160", top: "14%", kind: "plain" },
  { kg: "150", top: "30%", kind: "old" },
  { kg: "135", top: "54%", kind: "new" },
  { kg: "120", top: "70%", kind: "plain" },
  { kg: "100", top: "86%", kind: "plain" },
] as const;

const LINE_KIND = {
  plain: "border-t border-line",
  old: "border-t border-dashed border-line-bright",
  new: "border-t-2 border-fg",
} as const;

/**
 * Kalk hero (reference B `.hero`, `.stage`, `.plate-nums`): H1, one
 * sentence, one CTA, and the plate numbers the engine just changed.
 * No eyebrow, no stats band.
 */
export default function KalkHero() {
  const t = useTranslations("Marketing.kalk.hero");

  return (
    <section aria-labelledby="hero-heading" className="relative">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 px-4 md:px-8 lg:max-h-[900px] lg:min-h-[calc(100svh-68px)] lg:grid-cols-2 lg:gap-10">
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

        <div className="relative flex flex-col items-center overflow-hidden border-t border-line pb-9 pt-7 lg:flex-row lg:justify-end lg:border-l lg:border-t-0 lg:py-7">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
            {STAGE_LINES.map((line) => (
              <div
                key={line.kg}
                style={{ top: line.top }}
                className={`absolute inset-x-0 pl-3 pt-1 font-mono text-[10px] tracking-[0.08em] text-fg-dim ${LINE_KIND[line.kind]}`}
              >
                {line.kg} {t("plateUnit")}
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            className="font-display pointer-events-none mb-7 flex self-stretch items-end justify-between leading-[0.8]! lg:absolute lg:left-[clamp(12px,2vw,36px)] lg:top-1/2 lg:mb-0 lg:block lg:-translate-y-[54%]"
          >
            <span className="strike-signal block w-max text-[clamp(80px,25vw,120px)] tracking-[-0.02em]! text-transparent [-webkit-text-stroke:2px_var(--line-bright)] lg:text-[clamp(150px,17vw,280px)]">{t("plateOld")}</span>
            <span className="block w-max text-[clamp(80px,25vw,120px)] tracking-[-0.02em]! text-fg lg:text-[clamp(150px,17vw,280px)]">
              {t("plateNew")}
              <small className="relative top-1.5 ml-1 align-top font-mono text-[14px] font-medium tracking-[0.1em] lg:top-5 lg:ml-2.5">
                {t("plateUnit")}
              </small>
            </span>
          </div>

          <figure className="relative z-[2] m-0 lg:mr-[clamp(0px,3vw,48px)]">
            <DashboardScreen width={282} />
            <figcaption className="mx-auto mt-3.5 max-w-[282px] text-center font-mono text-[11px] tracking-[0.06em] text-fg-dim">
              {t("phoneCaption")}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
