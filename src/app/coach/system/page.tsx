import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getDevStatus, type Severity } from "@/lib/dev-status";
import { getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import Backlog from "./Backlog";

export async function generateMetadata() {
  const t = await getTranslations("Coach.system");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

// Refetch on each load — this page is internal and called rarely.
export const dynamic = "force-dynamic";

export default async function CoachSystemPage() {
  const t = await getTranslations("Coach.system");
  // Admin-only. The /coach layout has already gated on isCoach;
  // this is the second-tier check that keeps integration status,
  // credential reminders, and DB stats restricted to founders +
  // trusted ops, not every form-check reviewer.
  const member = await getSession();
  if (!member?.isAdmin) redirect("/coach");

  const status = await getDevStatus();

  const configured = status.services.filter((s) => s.configured).length;
  const total = status.services.length;

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          {t("introPrefix")}
          <time
            dateTime={status.collectedAt}
            className="font-mono text-fg"
            title={status.collectedAt}
          >
            {new Date(status.collectedAt).toLocaleString("da-DK", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
          </time>
          {t("introSuffix")}
        </p>
      </header>

      {/* KPI row — match the /coach overview pattern */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <KPI label={t("kpiServicesConfigured")} value={`${configured}/${total}`} />
        <KPI
          label={t("kpiMembers")}
          value={status.database.reachable ? status.database.members : "—"}
        />
        <KPI
          label={t("kpiActiveSubscriptions")}
          value={status.database.reachable ? status.database.activeSubscriptions : "—"}
        />
        <KPI
          label={t("kpiSessionsPerWeek")}
          value={status.database.reachable ? status.database.sessionsThisWeek : "—"}
        />
        <KPI
          label={t("kpiPendingFormChecks")}
          value={status.database.reachable ? status.database.pendingFormChecks : "—"}
          pulse={status.database.pendingFormChecks > 0}
        />
      </section>

      {/* Reminders */}
      <Section
        eyebrow={t("remindersEyebrow")}
        title={t("remindersTitle")}
        sub={t("remindersSub")}
      >
        <ul className="surface-2 rounded-2xl divide-y hairline overflow-hidden">
          {status.reminders.map((r) => (
            <li key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={r.severity} />
                    <span className="eyebrow text-fg-faint">{r.service}</span>
                  </div>
                  <div className="font-display text-lg leading-tight">
                    {r.label}
                  </div>
                  <p className="mt-2 text-xs font-mono text-fg-dim">
                    {r.runbook}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {r.expiresAt ? (
                    <>
                      <div className="font-display text-2xl numeric leading-none">
                        {r.daysUntilExpiry !== null && r.daysUntilExpiry < 0
                          ? t("expired")
                          : `${r.daysUntilExpiry}`}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-1">
                        {r.daysUntilExpiry !== null && r.daysUntilExpiry >= 0
                          ? t("daysLeft")
                          : t("sinceExpiry")}
                      </div>
                      <div className="text-[10px] font-mono text-fg-faint mt-1">
                        {new Date(r.expiresAt).toLocaleDateString("da-DK", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
                      {r.suggestedRotation ?? t("noHardExpiry")}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Services */}
      <Section
        eyebrow={t("servicesEyebrow")}
        title={t("servicesTitle")}
        sub={t("servicesSub")}
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {status.services.map((s) => (
            <li
              key={s.id}
              className="surface-2 rounded-2xl p-5 flex items-start gap-4"
            >
              <span
                className={`size-3 rounded-full shrink-0 mt-1.5 ${
                  s.configured
                    ? "bg-green-400"
                    : "bg-fg-faint/30 border border-fg-faint"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-display text-lg leading-tight">
                    {s.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
                      s.configured ? "text-green-400" : "text-fg-faint"
                    }`}
                  >
                    {s.configured ? t("serviceLive") : t("serviceMissing")}
                  </span>
                </div>
                {s.notes ? (
                  <p className="text-xs font-mono text-fg-dim">{s.notes}</p>
                ) : null}
                {s.dashboardUrl ? (
                  <a
                    href={s.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg underline underline-offset-2"
                  >
                    {t("openDashboard")}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {status.database.error ? (
        <section className="surface-2 rounded-2xl p-5 border border-red-400/40">
          <div className="eyebrow text-red-400 mb-2">{t("databaseError")}</div>
          <p className="font-mono text-xs text-fg-dim break-all">
            {status.database.error}
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <div className="eyebrow mb-1">{t("companyConfigEyebrow")}</div>
          <h2 className="font-display text-2xl md:text-3xl">{t("companyConfigTitle")}</h2>
          <p className="mt-1 text-sm text-fg-dim max-w-md">
            {t("companyConfigSubPrefix")}
            <code className="text-fg numeric text-xs">src/lib/company.ts</code>
            {t("companyConfigSubSuffix")}
          </p>
        </div>
        <dl className="surface-2 rounded-2xl divide-y hairline overflow-hidden text-sm">
          <Row label={t("rowName")} value={COMPANY.name} />
          <Row label={t("rowProduct")} value={COMPANY.product} />
          <Row label={t("rowTagline")} value={COMPANY.tagline} />
          <Row label={t("rowAppUrl")} value={COMPANY.appUrl} />
          <Row label={t("rowMarketingUrl")} value={COMPANY.marketingUrl} />
          <Row label={t("rowLegalEntity")} value={COMPANY.legal.entity} />
          <Row label={t("rowCvr")} value={COMPANY.legal.cvr ?? "—"} dim={!COMPANY.legal.cvr} />
          <Row label={t("rowAddress")} value={COMPANY.legal.address} />
          <Row label={t("rowFounded")} value={String(COMPANY.legal.foundedYear)} />
          <Row label={t("rowSupportEmail")} value={COMPANY.emails.support} />
          <Row label={t("rowBillingEmail")} value={COMPANY.emails.billing} />
          <Row label={t("rowTransactionalFrom")} value={COMPANY.emails.transactionalFrom} />
          <Row label={t("rowReplyTo")} value={COMPANY.emails.replyTo} />
          <Row
            label={t("rowInstagram")}
            value={COMPANY.social.instagramHandle ? `@${COMPANY.social.instagramHandle}` : "—"}
            dim={!COMPANY.social.instagramHandle}
          />
        </dl>
      </section>

      <Backlog />
    </Container>
  );
}

/* ---------------------------- atoms ---------------------------- */

function Row({
  label,
  value,
  dim = false,
}: {
  label: string;
  value: string | null;
  dim?: boolean;
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <dt className="eyebrow w-36 shrink-0">{label}</dt>
      <dd
        className={`flex-1 break-all font-mono text-xs ${dim ? "text-fg-faint" : "text-fg"}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}


function KPI({
  label,
  value,
  pulse = false,
}: {
  label: string;
  value: string | number;
  pulse?: boolean;
}) {
  return (
    <div className="bg-bg px-4 py-5">
      <div className="eyebrow text-fg-faint mb-1.5 flex items-center gap-1.5">
        {pulse ? <span className="pulse-dot" /> : null}
        {label}
      </div>
      <div className="font-display text-3xl numeric leading-none">{value}</div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <div className="eyebrow mb-1">{eyebrow}</div>
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-fg-dim max-w-md">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles = {
    ok: "bg-green-400/15 text-green-400",
    info: "bg-fg-faint/15 text-fg-dim",
    warn: "bg-yellow-400/15 text-yellow-400",
    critical: "bg-red-400/15 text-red-400",
  };
  const label = {
    ok: "OK",
    info: "INFO",
    warn: "WARN",
    critical: "CRITICAL",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.14em] ${styles[severity]}`}
    >
      {label[severity]}
    </span>
  );
}
