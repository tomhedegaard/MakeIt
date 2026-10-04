import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { isYouthAccount } from "@/lib/youth/account";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { acknowledgeMentalDisclaimerAction } from "@/app/(app)/mind/onboarding/actions";

/** First-visit Mind disclaimer — rendered on `/mind` so the tab does not hop. */
export default async function MindDisclaimer() {
  const t = await getTranslations("Mind.disclaimer");
  const viewer = await getSession();
  const youth = viewer ? await isYouthAccount(viewer.id) : false;

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
            <h2 className="font-display text-section mb-3">
              {t("important_title")}
            </h2>
            <p className="text-fg-dim leading-relaxed text-copy">
              {t.rich("important_body", {
                strong: (chunks) => <strong className="font-medium text-fg">{chunks}</strong>,
              })}
            </p>
          </section>

          <section className="border-l hairline-strong pl-5">
            <p className="eyebrow mb-3">{t("resources_title")}</p>
            <ul className="space-y-1.5 text-fg text-copy">
              {youth ? (
                <li>
                  <a href="tel:116111" className="underline underline-offset-2">
                    {t("resources_bornetelefonen")}
                  </a>
                </li>
              ) : null}
              {youth ? (
                <li>
                  <a href="https://headspace.dk" className="underline underline-offset-2">
                    {t("resources_headspace")}
                  </a>
                </li>
              ) : null}
              <li>
                <a href="tel:70201201" className="underline underline-offset-2">
                  {t("resources_livslinien")}
                </a>
              </li>
              <li>
                <a href="tel:112" className="underline underline-offset-2">
                  {t("resources_emergency")}
                </a>
              </li>
              <li>{t("resources_doctor")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-section mb-4">
              {t("privacy_title")}
            </h2>
            <ul className="space-y-3 text-fg-dim leading-relaxed text-copy">
              <li>
                <span className="text-fg font-medium">{t("privacy_journal_label")}: </span>
                {t("privacy_journal")}
              </li>
              <li>
                <span className="text-fg font-medium">{t("privacy_mind_check_label")}: </span>
                {t("privacy_mind_check")}
              </li>
              <li>
                <span className="text-fg font-medium">{t("privacy_ai_label")}: </span>
                {t("privacy_ai")}
              </li>
            </ul>
          </section>

          <form action={acknowledgeMentalDisclaimerAction}>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {t("accept")}
            </button>
          </form>
        </div>
      </Container>
    </>
  );
}
