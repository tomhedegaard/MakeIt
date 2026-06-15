import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

/**
 * Farveindeks — standalone section that teaches the domain color
 * system (docs/DOMAIN_COLOR_SYSTEM.md) before AppShowcase shows it
 * in action.
 *
 * Four cells, one per health domain, each scoped with data-domain so
 * the section IS the system rather than a mockup of it: the same
 * .domain-stroke, .eyebrow-domain and text-domain utilities the app
 * uses resolve here. Numbers mirror the app nav (02 Træning, 03 Kost,
 * 05 HRV, 06 Mind) so the indexing carries over 1:1 when the member
 * logs in.
 *
 * Monochrome base stays untouched — color appears only in the stroke,
 * the kicker and the nav number, per the dosage rules.
 */

const DOMAINS = [
  { domain: "body", num: "02", key: "body" },
  { domain: "food", num: "03", key: "food" },
  { domain: "heart", num: "05", key: "heart" },
  { domain: "mind", num: "06", key: "mind" },
] as const;

export default async function DomainIndexSection() {
  const t = await getTranslations("Marketing.domainIndex");

  return (
    <section className="relative py-12 md:py-24 border-t hairline">
      <Container>
        <div className="max-w-2xl" data-reveal>
          <div className="eyebrow mb-6">{t("eyebrow")}</div>
          <h2 className="font-display text-[clamp(2rem,5.2vw,4rem)] leading-[0.95]">
            {t("heading")}
          </h2>
          <p className="mt-6 text-lg md:text-xl text-fg-dim leading-relaxed">
            {t("intro")}
          </p>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border hairline rounded-2xl overflow-hidden">
          {DOMAINS.map((d, i) => (
            <div
              key={d.domain}
              data-domain={d.domain}
              data-reveal
              style={{ transitionDelay: `${120 + i * 80}ms` }}
              className="bg-bg-2 p-6 md:p-8"
            >
              <span className="domain-stroke mb-5" aria-hidden />
              <div className="flex items-baseline gap-2">
                <span className="numeric text-[11px] text-domain">{d.num}</span>
                <span className="eyebrow eyebrow-domain">
                  {t(`${d.key}.kicker`)}
                </span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl mt-2">
                {t(`${d.key}.title`)}
              </h3>
              <p className="mt-3 text-sm text-fg-dim leading-relaxed">
                {t(`${d.key}.body`)}
              </p>
              <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                {t(`${d.key}.surfaces`)}
              </p>
            </div>
          ))}
        </div>

        <p
          className="mt-6 text-xs font-mono uppercase tracking-[0.14em] text-fg-faint"
          data-reveal
        >
          {t("note")}
        </p>
      </Container>
    </section>
  );
}
