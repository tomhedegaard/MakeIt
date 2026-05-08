"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root error boundary. Renders for any uncaught error in the route
 * tree (server actions, data fetching, child components). Keep it
 * brand-aligned and offer the two recovery paths a user actually
 * needs: try again, or go home.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev; in prod this is where Sentry would capture.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="eyebrow mb-3">Fejl · 500</div>
        <h1 className="font-display text-4xl md:text-5xl mb-4 leading-[0.95]">
          Noget gik galt.
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-8">
          Vi kunne ikke loade denne side. Det er ikke dig — det er os.
          Prøv igen, eller gå tilbage til start.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-fg-faint mb-8">
            ref: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} type="button" className="btn btn-primary">
            Prøv igen
          </button>
          <Link href="/" className="btn">
            Til forsiden
          </Link>
        </div>
      </div>
    </main>
  );
}
