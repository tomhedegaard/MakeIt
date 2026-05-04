import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const member = (await getSession())!;

  return (
    <>
      <PageHeader
        eyebrow={`God morgen, ${member.handle}`}
        title="Hvad løfter du i dag?"
        subtitle="Overblik over din træning, dine programmer, dit fællesskab og dine Reps — samlet ét sted."
        right={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/coaching" className="btn btn-primary">Start dagens session →</Link>
            <Link href="/community" className="btn">Crew-feed</Link>
          </div>
        }
      />

      <Container className="py-12 space-y-12">
        {/* KPI row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline">
          {[
            { k: "Streak",        v: "12", s: "dage på stribe" },
            { k: "Volumen",       v: "84.2K", s: "kg løftet i april" },
            { k: "PR'er denne md.", v: "03", s: "Squat · DL · OHP" },
            { k: "Reps balance",  v: "1.420", s: "Tier: " + member.tier },
          ].map((s) => (
            <div key={s.k} className="bg-bg p-6">
              <div className="eyebrow mb-3">{s.k}</div>
              <div className="numeric text-3xl md:text-4xl">{s.v}</div>
              <div className="mt-2 text-xs text-fg-faint font-mono">{s.s}</div>
            </div>
          ))}
        </section>

        {/* Two column */}
        <div className="grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 surface-2 rounded-lg overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between border-b hairline">
              <div>
                <div className="eyebrow mb-1">Aktivt program</div>
                <h2 className="font-display text-3xl md:text-4xl">PR-Block · Wk 04 / 12</h2>
              </div>
              <Link href="/coaching" className="btn btn-sm">Se alle</Link>
            </div>
            <ul className="divide-y hairline">
              {[
                { d: "I dag",   t: "Squat — Top set @ RPE 8, 3×3 backoff",   m: "65 min" },
                { d: "I morgen", t: "Pause-bench, ringe-row, push-press",     m: "55 min" },
                { d: "Tor",     t: "Deadlift — opbygning til 90% af 1RM",    m: "70 min" },
                { d: "Fre",     t: "Hypertrofi: kvadriceps + skulder",        m: "45 min" },
              ].map((row) => (
                <li key={row.d} className="px-6 py-4 flex items-center gap-6">
                  <span className="eyebrow w-16">{row.d}</span>
                  <span className="flex-1 text-fg/90 text-sm md:text-base">{row.t}</span>
                  <span className="numeric text-fg-faint text-xs">{row.m}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="surface-2 rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b hairline">
              <div className="eyebrow mb-1">Live</div>
              <h2 className="font-display text-2xl">Crew-aktivitet</h2>
            </div>
            <ul className="divide-y hairline">
              {[
                { who: "@nina_dl",  what: "+2.5kg PR · Deadlift 175 kg", when: "lige nu" },
                { who: "@kasper_s", what: "afsluttet uge 8 af PR-Block", when: "12m" },
                { who: "@maria.lift", what: "delt formcheck-video", when: "32m" },
                { who: "@anton",    what: "har droppet en limited cuff-farve", when: "1t" },
              ].map((row, i) => (
                <li key={i} className="px-6 py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-fg">{row.who}</span>
                    <span className="numeric text-xs text-fg-faint">{row.when}</span>
                  </div>
                  <div className="text-fg-dim mt-1">{row.what}</div>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Drops */}
        <section className="grid gap-6 md:grid-cols-3">
          {[
            { tag: "Members only", t: "Limited Cuff — Olive", s: "Kun 80 stk · 1.200 Reps eller 449 kr" },
            { tag: "Challenge",    t: "Maj: 100k volumen-club", s: "Tilmeld dig — 250 Reps for deltagelse" },
            { tag: "1:1",         t: "Form-check med Anton",   s: "Book 30 min · 2.000 Reps" },
          ].map((c) => (
            <article key={c.t} className="surface-2 p-6 rounded-lg lift">
              <div className="eyebrow mb-4">{c.tag}</div>
              <h3 className="font-display text-2xl mb-2">{c.t}</h3>
              <p className="text-sm text-fg-dim">{c.s}</p>
            </article>
          ))}
        </section>
      </Container>
    </>
  );
}
