import Link from "next/link";
import { useTranslations } from "next-intl";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";
import Rule from "./Rule";
import { MakeItWordmark } from "@/components/brand/MakeItMark";

const LINK = "border-b border-line-strong pb-0.5 text-xs no-underline hover:border-fg";

/**
 * Footer (reference B `.foot`): "HQ" large with "by MAKEIT" under it
 * (docs/BRAND_MARK.md), legal links, support email and the sample-data
 * disclaimer. No eyebrow — the third and last one
 * belongs to the access panel above (spec F2 rule 4).
 */
export default function LandingFooter() {
  const t = useTranslations("Marketing.landing.footer");

  return (
    <footer className="pb-12">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <Rule />

        <div className="mt-7 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-7">
          <div>
            <p className="font-display text-[clamp(72px,11vw,168px)] leading-[0.8]!">HQ</p>
            <p className="mt-7 flex items-baseline gap-2 text-sm text-fg-dim">
              by
              <MakeItWordmark className="h-[clamp(13px,1.5vw,20px)] text-fg" />
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link href="/privacy" className={LINK}>
              {t("privacy")}
            </Link>
            <Link href="/terms" className={LINK}>
              {t("terms")}
            </Link>
            <a href={SUPPORT_MAILTO} className={LINK}>
              {COMPANY.emails.support}
            </a>
          </nav>
        </div>

        <div className="mt-7 flex flex-wrap justify-between gap-4 text-micro text-fg-dim">
          <span>{t("sample")}</span>
          <span>{t("slogan")}</span>
        </div>
      </div>
    </footer>
  );
}
