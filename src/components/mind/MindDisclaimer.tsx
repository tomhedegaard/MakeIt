import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { acknowledgeMentalDisclaimerAction } from "@/app/(app)/mind/onboarding/actions";

/** First-visit Mind disclaimer — rendered on `/mind` so the tab does not hop. */
export default async function MindDisclaimer() {
  const t = await getTranslations("Mind.disclaimer");

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("intro")}
      />
      <Container size="narrow" className="py-12 md:py-16">
        <div className="space-y-12">
          <section>
            <h2 className="font-display text-2xl md:text-3xl mb-3">
              {t("important_title")}
            </h2>
            <p className="text-fg-dim leading-relaxed text-base md:text-lg">
              {t("important_body")}
            </p>
          </section>

          <section className="border-l-2 border-fg/20 pl-5">
            <h3 className="eyebrow mb-3">{t("resources_title")}</h3>
            <ul className="space-y-1.5 text-fg text-base">
              <li>{t("resources_livslinien")}</li>
              <li>{t("resources_emergency")}</li>
              <li>{t("resources_doctor")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl md:text-3xl mb-4">
              {t("privacy_title")}
            </h2>
            <ul className="space-y-3 text-fg-dim leading-relaxed text-base md:text-lg">
              <li>
                <span className="text-fg font-medium">{t("privacy_journal_label")} — </span>
                {t("privacy_journal")}
              </li>
              <li>
                <span className="text-fg font-medium">{t("privacy_mind_check_label")} — </span>
                {t("privacy_mind_check")}
              </li>
              <li>
                <span className="text-fg font-medium">{t("privacy_ai_label")} — </span>
                {t("privacy_ai")}
              </li>
            </ul>
          </section>

          <form action={acknowledgeMentalDisclaimerAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-8 py-4 text-base font-medium hover:opacity-90 transition-opacity"
            >
              {t("accept")}
            </button>
          </form>
        </div>
      </Container>
    </>
  );
}
