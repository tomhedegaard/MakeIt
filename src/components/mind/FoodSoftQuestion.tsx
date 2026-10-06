import { getTranslations } from "next-intl/server";

/**
 * The soft question (spec 2026-09-27 §S): shown at the mind-check when an
 * early sign is there. It never names the data behind it and never warns;
 * it asks, and it points to help: LMS, Livslinien and Munk.
 */
export default async function FoodSoftQuestion() {
  const t = await getTranslations("Mind.foodQuestion");
  return (
    <section data-mind-food-question aria-labelledby="mind-food-question" className="border hairline bg-bg-2 p-5 space-y-3">
      <h2 id="mind-food-question" className="font-display text-card">
        {t("title")}
      </h2>
      <p className="text-copy text-fg-body max-w-prose">{t("body")}</p>
      <p className="text-meta text-fg-dim max-w-prose">
        <a href="https://lms.dk" className="underline underline-offset-2 hover:text-fg">
          {t("lms")}
        </a>
        {" · "}
        <a href="tel:70201201" className="whitespace-nowrap underline underline-offset-2 hover:text-fg">
          {t("livslinien")}
        </a>
        {" · "}
        {t("munk")}
      </p>
      <div className="text-micro text-fg-dim">{t("notTreatment")}</div>
    </section>
  );
}
