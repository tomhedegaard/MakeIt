import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import FaqList, { type FaqItem } from "@/components/marketing/FaqList";
import { SUPPORT_MAILTO } from "@/lib/company";

export default async function FAQ() {
  const t = await getTranslations("Marketing.faq");

  const ITEMS: FaqItem[] = [
    { q: t("items.advanced.q"),     a: t("items.advanced.a") },
    { q: t("items.oneRm.q"),        a: t("items.oneRm.a") },
    { q: t("items.cancel.q"),       a: t("items.cancel.a") },
    { q: t("items.vacation.q"),     a: t("items.vacation.a") },
    { q: t("items.responseTime.q"), a: t("items.responseTime.a") },
    { q: t("items.pause.q"),        a: t("items.pause.a") },
    { q: t("items.irl.q"),          a: t("items.irl.a") },
    { q: t("items.cheaper.q"),      a: t("items.cheaper.a") },
    { q: t("items.wearables.q"),    a: t("items.wearables.a") },
    { q: t("items.hrvScore.q"),     a: t("items.hrvScore.a") },
    { q: t("items.weeklyInsight.q"),    a: t("items.weeklyInsight.a") },
    { q: t("items.hrvPrivacy.q"),   a: t("items.hrvPrivacy.a") },
    { q: t("items.dataDirection.q"),    a: t("items.dataDirection.a") },
    { q: t("items.offPlanNutrition.q"), a: t("items.offPlanNutrition.a") },
    // WAUW-3: new søjle-aware FAQ entries
    { q: t("items.openBrainWhy.q"),    a: t("items.openBrainWhy.a") },
    { q: t("items.coCoach.q"),         a: t("items.coCoach.a") },
    { q: t("items.hrvSharing.q"),      a: t("items.hrvSharing.a") },
    { q: t("items.optOutAdaptive.q"),  a: t("items.optOutAdaptive.a") },
  ];

  return (
    <section id="faq" className="relative border-t hairline py-20 md:py-28 scroll-mt-20">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 items-start">
          <div className="md:col-span-5" data-reveal>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.92] mb-5">
              {t("heading")}
            </h2>
            <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
              {t("intro")}
              {" "}
              <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
                {t("introLink")}
              </a>
              .
            </p>
          </div>

          <FaqList items={ITEMS} showAllLabel={t("showAll")} />
        </div>
      </Container>
    </section>
  );
}
