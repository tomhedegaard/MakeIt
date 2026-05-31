import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { SUPPORT_MAILTO } from "@/lib/company";

export default async function FAQ() {
  const t = await getTranslations("Marketing.faq");

  const ITEMS: { q: string; a: string }[] = [
    { q: t("items.advanced.q"),     a: t("items.advanced.a") },
    { q: t("items.oneRm.q"),        a: t("items.oneRm.a") },
    { q: t("items.cancel.q"),       a: t("items.cancel.a") },
    { q: t("items.vacation.q"),     a: t("items.vacation.a") },
    { q: t("items.responseTime.q"), a: t("items.responseTime.a") },
    { q: t("items.pause.q"),        a: t("items.pause.a") },
    { q: t("items.irl.q"),          a: t("items.irl.a") },
    { q: t("items.cheaper.q"),      a: t("items.cheaper.a") },
    { q: t("items.wearables.q"),    a: t("items.wearables.a") },
    { q: t("items.hrvScore.q"),     a: t("items.hrvScore.a") },
    { q: t("items.weeklyInsight.q"),    a: t("items.weeklyInsight.a") },
    { q: t("items.hrvPrivacy.q"),   a: t("items.hrvPrivacy.a") },
    { q: t("items.dataDirection.q"),    a: t("items.dataDirection.a") },
    { q: t("items.offPlanNutrition.q"), a: t("items.offPlanNutrition.a") },
    // WAUW-3: new søjle-aware FAQ entries
    { q: t("items.openBrainWhy.q"),    a: t("items.openBrainWhy.a") },
    { q: t("items.coCoach.q"),         a: t("items.coCoach.a") },
    { q: t("items.hrvSharing.q"),      a: t("items.hrvSharing.a") },
    { q: t("items.optOutAdaptive.q"),  a: t("items.optOutAdaptive.a") },
  ];

  return (
    <section id="faq" className="relative border-t hairline py-24 md:py-40">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 items-start">
          <div className="md:col-span-5" data-reveal>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.92] mb-5">
              {t("heading")}
            </h2>
            <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
              {t("intro")}
              {" "}
              <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
                {t("introLink")}
              </a>
              .
            </p>
          </div>

          <ul className="md:col-span-7 border-t hairline">
            {ITEMS.map((item, i) => (
              <li
                key={item.q}
                data-reveal
                style={{ transitionDelay: `${i * 60}ms` }}
                className="border-b hairline"
              >
                <details className="group">
                  <summary
                    className="flex items-start gap-4 py-5 cursor-pointer list-none touch-app"
                    style={{ outline: "none" }}
                  >
                    <span className="numeric text-[11px] text-fg-faint w-7 shrink-0 mt-1.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-lg md:text-xl leading-snug">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="size-7 rounded-full surface-2 flex items-center justify-center text-fg-dim group-open:rotate-45 transition-transform shrink-0"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pl-11 pr-4 pb-5 text-fg-dim text-sm md:text-base leading-relaxed">
                    {item.a}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
