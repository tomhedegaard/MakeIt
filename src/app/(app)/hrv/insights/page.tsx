import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import HrvSubNav from "@/components/hrv/HrvSubNav";
import InsightCard from "@/components/hrv/InsightCard";
import { getSession } from "@/lib/auth";
import { getLatestWeeklyInsight, type WeeklyInsight } from "@/lib/data/hrv";

/**
 * `/hrv/insights` — a member's most recent weekly HRV insight (V2.2).
 *
 * Reads the member's latest stored insight via `getLatestWeeklyInsight`, then
 * renders ONE of two states:
 *  - Empty (`null`) → editorial reassurance copy. Covers demo mode and members
 *    with no insight row yet.
 *  - Populated → the Claude-written summary as a lead paragraph, the
 *    correlation cards, and a faint provenance line.
 *
 * The shared `HrvSubNav` at the top links between the four `/hrv` pages.
 */

export default async function HrvInsightsPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const t = await getTranslations("Hrv.insights");
  const locale = await getLocale();
  const insight = await getLatestWeeklyInsight(member.id);

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container className="py-8 lg:py-12 space-y-8">
        <HrvSubNav />

        {insight === null ? (
          <StateEmpty t={t} />
        ) : (
          <StatePopulated insight={insight} t={t} locale={locale} />
        )}
      </Container>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Empty — no insight row yet (also demo mode)                      */
/* ---------------------------------------------------------------- */

type InsightsT = Awaited<ReturnType<typeof getTranslations<"Hrv.insights">>>;

function StateEmpty({ t }: { t: InsightsT }) {
  return (
    <article className="max-w-prose">
      <p className="text-fg-dim text-sm md:text-base leading-relaxed">
        {t("empty")}
      </p>
    </article>
  );
}

/* ---------------------------------------------------------------- */
/* Populated — a stored weekly insight                              */
/* ---------------------------------------------------------------- */

function StatePopulated({
  insight,
  t,
  locale,
}: {
  insight: WeeklyInsight;
  t: InsightsT;
  locale: string;
}) {
  const provenance =
    insight.claudeModelId === "template-fallback"
      ? t("provenanceAuto")
      : t("provenanceCoach");

  // `weekStart` is a date-only string; the "T00:00:00" suffix forces
  // local-midnight parsing so the date doesn't slip a day in negative-offset
  // timezones. Same guard as src/lib/email/templates/weekly-digest.ts.
  const weekLabel = new Date(insight.weekStart + "T00:00:00").toLocaleDateString(
    locale,
    { day: "numeric", month: "long" },
  );

  return (
    <div className="space-y-8">
      <article className="max-w-prose">
        <p className="text-fg-dim text-base md:text-lg leading-relaxed">
          {insight.summaryText}
        </p>
      </article>

      <div className="grid gap-4 sm:grid-cols-2">
        {insight.correlationCards.map((card) => (
          <InsightCard key={card.factor} card={card} />
        ))}
      </div>

      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        {provenance} {t("weekFrom", { date: weekLabel })}
      </p>
    </div>
  );
}
