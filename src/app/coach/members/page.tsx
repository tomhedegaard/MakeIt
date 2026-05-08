import Link from "next/link";
import Container from "@/components/Container";
import { getMembersSummary } from "@/lib/data/coach";

export default async function CoachMembersPage() {
  const members = await getMembersSummary();

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">Coach console</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">Medlemmer</h1>
        <p className="mt-2 text-fg-dim text-sm">{members.length} i crewet</p>
      </header>

      <section className="surface-2 rounded-2xl overflow-hidden">
        {members.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="font-display text-2xl mb-2">Ingen medlemmer endnu.</div>
            <p className="text-fg-dim text-sm max-w-sm mx-auto">
              Når invite-koder bliver brugt, dukker medlemmerne op her med tier, aktivt
              program og sidste session.
            </p>
          </div>
        ) : (
          <ul className="divide-y hairline">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/coach/members/${m.id}`}
                  className="block px-5 py-4 flex items-center gap-4 hover:bg-bg-3"
                >
                  <div className="size-10 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-xs font-mono shrink-0">
                    {m.handle.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">@{m.handle}</div>
                    <div className="text-[11px] font-mono text-fg-faint">
                      {m.tier} ·{" "}
                      {m.programCode ? `${m.programCode} · uge ${m.programWeek}` : "Intet aktivt program"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                      Sidste
                    </div>
                    <div className="numeric text-sm">
                      {m.lastSessionDate ?? "—"}
                    </div>
                  </div>
                  <span className="text-fg-dim ml-2" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
