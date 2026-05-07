import Container from "@/components/Container";

const QUOTES: {
  who: string;
  tier: string;
  cred: string;
  quote: string;
}[] = [
  {
    who: "@kasper_s",
    tier: "Athlete",
    cred: "Powerbuilding · 162.5 kg squat single",
    quote:
      "Det første program jeg faktisk har kørt fra ende til anden. Mikaels form-checks fanger ting AI&apos;en misser, og mængden af noter han skriver pr. video er sygt.",
  },
  {
    who: "@nina_dl",
    tier: "Beast",
    cred: "DL-specialization · 175 kg @ 68 kg BW",
    quote:
      "+15 kg på dødløftet på 8 uger uden skader. Det at Reps-shoppen findes er en farlig god motivation — jeg sparer op til den brodérede strap.",
  },
  {
    who: "@maria.lift",
    tier: "Beast",
    cred: "Hypertrofi · skifter mellem blokke",
    quote:
      "Crewet er der jeg poster, ikke Instagram. Stille, præcist, og på dansk. Ingen ads, ingen krav. Bare folk der løfter.",
  },
];

export default function Testimonials() {
  return (
    <section id="crew-says" className="relative border-t hairline py-24 md:py-40">
      <Container>
        <div className="max-w-2xl mb-12 md:mb-16" data-reveal>
          <div className="eyebrow mb-4">07 — Crewet</div>
          <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] mb-5">
            Hvad de siger.
          </h2>
          <p className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl">
            Tre fra crewet om hvordan det føles at træne her. Ingen ambassadør-deals,
            ingen rabat-koder. Bare medlemmer der har sat tid på.
          </p>
        </div>

        <ul className="grid gap-px bg-line border hairline md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <li
              key={q.who}
              data-reveal
              style={{ transitionDelay: `${i * 100}ms` }}
              className="bg-bg p-7 md:p-9 flex flex-col gap-6"
            >
              <span className="font-display text-5xl text-fg-faint leading-none">&ldquo;</span>
              <p
                className="flex-1 text-base md:text-lg text-fg/95 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: q.quote }}
              />
              <div className="border-t hairline pt-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-xs font-mono uppercase">
                    {q.who.slice(1, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm">{q.who}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-dim">
                      {q.tier} · {q.cred}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
