import { useTranslations } from "next-intl";
import FaqList, { type FaqItem } from "@/components/marketing/FaqList";

/** Classic `Marketing.faq.items` keys reused as-is, no copy fork. */
const REUSED_KEYS = ["advanced", "wearables", "optOutAdaptive", "responseTime", "hrvScore"] as const;

/**
 * Kalk FAQ (reference B `.faq-grid`): the one new invite-only question
 * plus five answers reused from the classic FAQ. `FaqList` (Task 5)
 * already renders the accordion; `initialCount={6}` shows every item,
 * so its own "show all" button never appears.
 */
export default function KalkFaq() {
  const t = useTranslations("Marketing.kalk.faq");
  const items = useTranslations("Marketing.faq.items");
  const faq = useTranslations("Marketing.faq");

  const ITEMS: FaqItem[] = [
    { q: t("inviteOnly.q"), a: t("inviteOnly.a") },
    ...REUSED_KEYS.map((key) => ({ q: items(`${key}.q`), a: items(`${key}.a`) })),
  ];

  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-[68px] pb-[clamp(72px,8vw,128px)]">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <div className="grid gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <h2 id="faq-heading" className="font-display text-[clamp(46px,6.4vw,96px)]">
              {t("heading")}
            </h2>
            <p className="mt-[22px] max-w-[40ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
          </div>

          <FaqList items={ITEMS} initialCount={6} showAllLabel={faq("showAll", { count: ITEMS.length })} />
        </div>
      </div>
    </section>
  );
}
