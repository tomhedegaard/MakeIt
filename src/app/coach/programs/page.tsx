import Link from "next/link";
import Container from "@/components/Container";
import { listCoachPrograms } from "@/lib/data/coach-programs";
import NewProgramForm from "@/components/coach/NewProgramForm";

export const metadata = { title: "Programmer · Coach" };

export default async function CoachProgramsPage() {
  const programs = await listCoachPrograms();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">Coach console · Programmer</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          Programmer.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          Byg trænings-skabeloner fra øvelsesbiblioteket — dage, øvelser,
          sæt — og publicér dem til medlemmer.
        </p>
      </header>

      <NewProgramForm />

      {programs.length === 0 ? (
        <p className="text-fg-dim text-sm">
          Ingen programmer endnu. Opret det første ovenfor.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/coach/programs/${encodeURIComponent(p.code)}`}
                className="surface-2 rounded-xl p-5 lift block h-full"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="numeric text-[10px] tracking-[0.16em] uppercase text-fg-faint">
                    {p.code}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border hairline ${
                      p.isPublished ? "text-fg" : "text-fg-faint"
                    }`}
                  >
                    {p.isPublished ? "Publiceret" : "Kladde"}
                  </span>
                </div>
                <div className="font-display text-xl leading-tight">
                  {p.name}
                </div>
                <div className="eyebrow text-fg-faint mt-1">
                  {[p.type, p.level].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-fg-dim">
                  <span>{p.weeks} uger</span>
                  <span>
                    {p.dayCount} {p.dayCount === 1 ? "dag" : "dage"}
                  </span>
                  <span>
                    {p.activeAssignments} aktiv
                    {p.activeAssignments === 1 ? "" : "e"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
