"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Container from "@/components/Container";

/**
 * Tier journey — scroll-driven visualization of the Reps tier
 * system. Each tier card is "locked" by default (dimmed, blurred
 * testimonial, lock badge) and unlocks when it scrolls 50% into
 * the viewport.
 *
 * Threshold values come from migration 0008_tier_promotion.sql:
 *   0–999       → Lifter
 *   1.000–4.999 → Athlete
 *   5.000–14.999→ Beast
 *   15.000+     → Legend
 *
 * Testimonial copy is fictional crew quotes that anchor each tier
 * in a concrete narrative (first 30 days, three months in, the
 * volume block, three years). When real members hit each tier we
 * can swap to actual quotes via a small server fetch.
 */
type Tier = {
  num: string;
  name: string;
  range: string;
  tierKey: "lifter" | "athlete" | "beast" | "legend";
  description: string;
  sigil: string;
  testimonial: { quote: string; handle: string };
};

export default function TierJourney() {
  const t = useTranslations("Marketing.tiers");

  const TIERS: Tier[] = [
    {
      num: "01",
      name: "Lifter",
      range: "0 – 999",
      tierKey: "lifter",
      description: t("lifter.description"),
      sigil: "▲",
      testimonial: {
        quote: t("lifter.quote"),
        handle: "nora.lift",
      },
    },
    {
      num: "02",
      name: "Athlete",
      range: "1.000 – 4.999",
      tierKey: "athlete",
      description: t("athlete.description"),
      sigil: "▲▲",
      testimonial: {
        quote: t("athlete.quote"),
        handle: "emil.beast",
      },
    },
    {
      num: "03",
      name: "Beast",
      range: "5.000 – 14.999",
      tierKey: "beast",
      description: t("beast.description"),
      sigil: "▲▲▲",
      testimonial: {
        quote: t("beast.quote"),
        handle: "kira.power",
      },
    },
    {
      num: "04",
      name: "Legend",
      range: "15.000+",
      tierKey: "legend",
      description: t("legend.description"),
      sigil: "▲▲▲▲",
      testimonial: {
        quote: t("legend.quote"),
        handle: "marius.legend",
      },
    },
  ];

  return (
    <section id="tiers" className="relative py-32 md:py-48">
      <Container>
        <div className="max-w-2xl mb-20">
          <div className="eyebrow mb-3">{t("eyebrow")}</div>
          <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] mb-5">
            {t("heading.line1")}
            <br />
            {t("heading.line2")}
          </h2>
          <p className="text-fg-dim text-lg leading-relaxed max-w-lg">
            {t("intro")}
          </p>
        </div>

        <div className="relative">
          {/* Vertical connector line — sits behind the tier cards.
              We don't try to make it scroll-fill in v1; visual
              continuity is enough without the extra scroll math. */}
          <div
            aria-hidden
            className="absolute left-[18px] md:left-[28px] top-2 bottom-2 w-px bg-line"
          />

          <ul className="space-y-12 md:space-y-20">
            {TIERS.map((tier, i) => (
              <TierRow key={tier.num} tier={tier} isLast={i === TIERS.length - 1} />
            ))}
          </ul>
        </div>

        <div className="mt-24 flex flex-wrap items-center gap-4">
          <Link href="/login" className="btn btn-primary">
            {t("cta")}
          </Link>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
            {t("ctaNote")}
          </span>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------- row ------------------------- */

function TierRow({
  tier,
  isLast,
}: {
  tier: Tier;
  isLast: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduced = useReducedMotion();
  const t = useTranslations("Marketing.tiers");
  // Unlock when the card is 40% into the viewport; once: true so we
  // don't re-lock on scroll-back which would feel jittery. Reduced-
  // motion users get every tier pre-unlocked so they don't have to
  // chase the reveal animation as they scroll.
  const inView = useInView(ref, { amount: 0.4, once: true });
  const unlocked = reduced ? true : inView;

  return (
    <li ref={ref} className="relative pl-12 md:pl-20">
      {/* Sigil disc on the connector. Filled circle when unlocked,
          ring when locked. */}
      <div
        aria-hidden
        className="absolute left-0 top-1.5 flex items-center justify-center"
      >
        <motion.div
          initial={false}
          animate={{
            backgroundColor: unlocked
              ? "var(--bg-3)"
              : "var(--bg)",
            borderColor: unlocked
              ? "var(--line-bright)"
              : "var(--line)",
          }}
          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
          className="size-9 md:size-14 rounded-full border-2 flex items-center justify-center"
        >
          <motion.span
            initial={false}
            animate={{ opacity: unlocked ? 1 : 0.25 }}
            transition={{ duration: 0.6 }}
            className="font-mono text-[10px] md:text-xs tracking-[0.16em] uppercase text-fg"
          >
            {tier.num}
          </motion.span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0.35, filter: "blur(4px)", y: 12 }}
        animate={
          unlocked
            ? { opacity: 1, filter: "blur(0px)", y: 0 }
            : { opacity: 0.35, filter: "blur(4px)", y: 12 }
        }
        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <div className="flex flex-wrap items-baseline gap-3 mb-3">
          <h3 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] leading-[0.95]">
            {tier.name}
          </h3>
          <span className="eyebrow text-fg-faint">{tier.sigil}</span>
          <span className="text-xs font-mono tracking-[0.14em] uppercase text-fg-dim ml-auto">
            {tier.range} <span className="text-fg-faint">reps</span>
          </span>
        </div>

        <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-2xl mb-6">
          {tier.description}
        </p>

        {/* Testimonial — masked until unlock so the locked state
            doesn't leak the quote. Once unlocked, slides in from
            below with a small delay so it lands after the title. */}
        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          animate={unlocked ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{
            duration: 0.7,
            delay: unlocked ? 0.25 : 0,
            ease: [0.2, 0.7, 0.2, 1],
          }}
          className="surface-2 rounded-2xl p-5 md:p-6 border-l-2 border-fg max-w-2xl"
        >
          <blockquote className="text-fg/90 text-base md:text-lg leading-relaxed italic">
            “{tier.testimonial.quote}”
          </blockquote>
          <figcaption className="mt-3 text-xs font-mono uppercase tracking-[0.16em] text-fg-faint">
            — @{tier.testimonial.handle}
          </figcaption>
        </motion.figure>

        {/* Locked badge — only renders while locked. Subtle, not
            screaming. Positioned at the bottom-right of the card. */}
        {!unlocked ? (
          <div className="absolute right-0 top-1.5 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-fg-faint">
            <LockGlyph /> {t("locked")}
          </div>
        ) : null}
      </motion.div>

      {/* Visual punctuation between tiers — small hairline dash. */}
      {!isLast ? (
        <div
          aria-hidden
          className="absolute left-12 md:left-20 right-0 -bottom-6 md:-bottom-10 h-px bg-line/40"
        />
      ) : null}
    </li>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
      <rect x="2.5" y="5" width="7" height="5" rx="0.8" fill="currentColor" />
      <path
        d="M4 5 V3.5 A2 2 0 0 1 8 3.5 V5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
