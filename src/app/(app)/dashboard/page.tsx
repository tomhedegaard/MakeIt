import Link from "next/link";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { TODAY_SESSION, totalSets } from "@/lib/workout";

export default async function TodayPage() {
  const member = (await getSession())!;
  const s = TODAY_SESSION;
  const sets = totalSets(s);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      {/* Greeting */}
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <div className="eyebrow mb-2">God morgen</div>
          <h1 className="font-display text-[clamp(2rem,7vw,3.5rem)] leading-[0.95]">
            @{member.handle}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <div className="eyebrow mb-1">Streak</div>
          <div className="numeric text-3xl">12</div>
          <div className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">dage</div>
        </div>
      </header>

      {/* Today's session — flagship card */}
      <section
        aria-label="Dagens session"
        className="surface-2 rounded-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 border-b hairline">
          <div className="flex items-center gap-2 mb-3">
            <span className="pulse-dot" />
            <span className="eyebrow">Dagens session · {s.programCode} · uge {s.week}</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-2">
            {s.dayLabel}
          </h2>
          <p className="text-fg-dim text-sm md:text-base leading-relaxed">
            {s.title}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-line border-b hairline">
          <div className="bg-bg-2 px-4 py-3">
            <div className="eyebrow mb-1">Øvelser</div>
            <div className="numeric text-2xl">{s.exercises.length}</div>
          </div>
          <div className="bg-bg-2 px-4 py-3">
            <div className="eyebrow mb-1">Sæt</div>
            <div className="numeric text-2xl">{sets}</div>
          </div>
          <div className="bg-bg-2 px-4 py-3">
            <div className="eyebrow mb-1">Est. tid</div>
            <div className="numeric text-2xl">{s.estimatedMinutes}<span className="text-fg-dim text-sm">m</span></div>
          </div>
        </div>

        <ul className="divide-y hairline">
          {s.exercises.map((ex, i) => (
            <li key={ex.id} className="px-5 py-3 flex items-center gap-4">
              <span className="numeric text-fg-faint text-xs w-6">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-fg/90 text-sm md:text-base truncate">{ex.name}</span>
              <span className="numeric text-fg-faint text-xs">{ex.sets.length}× sæt</span>
            </li>
          ))}
        </ul>

        <div className="p-4 lg:p-5">
          <Link href={`/session/${s.id}`} className="btn btn-primary btn-xl">
            Start session →
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">Volumen</div>
          <div className="numeric text-2xl lg:text-3xl">84.2K</div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">kg · april</div>
        </div>
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">PR&apos;er</div>
          <div className="numeric text-2xl lg:text-3xl">03</div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">denne md.</div>
        </div>
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">Reps</div>
          <div className="numeric text-2xl lg:text-3xl">1.420</div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">{member.tier}</div>
        </div>
      </section>

      {/* Coming up */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Kommende sessioner</div>
          <Link href="/coaching" className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
            Se uge →
          </Link>
        </div>
        <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
          {[
            { d: "I morgen", t: "Pause-bench, ringe-row, push-press", m: "55m" },
            { d: "Tor",      t: "Deadlift — opbygning til 90% af 1RM", m: "70m" },
            { d: "Fre",      t: "Hypertrofi: kvadriceps + skulder",     m: "45m" },
          ].map((row) => (
            <li key={row.d} className="px-4 py-3 flex items-center gap-4">
              <span className="eyebrow w-16 shrink-0">{row.d}</span>
              <span className="flex-1 text-sm text-fg/90 truncate">{row.t}</span>
              <span className="numeric text-fg-faint text-xs shrink-0">{row.m}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Crew highlights */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Crew lige nu</div>
          <Link href="/community" className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
            Se feed →
          </Link>
        </div>
        <ul className="space-y-2.5">
          {[
            { who: "@nina_dl",    what: "+2.5kg PR · Deadlift 175 kg", when: "lige nu", pr: true },
            { who: "@kasper_s",   what: "afsluttet uge 8 af PR-Block",  when: "12m" },
            { who: "@maria.lift", what: "delt formcheck-video",         when: "32m" },
          ].map((row, i) => (
            <li key={i} className="surface-2 rounded-lg p-4 flex items-center gap-3">
              <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                {row.who.slice(1, 3).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">
                  <span className="text-fg">{row.who}</span>{" "}
                  <span className="text-fg-dim">{row.what}</span>
                </div>
                <div className="text-[10px] font-mono text-fg-faint mt-0.5">{row.when}</div>
              </div>
              {row.pr ? (
                <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0">
                  ★ PR
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
