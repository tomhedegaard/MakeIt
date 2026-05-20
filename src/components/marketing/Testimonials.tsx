import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

export default async function Testimonials() {
  const t = await getTranslations("Marketing.testimonials");

  const QUOTES: {
    who: string;
    tier: string;
    cred: string;
    quote: string;
  }[] = [
    {
      who: "@kasper_s",
      tier: "Athlete",
      cred: t("kasper.cred"),
      quote: t("kasper.quote"),
    },
    {
      who: "@nina_dl",
      tier: "Beast",
      cred: t("nina.cred"),
      quote: t("nina.quote"),
    },
    {
      who: "@maria.lift",
      tier: "Beast",
      cred: t("maria.cred"),
      quote: t("maria.quote"),
    },
  ];

  return (
    <section id="crew-says" className="relative border-t hairline py-24 md:py-40">
      <Container>
        <div className="max-w-2xl mb-12 md:mb-16" data-reveal>
          <div className="eyebrow mb-4">{t("eyebrow")}</div>
          <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] mb-5">
            {t("heading")}
          </h2>
          <p className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl">
            {t("intro")}
          </p>
        </div>

        <ul className="grid gap-px bg-line border hairline md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <li
              key={q.who}
              data-reveal
              style={{ transitionDelay: `${i * 100}ms` }}
              className="bg-bg p-7 md:p-9 flex flex-col gap-6"
            >
              <span className="font-display text-5xl text-fg-faint leading-none">&ldquo;</span>
              <p
                className="flex-1 text-base md:text-lg text-fg/95 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: q.quote }}
              />
              <div className="border-t hairline pt-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-xs font-mono uppercase">
                    {q.who.slice(1, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm">{q.who}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-dim">
                      {q.tier} · {q.cred}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
