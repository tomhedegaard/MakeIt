"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import Container from "@/components/Container";
import CountUp from "@/components/CountUp";
import Spotlight from "@/components/Spotlight";
import Link from "next/link";
import {
  HERO_DOMAINS,
  MarketingDomainKicker,
  MarketingFigure,
} from "@/components/marketing/FigureLanguage";

const ease = [0.2, 0.7, 0.2, 1] as const;

type Stat =
  | { id: string; k: string; to: number; pad?: number; s: string }
  | { id: string; k: string; literal: string; s: string };

/**
 * Pinned hero — the section is 170vh tall, its inner content is
 * position: sticky so it stays glued to the viewport while the
 * layers reveal in sequence driven by scroll progress 0→1.
 *
 * Everything inside the pin must fit one viewport: the sticky box is
 * exactly 100vh with overflow-hidden, so anything taller than the
 * screen is simply clipped away and never seen. That is why the
 * stats live in `StatsBand` below the pin rather than inside it, and
 * why the headline clamp caps well under the old 11rem.
 *
 * Performance notes (from a 60Hz-display jank report):
 *
 *   - reveals are opacity/transform only — both composited, neither
 *     triggers layout or paint per scroll frame
 *   - will-change: transform, opacity + translateZ(0) on the
 *     sticky container to promote it to its own GPU compositing
 *     layer, so the dissolve + nested transforms don't repaint
 *     the document below
 *   - useReducedMotion gates the pinning entirely: when the user
 *     has prefers-reduced-motion set, we skip the tall outer
 *     container + scroll-driven progress entirely and render the
 *     hero at its end state (everything visible, no exit fade).
 *     This also avoids the cumulative scroll-listener cost on
 *     low-power devices
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const t = useTranslations("Marketing.hero");

  // Kun app-stats (UX-audit C1: straps-salgstallet hørte til shoppen).
  // Outcome-tal frem for skala-tal — 6 SEK og 05:30 matcher eksisterende
  // app-copy ("Claude vurderer på 6 sek." / "hver morgen klokken 05:30").
  const STATS: Stat[] = [
    { id: "members", k: t("stats.members"), to: 412, s: t("stats.membersSuffix") },
    { id: "formCheck", k: t("stats.formCheck"), literal: t("stats.formCheckValue"), s: t("stats.formCheckSuffix") },
    { id: "engine", k: t("stats.engine"), literal: t("stats.engineValue"), s: t("stats.engineSuffix") },
    { id: "madeIn", k: t("stats.madeIn"), literal: "DK", s: t("stats.madeInSuffix") },
  ];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Background glow drift.
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Exit dissolve.
  const exitOpacity = useTransform(scrollYProgress, [0.92, 1], [1, 0.15]);

  // Reduced-motion mode: short section, no pin, no scroll-driven
  // anything. Everything renders at its end state.
  if (reduced) {
    return (
      <>
        <section
          ref={sectionRef}
          className="relative overflow-hidden pt-28 md:pt-40 pb-16 md:pb-24"
        >
          {/* Static end-state — no motion values; just plain styles. */}
          <HeroContent />
        </section>
        <StatsBand stats={STATS} />
      </>
    );
  }

  return (
    <>
      {/* UX-audit A7: pin'et var 260vh, hvilket holdt headline alene på
          skærmen i ~2 skærmes scroll før subline/CTA'er dukkede op. */}
      <section ref={sectionRef} className="relative h-[170vh]">
      <div
        className="sticky top-0 h-screen overflow-hidden flex flex-col"
        style={{
          willChange: "transform, opacity",
          // Promote to a GPU compositing layer so the dissolve +
          // nested transforms below don't repaint the document.
          transform: "translateZ(0)",
        }}
      >
        <motion.div
          style={{ opacity: exitOpacity }}
          className="relative flex-1 flex flex-col justify-center pt-28 md:pt-40 pb-12"
        >
          <motion.div
            style={{ y: glowY, opacity: glowOpacity }}
            className="pointer-events-none absolute inset-0 z-0"
          >
            <div className="absolute -top-40 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,242,236,0.10),transparent_70%)] blur-2xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
          </motion.div>

          <Spotlight />

          <Container className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
              className="flex items-center gap-3 mb-10"
            >
              <span className="pulse-dot" />
              <span className="eyebrow">
                MakeIt <span className="text-fg-faint">{"//"}</span> HQ &nbsp;·&nbsp; {t("eyebrow")}
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.09, delayChildren: 0.18 } },
              }}
              className="font-display text-[clamp(3rem,10.5vw,9rem)] leading-[0.9]"
            >
              {["MADE", "FOR", "THOSE", "WHO", "LIFT."].map((word, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { y: "110%", opacity: 0, rotate: 1.2 },
                    show: {
                      y: 0,
                      opacity: 1,
                      rotate: 0,
                      transition: { duration: 1.05, ease },
                    },
                  }}
                  className="inline-block overflow-hidden mr-[0.18em] last:mr-0"
                >
                  <span className="block">{word}</span>
                </motion.span>
              ))}
            </motion.h1>

            <div className="mt-12 grid gap-10 md:grid-cols-12 items-end">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease, delay: 0.85 }}
                className="md:col-span-6 max-w-xl"
              >
                <HeroLead />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease, delay: 1.2 }}
                className="md:col-span-6"
              >
                <HeroActions />
              </motion.div>
            </div>

          </Container>
        </motion.div>
      </div>
      </section>

      {/* Stats-båndet ligger UDEN for pin'et (UX-audit A7, opfølgende
          fund): inde i det 100vh-høje sticky-lag lå rækken under
          fold'en på en 900px-høj skærm og nåede først ind i viewporten
          efter exit-dissolven havde tonet hero ned til 15% opacity —
          altså reelt usynlig på en standard laptop. Som selvstændigt
          bånd ses den altid, i fuld styrke. */}
      <StatsBand stats={STATS} />
    </>
  );
}

/** Stats-bånd — fælles for motion- og reduced-motion-varianten. */
function StatsBand({ stats }: { stats: Stat[] }) {
  return (
    <section className="relative">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline">
          {stats.map((s, i) => (
            <div
              key={s.id}
              className="bg-bg p-6 md:p-8"
              data-reveal
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="eyebrow mb-3">{s.k}</div>
              <div className="numeric text-3xl md:text-5xl font-medium text-fg">
                {"literal" in s ? (
                  s.literal
                ) : (
                  <CountUp to={s.to} pad={s.pad} duration={1.8} />
                )}
              </div>
              <div className="mt-2 text-xs text-fg-faint font-mono">{s.s}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * Shared hero copy — pinned + reduced-motion both render this so the
 * figure, DomainMark kickers, monochrome paragraph and CTA cannot drift.
 *
 * Color lives only in the figure anchors and the four DomainMarks
 * (~10% of the surface). Headline, subline and body stay monochrome.
 * Domain hue on brødtekst is forbidden (docs/DOMAIN_COLOR_SYSTEM.md).
 * ---------------------------------------------------------------- */

function HeroLead() {
  const t = useTranslations("Marketing.hero");
  return (
    <>
      <p className="text-fg text-xl md:text-2xl leading-snug">{t("subline")}</p>
      <HeroWorlds />
      <p className="mt-4 text-fg-dim text-lg md:text-xl leading-relaxed">
        {t("subline2")}
      </p>
    </>
  );
}

/**
 * Editorial body-map next to the four domain kickers. Compact so the
 * 100vh pin does not clip; charcoal figure, all four anchors lit,
 * DomainMarks instead of generic dots.
 */
function HeroWorlds() {
  const t = useTranslations("Marketing.hero");
  return (
    <div className="mt-5 flex items-center gap-5">
      <MarketingFigure
        ariaLabel={t("figureAria")}
        className="h-28 md:h-36 w-auto shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-2">
        {HERO_DOMAINS.map((domain) => (
          <MarketingDomainKicker
            key={domain}
            domain={domain}
            label={t(`domains.${domain}`)}
          />
        ))}
      </div>
    </div>
  );
}

function HeroActions() {
  const t = useTranslations("Marketing.hero");
  return (
    <div className="flex flex-col items-start gap-3 md:items-end">
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <Link href="/login" className="btn btn-primary">
          {t("ctaPrimary")}
        </Link>
        <a href="#crew" className="btn">{t("ctaSecondary")}</a>
        <a href="#engine" className="btn btn-ghost">{t("ctaTertiary")}</a>
      </div>
      <a
        href="#waitlist"
        className="text-sm text-fg-dim underline underline-offset-4 hover:text-fg"
      >
        {t("waitlistLink")}
      </a>
      <p className="text-[11px] text-fg-faint font-mono uppercase tracking-[0.16em]">
        {t("trustLine")}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Static end-state for reduced-motion users. Mirrors the motion
 * version's final visual state without any animation wiring.
 * ---------------------------------------------------------------- */

function HeroContent() {
  const t = useTranslations("Marketing.hero");
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,242,236,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      </div>

      <Container className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <span className="pulse-dot" />
          <span className="eyebrow">
            MakeIt <span className="text-fg-faint">{"//"}</span> HQ &nbsp;·&nbsp; {t("eyebrow")}
          </span>
        </div>

        <h1 className="font-display text-[clamp(3rem,10.5vw,9rem)] leading-[0.9]">
          MADE FOR THOSE WHO LIFT.
        </h1>

        <div className="mt-12 grid gap-10 md:grid-cols-12 items-end">
          <div className="md:col-span-6 max-w-xl">
            <HeroLead />
          </div>
          <div className="md:col-span-6">
            <HeroActions />
          </div>
        </div>

      </Container>
    </>
  );
}

