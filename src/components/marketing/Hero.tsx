"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Container from "@/components/Container";
import CountUp from "@/components/CountUp";
import Spotlight from "@/components/Spotlight";
import Link from "next/link";

const ease = [0.2, 0.7, 0.2, 1] as const;

type Stat =
  | { k: string; to: number; pad?: number; s: string }
  | { k: string; literal: string; s: string };

const STATS: Stat[] = [
  { k: "Solgte straps", to: 50142, s: "+ stigende" },
  { k: "Aktive medlemmer", to: 412, s: "Closed beta" },
  { k: "Coaching-programmer", to: 7, pad: 2, s: "Tilgængelige nu" },
  { k: "Made in", literal: "DK", s: "København" },
];

/**
 * Pinned hero — the section is 260vh tall, its inner content is
 * position: sticky so it stays glued to the viewport for 1.6vh of
 * scroll while six layers reveal in sequence driven by scroll
 * progress 0→1:
 *
 *   0.00–0.05   eyebrow + headline (on-mount stagger; no scroll dep)
 *   0.05–0.32   subline mask-reveals left → right (5% soft edge so
 *                the leading edge "burns through" rather than hard-
 *                cuts — closer to ink etching than a wipe)
 *   0.28–0.48   CTA pair fades + scales + lifts
 *   0.50–0.85   stats row reveals each tile in a staggered cascade
 *   0.92–1.00   whole hero fades to 0.15 opacity as the marquee
 *                emerges underneath (the section is about to scroll
 *                past — the dissolve sells the transition)
 *
 * The on-mount animations (eyebrow + headline stagger) still play
 * the first time the hero mounts, then stay. Scroll-driven reveals
 * take over from there. Lenis smooth-scroll plays nicely with
 * framer-motion's scroll values — no special handling needed.
 *
 * Spotlight (mouse-tracked glow) sits inside the sticky so it
 * follows the cursor for the full pinned duration, not just the
 * first viewport.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Background glow drift — pre-existing flourish; kept but rebased
  // to use the new pinned scroll range.
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Subline mask-reveal. A gradient with a 5% soft edge between the
  // visible and clipped regions gives the "burn" feel rather than a
  // hard wipe. We drive the edge position from 0 → 110 so it sweeps
  // past the right side (>100) and removes the soft fade at the end.
  const sublineEdge = useTransform(scrollYProgress, [0.05, 0.32], [0, 110]);
  const sublineMask = useTransform(
    sublineEdge,
    (p) =>
      `linear-gradient(95deg, #000 0%, #000 ${Math.max(0, p - 5)}%, transparent ${p}%, transparent 100%)`
  );
  const sublineOpacity = useTransform(scrollYProgress, [0.05, 0.12], [0, 1]);

  // CTAs — scale + lift + fade in together.
  const ctaY = useTransform(scrollYProgress, [0.28, 0.48], [40, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.28, 0.48], [0, 1]);
  const ctaScale = useTransform(scrollYProgress, [0.28, 0.48], [0.94, 1]);

  // Stats row — each tile gets its own ramp so they cascade.
  const stat0 = useTransform(scrollYProgress, [0.50, 0.60], [0, 1]);
  const stat1 = useTransform(scrollYProgress, [0.56, 0.66], [0, 1]);
  const stat2 = useTransform(scrollYProgress, [0.62, 0.72], [0, 1]);
  const stat3 = useTransform(scrollYProgress, [0.68, 0.78], [0, 1]);
  const statOpacities = [stat0, stat1, stat2, stat3];
  const statY = useTransform(scrollYProgress, [0.50, 0.85], [24, 0]);

  // Exit dissolve.
  const exitOpacity = useTransform(scrollYProgress, [0.92, 1], [1, 0.15]);

  return (
    <section ref={sectionRef} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        <motion.div
          style={{ opacity: exitOpacity }}
          className="relative flex-1 flex flex-col justify-center pt-28 md:pt-40 pb-12"
        >
          {/* gradient glow behind type — drifts up on scroll */}
          <motion.div
            style={{ y: glowY, opacity: glowOpacity }}
            className="pointer-events-none absolute inset-0 z-0"
          >
            <div className="absolute -top-40 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,242,236,0.10),transparent_70%)] blur-2xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
          </motion.div>

          {/* mouse-tracked spotlight on top of the glow, under the type */}
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
                MakeIt <span className="text-fg-faint">{"//"}</span> HQ &nbsp;·&nbsp; Closed Beta · Invite only · est. 2026
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.09, delayChildren: 0.18 } },
              }}
              className="font-display text-[clamp(3.4rem,12vw,11rem)] leading-[0.9]"
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
              <motion.p
                style={{
                  opacity: sublineOpacity,
                  WebkitMaskImage: sublineMask,
                  maskImage: sublineMask,
                }}
                className="md:col-span-6 text-fg-dim text-lg md:text-xl leading-relaxed max-w-xl"
              >
                MakeIt er ikke bare straps og cuffs.
                <br />
                Det er det interne univers for crewet bag — coaching, community og loyalitet
                samlet ét sted. Bygget i København. Lavet til atleter der løfter tungt.
              </motion.p>

              <motion.div
                style={{ opacity: ctaOpacity, y: ctaY, scale: ctaScale }}
                className="md:col-span-6 flex flex-wrap items-center gap-3 md:justify-end"
              >
                <Link href="/login" className="btn btn-primary">
                  Få adgang
                  <span aria-hidden>→</span>
                </Link>
                <a href="#crew" className="btn">Læs mere</a>
              </motion.div>
            </div>

            {/* Stats row — values count up from 0 when scrolled into view */}
            <motion.div
              style={{ y: statY }}
              className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline"
            >
              {STATS.map((s, i) => (
                <motion.div
                  key={s.k}
                  style={{ opacity: statOpacities[i] }}
                  className="bg-bg p-6 md:p-8"
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
                </motion.div>
              ))}
            </motion.div>
          </Container>
        </motion.div>
      </div>
    </section>
  );
}
