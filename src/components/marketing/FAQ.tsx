import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import FaqList, { type FaqItem } from "@/components/marketing/FaqList";
import { SUPPORT_MAILTO } from "@/lib/company";
import { FAQ_ITEM_KEYS } from "@/lib/marketing/faq-items";

export default async function FAQ() {
  const t = await getTranslations("Marketing.faq");

  const ITEMS: FaqItem[] = FAQ_ITEM_KEYS.map((key) => ({
    q: t(`items.${key}.q`),
    a: t(`items.${key}.a`),
  }));

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

          <FaqList
            items={ITEMS}
            showAllLabel={t("showAll", { count: ITEMS.length })}
          />
        </div>
      </Container>
    </section>
  );
}
