import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

/**
 * Crew-pyramiden — the "give it forward" differentiator, stated up
 * front instead of only being discoverable deep inside TierJourney.
 *
 * The tier ladder already encodes this (beast unlocks Coach School,
 * legend co-coaches with Munk as senior, Reps rewards the quality of
 * your feedback to others). But that payoff only reveals itself after
 * a long scroll, so a curious first-time visitor never learns that
 * the platform grows organically: what you receive on the way up, you
 * hand down to the people standing where you stood.
 *
 * Three beats — receive → hand down → coach — each anchored to the
 * tier that unlocks it, so the claim stays concrete rather than
 * aspirational. Links to #tiers where the full ladder pays it off.
 *
 * Deliberately monochrome: the crew pyramid is a build-pillar, not
 * a health domain, so it takes no domain hue (docs/DOMAIN_COLOR_SYSTEM.md).
 */

const STEPS = [
  { key: "receive", num: "01" },
  { key: "handDown", num: "02" },
  { key: "coach", num: "03" },
] as const;

export default async function GiveForwardSection() {
  const t = await getTranslations("Marketing.giveForward");

  return (
    <section className="relative py-12 md:py-24 border-t hairline">
      <Container>
        <div className="max-w-2xl" data-reveal>
          <div className="eyebrow mb-6">{t("eyebrow")}</div>
          <h2 className="font-display text-[clamp(2rem,5.2vw,4rem)] leading-[0.95]">
            {t("heading.line1")}
            <br />
            {t("heading.line2")}
          </h2>
          <p className="mt-6 text-lg md:text-xl text-fg-dim leading-relaxed">
            {t("intro")}
          </p>
        </div>

        <div className="mt-12 md:mt-16 grid gap-px bg-line border hairline rounded-2xl overflow-hidden md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              data-reveal
              style={{ transitionDelay: `${120 + i * 80}ms` }}
              className="bg-bg-2 p-6 md:p-8"
            >
              <div className="flex items-baseline gap-2">
                <span className="numeric text-[11px] text-fg-faint">{s.num}</span>
                <span className="eyebrow">{t(`${s.key}.kicker`)}</span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl mt-2">
                {t(`${s.key}.title`)}
              </h3>
              <p className="mt-3 text-sm text-fg-dim leading-relaxed">
                {t(`${s.key}.body`)}
              </p>
              <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                {t(`${s.key}.tier`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4" data-reveal>
          <a
            href="#tiers"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg lift"
          >
            {t("cta")} →
          </a>
          <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
            {t("note")}
          </p>
        </div>
      </Container>
    </section>
  );
}
