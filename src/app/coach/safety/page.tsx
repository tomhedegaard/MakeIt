import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { getMentalSafetyMetrics } from "@/lib/data/mind";

export const metadata = {
  title: "Safety · Coach · MakeIt",
};

/**
 * `/coach/safety` — Munk-only mental safety observability.
 *
 * Journals are owner-only RLS. We do not query them here and we do
 * not render zeros as if they were coverage. Open rows are
 * member-written summaries from mental_safety_alerts.
 */
export default async function CoachSafetyPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!member.isAdmin) redirect("/coach");

  const week = await getMentalSafetyMetrics(7);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">Coach · Søjle 5</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          Safety.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          En styrkecoach er ikke en krisevagt. Livslinien 70 201 201 og 112
          er det rigtige ved akut krise. Her ser du kun det medlemmet selv
          har valgt at skrive — aldrig journal-tekst.
        </p>
      </header>

      <section>
        <h2 className="font-display text-xl mb-4">Åbne eskaleringer</h2>
        {!week.alertsReadable ? (
          <div className="rounded-2xl border hairline bg-bg-2/30 p-6 space-y-2">
            <p className="text-fg-dim text-sm leading-relaxed">
              <code className="text-fg">mental_safety_alerts</code> kan ikke
              læses. Enten mangler migration 0057, eller RLS blokerede
              læsningen. Det er ikke det samme som &laquo;nul sager&raquo;.
            </p>
          </div>
        ) : week.openAlerts.length === 0 ? (
          <div className="rounded-2xl border hairline bg-bg-2/30 p-6 space-y-2">
            <div className="font-display text-5xl tabular-nums">0</div>
            <p className="text-fg-dim text-sm">
              Ingen åbne medlems-skrevne summaries. Munk får ikke push — åbn
              denne side for at se nye.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-fg-dim text-sm">
              <span className="tabular-nums font-medium text-fg">
                {week.openMentalAlerts}
              </span>{" "}
              åbne. Kun medlems-skrevet tekst.
            </p>
            <ul className="space-y-3">
              {week.openAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-2xl border hairline bg-bg-2/30 p-5 space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">@{alert.member_handle}</span>
                    <span className="text-fg-dim text-xs tabular-nums">
                      {alert.created_at.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-fg leading-relaxed whitespace-pre-wrap">
                    {alert.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Journal-volumen</h2>
        {week.journalCoverage === "demo" ? (
          <div className="space-y-3">
            <p className="text-fg-dim text-xs">
              Demo-tal — ikke live dækning. I connected mode kan coaches
              ikke aggregere andres journals (RLS owner-only).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-xl overflow-hidden">
              <KPI label="Journal entries" value={week.totalEntries ?? 0} />
              <KPI label="Clean" value={week.cleanCount ?? 0} />
              <KPI label="Flagged" value={week.flaggedCount ?? 0} />
              <KPI label="Crisis" value={week.crisisCount ?? 0} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border hairline bg-bg-2/30 p-6">
            <p className="text-fg-dim text-sm leading-relaxed">
              Journal-tal vises ikke. <code className="text-fg">journal_entries</code>{" "}
              er owner-only — Munk kan ikke se andres poster, og et 0-0-0-0
              her ville være falsk dækning. Claude-nulls tælles i logs som{" "}
              <code className="text-fg">[mind] moderation_claude_null</code>.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Sådan virker pipelinen</h2>
        <ol className="space-y-2 text-fg-dim text-sm leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-fg">Keyword pre-filter:</strong> hurtig regex
            over entry-body. Conservative — false-positives OK.
          </li>
          <li>
            <strong className="text-fg">Claude moderation (Haiku):</strong> fanger
            oblique sprog. Hvis Claude er nede eller returnerer null, er
            verdictet <em>ikke</em> clean — Livslinien-modal vises.
          </li>
          <li>
            <strong className="text-fg">Resources-modal:</strong> Livslinien + 112
            vises altid ved flagged/crisis. En styrkecoach er ikke en
            krisevagt.
          </li>
          <li>
            <strong className="text-fg">Consent-gated write:</strong> medlem
            skriver selv en summary →{" "}
            <code className="text-fg">mental_safety_alerts</code>. Ingen
            push/mail. Du ser aldrig den rå journal.
          </li>
        </ol>
      </section>
    </Container>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg-2/40 p-5">
      <div className="eyebrow text-xs mb-2">{label}</div>
      <div className="font-display text-3xl tabular-nums text-fg">{value}</div>
    </div>
  );
}
