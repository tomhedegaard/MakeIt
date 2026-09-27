import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import Container from "@/components/Container";
import Card from "@/components/ui/Card";
import PageTitle from "@/components/ui/PageTitle";
import { ICON } from "@/components/ui/icon";
import SectionHeader from "@/components/ui/SectionHeader";
import { getActiveProgram } from "@/lib/data/coaching";
import { getTodayCard } from "@/lib/data/dashboard";

/**
 * I dag for MakeIt Ung (spec afsnit 3). Today's session, food around
 * training without numbers, and Mind when consented. No kcal, no body
 * weight, no HRV numbers, no streak pressure. Help lines always shown.
 */
export default async function YouthToday({ memberId, name, mind }: { memberId: string; name: string; mind: boolean }) {
  const t = await getTranslations("Youth.today");
  const [today, active] = await Promise.all([getTodayCard(memberId), getActiveProgram(memberId)]);
  const hasProgram = Boolean(active);
  return (
    <Container className="py-6 lg:py-12 space-y-6" data-youth-today="">
      <PageTitle kicker={t("eyebrow")} title={t("title", { name })} />

      {today ? (
        <Card variant="primary" domain="body" as="section" className="space-y-3">
          <SectionHeader eyebrow={t("sessionEyebrow", { day: today.dayLabel })} title={today.title} className="mb-0" />
          <p className="text-meta text-fg-dim">
            {t("sessionMeta", { exercises: today.exerciseCount, minutes: today.estimatedMinutes })}
          </p>
          <p className="text-copy text-fg-body">{t("sessionHint")}</p>
          <Link href={`/session/${today.id}`} className="btn btn-primary w-full">
            {t("start")} <ArrowRight {...ICON} className="size-5" />
          </Link>
        </Card>
      ) : (
        <Card variant="primary" domain="body" as="section" className="space-y-3">
          <SectionHeader eyebrow={t("trainEyebrow")} title={hasProgram ? t("restTitle") : t("chooseTitle")} className="mb-0" />
          <p className="text-copy text-fg-body">{hasProgram ? t("restBody") : t("chooseBody")}</p>
          {hasProgram ? null : (
            <Link href="/coaching" className="btn btn-primary w-full">
              {t("choose")} <ArrowRight {...ICON} className="size-5" />
            </Link>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/ung/mad" data-domain="food" className="block">
          <Card domain="food" className="h-full space-y-2">
            <SectionHeader eyebrow={t("foodEyebrow")} title={t("foodTitle")} className="mb-0" />
            <p className="text-meta text-fg-dim">{t("foodBody")}</p>
          </Card>
        </Link>
        {mind ? (
          <Link href="/mind/check" data-domain="mind" className="block">
            <Card domain="mind" className="h-full space-y-2">
              <SectionHeader eyebrow={t("mindEyebrow")} title={t("mindTitle")} className="mb-0" />
              <p className="text-meta text-fg-dim">{t("mindBody")}</p>
            </Card>
          </Link>
        ) : null}
      </div>

      <section className="border-t hairline pt-5 space-y-1">
        <p className="text-meta font-medium">{t("helpTitle")}</p>
        <p className="text-meta text-fg-dim">{t("help")}</p>
      </section>
    </Container>
  );
}
