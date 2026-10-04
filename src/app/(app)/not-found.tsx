import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";

/** notFound() inside (app): same copy as the root 404, inside AppShell's <main>. */
export default async function AppNotFound() {
  const t = await getTranslations("Common.notFound");
  return (
    <Container size="narrow" className="py-12 md:py-20 space-y-6">
      <PageTitle title={t("title")} />
      <p className="text-copy text-fg-dim">{t("body")}</p>
      <Link href="/dashboard" className="btn btn-primary">
        {t("back")}
      </Link>
    </Container>
  );
}
