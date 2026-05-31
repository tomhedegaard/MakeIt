import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import AnatomyPreview from "./AnatomyPreview";

export async function generateMetadata() {
  const t = await getTranslations("CoachStudio.anatomy");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

/**
 * Admin-only iteration sandbox for the AnatomyFigure component.
 * Picks an exercise from a small library + a view (front/back), and
 * renders the figure live so we can tune muscle paths, colors,
 * proportions, and the highlight system together before wiring the
 * component into real exercise pages.
 *
 * This page is intentionally minimal — no DB hits, no plan
 * generation, just the figure + controls. When the figure is dialled
 * in, we delete this route + add the production wiring.
 */
export default async function AnatomyPreviewPage() {
  const member = await getSession();
  if (!member?.isAdmin) redirect("/coach");

  const t = await getTranslations("CoachStudio.anatomy");

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header>
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          {t("intro")}
        </p>
      </header>

      <AnatomyPreview />
    </Container>
  );
}
