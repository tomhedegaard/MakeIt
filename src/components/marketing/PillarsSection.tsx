import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { domainTags } from "@/components/marketing/domainTags";

/**
 * WAUW-1 — the 4 søjler section.
 *
 * Spec: .claude/plans/for-at-have-wauw-humble-naur.md §"Ny PillarsSection"
 *
 * Replaces the v0 generic "Coaching/Community/Reps/Restitution"
 * pillars with the four wauw-plan søjler that are actually shipped:
 *
 *   02 — Motor              (Søjle 1: Adaptive Engine)
 *   03 — Åben hjerne        (Søjle 2: Open Brain UI)
 *   04 — Munk-multiplikator (Søjle 3: Munk Multiplier)
 *   05 — Crew-pyramide      (Søjle 4: Crew Coaching Pyramid)
 *
 * Layout grammar is intentionally identical to v0 — eyebrow + display
 * heading left, body + numbered bullets + big stat right, alternating
 * via `data-reveal` stagger. Domain colors appear only where copy
 * genuinely references a health domain (HRV→heart, søvn/mind→mind,
 * RPE→body via t.rich + domainTags), and the Mind pillar — the one
 * build-pillar that IS a domain — carries data-domain="mind" so its
 * eyebrow takes the hue. See docs/DOMAIN_COLOR_SYSTEM.md.
 *
 * Each pillar carries an optional `demoHook` — a short link rendered
 * under the stat that anchors to the relevant interactive surface
 * (e.g. Motor → #engine playground, Crew-pyramide → #tiers). This is
 * how the section earns its keep: not just "we built X" but "here's
 * where you touch it."
 */
export default async function PillarsSection() {
  const t = await getTranslations("Marketing.pillars");

  const pillars = [
    {
      // Prefix with "pillar-" so #engine on the page resolves to the
      // standalone playground (AdaptivePlaygroundPublic) and never
      // collides with the pillar's anchor.
      id: "pillar-engine",
      label: t("engine.label"),
      title: t("engine.title"),
      body: t.rich("engine.body", domainTags),
      bullets: [
        t("engine.bullet1"),
        t("engine.bullet2"),
        t("engine.bullet3"),
      ],
      stat: { v: "8", k: t("engine.statLabel") },
      demoHook: { href: "#engine", label: t("engine.demoHook") },
    },
    {
      id: "pillar-open-brain",
      label: t("openBrain.label"),
      title: t("openBrain.title"),
      body: t("openBrain.body"),
      bullets: [
        t("openBrain.bullet1"),
        t("openBrain.bullet2"),
        t("openBrain.bullet3"),
      ],
      stat: { v: "30", k: t("openBrain.statLabel") },
      demoHook: { href: "#engine", label: t("openBrain.demoHook") },
    },
    {
      id: "pillar-munk-multiplier",
      label: t("munkMultiplier.label"),
      title: t("munkMultiplier.title"),
      body: t("munkMultiplier.body"),
      bullets: [
        t("munkMultiplier.bullet1"),
        t("munkMultiplier.bullet2"),
        t("munkMultiplier.bullet3"),
      ],
      stat: { v: "24t", k: t("munkMultiplier.statLabel") },
      demoHook: null,
    },
    {
      id: "pillar-crew-pyramid",
      label: t("crewPyramid.label"),
      title: t("crewPyramid.title"),
      body: t("crewPyramid.body"),
      bullets: [
        t("crewPyramid.bullet1"),
        t("crewPyramid.bullet2"),
        t("crewPyramid.bullet3"),
      ],
      stat: { v: "4", k: t("crewPyramid.statLabel") },
      demoHook: { href: "#tiers", label: t("crewPyramid.demoHook") },
    },
    {
      id: "pillar-mind",
      domain: "mind",
      label: t("mind.label"),
      title: t("mind.title"),
      body: t.rich("mind.body", domainTags),
      bullets: [
        t("mind.bullet1"),
        t("mind.bullet2"),
        t("mind.bullet3"),
      ],
      stat: { v: "60", k: t("mind.statLabel") },
      demoHook: null,
    },
  ];

  return (
    <section className="relative py-12 md:py-24">
      {pillars.map((p, idx) => (
        <div
          key={p.id}
          id={p.id}
          data-domain={"domain" in p ? p.domain : undefined}
          className={`relative border-t hairline ${idx === pillars.length - 1 ? "border-b" : ""}`}
        >
          <Container className="py-20 md:py-32">
            <div className="grid gap-12 md:grid-cols-12 items-start">
              <div className="md:col-span-5" data-reveal>
                <div className="eyebrow eyebrow-domain mb-6">{p.label}</div>
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

                {p.demoHook ? (
                  <a
                    href={p.demoHook.href}
                    data-reveal
                    style={{ transitionDelay: "600ms" }}
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg lift"
                  >
                    {p.demoHook.label} →
                  </a>
                ) : null}
              </div>
            </div>
          </Container>
        </div>
      ))}
    </section>
  );
}
