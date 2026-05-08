"use client";

import { useEffect } from "react";
import Link from "next/link";
import Container from "@/components/Container";

/**
 * Coach-side error boundary. Coach routes are sensitive (member data,
 * form-checks, redemptions) so we link back to the coach overview
 * rather than the member dashboard.
 */
export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[coach/error.tsx]", error);
  }, [error]);

  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-md">
        <div className="eyebrow mb-3">Coach · fejl</div>
        <h1 className="font-display text-3xl md:text-4xl mb-4 leading-[0.95]">
          Kunne ikke loade.
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-8">
          Et kald fejlede. Prøv igen — hvis det fortsætter, kan det være en RLS-policy
          eller et netværksproblem. Tjek konsollen.
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
          <Link href="/coach" className="btn">
            Coach overview
          </Link>
        </div>
      </div>
    </Container>
  );
}
