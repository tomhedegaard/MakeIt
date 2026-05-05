import Container from "@/components/Container";
import { pricing, positioning } from "@/lib/pricing";

const PILLARS = [
  {
    n: "01",
    eyebrow: "Automatiseret",
    title: "AI bygger programmet",
    body:
      "Personlige strength- og hypertrofi-programmer genereres ud fra dine maks, " +
      "din historik og dit mål — og opdateres uge for uge baseret på hvordan du faktisk løfter.",
    foot: "Ingen ventetid · ingen template-pdf'er",
  },
  {
    n: "02",
    eyebrow: "Instant feedback",
    title: "AI tjekker din form",
    body:
      "Upload en video og få teknik-feedback inden for sekunder. " +
      "En af crewets head coaches verificerer ugentligt, så du aldrig kører på autopilot.",
    foot: "Sek. respons · ugentlig human review",
  },
  {
    n: "03",
    eyebrow: "Mennesker til milepæle",
    title: "Crew + coach når det tæller",
    body:
      "PR-fejringer, deload-snak, og 1:1 tid med Anton når du er på vej mod et nyt loft. " +
      "Resten af tiden holder fællesskabet dig ansvarlig.",
    foot: "Crew-feed · 1:1 ved milepæle",
  },
];

export default function ValueSection() {
  return (
    <section id="how" className="relative border-t hairline py-24 md:py-40">
      <Container>
        {/* Hook + price */}
        <div className="grid gap-12 md:grid-cols-12 items-end mb-16 md:mb-24">
          <div className="md:col-span-7" data-reveal>
            <div className="eyebrow mb-5">{positioning.eyebrow}</div>
            <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92]">
              {positioning.headline}
            </h2>
          </div>

          <div
            className="md:col-span-5 surface-2 rounded-lg p-6 md:p-8"
            data-reveal
            style={{ transitionDelay: "120ms" }}
          >
            <div className="eyebrow mb-3">Pris</div>
            <div className="flex items-baseline gap-2">
              <span className="numeric text-5xl md:text-6xl">{pricing.member.amount}</span>
              <span className="numeric text-fg-dim text-lg">
                {pricing.member.currency}/{pricing.member.period}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t hairline space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-fg-dim">{pricing.market.label}</span>
                <span className="numeric text-fg-faint line-through">
                  ~{pricing.market.amount} {pricing.market.currency}/{pricing.market.period}
                </span>
              </div>
              <p className="text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
                Endelig pris låses inden launch
              </p>
            </div>
          </div>
        </div>

        <p
          className="max-w-2xl text-lg md:text-xl leading-relaxed text-fg-dim mb-16"
          data-reveal
          style={{ transitionDelay: "200ms" }}
        >
          {positioning.sub}
        </p>

        <div className="grid gap-px bg-line border hairline md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <article
              key={p.n}
              className="bg-bg p-7 md:p-9"
              data-reveal
              style={{ transitionDelay: `${260 + i * 90}ms` }}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="numeric text-fg-faint text-sm">{p.n}</span>
                <span className="eyebrow">{p.eyebrow}</span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl leading-[1] mb-5">
                {p.title}
              </h3>
              <p className="text-fg-dim text-sm md:text-base leading-relaxed mb-6">
                {p.body}
              </p>
              <div className="text-xs font-mono text-fg-faint uppercase tracking-[0.14em] pt-5 border-t hairline">
                {p.foot}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
