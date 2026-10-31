import { useTranslations } from "next-intl";
import WaitlistForm from "./WaitlistForm";
import Rule from "./Rule";

/**
 * Access panel (reference B `.access-panel`): a Nat block dropped into
 * the Kalk page, carrying the third and last eyebrow on the page. The
 * wrapper is a plain `data-theme="nat"` div — not `.theme-root` — this
 * is a dark block inside a light page, not a full-page theme switch
 * (see `ThemeScope`). `.btn-primary` resolves to `--fg`/`--bg`, so it
 * inverts to a light pill here automatically, no orange involved.
 * The kg ruler above draws itself across and the heading rises out of
 * its line as the block scrolls in (view timelines in globals.css).
 */
export default function AccessPanel() {
  const t = useTranslations("Marketing.landing.access");

  return (
    <section id="waitlist" aria-labelledby="access-heading" className="scroll-mt-[68px] pb-[clamp(72px,8vw,128px)]">
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <Rule className="mb-6" />
        <div
          data-theme="nat"
          className="grid items-end gap-[clamp(32px,5vw,80px)] bg-bg p-[clamp(28px,5vw,72px)] text-fg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        >
          <div>
            <p className="eyebrow mb-5 inline-flex items-center gap-2.5 before:h-0.5 before:w-7 before:bg-fg">
              {t("eyebrow")}
            </p>
            <h2 id="access-heading" className="font-display overflow-clip text-[clamp(52px,7vw,110px)]">
              <span className="access-rise block">{t("heading")}</span>
            </h2>
            <p className="mt-[22px] max-w-[36ch] text-fg-dim">{t("worksWith")}</p>
          </div>

          <div>
            <p className="max-w-[36ch] text-fg-dim">{t("sub")}</p>
            <WaitlistForm />
          </div>
        </div>
      </div>
    </section>
  );
}
