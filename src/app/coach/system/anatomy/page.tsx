import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import AnatomyPreview from "./AnatomyPreview";
import AnatomyFigure3DSpikeLoader from "@/components/anatomy/AnatomyFigure3DSpike.loader";

export async function generateMetadata() {
  const t = await getTranslations("CoachStudio.anatomy");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

export default async function AnatomyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ spike?: string }>;
}) {
  const member = await getSession();
  if (!member) redirect("/login?next=/coach/system/anatomy");

  const { spike } = await searchParams;
  const isSpike = spike === "1";

  // Spike-routen (Fase 0) er åben for alle indloggede members for at lette
  // visuel verifikation. Default-sandboxen er fortsat admin-only.
  if (!isSpike && !member.isAdmin) redirect("/coach");

  const t = await getTranslations("CoachStudio.anatomy");

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header>
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95]">
          {isSpike ? "R3F Spike" : t("title")}
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          {isSpike
            ? "Fase 1: 3D-version af vores 2D-anatomy-figur. Samme muskel-taxonomi og brand-palette, extruderede SVG-paths. Sammenlign med 2D-mode side-om-side; drag for at rotere 3D-figuren."
            : t("intro")}
        </p>
      </header>

      {isSpike ? <AnatomyFigure3DSpikeLoader /> : <AnatomyPreview />}
    </Container>
  );
}
