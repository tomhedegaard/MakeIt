import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getCirkelFeed,
  getMyCirkler,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import CirkelPostForm from "@/components/mind/CirkelPostForm";
import CirkelFeed from "@/components/mind/CirkelFeed";

export async function generateMetadata() {
  const t = await getTranslations("Mind.cirklerPage");
  return { title: t("metaTitle") };
}

/**
 * `/mind/cirkler` — Beast+ asynkron group check-ins (MH-10).
 *
 * Members of one or more cirkler see their feed + a post form for
 * each cirkel. Non-Beast tier hits a locked explainer.
 */
export default async function MindCirklerPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  const t = await getTranslations("Mind.cirklerPage");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const beastOrLegend = member.tier === "Beast" || member.tier === "Legend";

  if (!beastOrLegend) {
    return (
      <>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("locked.title")}
          subtitle={t("locked.subtitle")}
        />
        <Container size="narrow" className="py-10">
          <p className="text-fg-dim leading-relaxed">{t("locked.body")}</p>
        </Container>
      </>
    );
  }

  const cirkler = await getMyCirkler(member.id);

  if (cirkler.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("empty.title")}
          subtitle={t("empty.subtitle")}
        />
      </>
    );
  }

  // Render the first cirkel inline. Future: multi-cirkel tabs.
  const first = cirkler[0]!;
  const feed = await getCirkelFeed(first.id, 30);

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={first.name}
        subtitle={t("subtitle", { count: first.member_count })}
      />
      <Container size="narrow" className="py-10 space-y-10">
        <CirkelPostForm cirkelId={first.id} />
        <CirkelFeed posts={feed} />

        {cirkler.length > 1 ? (
          <p className="text-fg-dim text-sm">
            {t("multi", { count: cirkler.length })}
          </p>
        ) : null}
      </Container>
    </>
  );
}
