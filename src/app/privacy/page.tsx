import Link from "next/link";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";

export const metadata = {
  title: `Privacy Policy — ${COMPANY.product}`,
};

export default function PrivacyPage() {
  return (
    <main className="relative z-10 flex-1 py-16 md:py-24">
      <Container size="narrow">
        <Link href="/" className="inline-block mb-12 text-fg">
          <Logo />
        </Link>

        <div className="eyebrow mb-3">Privacy Policy</div>
        <h1 className="font-display text-4xl md:text-6xl mb-6 leading-[0.95]">
          Hvad vi gemmer.
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-10">
          Senest opdateret: maj 2026 · Dataansvarlig:{" "}
          {COMPANY.legal.entity ?? COMPANY.name}
          {COMPANY.legal.address ? `, ${COMPANY.legal.address}` : ""} ·{" "}
          {COMPANY.legal.cvr ? `CVR ${COMPANY.legal.cvr}` : "CVR — kontakt"}{" "}
          <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
            {COMPANY.emails.support}
          </a>
          .
        </p>

        <Section eyebrow="01" title="Hvad vi indsamler">
          <p>
            Som medlem af {COMPANY.product} behandler vi følgende:
          </p>
          <List
            items={[
              ["Konto", "Email, valgt handle, display navn, bio, tier, joined-date."],
              ["Træningsdata", "Loggede sæt (vægt, reps, RPE, tidspunkt), program-tilknytning, uge-progression, gennemførte sessioner."],
              ["Form-checks", "Video-uploads (privat bucket), AI-genererede vurderinger, coach-noter."],
              ["Social", "Posts, kommentarer, reaktioner, @mentions."],
              ["Reps & køb", "Reps-balance, transaktioner, indløsninger. Stripe håndterer betalingsdata — vi gemmer kun et customer-ID."],
              ["Tekniske data", "Session-cookie, IP-adresse til log-formål, request-tidspunkter."],
            ]}
          />
        </Section>

        <Section eyebrow="02" title="Hvorfor">
          <p>Vi behandler dine data for at:</p>
          <List
            items={[
              ["Levere tjenesten", "Personligt program, form-check feedback, fællesskabs-feed, Reps-loyalty."],
              ["Sende notifikationer", "Coach-noter, @mentions, ugentlig digest, tier-up. Du kan slå hver type fra under Indstillinger."],
              ["Forbedre platformen", "Aggregeret brug — ingen individuelle tracking-profiler."],
              ["Opfylde lovkrav", "Bogføring, GDPR-rettigheder, sikkerhed."],
            ]}
          />
        </Section>

        <Section eyebrow="03" title="Hvem vi deler med">
          <p>Vi deler kun data når det er strengt nødvendigt for tjenesten:</p>
          <List
            items={[
              ["Supabase", "Database og auth — EU-region (Frankfurt). Databehandler under DPA."],
              ["Resend", "Transaktionel email — sender på vores vegne. EU/USA, Standard Contractual Clauses."],
              ["Stripe", "Betalingsbehandling — du indtaster kortinfo direkte hos Stripe; vi ser den aldrig."],
              ["Anthropic (Claude)", "AI-program-generation og form-check-vurdering. Anthropic gemmer ikke prompts/output udover request-livscyklus i deres business-tier."],
            ]}
          />
          <p className="mt-4">
            Vi sælger aldrig dine data. Vi deler dem ikke til markedsføring uden eksplicit samtykke.
          </p>
        </Section>

        <Section eyebrow="04" title="Dine rettigheder (GDPR)">
          <List
            items={[
              ["Indsigt + portabilitet", "Eksportér alle dine data som JSON fra Indstillinger → Data."],
              ["Berigtigelse", "Opdatér din profil under Indstillinger eller skriv til os."],
              ["Sletning", "Slet din konto permanent under Indstillinger → Danger zone."],
              ["Begrænsning + indsigelse", `Skriv til ${COMPANY.emails.support} — vi svarer inden 30 dage.`],
              ["Klage", "Du kan klage til Datatilsynet hvis du mener vi behandler din data forkert."],
            ]}
          />
        </Section>

        <Section eyebrow="05" title="Cookies">
          <p>
            Vi bruger én strengt nødvendig cookie (<code className="numeric text-xs">mi_session</code> /
            Supabase auth-cookie) til at holde dig logget ind. Den lagres så længe din session
            er aktiv, eller maks 30 dage. Vi bruger <strong>ikke</strong> analytics-cookies,
            tracking-pixels, eller third-party annoncerings-cookies.
          </p>
        </Section>

        <Section eyebrow="06" title="Opbevaring">
          <p>
            Aktive medlemskabs-data gemmes så længe din konto eksisterer. Når du sletter din
            konto fjernes alt permanent inden for 30 dage (op til 90 dage hvis backup-rotation
            kræver det). Bogføringsdata fra Stripe gemmes 5 år iht. dansk regnskabslov.
          </p>
        </Section>

        <Section eyebrow="07" title="Ændringer">
          <p>
            Vi opdaterer denne politik når funktionalitet ændrer sig. Materielle ændringer
            varsles på email til registrerede medlemmer mindst 14 dage før de træder i kraft.
          </p>
        </Section>

        <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint mt-16">
          {COMPANY.legal.entity ?? COMPANY.name}
          {COMPANY.legal.address ? ` · ${COMPANY.legal.address}` : ""}
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
