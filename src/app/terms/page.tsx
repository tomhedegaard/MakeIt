import Link from "next/link";
import Container from "@/components/Container";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Vilkår — MakeIt // HQ",
};

export default function TermsPage() {
  return (
    <main className="relative z-10 flex-1 py-16 md:py-24">
      <Container size="narrow">
        <Link href="/" className="inline-block mb-12 text-fg">
          <Logo />
        </Link>

        <div className="eyebrow mb-3">Vilkår</div>
        <h1 className="font-display text-4xl md:text-6xl mb-6 leading-[0.95]">
          Spillereglerne.
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-10">
          Senest opdateret: maj 2026 · Ved at bruge MakeIt // HQ accepterer du
          disse vilkår. Spørgsmål?{" "}
          <a className="underline hover:text-fg" href="mailto:munk@nowmakeit.eu">
            munk@nowmakeit.eu
          </a>
          .
        </p>

        <Section eyebrow="01" title="Tjenesten">
          <p>
            MakeIt // HQ er en lukket coaching-platform leveret af MakeIt Danmark ApS
            (CVR — kontakt). Vi giver adgang til AI-genererede styrketrænings-programmer,
            video-baseret form-feedback, et community af crew-medlemmer, og et Reps-loyalty
            program. Adgang kræver invite-kode og aktivt medlemskab.
          </p>
        </Section>

        <Section eyebrow="02" title="Medlemskab og betaling">
          <List
            items={[
              ["Faktureres", "Månedligt forud via Stripe. Pris vises tydeligt før checkout."],
              ["Opsigelse", "Når som helst fra Billing-siden. Træder i kraft ved næste fakturering — ingen tilbagebetaling for igangværende periode."],
              ["1:1 add-on", "Begrænsede pladser, separate vilkår — vi annullerer manuelt hvis ingen plads er ledig."],
              ["Pris-ændringer", "Varsles 30 dage forud. Du kan opsige inden ændringen træder i kraft."],
            ]}
          />
        </Section>

        <Section eyebrow="03" title="Sundheds-disclaimer">
          <p>
            <strong>Du træner på eget ansvar.</strong> Vores coaching og AI-feedback erstatter
            ikke medicinsk eller fysioterapeutisk rådgivning. Du bør konsultere en læge før
            start af et nyt træningsprogram, særligt hvis du har eksisterende skader,
            hjertesygdomme, eller andre helbredsmæssige forhold.
          </p>
          <p>
            AI form-checks er en teknisk vurdering, ikke en endelig kvalitetssikring.
            Mikael Munk gennemgår personligt inden for 24 timer, men ansvaret for at løfte
            sikkert ligger hos dig.
          </p>
        </Section>

        <Section eyebrow="04" title="Acceptabel brug">
          <List
            items={[
              ["Personligt", "Din konto er personlig. Del ikke login eller invite-koder."],
              ["Respekt", "I crew-feedet: konstruktiv feedback, ingen hate, ingen ads, ingen spam."],
              ["Indhold", "Du beholder ophavsret til dine posts og videos. Vi har en evig licens til at vise dem inden for platformen."],
              ["Suspension", "Vi kan suspendere konti der bryder reglerne. Vi giver besked og chance for at rette hvis muligt."],
            ]}
          />
        </Section>

        <Section eyebrow="05" title="Reps og indløsninger">
          <p>
            Reps har ingen kontant-værdi og kan ikke konverteres til penge eller overføres
            mellem medlemmer. De udløber ikke — men hvis du sletter din konto eller
            opsiger dit medlemskab, mister du adgangen til både balance og indløsninger.
          </p>
          <p>
            Limited drops sendes med GLS når Mikael har bekræftet — typisk inden for
            5 hverdage. Custom-broderede produkter har 2-3 ugers leveringstid.
          </p>
        </Section>

        <Section eyebrow="06" title="Ansvarsbegrænsning">
          <p>
            Vores samlede ansvar over for dig er begrænset til det beløb du har betalt
            i medlemsskab de seneste 12 måneder. Vi er ikke ansvarlige for indirekte
            tab, tabt fortjeneste eller skader som følge af tjenestens utilgængelighed.
            Dette begrænser ikke ansvar der ikke kan fraskrives efter dansk lov.
          </p>
        </Section>

        <Section eyebrow="07" title="Lovvalg + tvister">
          <p>
            Disse vilkår er underlagt dansk ret. Tvister der ikke kan løses i mindelighed,
            afgøres ved Københavns Byret som første instans.
          </p>
        </Section>

        <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint mt-16">
          MakeIt Danmark ApS · Engvej 169 · 2300 København S
        </p>
      </Container>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 border-t hairline">
      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-3">
          <div className="eyebrow mb-2">{eyebrow}</div>
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
        </div>
        <div className="md:col-span-9 space-y-4 text-fg/90 text-base leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}

function List({ items }: { items: [string, string][] }) {
  return (
    <ul className="grid gap-2">
      {items.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
          <span className="eyebrow">{k}</span>
          <span className="text-fg-dim leading-relaxed">{v}</span>
        </li>
      ))}
    </ul>
  );
}
