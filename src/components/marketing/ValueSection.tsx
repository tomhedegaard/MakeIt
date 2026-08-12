import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { pricing } from "@/lib/pricing";

export default async function ValueSection() {
  const t = await getTranslations("Marketing.value");

  // pricing.ts bruger "[XX]"-placeholders indtil prisen er låst —
  // de må aldrig nå en besøgende (UX-audit A1).
  const priceIsSet = !pricing.member.amount.includes("[");

  const PILLARS = [
    {
      n: "01",
      eyebrow: t("pillar1.eyebrow"),
      title: t("pillar1.title"),
      body: t("pillar1.body"),
      foot: t("pillar1.foot"),
    },
    {
      n: "02",
      eyebrow: t("pillar2.eyebrow"),
      title: t("pillar2.title"),
      body: t("pillar2.body"),
      foot: t("pillar2.foot"),
    },
    {
      n: "03",
      eyebrow: t("pillar3.eyebrow"),
      title: t("pillar3.title"),
      body: t("pillar3.body"),
      foot: t("pillar3.foot"),
    },
    {
      n: "04",
      eyebrow: t("pillar4.eyebrow"),
      title: t("pillar4.title"),
      body: t("pillar4.body"),
      foot: t("pillar4.foot"),
    },
  ];

  return (
    <section id="how" className="relative border-t hairline py-24 md:py-40">
      <Container>
        {/* Hook + price */}
        <div className="grid gap-12 md:grid-cols-12 items-end mb-16 md:mb-24">
          <div className="md:col-span-7" data-reveal>
            <div className="eyebrow mb-5">{t("positioningEyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92]">
              {t("positioningHeadline")}
            </h2>
          </div>

          <div
            className="md:col-span-5 surface-2 rounded-lg p-6 md:p-8"
            data-reveal
            style={{ transitionDelay: "120ms" }}
          >
            <div className="eyebrow mb-3">{t("priceLabel")}</div>
            {priceIsSet ? (
              <div className="flex items-baseline gap-2">
                <span className="numeric text-5xl md:text-6xl">{pricing.member.amount}</span>
                <span className="numeric text-fg-dim text-lg">
                  {pricing.member.currency}/{pricing.member.period}
                </span>
              </div>
            ) : (
              // UX-audit A1: vis aldrig "[XX] kr/md"-placeholderen for
              // besøgende — beta-framing indtil den reelle pris er låst.
              <div className="flex items-baseline gap-3">
                <span className="font-display text-5xl md:text-6xl leading-none">
                  {t("betaValue")}
                </span>
                <span className="text-fg-dim text-sm font-mono uppercase tracking-[0.14em]">
                  {t("betaSuffix")}
                </span>
              </div>
            )}

            {/* "Named bundle"-greb fra Scanfit-teardown: hele
                systemet samlet som én liste, ét medlemskab. */}
            <div className="mt-4 pt-4 border-t hairline">
              <div className="text-xs font-mono text-fg-faint uppercase tracking-[0.14em] mb-3">
                {t("includesHeading")}
              </div>
              <ul className="space-y-1.5 text-sm text-fg-dim">
                {(["1", "2", "3", "4", "5"] as const).map((n) => (
                  <li key={n} className="flex gap-2">
                    <span aria-hidden className="text-fg-faint">·</span>
                    {t(`includes.${n}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-4 border-t hairline space-y-1.5">
              {priceIsSet ? (
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-fg-dim">{t("marketLabel")}</span>
                  <span className="numeric text-fg-faint line-through">
                    ~{pricing.market.amount} {pricing.market.currency}/{pricing.market.period}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-fg-dim">{t("marketFraction")}</p>
              )}
              <p className="text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
                {t("priceLockNote")}
              </p>
            </div>
          </div>
        </div>

        <p
          className="max-w-2xl text-lg md:text-xl leading-relaxed text-fg-dim mb-16"
          data-reveal
          style={{ transitionDelay: "200ms" }}
        >
          {t("positioningSub")}
        </p>

        <div className="grid gap-px bg-line border hairline md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <article
              key={p.n}
              className="bg-bg p-7 md:p-9"
              data-reveal
              style={{ transitionDelay: `${260 + i * 90}ms` }}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="numeric text-fg-faint text-sm">{p.n}</span>
                <span className="eyebrow">{p.eyebrow}</span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl leading-[1] mb-5">
                {p.title}
              </h3>
              <p className="text-fg-dim text-sm md:text-base leading-relaxed mb-6">
                {p.body}
              </p>
              <div className="text-xs font-mono text-fg-faint uppercase tracking-[0.14em] pt-5 border-t hairline">
                {p.foot}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
