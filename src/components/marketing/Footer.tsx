import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import LanguageSelector from "@/components/LanguageSelector";
import { PUBLIC_ACCESS_HREF } from "@/lib/marketing/public-cta";

export default async function MarketingFooter() {
  const t = await getTranslations("Marketing.footer");

  return (
    <footer className="relative border-t hairline">
      <Container>
        <div className="py-20 grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-6 text-fg-dim max-w-md text-sm leading-relaxed">
              {t("blurbBefore", { product: COMPANY.product })}{" "}
              <a href={COMPANY.marketingUrl} className="underline hover:text-fg">
                {COMPANY.marketingDomain}
              </a>{" "}
              {t("blurbAfter")}
            </p>
          </div>

          <div className="md:col-span-3">
            <div className="eyebrow mb-4">{t("universeLabel")}</div>
            <ul className="space-y-2.5 text-fg/85 text-sm">
              <li><a href="#crew">{t("universeCrew")}</a></li>
              <li><a href="#pillar-munk-multiplier">{t("universeCoaching")}</a></li>
              <li><a href="#crew">{t("universeCommunity")}</a></li>
              <li><a href="#tiers">{t("universeReps")}</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <div className="eyebrow mb-4">{t("contactLabel")}</div>
            <ul className="space-y-2.5 text-fg/85 text-sm">
              {COMPANY.legal.address ? <li>{COMPANY.legal.address}</li> : null}
              <li>
                <a href={`mailto:${COMPANY.emails.support}`}>{COMPANY.emails.support}</a>
              </li>
              {COMPANY.social.instagramHandle ? (
                <li>
                  <a href={COMPANY.social.instagramUrl ?? "#"}>
                    {t("instagram", { handle: COMPANY.social.instagramHandle })}
                  </a>
                </li>
              ) : null}
            </ul>

            <a href={PUBLIC_ACCESS_HREF} className="btn btn-sm mt-6 inline-flex">{t("getAccess")}</a>
          </div>
        </div>

        <div className="py-6 border-t hairline flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-fg-faint uppercase tracking-[0.16em]">
          <span>
            © {new Date().getFullYear()} {COMPANY.legal.entity ?? COMPANY.name}
          </span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-fg">{t("privacy")}</Link>
            <Link href="/terms" className="hover:text-fg">{t("terms")}</Link>
          </div>
          <LanguageSelector />
          <span>{t("madeIn")}</span>
        </div>
      </Container>
    </footer>
  );
}
