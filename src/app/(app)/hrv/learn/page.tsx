import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import HrvSubNav from "@/components/hrv/HrvSubNav";

/**
 * `/hrv/learn` — a short, static editorial page explaining HRV to members.
 *
 * Purely editorial: no data fetching, no member resolution. Five plain-language
 * sections in a narrow text column, monochrome, no illustrations.
 *
 * The shared `HrvSubNav` at the top links between the three `/hrv` pages.
 */

/** The five editorial sections, in render order. */
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Hvad er HRV?",
    body: "Hjerterytmevariabilitet er de små udsving i tid mellem dine hjerteslag. Det afspejler dit autonome nervesystem — balancen mellem gas og bremse. Det er ikke en diagnose, men et fingerpeg om, hvor restitueret din krop er.",
  },
  {
    heading: "Hvorfor RMSSD?",
    body: "Der findes mange HRV-tal; vi viser RMSSD, fordi det er det mest robuste for korte, daglige målinger. Vi viser dig din faktiske værdi i millisekunder — ikke et opfundet “score”.",
  },
  {
    heading: "Hvorfor du ikke får et 0-100 score",
    body: "Et tal fra 0 til 100 lover en præcision, der ikke findes. Vi viser dit rigtige tal og dit eget baseline-bånd, så du ser, hvor du ligger i forhold til din egen normal.",
  },
  {
    heading: "Hvorfor du ikke kan sammenligne din HRV med andres",
    body: "Sundt RMSSD spænder fra ca. 10 til 200 ms afhængigt af alder, køn og form. Et højt tal hos én er et lavt tal hos en anden. Kun din egen baseline betyder noget.",
  },
  {
    heading: "Cyklus & HRV",
    body: "For kvindelige medlemmer: HRV svinger naturligt hen over menstruationscyklussen, typisk lavere i dagene før menstruation. Slå cyklus-tracking til under Settings, så din baseline tager højde for det.",
  },
];

export default function HrvLearnPage() {
  return (
    <>
      <PageHeader
        eyebrow="Recovery"
        title="Lær"
        subtitle="Hvad HRV er, hvorfor vi viser den, som vi gør — og hvad tallet betyder for dig."
      />
      <Container className="py-8 lg:py-12 space-y-10">
        <HrvSubNav />

        <article className="max-w-prose space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl md:text-3xl leading-tight mb-3">
                {section.heading}
              </h2>
              <p className="text-fg-dim text-sm md:text-base leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </article>
      </Container>
    </>
  );
}
