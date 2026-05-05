import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { pricing } from "@/lib/pricing";

const PROGRAMS = [
  {
    code: "STR-12",
    name: "PR-Block",
    type: "Strength",
    weeks: 12,
    coach: "Anton",
    level: "Intermediate / Advanced",
    desc: "Klassisk linær periodisering med RPE-styring. Bygget til at tage din squat, bench og DL til nye PR'er på 12 uger.",
  },
  {
    code: "HYP-08",
    name: "Build Phase",
    type: "Hypertrofi",
    weeks: 8,
    coach: "Maria",
    level: "All levels",
    desc: "Volumen-fokuseret blok med bro-split logik for ben, ryg og skuldre. Mest reps, mest masse.",
  },
  {
    code: "PWR-10",
    name: "Powerbuilding",
    type: "Hybrid",
    weeks: 10,
    coach: "Kasper",
    level: "Intermediate",
    desc: "50/50 strength og hypertrofi. Tunge top-sets på big lifts, accessory-arbejde til æstetik.",
  },
  {
    code: "DL-06",
    name: "Deadlift Specialization",
    type: "Specialization",
    weeks: 6,
    coach: "Anton",
    level: "Advanced",
    desc: "Seks uger fokuseret 100% på dødløft. Pause-pulls, deficits, og en peak-protokol til ny 1RM.",
  },
];

export default function CoachingPage() {
  return (
    <>
      <PageHeader
        eyebrow="02 — Coaching"
        title="Programmer der virker."
        subtitle="Kurateret af Anton og crewets head coaches. Vælg en blok, kør den, og få form-checks undervejs."
      />

      <Container className="py-12 space-y-14">
        {/* Pricing & positioning */}
        <section className="surface-2 rounded-lg overflow-hidden">
          <div className="grid md:grid-cols-12">
            <div className="md:col-span-7 p-8 md:p-10 border-b md:border-b-0 md:border-r hairline">
              <div className="eyebrow mb-4">Pris &amp; model</div>
              <h2 className="font-display text-3xl md:text-5xl leading-[0.95] mb-5">
                AI gør det generiske.
                <br />
                Mennesker gør det vigtige.
              </h2>
              <p className="text-fg-dim text-base md:text-lg max-w-lg leading-relaxed">
                Programmer, form-tjek og progression håndteres automatisk.
                Coaches og crew kommer ind dér hvor det rent faktisk batter — så
                du får bedre coaching for en brøkdel af markedsprisen.
              </p>

              <ul className="mt-7 grid gap-2 text-sm">
                {[
                  "Personligt AI-program der opdateres hver uge",
                  "AI form-check med svar i sekunder",
                  "Ugentlig human review fra en head coach",
                  "Crew-feed, challenges og PR-leaderboards inkluderet",
                  "Reps loyalty: tjen point på alt du laver",
                ].map((b) => (
                  <li key={b} className="flex gap-3 border-t hairline pt-2">
                    <span className="text-fg-faint w-4">·</span>
                    <span className="text-fg/90">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-5 p-8 md:p-10 flex flex-col gap-7 justify-between">
              <div>
                <div className="eyebrow mb-3">Crew-medlemskab</div>
                <div className="flex items-baseline gap-2">
                  <span className="numeric text-6xl md:text-7xl leading-none">
                    {pricing.member.amount}
                  </span>
                  <span className="numeric text-fg-dim text-lg">
                    {pricing.member.currency}/{pricing.member.period}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t hairline">
                  <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                    <span className="text-fg-dim">{pricing.market.label}</span>
                    <span className="numeric text-fg-faint line-through">
                      ~{pricing.market.amount} {pricing.market.currency}/{pricing.market.period}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint mt-2">
                    Endelige priser låses inden launch
                  </p>
                </div>
              </div>

              <button className="btn btn-primary w-full">Aktivér medlemskab</button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {PROGRAMS.map((p) => (
            <article key={p.code} className="surface-2 rounded-lg p-6 md:p-8 lift">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="eyebrow mb-2">{p.code} · {p.type}</div>
                  <h3 className="font-display text-3xl md:text-4xl">{p.name}</h3>
                </div>
                <div className="text-right">
                  <div className="numeric text-3xl">{p.weeks}</div>
                  <div className="eyebrow">uger</div>
                </div>
              </div>

              <p className="text-fg-dim text-sm md:text-base leading-relaxed mb-6">
                {p.desc}
              </p>

              <div className="grid grid-cols-2 gap-px bg-line border hairline mb-6">
                <div className="bg-bg-2 px-4 py-3">
                  <div className="eyebrow mb-1">Coach</div>
                  <div className="text-sm">{p.coach}</div>
                </div>
                <div className="bg-bg-2 px-4 py-3">
                  <div className="eyebrow mb-1">Niveau</div>
                  <div className="text-sm">{p.level}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="btn btn-primary btn-sm">Start program</button>
                <button className="btn btn-sm">Se uge for uge</button>
              </div>
            </article>
          ))}
        </section>

        <section className="surface-2 rounded-lg p-8 md:p-12 grid md:grid-cols-3 gap-10 items-center">
          <div className="md:col-span-2">
            <div className="eyebrow mb-3">
              1:1 Coaching · Den eneste 100% menneskelige del
            </div>
            <h3 className="font-display text-3xl md:text-5xl mb-3">
              Vil du have Anton i dit øre direkte?
            </h3>
            <p className="text-fg-dim text-base md:text-lg max-w-xl">
              Personligt program, ugentlige form-checks via video, og direkte adgang
              over Signal. Begrænsede pladser — vi tager kun {pricing.oneOnOne.spots} ind ad gangen.
            </p>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="numeric text-3xl md:text-4xl">
                {pricing.oneOnOne.amount}
              </span>
              <span className="numeric text-fg-dim text-sm">
                {pricing.oneOnOne.currency}/{pricing.oneOnOne.period} · oven i medlemskabet
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <button className="btn btn-primary">Søg om plads</button>
            <button className="btn">Læs mere</button>
          </div>
        </section>
      </Container>
    </>
  );
}
