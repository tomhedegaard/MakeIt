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
  { k: "Made in", literal: "DK", s: "Amagerbro · 169" },
];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden pt-28 md:pt-40 pb-24 md:pb-40"
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
            className="md:col-span-6 text-fg-dim text-lg md:text-xl leading-relaxed max-w-xl"
          >
            MakeIt er ikke bare straps og cuffs.
            <br />
            Det er det interne univers for crewet bag — coaching, community og loyalitet
            samlet ét sted. Bygget i København. Lavet til atleter der løfter tungt.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease }}
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.05 }}
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline"
        >
          {STATS.map((s) => (
            <div key={s.k} className="bg-bg p-6 md:p-8">
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
        </motion.div>
      </Container>
    </section>
  );
}
