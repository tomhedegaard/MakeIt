import Container from "@/components/Container";
import { SUPPORT_MAILTO } from "@/lib/company";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "Skal jeg være avanceret for at være med?",
    a: "Nej. Onboardingen tilpasser intensitet og volumen til dit niveau. Som begynder bliver top-sets capped på RPE 7, og programmet bygger forsigtigt op. Mellem og avancerede får skarpere belastninger fra dag 1.",
  },
  {
    q: "Hvad hvis jeg ikke kender mit 1RM?",
    a: "Spring felterne over i onboardingen. Vi bruger sensible defaults baseret på dit niveau, og din allerførste session producerer data der bliver brugt til at fine-tune næste uge. Du behøver ikke kende dit 1RM på forhånd.",
  },
  {
    q: "Kan jeg opsige når som helst?",
    a: "Ja. Crew-medlemskabet kan opsiges direkte fra Stripe Customer Portal — det træder i kraft ved næste faktureringsdato, og du beholder adgangen indtil da. Ingen binding, ingen klausuler.",
  },
  {
    q: "Hvad sker når Mikael er på ferie?",
    a: "AI'en kører videre uafbrudt — programmer genereres, form-checks får øjeblikkeligt svar, sæt logges og crewet er aktivt. Mikaels personlige reviews kan være forsinket op til en uge i ferieperioder, og vi skriver det altid i feedet på forhånd.",
  },
  {
    q: "Hvor hurtigt får jeg svar på en form-check?",
    a: "AI svarer typisk inden for 6-15 sekunder. Mikaels personlige verifikation lander inden for 24 timer på hverdage, og du får både in-app notifikation og email når den er klar.",
  },
  {
    q: "Kan jeg pause på grund af rejse, sygdom eller skade?",
    a: "Ja. Du kan pause dit aktive program direkte i appen — sessioner og uge-progression fryser. Når du genoptager, regenereres næste uge automatisk så du ikke skal kæmpe med stale targets. For abonnementet skal du pause via Stripe Customer Portal.",
  },
  {
    q: "Er det her erstatning for personlig træning IRL?",
    a: "For 95% af lifters: ja. AI form-check + ugentlig coach review fanger det meste. For dem der vil have noget mere — 1:1 add-on'en giver dig direkte Signal-adgang til Mikael og en ugentlig 30-min videosession. Begrænset til 8 pladser ad gangen.",
  },
  {
    q: "Hvorfor er det billigere end traditionel coaching?",
    a: "Fordi AI håndterer det generiske — programgenerering, progression, øjeblikkelig form-feedback. Mikael og crewet bruger så tiden på det der faktisk batter: 1:1, milepæle, og at holde dig ansvarlig. Du betaler for det der tæller.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="relative border-t hairline py-24 md:py-40">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 items-start">
          <div className="md:col-span-5" data-reveal>
            <div className="eyebrow mb-4">08 — FAQ</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.92] mb-5">
              Spørgsmål?
            </h2>
            <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
              Det vi typisk bliver spurgt om. Mangler dit svar?
              {" "}
              <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
                Skriv direkte til Mikael
              </a>
              .
            </p>
          </div>

          <ul className="md:col-span-7 border-t hairline">
            {ITEMS.map((item, i) => (
              <li
                key={item.q}
                data-reveal
                style={{ transitionDelay: `${i * 60}ms` }}
                className="border-b hairline"
              >
                <details className="group">
                  <summary
                    className="flex items-start gap-4 py-5 cursor-pointer list-none touch-app"
                    style={{ outline: "none" }}
                  >
                    <span className="numeric text-[11px] text-fg-faint w-7 shrink-0 mt-1.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-lg md:text-xl leading-snug">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="size-7 rounded-full surface-2 flex items-center justify-center text-fg-dim group-open:rotate-45 transition-transform shrink-0"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pl-11 pr-4 pb-5 text-fg-dim text-sm md:text-base leading-relaxed">
                    {item.a}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
