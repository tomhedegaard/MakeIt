import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";

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

      <Container className="py-12 space-y-12">
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
            <div className="eyebrow mb-3">1:1 Coaching</div>
            <h3 className="font-display text-3xl md:text-5xl mb-3">
              Vil du have Anton i dit øre direkte?
            </h3>
            <p className="text-fg-dim text-base md:text-lg max-w-xl">
              Personligt program, ugentlige form-checks via video, og direkte adgang
              over Signal. Begrænsede pladser — vi tager kun 8 atleter ind ad gangen.
            </p>
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
