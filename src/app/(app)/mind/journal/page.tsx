import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getRecentJournalEntries,
  getTodayJournalEntry,
  getTodayMindCheck,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import JournalForm from "@/components/mind/JournalForm";
import JournalHistory from "@/components/mind/JournalHistory";
import { pickPromptForToday } from "@/lib/mind/prompts";

export const metadata = {
  title: "Journal · Mind · MakeIt",
};

/**
 * `/mind/journal` — private journaling surface (MH-3).
 *
 * Owner-only RLS on journal_entries. One entry per UTC day. Prompt
 * picked from today's mind-check signal (high stress → grounding,
 * low energy → compassion) else day-of-year rotation.
 *
 * MH-3 wires the lightweight crisis-keyword pre-filter; MH-9 layers
 * Claude moderation + consent-gated coach-escalation on top.
 */
export default async function MindJournalPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const [todayMc, todayEntry, history] = await Promise.all([
    getTodayMindCheck(member.id),
    getTodayJournalEntry(member.id),
    getRecentJournalEntries(member.id, 30),
  ]);

  const prompt = pickPromptForToday(todayMc);

  return (
    <>
      <PageHeader
        eyebrow="Mind · Journal"
        title={todayEntry ? "Journal — opdater." : "Journal — privat."}
        subtitle={
          todayEntry
            ? "Du har skrevet i dag. Du kan opdatere indtil midnat."
            : "Tre ord eller tre afsnit. Kun du ser den. Aldrig Munk, aldrig coaches."
        }
      />
      <Container size="narrow" className="py-10 md:py-14">
        <JournalForm prompt={prompt} initialBody={todayEntry?.body ?? ""} />

        {history.length > 0 ? (
          <div className="mt-16">
            <h2 className="font-display text-2xl mb-6">Tidligere poster</h2>
            <JournalHistory entries={history.filter((e) => e.id !== todayEntry?.id)} />
          </div>
        ) : null}
      </Container>
    </>
  );
}
