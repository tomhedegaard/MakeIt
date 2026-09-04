import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { domainTags } from "@/components/marketing/domainTags";
import HrvTrendVisual from "@/components/marketing/HrvTrendVisual";

/**
 * WAUW-1 — the 4 søjler section.
 *
 * Spec: .claude/plans/for-at-have-wauw-humble-naur.md §"Ny PillarsSection"
 *
 * Tre pillars, ikke fem (UX-audit B1b). De fem søjler fortalte
 * parvis den samme historie og kostede to skærmes scroll uden ny
 * information, så de er lagt sammen hvor de hører sammen:
 *
 *   02 — Motor & åben hjerne   (Søjle 1 + 2: motoren justerer OG
 *                               viser hele beslutningskæden)
 *   03 — Coaching der skalerer (Søjle 3 + 4: AI udkaster, Munk
 *                               signerer, Beasts bliver co-coaches)
 *   04 — Mental motor          (Søjle 5 — står alene, den er
 *                               differentiatoren)
 *
 * Layout grammar is intentionally identical to v0 — eyebrow + display
 * heading left, body + numbered bullets + big stat right, alternating
 * via `data-reveal` stagger. The redesign is content-deep, not
 * layout-wide; the design system stays untouched so the page reads
 * as one continuous editorial.
 *
 * Domain colors (docs/DOMAIN_COLOR_SYSTEM.md) appear only where copy
 * genuinely references a health domain (HRV→heart, søvn/mind→mind,
 * RPE→body via t.rich + domainTags), and the Mental motor pillar —
 * the one build-pillar that IS a domain — carries data-domain="mind"
 * so its eyebrow takes the hue.
 *
 * Each pillar carries an optional `demoHook` — a short link rendered
 * under the stat that anchors to the relevant interactive surface
 * (e.g. Motor → #engine playground, Crew-pyramide → #tiers). This is
 * how the section earns its keep: not just "we built X" but "here's
 * where you touch it."
 */
export default async function PillarsSection() {
  const t = await getTranslations("Marketing.pillars");

  const pillars: {
    id: string;
    label: string;
    title: string;
    body: ReactNode;
    bullets: string[];
    stat: { v: string; k: string };
    demoHook: { href: string; label: string } | null;
    visual?: ReactNode;
    domain?: "mind";
  }[] = [
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
        t("engine.bullet4"),
      ],
      stat: { v: "30", k: t("engine.statLabel") },
      demoHook: { href: "#engine", label: t("engine.demoHook") },
      visual: <HrvTrendVisual />,
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
        t("munkMultiplier.bullet4"),
      ],
      stat: { v: "24t", k: t("munkMultiplier.statLabel") },
      demoHook: { href: "#tiers", label: t("munkMultiplier.demoHook") },
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
          data-domain={p.domain}
          className={`relative border-t hairline scroll-mt-20 ${idx === pillars.length - 1 ? "border-b" : ""}`}
        >
          <Container className="py-16 md:py-24">
            <div className="grid gap-12 md:grid-cols-12 items-start">
              {/* UX-audit A6: lange danske ord ("REGNESTYKKET.") løb
                  ind i højre kolonne ved ~1440px. Bredere kolonne,
                  lavere clamp-loft og orddeling som sikkerhedsnet. */}
              <div className="md:col-span-6" data-reveal>
                <div className="eyebrow eyebrow-domain mb-6">{p.label}</div>
                <h3 className="font-display text-[clamp(1.9rem,4.2vw,3.6rem)] leading-[0.95] [overflow-wrap:break-word]">
                  {p.title}
                </h3>

                {/* UX-audit B2/B4: venstre kolonne stod tom under
                    overskriften. Motor-pillaren viser nu den faktiske
                    graf medlemmet ser — bygget af samme rene funktion
                    som in-app-fladen. */}
                {p.visual ? <div className="mt-10">{p.visual}</div> : null}
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
