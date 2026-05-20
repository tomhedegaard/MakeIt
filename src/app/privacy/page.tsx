import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";

export async function generateMetadata() {
  const t = await getTranslations("Legal.privacy");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Legal.privacy");

  return (
    <main className="relative z-10 flex-1 py-16 md:py-24">
      <Container size="narrow">
        <Link href="/" className="inline-block mb-12 text-fg">
          <Logo />
        </Link>

        <div className="eyebrow mb-3">{t("eyebrow")}</div>
        <h1 className="font-display text-4xl md:text-6xl mb-6 leading-[0.95]">
          {t("title")}
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-10">
          {t("introUpdated")}
          {COMPANY.legal.entity ?? COMPANY.name}
          {COMPANY.legal.address ? `, ${COMPANY.legal.address}` : ""} ·{" "}
          {COMPANY.legal.cvr ? `CVR ${COMPANY.legal.cvr}` : t("introCvrFallback")}{" "}
          <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
            {COMPANY.emails.support}
          </a>
          .
        </p>

        <Section eyebrow={t("s01.eyebrow")} title={t("s01.title")}>
          <p>
            {t("s01.intro", { product: COMPANY.product })}
          </p>
          <List
            items={[
              [t("s01.items.account.k"), t("s01.items.account.v")],
              [t("s01.items.training.k"), t("s01.items.training.v")],
              [t("s01.items.formChecks.k"), t("s01.items.formChecks.v")],
              [t("s01.items.social.k"), t("s01.items.social.v")],
              [t("s01.items.reps.k"), t("s01.items.reps.v")],
              [t("s01.items.technical.k"), t("s01.items.technical.v")],
            ]}
          />
        </Section>

        <Section eyebrow={t("s02.eyebrow")} title={t("s02.title")}>
          <p>{t("s02.intro")}</p>
          <List
            items={[
              [t("s02.items.deliver.k"), t("s02.items.deliver.v")],
              [t("s02.items.notify.k"), t("s02.items.notify.v")],
              [t("s02.items.improve.k"), t("s02.items.improve.v")],
              [t("s02.items.legal.k"), t("s02.items.legal.v")],
            ]}
          />
        </Section>

        <Section eyebrow={t("s03.eyebrow")} title={t("s03.title")}>
          <p>{t("s03.intro")}</p>
          <List
            items={[
              [t("s03.items.supabase.k"), t("s03.items.supabase.v")],
              [t("s03.items.resend.k"), t("s03.items.resend.v")],
              [t("s03.items.stripe.k"), t("s03.items.stripe.v")],
              [t("s03.items.anthropic.k"), t("s03.items.anthropic.v")],
            ]}
          />
          <p className="mt-4">
            {t("s03.outro")}
          </p>
        </Section>

        <Section eyebrow={t("s04.eyebrow")} title={t("s04.title")}>
          <List
            items={[
              [t("s04.items.access.k"), t("s04.items.access.v")],
              [t("s04.items.rectify.k"), t("s04.items.rectify.v")],
              [t("s04.items.delete.k"), t("s04.items.delete.v")],
              [t("s04.items.restrict.k"), t("s04.items.restrict.v", { email: COMPANY.emails.support })],
              [t("s04.items.complain.k"), t("s04.items.complain.v")],
            ]}
          />
        </Section>

        <Section eyebrow={t("s05.eyebrow")} title={t("s05.title")}>
          <p>
            {t("s05.bodyBefore")}<code className="numeric text-xs">{t("s05.cookieName")}</code>
            {t("s05.bodyMid")}<strong>{t("s05.bodyEmphasis")}</strong>{t("s05.bodyAfter")}
          </p>
        </Section>

        <Section eyebrow={t("s06.eyebrow")} title={t("s06.title")}>
          <p>
            {t("s06.body")}
          </p>
        </Section>

        <Section eyebrow={t("s07.eyebrow")} title={t("s07.title")}>
          <p>
            {t("s07.body")}
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
