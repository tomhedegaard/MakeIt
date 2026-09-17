import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import HrvSubNav from "@/components/hrv/HrvSubNav";

/**
 * `/hrv/learn` — a short, static editorial page explaining HRV to members.
 *
 * Purely editorial: no data fetching, no member resolution. Five plain-language
 * sections in a narrow text column, monochrome, no illustrations.
 *
 * The shared `HrvSubNav` at the top links between the three `/hrv` pages.
 */

/** The five editorial sections, in render order (copy in Hrv.learn.sections). */
const SECTION_KEYS = ["what", "rmssd", "noScore", "noCompare", "cycle"] as const;

export default async function HrvLearnPage() {
  const t = await getTranslations("Hrv.learn");

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container className="py-8 lg:py-12 space-y-10">
        <HrvSubNav />

        <article className="max-w-prose space-y-12">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="font-display text-2xl md:text-3xl leading-tight mb-3">
                {t(`sections.${key}.heading`)}
              </h2>
              <p className="text-fg-dim text-sm md:text-base leading-relaxed">
                {t(`sections.${key}.body`)}
              </p>
            </section>
          ))}
        </article>
      </Container>
    </>
  );
}
