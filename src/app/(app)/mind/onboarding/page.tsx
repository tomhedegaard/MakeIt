import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { hasAcknowledgedMentalDisclaimer } from "@/lib/data/mind";
import { acknowledgeMentalDisclaimerAction } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("Mind.disclaimer");
  return { title: `${t("title")} · MakeIt` };
}

/**
 * `/mind/onboarding` — first-visit disclaimer for the mental pillar.
 *
 * Explicit: "this is NOT clinical treatment". Surfaces resources for
 * crisis paths. Once accepted, stamps members.acknowledged_mental_
 * disclaimer_at (or a cookie in demo mode) and forwards to /mind/check.
 */
export default async function MindOnboardingPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  if (await hasAcknowledgedMentalDisclaimer(member.id)) {
    redirect("/mind/check");
  }

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
