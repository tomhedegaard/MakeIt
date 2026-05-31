import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";

export async function generateMetadata() {
  const t = await getTranslations("Legal.terms");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

export default async function TermsPage() {
  const t = await getTranslations("Legal.terms");

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
          {t("introBefore", { product: COMPANY.product })}
          <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
            {COMPANY.emails.support}
          </a>
          .
        </p>

        <Section eyebrow={t("s01.eyebrow")} title={t("s01.title")}>
          <p>
            {t("s01.bodyBefore", {
              product: COMPANY.product,
              entity: COMPANY.legal.entity ?? COMPANY.name,
            })}
            {COMPANY.legal.cvr
              ? t("s01.cvr", { cvr: COMPANY.legal.cvr })
              : t("s01.cvrFallback")}
            {t("s01.bodyAfter")}
          </p>
        </Section>

        <Section eyebrow={t("s02.eyebrow")} title={t("s02.title")}>
          <List
            items={[
              [t("s02.items.billed.k"), t("s02.items.billed.v")],
              [t("s02.items.cancel.k"), t("s02.items.cancel.v")],
              [t("s02.items.addon.k"), t("s02.items.addon.v")],
              [t("s02.items.priceChanges.k"), t("s02.items.priceChanges.v")],
            ]}
          />
        </Section>

        <Section eyebrow={t("s03.eyebrow")} title={t("s03.title")}>
          <p>
            <strong>{t("s03.p1Emphasis")}</strong>{t("s03.p1")}
          </p>
          <p>
            {t("s03.p2")}
          </p>
        </Section>

        <Section eyebrow={t("s04.eyebrow")} title={t("s04.title")}>
          <List
            items={[
              [t("s04.items.personal.k"), t("s04.items.personal.v")],
              [t("s04.items.respect.k"), t("s04.items.respect.v")],
              [t("s04.items.content.k"), t("s04.items.content.v")],
              [t("s04.items.suspension.k"), t("s04.items.suspension.v")],
            ]}
          />
        </Section>

        <Section eyebrow={t("s05.eyebrow")} title={t("s05.title")}>
          <p>
            {t("s05.p1")}
          </p>
          <p>
            {t("s05.p2")}
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
