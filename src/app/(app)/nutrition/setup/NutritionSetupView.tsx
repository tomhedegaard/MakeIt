import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import SetupWizardClient from "./SetupWizardClient";

/** Shared first-visit wizard chrome — used on /nutrition and /nutrition/setup. */
export default async function NutritionSetupView() {
  const t = await getTranslations("Nutrition.setup");

  return (
    <main className="relative z-10 flex-1 py-12 md:py-20">
      <Container size="narrow">
        <div className="mb-10">
          <PageTitle kicker={t("eyebrow")} title={`${t("title")} ${t("titleLine2")}`} />
          <p className="mt-4 text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
            {t("intro")}
          </p>
        </div>

        <SetupWizardClient />
      </Container>
    </main>
  );
}
