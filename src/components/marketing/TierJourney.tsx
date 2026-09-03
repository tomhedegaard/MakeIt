"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Container from "@/components/Container";
import RepsSimulator from "@/components/marketing/RepsSimulator";

/**
 * Tier journey — scroll-driven visualization of the Reps tier
 * system as a FUNCTIONAL coaching ladder (WAUW-2 rewrite).
 *
 * Spec: .claude/plans/for-at-have-wauw-humble-naur.md §"Ny TierJourney"
 *
 * Each tier card is "locked" by default (dimmed, blurred, lock
 * badge) and unlocks when it scrolls 40% into the viewport. The
 * scaffolding (sigil-disc + connector + reveal-on-scroll) is
 * unchanged from v1. The CONTENT swap is the wauw:
 *
 *   v1: cosmetic tier → 1 testimonial quote
 *   v2: cosmetic tier → 4 concrete unlocks (functional capabilities
 *        the member earns) + an optional testimonial footnote
 *
 * Threshold values come from migration 0008_tier_promotion.sql:
 *   0–999       → Lifter
 *   1.000–4.999 → Athlete
 *   5.000–14.999→ Beast
 *   15.000+     → Legend
 *
 * Unlocks copy is i18n-driven so Munk can edit without a code change.
 * Each tier's `unlocks` array is 3–4 short Danish capability strings
 * (e.g. "Coach School låst op", "Sandbox-cases (du øver mod
 * simulerede medlemmer)") that connect the Reps balance to a real
 * member capability.
 *
 * The bottom CTAs are now two: primary "Start din journey → /login"
 * (unchanged) and ghost "Se motoren der driver det → #engine" which
 * sends curious tier-scrollers back to the playground.
 */
type Tier = {
  num: string;
  name: string;
  range: string;
  tierKey: "lifter" | "athlete" | "beast" | "legend";
  description: string;
  sigil: string;
  unlocks: string[];
  testimonial?: { quote: string; handle: string };
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
      unlocks: [
        t("lifter.unlocks.1"),
        t("lifter.unlocks.2"),
        t("lifter.unlocks.3"),
        t("lifter.unlocks.4"),
      ],
      testimonial: { quote: t("lifter.quote"), handle: "nora.lift" },
    },
    {
      num: "02",
      name: "Athlete",
      range: "1.000 – 4.999",
      tierKey: "athlete",
      description: t("athlete.description"),
      sigil: "▲▲",
      unlocks: [
        t("athlete.unlocks.1"),
        t("athlete.unlocks.2"),
        t("athlete.unlocks.3"),
        t("athlete.unlocks.4"),
      ],
      testimonial: { quote: t("athlete.quote"), handle: "emil.beast" },
    },
    {
      num: "03",
      name: "Beast",
      range: "5.000 – 14.999",
      tierKey: "beast",
      description: t("beast.description"),
      sigil: "▲▲▲",
      unlocks: [
        t("beast.unlocks.1"),
        t("beast.unlocks.2"),
        t("beast.unlocks.3"),
        t("beast.unlocks.4"),
      ],
      testimonial: { quote: t("beast.quote"), handle: "kira.power" },
    },
    {
      num: "04",
      name: "Legend",
      range: "15.000+",
      tierKey: "legend",
      description: t("legend.description"),
      sigil: "▲▲▲▲",
      unlocks: [
        t("legend.unlocks.1"),
        t("legend.unlocks.2"),
        t("legend.unlocks.3"),
        t("legend.unlocks.4"),
      ],
      testimonial: { quote: t("legend.quote"), handle: "marius.legend" },
    },
  ];

  return (
    <section id="tiers" className="relative py-20 md:py-32 scroll-mt-20">
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

        {/* UX-audit B3/B4: højre kolonne stod tom på desktop, og siden
            havde kun ét interaktivt element. Simulatoren følger med
            ned langs stigen (sticky) mens man læser tierne. */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          <div className="relative lg:col-span-7">
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

          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <RepsSimulator />
          </div>
        </div>

        {/* Promotion-path footer + ctas */}
        <p className="mt-16 max-w-2xl text-sm text-fg-dim leading-relaxed">
          {t("promotionFooter")}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/login" className="btn btn-primary">
            {t("cta")}
          </Link>
          <a href="#engine" className="btn btn-ghost">
            {t("ctaSecondary")}
          </a>
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

        {/* Unlocks list — replaces the v1 testimonial-as-hero block.
            Stagger-revealed by 60ms per item once the card unlocks
            so the list "fills in" rather than appearing all at once. */}
        <ul className="space-y-2 max-w-2xl mb-5">
          {tier.unlocks.map((unlock, idx) => (
            <motion.li
              key={`${tier.num}-${idx}`}
              initial={{ opacity: 0, x: -8 }}
              animate={
                unlocked ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }
              }
              transition={{
                duration: 0.5,
                delay: unlocked ? 0.2 + idx * 0.06 : 0,
                ease: [0.2, 0.7, 0.2, 1],
              }}
              className="flex items-start gap-3 border-t hairline pt-3 text-fg/90"
            >
              <span className="numeric text-fg-faint text-xs w-6 shrink-0 pt-0.5">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="text-sm md:text-base leading-snug">
                {unlock}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* Optional testimonial — kept as small footnote under the
            unlocks. The concrete capabilities ARE the section; the
            quote just adds a human face. Truncated visually by the
            italics + size — Munk can edit per-tier later. */}
        {tier.testimonial ? (
          <motion.figure
            initial={{ opacity: 0, y: 8 }}
            animate={unlocked ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{
              duration: 0.6,
              delay: unlocked ? 0.45 : 0,
              ease: [0.2, 0.7, 0.2, 1],
            }}
            className="max-w-2xl pt-2 border-t hairline/40"
          >
            <blockquote className="text-fg-dim text-sm leading-relaxed italic">
              “{tier.testimonial.quote}”
            </blockquote>
            <figcaption className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
              — @{tier.testimonial.handle}
            </figcaption>
          </motion.figure>
        ) : null}

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
