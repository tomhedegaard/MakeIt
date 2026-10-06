import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import SessionScreen from "@/components/marketing/phone/screens/SessionScreen";
import FoodScreen from "@/components/marketing/phone/screens/FoodScreen";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";
import MindScreen from "@/components/marketing/phone/screens/MindScreen";
import { cn } from "@/lib/utils";
import TiltDoor from "./TiltDoor";
import Magnetic from "./Magnetic";

const DOOR_PHONE = 200;

/** Position in the load sequence (globals.css `[data-hero-rise]`): 0 rises first. */
const rise = (i: number) => ({ "--rise": i }) as CSSProperties;

/**
 * The four systems as four doors, each on its domain tint with the
 * real app screen rising out of it. Written out so Tailwind sees every
 * class. Each door links to its chapter further down.
 */
const DOORS: { key: "train" | "food" | "heart" | "mind"; href: string; field: string; ink: string; screen: ReactNode }[] = [
  { key: "train", href: "#train", field: "bg-bg-3", ink: "text-fg", screen: <SessionScreen width={DOOR_PHONE} /> },
  { key: "food", href: "#food", field: "bg-food-tint", ink: "text-food", screen: <FoodScreen width={DOOR_PHONE} /> },
  { key: "heart", href: "#hrv", field: "bg-heart-tint", ink: "text-heart", screen: <HrvScreen width={DOOR_PHONE} /> },
  { key: "mind", href: "#mind", field: "bg-mind-tint", ink: "text-mind", screen: <MindScreen width={DOOR_PHONE} /> },
];

/**
 * Hero: H1, one sentence, one CTA, and the whole app at a glance. The
 * landing page may put the domain colours on whole surfaces as tints,
 * with the full colour in type (owner decision 2026-10-05); the app keeps
 * the ten percent rule.
 *
 * On load the hero rises in order: heading, sentence, call to action,
 * then the doors one by one. Pure CSS (`[data-hero-rise]` in
 * globals.css) from a resting state that already reads, so there is
 * nothing to wait for without JS and nothing at all with reduced motion.
 */
export default function LandingHero() {
  const t = useTranslations("Marketing.landing.hero");
  const d = useTranslations("Marketing.landing.chapters.doors");

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-x-clip">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <div className="grid gap-6 pb-2 pt-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pt-16">
          <h1
            id="hero-heading"
            data-hero-rise="mask"
            style={rise(0)}
            className="font-display max-w-[9.5em] text-[clamp(52px,7.2vw,112px)] leading-[0.88]!"
          >
            {t("heading")}
          </h1>
          <div className="lg:pb-3">
            <p data-hero-rise style={rise(2)} className="max-w-[34ch] text-[clamp(17px,1.45vw,21px)] text-fg-dim">
              {t("sub")}
            </p>
            <div data-hero-rise style={rise(3)} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Magnetic>
                <Link href={PUBLIC_WAITLIST_HREF} className="btn btn-primary h-12! px-6!">
                  {t("cta")}
                </Link>
              </Magnetic>
              <a
                href="#engine"
                className="border-b border-line-bright pb-0.5 text-[13px] no-underline hover:border-fg"
              >
                {t("link")} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>

        <ul
          data-doors
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-10 pt-[240px] [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-16 lg:pt-[220px]"
        >
          {DOORS.map((door, i) => (
            <li
              key={door.key}
              data-hero-rise
              style={rise(4 + i)}
              className="w-[74vw] max-w-[320px] shrink-0 snap-start lg:w-auto lg:max-w-none"
            >
              <TiltDoor
                href={door.href}
                className={cn("group relative block h-[300px] text-fg no-underline lg:h-[330px]", door.field)}
              >
                <div className="absolute bottom-[86px] left-1/2 -translate-x-1/2 [perspective:900px]">
                  <div className="door-phone">{door.screen}</div>
                </div>
                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                  <span>
                    <span className={cn("font-display block text-[28px] leading-none", door.ink)}>{d(`${door.key}.name`)}</span>
                    <span className="mt-1.5 block text-[13px] text-fg-dim">{d(`${door.key}.line`)}</span>
                  </span>
                  <span aria-hidden="true" className={cn("text-[22px] leading-none", door.ink)}>
                    ↓
                  </span>
                </div>
              </TiltDoor>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
