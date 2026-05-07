"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { dismissTierEventAction } from "@/app/(app)/actions";

export default function TierBanner({
  eventId,
  toTier,
  fromTier,
}: {
  eventId: string;
  toTier: string;
  fromTier: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  function dismiss() {
    setHidden(true);
    startTransition(() => {
      dismissTierEventAction(eventId);
    });
  }

  if (hidden) return null;

  return (
    <div
      className="surface-2 rounded-2xl px-5 py-4 flex items-center gap-4 lift"
      style={{ borderColor: "var(--line-bright)" }}
    >
      <span className="pulse-dot" aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-fg-faint mb-0.5">
          Tier-up
        </div>
        <div className="font-display text-xl leading-snug">
          Du er rykket fra {fromTier} til {toTier}.
        </div>
        <div className="text-xs text-fg-dim mt-0.5">
          Nye perks låst op — se Reps-siden.
        </div>
      </div>
      <Link href="/reps" className="btn btn-sm btn-primary shrink-0">
        Se perks →
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Luk"
        className="size-8 rounded-full surface flex items-center justify-center text-fg-dim hover:text-fg shrink-0"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
