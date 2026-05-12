"use client";

import { useEffect } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";

/**
 * Logged-in app error boundary. Sits inside (app) so it preserves the
 * AppShell chrome (sidebar / mobile tab bar) — only the inner route
 * content swaps to this fallback. Lets the member jump back to the
 * dashboard rather than bouncing them all the way out.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[(app)/error.tsx]", error);
  }, [error]);

  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-md">
        <div className="eyebrow mb-3">Fejl</div>
        <h1 className="font-display text-3xl md:text-4xl mb-4 leading-[0.95]">
          Den side kunne vi ikke loade.
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-8">
          Tjek din forbindelse og prøv igen. Hvis det fortsætter, skriv til{" "}
          <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
            {COMPANY.emails.support}
          </a>
          .
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-fg-faint mb-8">
            ref: {error.digest}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button onClick={reset} type="button" className="btn btn-primary">
            Prøv igen
          </button>
          <Link href="/dashboard" className="btn">
            Til dashboard
          </Link>
        </div>
      </div>
    </Container>
  );
}
