import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

/**
 * Safety line at the foot of every Mind page (spec §6.5): the app is not
 * treatment, and the crisis numbers are one tap away. Numbers stay Danish
 * in every locale, like the crisis lines in MentalResourcesModal.
 */
export default async function MindSafetyLine() {
  const t = await getTranslations("Mind.safetyLine");
  return (
    <Container size="narrow" className="py-6">
      <p data-mind-safety-line className="border-t hairline pt-4 text-meta text-fg-dim">
        {t("notTreatment")}{" "}
        <a href="tel:70201201" className="whitespace-nowrap underline underline-offset-2 hover:text-fg">
          {t("livslinien")}
        </a>
        {" · "}
        <a href="tel:112" className="whitespace-nowrap underline underline-offset-2 hover:text-fg">
          {t("emergency")}
        </a>
      </p>
    </Container>
  );
}
