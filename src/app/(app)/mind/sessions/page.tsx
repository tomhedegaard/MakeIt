import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getCompletedSessionIds,
  getHeroSessions,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import SessionCard from "@/components/mind/SessionCard";
import type { MentalSession, MentalSessionCategory } from "@/lib/mind/types";

export async function generateMetadata() {
  const t = await getTranslations("Mind.sessionsPage");
  return { title: t("metaTitle") };
}

/** Category headings + subtitles live in Mind.sessionsPage.category. */
const CATEGORY_ORDER: MentalSessionCategory[] = ["breathing", "focus", "recovery", "debrief"];

/**
 * `/mind/sessions` — hero session library (MH-5).
 *
 * 8 evergreen sessions seeded in migration 0046 §12. Grouped by
 * category, ordered by duration ascending. Cards link to the
 * runner page at `/mind/sessions/[slug]`.
 */
export default async function MindSessionsPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  const t = await getTranslations("Mind.sessionsPage");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const [sessions, completedIds] = await Promise.all([
    getHeroSessions("da"),
    getCompletedSessionIds(member.id),
  ]);

  const byCategory: Record<MentalSessionCategory, MentalSession[]> = {
    breathing: [],
    focus: [],
    recovery: [],
    debrief: [],
  };
  for (const s of sessions) byCategory[s.category].push(s);

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container className="py-10 md:py-14 space-y-14">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory[cat];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <div className="mb-5">
                <h2 className="font-display text-2xl md:text-3xl">
                  {t(`category.${cat}.heading`)}
                </h2>
                <p className="text-fg-dim text-sm mt-1">
                  {t(`category.${cat}.subtitle`)}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    completed={completedIds.has(s.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </Container>
    </>
  );
}
