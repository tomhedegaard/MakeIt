import Link from "next/link";
import { getTranslations } from "next-intl/server";
import DomainMark, { DOMAINS, type Domain } from "./DomainMark";
import MakeItFigure from "./MakeItFigure";

/**
 * Compact editorial body-map for the dashboard/today header.
 * Teaching state: all four anchors lit at rest (low-opacity fills +
 * food halo). Today-as-figure (off-only lighting) is a later phase.
 * Existing dashboard tiles and data stay below.
 */

const KICKERS: { domain: Domain; href: string; num: string }[] = [
  { domain: "mind", href: "/mind", num: "06" },
  { domain: "heart", href: "/hrv", num: "05" },
  { domain: "body", href: "/coaching", num: "02" },
  { domain: "food", href: "/nutrition", num: "03" },
];

export default async function BodyMap() {
  const t = await getTranslations("Dashboard.figure");

  return (
    <section
      aria-label={t("ariaLabel")}
      className="flex items-center gap-5 md:gap-8"
    >
      <MakeItFigure
        className="h-36 md:h-48 w-auto shrink-0"
        ariaLabel={t("ariaLabel")}
        highlightedDomains={DOMAINS}
      />
      <div className="min-w-0 flex-1">
        <div className="eyebrow mb-3">{t("eyebrow")}</div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {KICKERS.map((item) => (
            <li key={item.domain}>
              <Link
                href={item.href}
                data-domain={item.domain}
                className="flex items-center gap-2.5 group"
              >
                <DomainMark
                  domain={item.domain}
                  className="size-6 text-domain shrink-0"
                />
                <span className="min-w-0">
                  <span className="numeric text-[10px] text-domain mr-1.5">
                    {item.num}
                  </span>
                  <span className="eyebrow eyebrow-domain">
                    {t(item.domain)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
