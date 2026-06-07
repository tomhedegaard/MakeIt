import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getRecentMindCheckLogs,
  getTodayMindCheck,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import MindCheckForm from "@/components/mind/MindCheckForm";
import MentalGraph from "@/components/mind/MentalGraph";
import StreakBadge from "@/components/mind/StreakBadge";
import { currentStreak, longestStreak } from "@/lib/mind/streak";

export const metadata = {
  title: "Mind-check · MakeIt",
};

/**
 * `/mind/check` — the daily 60-second mental signal surface.
 *
 * MH-2: 3 sliders + optional note, 30-day mental graph, streak badge.
 * Adaptive Engine integration (mental signal → readiness) lands in MH-6.
 */
export default async function MindCheckPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const [logs, today] = await Promise.all([
    getRecentMindCheckLogs(member.id, 30),
    getTodayMindCheck(member.id),
  ]);

  const current = currentStreak(logs);
  const longest = longestStreak(logs);

  return (
    <>
      <PageHeader
        eyebrow="Mind · Søjle 5"
        title={today ? "Mind-check — opdater." : "Mind-check — 60 sek."}
        subtitle={
          today
            ? "Du har tjekket ind i dag. Du kan opdatere indtil midnat."
            : "Tre sliders. Én sætning hvis du har lyst. Det tager kortere tid end at vente på din næste sæt."
        }
        right={<StreakBadge current={current} longest={longest} />}
      />
      <Container size="narrow" className="py-10 md:py-14">
        <MindCheckForm
          initial={
            today
              ? {
                  energy: today.energy,
                  stress: today.stress,
                  focus: today.focus,
                  note: today.note,
                }
              : null
          }
        />

        <div className="mt-16">
          <MentalGraph logs={logs} days={30} />
        </div>

        <p className="mt-10 text-fg-dim text-sm leading-relaxed">
          Din journal og dine sessioner lander her i de næste faser
          (MH-3 til MH-5). Når Adaptive Engine (MH-6) sluges sammen med
          mental-signalen, vil dårlige mind-check uger lade Munks
          motor justere træningsdosis automatisk.
        </p>
      </Container>
    </>
  );
}
