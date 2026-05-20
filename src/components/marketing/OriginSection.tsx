import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { COMPANY } from "@/lib/company";

export default async function OriginSection() {
  const t = await getTranslations("Marketing.origin");

  return (
    <section id="origin" className="relative py-32 md:py-48">
      <Container>
        <div className="grid gap-16 md:grid-cols-12 items-start">
          <div className="md:col-span-5" data-reveal>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.92]">
              {t("heading.line1")}
              <br /> {t("heading.line2")}
              <br /> {t("heading.line3")}
            </h2>
          </div>

          <div className="md:col-span-6 md:col-start-7 space-y-10" data-reveal style={{ transitionDelay: "120ms" }}>
            <p className="text-xl md:text-2xl leading-relaxed">
              {t("body")}
            </p>

            <ul className="grid grid-cols-2 gap-px border hairline bg-line">
              {[
                { k: t("facts.establishedLabel"), v: t("facts.establishedValue") },
                { k: t("facts.locationLabel"),    v: COMPANY.legal.address ?? t("facts.locationFallback") },
                { k: t("facts.madeInLabel"),      v: t("facts.madeInValue") },
                { k: t("facts.soldAtLabel"),      v: t("facts.soldAtValue") },
                { k: t("facts.warrantyLabel"),    v: t("facts.warrantyValue") },
              ].map((row) => (
                <li key={row.k} className="bg-bg p-5">
                  <div className="eyebrow mb-2">{row.k}</div>
                  <div className="text-fg text-base">{row.v}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
