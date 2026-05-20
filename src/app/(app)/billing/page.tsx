import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { pricing } from "@/lib/pricing";
import { STRIPE_ENABLED } from "@/lib/stripe";
import { getActiveSubscriptions, type ActiveSubscription } from "@/lib/data/billing";
import { startCheckoutAction, openPortalAction } from "./actions";
import { BILLING_MAILTO, COMPANY } from "@/lib/company";

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

  const t = await getTranslations("Billing");

  return (
    <>
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        subtitle={t("header.subtitle")}
      />

      <Container className="py-8 lg:py-12 space-y-6">
        {params.success ? (
          <Banner kind="ok">{t("banners.success")}</Banner>
        ) : null}
        {params.canceled ? (
          <Banner>{t("banners.canceled")}</Banner>
        ) : null}
        {params.demo ? (
          <Banner>
            {t.rich("banners.demo", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </Banner>
        ) : null}
        {params.err ? (
          <Banner kind="warn">
            {t("banners.error", { err: params.err })}
          </Banner>
        ) : null}

        {/* Crew membership */}
        <section className="surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-5 border-b hairline flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow mb-1">{t("crew.eyebrow")}</div>
              <h2 className="font-display text-2xl md:text-3xl">
                {t("crew.title")}
              </h2>
            </div>
            <StatusPill sub={crew} t={t} />
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-line">
            <Cell label={t("crew.price")} value={`${pricing.member.amount} ${pricing.member.currency} / ${pricing.member.period}`} />
            <Cell
              label={t("crew.nextBilling")}
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
                <button type="submit" className="btn">{t("crew.manage")}</button>
              </form>
            ) : (
              <form action={startCheckoutAction}>
                <input type="hidden" name="kind" value="crew" />
                <button type="submit" className="btn btn-primary">
                  {t("crew.activate")}
                </button>
              </form>
            )}
            <p className="text-xs font-mono text-fg-faint self-center">
              {t("crew.secureCheckout")}
            </p>
          </div>
        </section>

        {/* 1:1 add-on */}
        <section className="surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-5 border-b hairline flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow mb-1">{t("oneOnOne.eyebrow")}</div>
              <h2 className="font-display text-2xl md:text-3xl">
                {t("oneOnOne.title")}
              </h2>
            </div>
            <StatusPill sub={oneOnOne} t={t} />
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-line">
            <Cell
              label={t("oneOnOne.price")}
              value={`${pricing.oneOnOne.amount} ${pricing.oneOnOne.currency} / ${pricing.oneOnOne.period}`}
            />
            <Cell
              label={t("oneOnOne.spots")}
              value={t("oneOnOne.spotsValue", { count: pricing.oneOnOne.spots })}
            />
          </div>

          <div className="p-5 flex flex-wrap gap-3">
            {oneOnOne && oneOnOne.status !== "canceled" ? (
              <form action={openPortalAction}>
                <button type="submit" className="btn">{t("oneOnOne.manage")}</button>
              </form>
            ) : (
              <form action={startCheckoutAction}>
                <input type="hidden" name="kind" value="one_on_one" />
                <button type="submit" className="btn btn-primary">
                  {t("oneOnOne.apply")}
                </button>
              </form>
            )}
            <p className="text-xs font-mono text-fg-faint self-center">
              {t("oneOnOne.requiresCrew")}
            </p>
          </div>
        </section>

        {/* Help */}
        <section className="surface-2 rounded-2xl p-5">
          <div className="eyebrow mb-2">{t("help.eyebrow")}</div>
          <p className="text-sm text-fg-dim mb-3">
            {t.rich("help.body", {
              link: (chunks) => (
                <a className="underline hover:text-fg" href={BILLING_MAILTO}>
                  {chunks}
                </a>
              ),
              email: COMPANY.emails.billing,
            })}
          </p>
        </section>
      </Container>
    </>
  );
}

function StatusPill({
  sub,
  t,
}: {
  sub: ActiveSubscription | null;
  t: Awaited<ReturnType<typeof getTranslations<"Billing">>>;
}) {
  if (!sub) {
    return (
      <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0 text-fg-dim">
        {t("status.notActivated")}
      </span>
    );
  }
  const statusKey = `status.list.${sub.status}`;
  const label = t.has(statusKey) ? t(statusKey) : sub.status;
  const isOk = sub.status === "active" || sub.status === "trialing";
  return (
    <span
      className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0 inline-flex items-center gap-1.5"
      style={{ color: isOk ? "var(--fg)" : "var(--fg-dim)" }}
    >
      {isOk ? <span className="size-1.5 rounded-full bg-fg" /> : null}
      {label}
      {sub.cancelAtPeriodEnd ? t("status.stopping") : ""}
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
