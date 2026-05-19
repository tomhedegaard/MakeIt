import { redirect } from "next/navigation";
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

  const insight = await getLatestWeeklyInsight(member.id);

  return (
    <>
      <PageHeader
        eyebrow="HRV"
        title="Indsigt"
        subtitle="Din ugentlige observation og hvad din livsstil ser ud til at betyde."
      />
      <Container className="py-8 lg:py-12 space-y-8">
        <HrvSubNav />

        {insight === null ? <StateEmpty /> : <StatePopulated insight={insight} />}
      </Container>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Empty — no insight row yet (also demo mode)                      */
/* ---------------------------------------------------------------- */

function StateEmpty() {
  return (
    <article className="max-w-prose">
      <p className="text-fg-dim text-sm md:text-base leading-relaxed">
        Din første ugentlige indsigt skrives søndag aften, så snart du har 14
        dages data fra dit wearable.
      </p>
    </article>
  );
}

/* ---------------------------------------------------------------- */
/* Populated — a stored weekly insight                              */
/* ---------------------------------------------------------------- */

function StatePopulated({ insight }: { insight: WeeklyInsight }) {
  const provenance =
    insight.claudeModelId === "template-fallback"
      ? "Skrevet automatisk."
      : "Skrevet af MakeIt-coachen.";

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
        {provenance} Uge fra {insight.weekStart}.
      </p>
    </div>
  );
}
