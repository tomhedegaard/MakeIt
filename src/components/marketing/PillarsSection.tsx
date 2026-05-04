import Container from "@/components/Container";

const pillars = [
  {
    id: "coaching",
    label: "02 — Coaching",
    title: "Programmer der virker. Coaches der løfter selv.",
    body: "1:1 sessioner, 12-ugers strength- og hypertrofi-blokke, formchecks via video. Kurateret af Anton og crewets head coaches. Ikke generisk app-content.",
    bullets: [
      "Strength · Hypertrophy · Powerbuilding",
      "Video form-check inden for 24 timer",
      "Personlige PR-tracks og deload-uger",
    ],
    stat: { v: "07", k: "Programmer live" },
  },
  {
    id: "community",
    label: "03 — Community",
    title: "Et feed bygget til løft — ikke til scroll.",
    body: "Del PR'er, optagelser og tanker med folk der faktisk forstår forskellen mellem en RPE 8 og en 9. Ugentlige challenges, leaderboards pr. gym, og IRL-meets på Amagerbro.",
    bullets: [
      "PR-feed med video og kommentarer",
      "Månedlige challenges & leaderboards",
      "IRL-meets, åbent hus & co-labs",
    ],
    stat: { v: "412", k: "Aktive medlemmer" },
  },
  {
    id: "reps",
    label: "04 — Reps Program",
    title: "Dit arbejde belønner sig.",
    body: "Tjen Reps for køb, programmer du gennemfører, PR'er du poster, og folk du inviterer ind. Bytt dem til limited drops, custom-strap-farver, early access og 1:1 tid med Anton.",
    bullets: [
      "Tier: Lifter → Athlete → Beast → Legend",
      "Limited drops kun for medlemmer",
      "Reps konverteres aldrig til kontanter — kun til ægte ting",
    ],
    stat: { v: "4", k: "Tiers" },
  },
];

export default function PillarsSection() {
  return (
    <section className="relative py-12 md:py-24">
      {pillars.map((p, idx) => (
        <div
          key={p.id}
          id={p.id}
          className={`relative border-t hairline ${idx === pillars.length - 1 ? "border-b" : ""}`}
        >
          <Container className="py-20 md:py-32">
            <div className="grid gap-12 md:grid-cols-12 items-start">
              <div className="md:col-span-5" data-reveal>
                <div className="eyebrow mb-6">{p.label}</div>
                <h3 className="font-display text-[clamp(2rem,5.2vw,4.5rem)] leading-[0.95]">
                  {p.title}
                </h3>
              </div>

              <div className="md:col-span-6 md:col-start-7 space-y-8">
                <p
                  className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl"
                  data-reveal
                  style={{ transitionDelay: "120ms" }}
                >
                  {p.body}
                </p>

                <ul className="grid gap-3">
                  {p.bullets.map((b, i) => (
                    <li
                      key={b}
                      data-reveal
                      style={{ transitionDelay: `${200 + i * 80}ms` }}
                      className="flex items-start gap-4 border-t hairline pt-4 text-fg/90"
                    >
                      <span className="numeric text-fg-faint text-sm w-8 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base md:text-lg">{b}</span>
                    </li>
                  ))}
                </ul>

                <div
                  data-reveal
                  style={{ transitionDelay: "500ms" }}
                  className="flex items-end gap-6 pt-4"
                >
                  <div className="numeric text-5xl md:text-7xl font-medium leading-none">
                    {p.stat.v}
                  </div>
                  <div className="eyebrow pb-2">{p.stat.k}</div>
                </div>
              </div>
            </div>
          </Container>
        </div>
      ))}
    </section>
  );
}
