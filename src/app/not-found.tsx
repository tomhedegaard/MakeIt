import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";

/** 404 for unmatched URLs and notFound() outside (app). Nord lys is the :root default. */
export default async function NotFound() {
  const t = await getTranslations("Common.notFound");
  return (
    <main className="flex-1">
      <Container size="narrow" className="py-12 md:py-20 space-y-6">
        <PageTitle title={t("title")} />
        <p className="text-copy text-fg-dim">{t("body")}</p>
        <Link href="/dashboard" className="btn btn-primary">
          {t("back")}
        </Link>
      </Container>
    </main>
  );
}
