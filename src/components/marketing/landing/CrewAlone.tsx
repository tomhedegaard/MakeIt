import { useTranslations } from "next-intl";

const FEED = ["p1", "p4", "p2", "p3", "p5"] as const;

/**
 * "Du er ikke alene": the crew as people. A day's feed of PRs, firsts
 * and form-checks with their cheers, beside the four ways members show
 * up for each other. Sample data, labelled as such on the page footer.
 */
export default function CrewAlone() {
  const t = useTranslations("Marketing.landing.chapters.alone");
  const c = useTranslations("Marketing.landing.screens.crew");
  const features = t.raw("features") as { t: string; d: string }[];

  return (
    <section id="crew-alone" aria-labelledby="alone-heading" className="scroll-mt-[68px]">
      <div className="mx-auto max-w-[1360px] px-4 py-[clamp(72px,9vw,140px)] md:px-8">
        <h2 id="alone-heading" className="font-display max-w-[8em] text-[clamp(56px,9vw,144px)] leading-[0.88]!">
          {t("heading")}
        </h2>
        <p className="mt-6 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>

        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h3 className="text-[13px] text-fg-dim">{t("feedLabel")}</h3>
            <ul className="mt-3 border-t border-line-strong">
              {FEED.map((p) => (
                <li key={p} className="flex items-center gap-4 border-b border-line py-4">
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-fg text-[13px] font-medium text-bg"
                  >
                    {c(`${p}i`)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[clamp(17px,1.5vw,21px)] leading-tight">
                      <span className="font-medium">{c(p)}</span> <span className="text-fg-dim">·</span> {c(`${p}t`)}
                    </span>
                    <span className="mt-1 block text-[13px] text-fg-dim">{c(`${p}m`)}</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 border border-line-strong px-3 py-1.5 text-[13px]">
                    {c("cheer")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="grid content-start gap-x-10 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f.t} className="border-t border-fg py-5">
                <p className="font-display text-[clamp(26px,2.6vw,38px)] leading-none">{f.t}</p>
                <p className="mt-2.5 max-w-[34ch] text-[15px] text-fg-dim">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
