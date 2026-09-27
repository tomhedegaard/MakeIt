import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import Card from "@/components/ui/Card";

export async function generateMetadata() {
  const t = await getTranslations("Youth.food");
  return { title: t("metaTitle") };
}

const SECTIONS = ["regular", "before", "after", "drink", "plate"] as const;

/**
 * Mad for MakeIt Ung (spec afsnit 3 and §S): what and when to eat around
 * training, in plain words. No calories, no macros, no weight, no
 * logging, no "good/bad" food. Open to adults too, but only linked from
 * the youth navigation.
 */
export default async function YouthFoodPage() {
  const t = await getTranslations("Youth.food");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-8 space-y-4 max-w-2xl" data-domain="food">
        {SECTIONS.map((key) => (
          <Card key={key} domain="food" as="section" className="space-y-2">
            <h2 className="font-display text-card">{t(`${key}.title`)}</h2>
            <p className="text-copy text-fg-body">{t(`${key}.body`)}</p>
            <p className="text-meta text-fg-dim">{t(`${key}.examples`)}</p>
          </Card>
        ))}
        <p className="pt-2 text-meta text-fg-dim">{t("footer")}</p>
      </Container>
    </>
  );
}
