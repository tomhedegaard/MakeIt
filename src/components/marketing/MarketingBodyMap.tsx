"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import DomainMark, { type Domain } from "@/components/brand/DomainMark";
import MakeItFigure from "@/components/brand/MakeItFigure";
import { cn } from "@/lib/utils";
import {
  HERO_DOMAINS,
  MarketingDomainKicker,
  highlightsForActive,
} from "@/components/marketing/FigureLanguage";

/**
 * Landing #app intro — the figure teaches the holistic body-map.
 * Default (rest) lights all four anchors. Hover or focus on a
 * DomainMark kicker or an SVG hot-zone lights only that domain
 * and swaps the helhed caption for how MakeIt serves that system.
 * Color stays in the marks and anchors. Copy stays monochrome.
 * See docs/MAKEIT_FIGURE.md.
 */
export default function MarketingBodyMap() {
  const t = useTranslations("Marketing.app");
  const [active, setActive] = useState<Domain | null>(null);
  const highlighted = highlightsForActive(active);
  const detailKey = active ?? "whole";

  return (
    <div
      className="mb-16 grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-x-14"
      data-reveal
      onPointerLeave={() => setActive(null)}
    >
      <div className="order-2 flex flex-col items-center lg:order-1 lg:col-span-5 lg:items-start">
        <MakeItFigure
          highlightedDomains={highlighted}
          onDomainHover={setActive}
          ariaLabel={t("figureAria")}
          className="h-[20rem] w-auto sm:h-[24rem] md:h-[28rem] lg:h-[32rem] lg:min-h-[420px] xl:h-[36rem]"
        />
        <p className="mt-5 text-center text-[11px] font-mono uppercase tracking-[0.18em] text-fg-faint lg:text-left">
          {t("figure.holistic")}
        </p>
      </div>

      <div className="order-1 lg:order-2 lg:col-span-7">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <h2 className="font-display mb-5 text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92]">
          {t("heading")}
        </h2>
        <p className="max-w-xl text-lg leading-relaxed text-fg-dim md:text-xl">
          {t("intro")}
        </p>

        <ul className="mt-8 flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-3">
          {HERO_DOMAINS.map((domain) => {
            const selected = active === domain;
            const dimmed = active !== null && !selected;
            return (
              <li key={domain}>
                <button
                  type="button"
                  data-domain={domain}
                  data-body-map-kicker={domain}
                  aria-pressed={selected}
                  onPointerEnter={() => setActive(domain)}
                  onFocus={() => setActive(domain)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    "w-full rounded-sm text-left transition-opacity duration-150",
                    dimmed && "opacity-40",
                  )}
                >
                  <MarketingDomainKicker
                    domain={domain}
                    label={t(`figure.${domain}.title`)}
                    markClassName="size-4"
                  />
                  {selected ? (
                    <span className="domain-stroke mt-1.5" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div
          className="mt-6 min-h-[6.5rem] border-t hairline pt-5"
          aria-live="polite"
        >
          <div className="mb-2 flex items-center gap-2">
            {active ? (
              <span data-domain={active} className="inline-flex">
                <DomainMark
                  domain={active}
                  className="size-3.5 text-domain shrink-0"
                />
              </span>
            ) : null}
            <span className="eyebrow">{t(`figure.${detailKey}.title`)}</span>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-fg-dim md:text-base">
            {t(`figure.${detailKey}.body`)}
          </p>
        </div>
      </div>
    </div>
  );
}
