import { redirect } from "next/navigation";
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

export const metadata = {
  title: "Sessions · Mind · MakeIt",
};

const CATEGORY_ORDER: MentalSessionCategory[] = ["breathing", "focus", "recovery", "debrief"];
const CATEGORY_HEADING: Record<MentalSessionCategory, string> = {
  breathing: "Vejrtrækning",
  focus: "Fokus",
  recovery: "Recovery",
  debrief: "Debrief",
};
const CATEGORY_SUBTITLE: Record<MentalSessionCategory, string> = {
  breathing: "Box breath, coherence, lang udånding — for ro og HRV.",
  focus: "Pre-session priming + genstart efter pause.",
  recovery: "Vind ned efter beast-mode. Sov bedre.",
  debrief: "Efter sessionen — hvad lærte du?",
};

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
        eyebrow="Mind · Sessions"
        title="Bibliotek."
        subtitle="Vejrtrækning, fokus, recovery, debrief. Vælg én. 1-5 minutter pr. session."
      />
      <Container className="py-10 md:py-14 space-y-14">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory[cat];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <div className="mb-5">
                <h2 className="font-display text-2xl md:text-3xl">
                  {CATEGORY_HEADING[cat]}
                </h2>
                <p className="text-fg-dim text-sm mt-1">{CATEGORY_SUBTITLE[cat]}</p>
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
