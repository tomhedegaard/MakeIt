import Link from "next/link";
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
 * Surfaces COUNTS ONLY. Never journal bodies. Never moderation reasons
 * tied to specific members. The point is: Munk can see whether the
 * pipeline is firing too often (false-positive tuning) or whether
 * he has open escalations needing attention.
 *
 * Bodies remain hard-private (RLS owner-only). The escalation flow
 * surfaces a member-WRITTEN summary in /coach/queue (hrv_alerts.
 * conditions_met.summary) — that's the only thing Munk ever sees.
 */
export default async function CoachSafetyPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!member.isAdmin) redirect("/coach");

  const week = await getMentalSafetyMetrics(7);
  const month = await getMentalSafetyMetrics(30);

  const flaggedRate7d =
    week.totalEntries > 0
      ? Math.round(((week.flaggedCount + week.crisisCount) / week.totalEntries) * 100)
      : 0;
  const flaggedRate30d =
    month.totalEntries > 0
      ? Math.round(((month.flaggedCount + month.crisisCount) / month.totalEntries) * 100)
      : 0;

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">Coach · Søjle 5</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          Safety.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          Mental moderation pipeline — tællere kun. Du ser ALDRIG en
          journal-tekst herfra. Eskaleringer ankommer i din normale form-check kø
          med en medlems-skrevet summary.
        </p>
      </header>

      <section>
        <h2 className="font-display text-xl mb-4">Åbne eskaleringer</h2>
        <div className="rounded-2xl border-2 border-fg/40 bg-bg-2/30 p-6 space-y-2">
          <div className="font-display text-5xl tabular-nums">
            {week.openMentalAlerts}
          </div>
          <p className="text-fg-dim text-sm">
            Mental-safety alerts venter i køen.{" "}
            {week.openMentalAlerts > 0 ? (
              <Link href="/coach/queue" className="text-fg underline hover:opacity-80">
                Til kø →
              </Link>
            ) : null}
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Sidste 7 dage</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-xl overflow-hidden">
          <KPI label="Journal entries" value={week.totalEntries} />
          <KPI label="Clean" value={week.cleanCount} accent="emerald" />
          <KPI label="Flagged" value={week.flaggedCount} accent="yellow" />
          <KPI label="Crisis" value={week.crisisCount} accent="red" />
        </div>
        <p className="mt-3 text-fg-dim text-xs">
          Flag-rate i ugen: <span className="tabular-nums">{flaggedRate7d}%</span>
          {flaggedRate7d > 15 ? (
            <span className="ml-2 text-yellow-300">
              (højt — overvej at tune crisis-keywords eller Claude moderation-prompt)
            </span>
          ) : null}
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Sidste 30 dage</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-xl overflow-hidden">
          <KPI label="Journal entries" value={month.totalEntries} />
          <KPI label="Clean" value={month.cleanCount} accent="emerald" />
          <KPI label="Flagged" value={month.flaggedCount} accent="yellow" />
          <KPI label="Crisis" value={month.crisisCount} accent="red" />
        </div>
        <p className="mt-3 text-fg-dim text-xs">
          Flag-rate i månaden: <span className="tabular-nums">{flaggedRate30d}%</span>
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Sådan virker pipelinen</h2>
        <ol className="space-y-2 text-fg-dim text-sm leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-fg">Keyword pre-filter:</strong> hurtig regex over
            entry-body (selvmord, selvskade, alvorlig håbløshed, substansbrug).
            Synkron. Conservative &mdash; false-positives OK.
          </li>
          <li>
            <strong className="text-fg">Claude moderation (Haiku):</strong> anden
            check der fanger oblique sprog keyword&apos;erne missede. ~2-3s pr. entry.
          </li>
          <li>
            <strong className="text-fg">Resources-modal:</strong> hvis nogen af de
            to flager → medlem ser Livslinien + 112 + læge-ressourcer.
          </li>
          <li>
            <strong className="text-fg">Consent-gated coach-eskalering:</strong>
            medlem TRYKKER &laquo;fortæl Munk&raquo; + skriver deres egen summary →
            havner i din kø som <code className="text-fg">hrv_alerts</code> med
            <code className="text-fg"> conditions_met.source = &#39;mental_safety&#39;</code>.
            Du ser ALDRIG den rå journal — kun medlems-summary.
          </li>
        </ol>
      </section>
    </Container>
  );
}

type KPIProps = {
  label: string;
  value: number;
  accent?: "emerald" | "yellow" | "red";
};

function KPI({ label, value, accent }: KPIProps) {
  const color =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "yellow"
        ? "text-yellow-300"
        : accent === "red"
          ? "text-red-300"
          : "text-fg";
  return (
    <div className="bg-bg-2/40 p-5">
      <div className="eyebrow text-xs mb-2">{label}</div>
      <div className={`font-display text-3xl tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
