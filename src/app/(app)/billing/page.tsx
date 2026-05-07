import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { pricing } from "@/lib/pricing";
import { STRIPE_ENABLED } from "@/lib/stripe";
import { getActiveSubscriptions, type ActiveSubscription } from "@/lib/data/billing";
import { startCheckoutAction, openPortalAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  trialing:           "Prøveperiode",
  active:             "Aktiv",
  past_due:           "Betaling fejlede",
  canceled:           "Opsagt",
  incomplete:         "Afventer betaling",
  incomplete_expired: "Udløbet",
  unpaid:             "Ubetalt",
  paused:             "Pauset",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; demo?: string; kind?: string; err?: string }>;
}) {
  const params = await searchParams;
  const member = (await getSession())!;

  const subs = STRIPE_ENABLED ? await getActiveSubscriptions(member.id) : null;
  const crew = subs?.crew ?? null;
  const oneOnOne = subs?.one_on_one ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Dit medlemskab"
        subtitle="Administrér dit Crew-medlemskab og 1:1 add-on. Alle ændringer træder i kraft ved næste faktureringsdato."
      />

      <Container className="py-8 lg:py-12 space-y-6">
        {params.success ? (
          <Banner kind="ok">Tak — din betaling gik igennem.</Banner>
        ) : null}
        {params.canceled ? (
          <Banner>Checkout afbrudt — intet er trukket.</Banner>
        ) : null}
        {params.demo ? (
          <Banner>
            Demo mode — Stripe er ikke koblet på. Tilføj <code>STRIPE_SECRET_KEY</code> + price-ID&apos;er for at aktivere checkout.
          </Banner>
        ) : null}
        {params.err ? (
          <Banner kind="warn">
            Noget gik galt under checkout ({params.err}). Prøv igen, eller skriv til os.
          </Banner>
        ) : null}

        {/* Crew membership */}
        <section className="surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-5 border-b hairline flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow mb-1">Crew-medlemskab</div>
              <h2 className="font-display text-2xl md:text-3xl">
                Adgang til hele platformen
              </h2>
            </div>
            <StatusPill sub={crew} />
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-line">
            <Cell label="Pris" value={`${pricing.member.amount} ${pricing.member.currency} / ${pricing.member.period}`} />
            <Cell
              label="Næste fakturering"
              value={
                crew?.currentPeriodEnd
                  ? new Date(crew.currentPeriodEnd).toLocaleDateString("da-DK")
                  : "—"
              }
            />
          </div>

          <div className="p-5 flex flex-wrap gap-3">
            {crew && crew.status !== "canceled" ? (
              <form action={openPortalAction}>
                <button type="submit" className="btn">Manage abonnement</button>
              </form>
            ) : (
              <form action={startCheckoutAction}>
                <input type="hidden" name="kind" value="crew" />
                <button type="submit" className="btn btn-primary">
                  Aktivér Crew-medlemskab →
                </button>
              </form>
            )}
            <p className="text-xs font-mono text-fg-faint self-center">
              Sikker checkout via Stripe · ingen kort gemmes hos os
            </p>
          </div>
        </section>

        {/* 1:1 add-on */}
        <section className="surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-5 border-b hairline flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow mb-1">1:1 Coaching · add-on</div>
              <h2 className="font-display text-2xl md:text-3xl">
                Direkte adgang til Anton
              </h2>
            </div>
            <StatusPill sub={oneOnOne} />
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-line">
            <Cell
              label="Pris"
              value={`${pricing.oneOnOne.amount} ${pricing.oneOnOne.currency} / ${pricing.oneOnOne.period}`}
            />
            <Cell
              label="Pladser"
              value={`${pricing.oneOnOne.spots} ad gangen`}
            />
          </div>

          <div className="p-5 flex flex-wrap gap-3">
            {oneOnOne && oneOnOne.status !== "canceled" ? (
              <form action={openPortalAction}>
                <button type="submit" className="btn">Manage 1:1</button>
              </form>
            ) : (
              <form action={startCheckoutAction}>
                <input type="hidden" name="kind" value="one_on_one" />
                <button type="submit" className="btn btn-primary">
                  Søg om plads →
                </button>
              </form>
            )}
            <p className="text-xs font-mono text-fg-faint self-center">
              Kræver aktivt Crew-medlemskab
            </p>
          </div>
        </section>

        {/* Help */}
        <section className="surface-2 rounded-2xl p-5">
          <div className="eyebrow mb-2">Hjælp</div>
          <p className="text-sm text-fg-dim mb-3">
            Spørgsmål om faktura, refund eller pause? Skriv til{" "}
            <a className="underline hover:text-fg" href="mailto:billing@nowmakeit.eu">
              billing@nowmakeit.eu
            </a>
            .
          </p>
        </section>
      </Container>
    </>
  );
}

function StatusPill({ sub }: { sub: ActiveSubscription | null }) {
  if (!sub) {
    return (
      <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0 text-fg-dim">
        Ikke aktiveret
      </span>
    );
  }
  const label = STATUS_LABEL[sub.status] ?? sub.status;
  const isOk = sub.status === "active" || sub.status === "trialing";
  return (
    <span
      className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0 inline-flex items-center gap-1.5"
      style={{ color: isOk ? "var(--fg)" : "var(--fg-dim)" }}
    >
      {isOk ? <span className="size-1.5 rounded-full bg-fg" /> : null}
      {label}
      {sub.cancelAtPeriodEnd ? " · stopper" : ""}
    </span>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-2 px-5 py-4">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Banner({
  children,
  kind = "info",
}: {
  children: React.ReactNode;
  kind?: "info" | "ok" | "warn";
}) {
  const tone =
    kind === "ok" ? "border-line-bright" : kind === "warn" ? "border-line-strong" : "border-line";
  return (
    <div
      className={`surface-2 rounded-lg px-4 py-3 text-sm border ${tone}`}
    >
      {children}
    </div>
  );
}
