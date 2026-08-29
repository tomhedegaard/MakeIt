import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

export default async function CrewSection() {
  const t = await getTranslations("Marketing.crew");

  return (
    <section id="crew" className="relative py-20 md:py-28">
      <Container>
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-4" data-reveal>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)]">
              {t("heading.line1")}
              <br /> {t("heading.line2")}
              <br /> {t("heading.line3")}
              <br /> {t("heading.line4")}
            </h2>
          </div>

          <div className="md:col-span-7 md:col-start-6 space-y-10">
            <p
              className="text-xl md:text-2xl leading-relaxed text-fg/90"
              data-reveal
              style={{ transitionDelay: "120ms" }}
            >
              {t("intro")}
            </p>

            <ul className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  k: t("items.invite.k"),
                  v: t("items.invite.v"),
                },
                {
                  k: t("items.internal.k"),
                  v: t("items.internal.v"),
                },
                {
                  k: t("items.noNoise.k"),
                  v: t("items.noNoise.v"),
                },
                {
                  k: t("items.ownData.k"),
                  v: t("items.ownData.v"),
                },
              ].map((it, i) => (
                <li
                  key={it.k}
                  data-reveal
                  style={{ transitionDelay: `${200 + i * 80}ms` }}
                  className="surface-2 p-6 lift"
                >
                  <div className="eyebrow mb-3">{it.k}</div>
                  <p className="text-fg-dim text-sm leading-relaxed">{it.v}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
