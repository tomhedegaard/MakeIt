import Link from "next/link";
import Container from "@/components/Container";
import {
  getCoachOverview,
  getMembersSummary,
  getPendingFormChecks,
} from "@/lib/data/coach";

export default async function CoachOverviewPage() {
  const [overview, members, pending] = await Promise.all([
    getCoachOverview(),
    getMembersSummary(),
    getPendingFormChecks(5),
  ]);

  // Recent activity = most recent member sessions (mock-ish ordering by lastSessionDate)
  const recentlyActive = members
    .filter((m) => m.lastSessionDate)
    .sort((a, b) => (a.lastSessionDate! < b.lastSessionDate! ? 1 : -1))
    .slice(0, 6);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">Coach console</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          Overblik.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          Hele crewets aktivitet samlet — fra form-check-kø til hvem der venter
          på et nyt program.
        </p>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <KPI label="Medlemmer"           value={overview.totalMembers} />
        <KPI label="Aktive programmer"   value={overview.activeAssignments} />
        <KPI label="Form-checks i kø"    value={overview.pendingFormChecks} pulse={overview.pendingFormChecks > 0} />
        <KPI label="Sessioner / uge"     value={overview.sessionsThisWeek} />
      </section>

      {/* Two column */}
      <div className="grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b hairline flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">Senest aktive</div>
              <h2 className="font-display text-2xl">Crewet</h2>
            </div>
            <Link href="/coach/members" className="btn btn-sm">Alle members →</Link>
          </div>

          <ul className="divide-y hairline">
            {recentlyActive.map((m) => (
              <li key={m.id} className="px-5 py-3 flex items-center gap-4">
                <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                  {m.handle.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">@{m.handle}</div>
                  <div className="text-[11px] font-mono text-fg-faint">
                    {m.programCode ? `${m.programCode} · uge ${m.programWeek}` : "Ingen aktivt program"}
                  </div>
                </div>
                <span className="numeric text-xs text-fg-dim shrink-0">{m.lastSessionDate}</span>
                <Link
                  href={`/coach/members/${m.id}`}
                  className="text-fg-dim hover:text-fg"
                  aria-label={`Åbn ${m.handle}`}
                >
                  →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b hairline flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">Form-check kø</div>
              <h2 className="font-display text-2xl">Til review</h2>
            </div>
            {pending.length > 0 ? (
              <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                {pending.length}
              </span>
            ) : null}
          </div>
          {pending.length === 0 ? (
            <div className="p-5 text-sm text-fg-dim">Køen er tom.</div>
          ) : (
            <ul className="divide-y hairline">
              {pending.slice(0, 4).map((f) => (
                <li key={f.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span>@{f.memberHandle}</span>
                    <span className="numeric text-fg-faint text-xs">
                      {f.aiScore != null ? `${f.aiScore}/100` : ""}
                    </span>
                  </div>
                  <div className="text-fg-dim text-xs truncate">
                    {f.exerciseName ?? "Form-check"}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t hairline p-3">
            <Link href="/coach/queue" className="btn btn-sm w-full">
              Åbn køen →
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function KPI({ label, value, pulse }: { label: string; value: number | string; pulse?: boolean }) {
  return (
    <div className="bg-bg p-5 lg:p-6">
      <div className="eyebrow mb-2 flex items-center gap-2">
        {pulse ? <span className="pulse-dot" /> : null}
        {label}
      </div>
      <div className="numeric text-3xl lg:text-4xl">{value}</div>
    </div>
  );
}
