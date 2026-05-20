import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

export default async function PillarsSection() {
  const t = await getTranslations("Marketing.pillars");

  const pillars = [
    {
      id: "coaching",
      label: t("coaching.label"),
      title: t("coaching.title"),
      body: t("coaching.body"),
      bullets: [
        t("coaching.bullet1"),
        t("coaching.bullet2"),
        t("coaching.bullet3"),
      ],
      stat: { v: "07", k: t("coaching.statLabel") },
    },
    {
      id: "community",
      label: t("community.label"),
      title: t("community.title"),
      body: t("community.body"),
      bullets: [
        t("community.bullet1"),
        t("community.bullet2"),
        t("community.bullet3"),
      ],
      stat: { v: "412", k: t("community.statLabel") },
    },
    {
      id: "reps",
      label: t("reps.label"),
      title: t("reps.title"),
      body: t("reps.body"),
      bullets: [
        t("reps.bullet1"),
        t("reps.bullet2"),
        t("reps.bullet3"),
      ],
      stat: { v: "4", k: t("reps.statLabel") },
    },
  ];

  return (
    <section className="relative py-12 md:py-24">
      {pillars.map((p, idx) => (
        <div
          key={p.id}
          id={p.id}
          className={`relative border-t hairline ${idx === pillars.length - 1 ? "border-b" : ""}`}
        >
          <Container className="py-20 md:py-32">
            <div className="grid gap-12 md:grid-cols-12 items-start">
              <div className="md:col-span-5" data-reveal>
                <div className="eyebrow mb-6">{p.label}</div>
                <h3 className="font-display text-[clamp(2rem,5.2vw,4.5rem)] leading-[0.95]">
                  {p.title}
                </h3>
              </div>

              <div className="md:col-span-6 md:col-start-7 space-y-8">
                <p
                  className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl"
                  data-reveal
                  style={{ transitionDelay: "120ms" }}
                >
                  {p.body}
                </p>

                <ul className="grid gap-3">
                  {p.bullets.map((b, i) => (
                    <li
                      key={b}
                      data-reveal
                      style={{ transitionDelay: `${200 + i * 80}ms` }}
                      className="flex items-start gap-4 border-t hairline pt-4 text-fg/90"
                    >
                      <span className="numeric text-fg-faint text-sm w-8 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base md:text-lg">{b}</span>
                    </li>
                  ))}
                </ul>

                <div
                  data-reveal
                  style={{ transitionDelay: "500ms" }}
                  className="flex items-end gap-6 pt-4"
                >
                  <div className="numeric text-5xl md:text-7xl font-medium leading-none">
                    {p.stat.v}
                  </div>
                  <div className="eyebrow pb-2">{p.stat.k}</div>
                </div>
              </div>
            </div>
          </Container>
        </div>
      ))}
    </section>
  );
}
