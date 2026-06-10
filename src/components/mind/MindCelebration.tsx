"use client";

import { useEffect, useState } from "react";

interface CelebrationProps {
  /** Kind of milestone the celebration fired for. */
  kind: "first_check" | "streak_3" | "streak_7" | "streak_30" | "streak_90";
}

const COPY: Record<CelebrationProps["kind"], { eyebrow: string; title: string; body: string; reps: number }> = {
  first_check: {
    eyebrow: "Mind · første mind-check",
    title: "Du gjorde det.",
    body: "Velkommen i mental-data. Hver dag du tjekker ind, bygger du grafen — og giver Adaptive Engine mere at arbejde med.",
    reps: 0,
  },
  streak_3: {
    eyebrow: "Mind · 3-dages stribe",
    title: "Tre dage i streg.",
    body: "Det er der vanen sætter sig. Fortsæt — næste milestone er 7 dage og +20 Reps.",
    reps: 5,
  },
  streak_7: {
    eyebrow: "Mind · 7-dages stribe",
    title: "Hel uge i mål.",
    body: "Du er nu blandt de medlemmer der bygger mental data konsistent. Næste: 30 dage og +100 Reps.",
    reps: 20,
  },
  streak_30: {
    eyebrow: "Mind · 30-dages stribe",
    title: "30 dage. Solidt.",
    body: "En måneds mental data — nu kan AI-coach reelt se mønstre i din uge. +100 Reps + milestone-bonus tikkede ind.",
    reps: 150, // 100 streak + 50 milestone
  },
  streak_90: {
    eyebrow: "Mind · 90-dages stribe",
    title: "90 dage — det er en praksis.",
    body: "Du har bygget mental sundhed som en disciplin. Det her er stadig den hårdeste del. Du gjorde det.",
    reps: 500, // 300 streak + 200 milestone
  },
};

/**
 * Per-kind localStorage key so each milestone shows ONCE.
 */
function storageKey(kind: CelebrationProps["kind"]): string {
  return `mi_mind_celebrate_${kind}_v1`;
}

/**
 * Inline banner that fires once per milestone (first mind-check or
 * streak milestone hit). Tracks shown state in localStorage so it
 * doesn't re-show on subsequent dashboard renders.
 *
 * The PARENT decides which kind to render (server-side: read current
 * streak + previous, derive milestone if just crossed). This component
 * only handles the show-once + dismiss UX.
 */
export default function MindCelebration({ kind }: CelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(storageKey(kind));
      if (!seen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } catch {
      // ignore
    }
  }, [kind]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(kind), "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;
  const c = COPY[kind];

  return (
    <div
      role="status"
      className="relative rounded-2xl border-2 border-fg/40 bg-bg-2 p-6 md:p-8 space-y-3 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-mind-energy/5 via-transparent to-mind-focus/5 pointer-events-none"
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{c.eyebrow}</div>
          {c.reps > 0 ? (
            <span className="text-xs font-mono tabular-nums px-2.5 py-1 rounded-full border hairline">
              +{c.reps} Reps
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-2xl md:text-3xl leading-tight">
          {c.title}
        </h3>
        <p className="text-fg-dim leading-relaxed">{c.body}</p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity mt-2"
        >
          Tak — luk
        </button>
      </div>
    </div>
  );
}
