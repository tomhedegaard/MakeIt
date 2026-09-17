import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getRecentJournalEntries,
  getRecentMindCheckLogs,
  getRecentSessionCompletions,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import {
  computeWeeklyInsights,
  headlineFromInsights,
} from "@/lib/mind/weekly-insights";
import WeeklyInsightsView from "@/components/mind/WeeklyInsightsView";

export async function generateMetadata() {
  const t = await getTranslations("Mind.weeklyPage");
  return { title: t("metaTitle") };
}

/**
 * `/mind/weekly` — last 7 days vs prior 7. Computed on the fly so no
 * new table is required for v0. The Monday cron uses the same compute
 * to build push-notification headlines.
 */
export default async function MindWeeklyPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  const t = await getTranslations("Mind.weeklyPage");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const [logs, completions, journals] = await Promise.all([
    getRecentMindCheckLogs(member.id, 14),
    getRecentSessionCompletions(member.id, 14),
    getRecentJournalEntries(member.id, 30),
  ]);

  const insights = computeWeeklyInsights(
    logs.map((l) => ({
      logged_date: l.logged_date,
      energy: l.energy,
      stress: l.stress,
      focus: l.focus,
    })),
    completions,
    journals.map((j) => ({ logged_date: j.logged_date })),
  );

  const headline = headlineFromInsights(insights);

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container size="narrow" className="py-10 md:py-14">
        <WeeklyInsightsView insights={insights} headline={headline} />
      </Container>
    </>
  );
}
