import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";

export default async function ProfilePage() {
  const m = (await getSession())!;
  return (
    <>
      <PageHeader
        eyebrow="05 — Profil"
        title={`@${m.handle}`}
        subtitle={`Tier: ${m.tier} · Medlem siden ${new Date(m.joinedAt).toLocaleDateString("da-DK")}`}
        right={
          m.isCoach ? (
            <Link href="/coach" className="btn btn-primary btn-sm">
              Åbn coach-konsol →
            </Link>
          ) : undefined
        }
      />

      <Container className="py-12 grid gap-6 md:grid-cols-2">
        <section className="surface-2 rounded-lg p-8">
          <div className="eyebrow mb-4">Lifts på record</div>
          <ul className="grid grid-cols-3 gap-px bg-line border hairline">
            {[
              { k: "Squat",    v: "180" },
              { k: "Bench",    v: "120" },
              { k: "Deadlift", v: "210" },
            ].map((l) => (
              <li key={l.k} className="bg-bg-2 p-5 text-center">
                <div className="numeric text-3xl">{l.v}</div>
                <div className="eyebrow mt-1">{l.k} · kg</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-2 rounded-lg p-8">
          <div className="eyebrow mb-4">Indstillinger</div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between border-b hairline pb-3">
              <span className="text-fg-dim">Email</span>
              <span>{m.handle}@nowmakeit.eu</span>
            </li>
            <li className="flex items-center justify-between border-b hairline pb-3">
              <span className="text-fg-dim">Notifikationer</span>
              <span>Crew + PR&apos;er</span>
            </li>
            <li className="flex items-center justify-between border-b hairline pb-3">
              <span className="text-fg-dim">Sprog</span>
              <span>Dansk</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-fg-dim">Tema</span>
              <span>Mørk (kun)</span>
            </li>
          </ul>
        </section>

        <section className="surface-2 rounded-lg p-8 md:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-2">Billing</div>
              <div className="font-display text-xl">Abonnement &amp; betaling</div>
              <p className="text-sm text-fg-dim mt-1 max-w-md">
                Administrér dit Crew-medlemskab og 1:1 add-on. Sikker checkout via Stripe.
              </p>
            </div>
            <Link href="/billing" className="btn btn-sm btn-primary">
              Åbn billing →
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
