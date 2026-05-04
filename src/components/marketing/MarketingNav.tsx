"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import Container from "@/components/Container";

export default function MarketingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b hairline backdrop-blur-md bg-[rgba(10,10,11,0.6)]">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link href="/" aria-label="MakeIt" className="text-fg">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[12px] tracking-[0.18em] uppercase text-fg-dim font-mono">
            <a href="#crew"     className="hover:text-fg transition-colors">Crew</a>
            <a href="#coaching" className="hover:text-fg transition-colors">Coaching</a>
            <a href="#community" className="hover:text-fg transition-colors">Community</a>
            <a href="#reps"     className="hover:text-fg transition-colors">Reps</a>
            <a href="#origin"   className="hover:text-fg transition-colors">Made in DK</a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase font-mono text-fg-dim">
              <span className="pulse-dot" /> Closed Beta
            </span>
            <Link href="/login" className="btn btn-sm btn-primary">Log ind</Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
