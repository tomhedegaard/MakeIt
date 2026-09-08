import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import SetupWizardClient from "./SetupWizardClient";

/** Shared first-visit wizard chrome — used on /nutrition and /nutrition/setup. */
export default async function NutritionSetupView() {
  const t = await getTranslations("Nutrition.setup");

  return (
    <main className="relative z-10 flex-1 py-12 md:py-20">
      <Container size="narrow">
        <header className="mb-10">
          <div className="eyebrow mb-3">{t("eyebrow")}</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,4rem)] leading-[0.95] mb-4">
            {t("title")}
            <br /> {t("titleLine2")}
          </h1>
          <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
            {t("intro")}
          </p>
        </header>

        <SetupWizardClient />
      </Container>
    </main>
  );
}
