"use client";

import { motion } from "framer-motion";
import Container from "@/components/Container";
import Link from "next/link";

const ease = [0.2, 0.7, 0.2, 1] as const;

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-40 pb-24 md:pb-40">
      {/* gradient glow behind type */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,242,236,0.10),transparent_70%)] blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      </div>

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
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
          }}
          className="font-display text-[clamp(3.4rem,12vw,11rem)] leading-[0.9]"
        >
          {["MADE", "FOR", "THOSE", "WHO", "LIFT."].map((word, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { y: "110%", opacity: 0 },
                show: { y: 0, opacity: 1, transition: { duration: 0.9, ease } },
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
            transition={{ duration: 0.9, delay: 0.6, ease }}
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
            transition={{ duration: 0.9, delay: 0.7, ease }}
            className="md:col-span-6 flex flex-wrap items-center gap-3 md:justify-end"
          >
            <Link href="/login" className="btn btn-primary">
              Få adgang
              <span aria-hidden>→</span>
            </Link>
            <a href="#crew" className="btn">Læs mere</a>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.0 }}
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline"
        >
          {[
            { k: "Solgte straps", v: "50.142", s: "+ stigende" },
            { k: "Aktive medlemmer", v: "412", s: "Closed beta" },
            { k: "Coaching-programmer", v: "07", s: "Tilgængelige nu" },
            { k: "Made in", v: "DK", s: "Amagerbro · 169" },
          ].map((s) => (
            <div key={s.k} className="bg-bg p-6 md:p-8">
              <div className="eyebrow mb-3">{s.k}</div>
              <div className="numeric text-3xl md:text-5xl font-medium text-fg">
                {s.v}
              </div>
              <div className="mt-2 text-xs text-fg-faint font-mono">{s.s}</div>
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
