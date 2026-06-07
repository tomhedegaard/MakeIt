/**
 * Deterministic fallback when Claude is unavailable for personal session
 * generation (MH-4). Picks a hero-session template + customizes a 2-line
 * preamble from the member's mind-check signal.
 *
 * The point: never show an empty session. The fallback is plain but
 * always works, and the cron's failure log makes it visible.
 */

import type { CoachContext } from "./coach-context";
import type { MentalSessionCategory, MentalSessionVisualPattern } from "./types";

export interface SessionScript {
  title: string;
  subtitle: string | null;
  body_md: string;
  visual_pattern: MentalSessionVisualPattern;
  duration_seconds: number;
  category: MentalSessionCategory;
}

/** Pick a deterministic-but-context-aware fallback session. */
export function buildFallbackSession(ctx: CoachContext): SessionScript {
  const e = ctx.mind_today.energy ?? ctx.mind_signal_7d.energy_median_7d ?? 3;
  const s = ctx.mind_today.stress ?? ctx.mind_signal_7d.stress_median_7d ?? 3;

  // High stress → coherence breathing.
  if (s >= 4) {
    return {
      title: "Coherence 5-5 til lige nu",
      subtitle: "Når stress sidder højt — 3 min",
      body_md: [
        `# I dag\n`,
        `Stress er højt. Du behøver ikke fikse noget — bare ånde.\n`,
        `## Mønstret\n`,
        `5 sekunder ind. 5 sekunder ud. Følg ringen.\n`,
        `## Når du er færdig\n`,
        `Lav mind-check igen om en time. Mange ser stress falde.`,
      ].join("\n"),
      visual_pattern: "coherence_5_5",
      duration_seconds: 180,
      category: "breathing",
    };
  }
  // Low energy → compassionate body scan, short.
  if (e <= 2) {
    return {
      title: "Lige nu er du træt",
      subtitle: "Compassion + scan — 2 min",
      body_md: [
        `# Hvad du har brug for\n`,
        `Du er træt. Ingen krav. Bare to minutter.\n`,
        `## Scan\n`,
        `Ovenfra og ned: pande, kæbe, skuldre, bryst, mave, ben.\n`,
        `For hvert område: bemærk det, ånd ud, slip.\n`,
        `## Slut\n`,
        `Du har gjort nok i dag. Resten er bonus.`,
      ].join("\n"),
      visual_pattern: "none",
      duration_seconds: 120,
      category: "recovery",
    };
  }
  // Default → quick focus priming.
  return {
    title: "60 sekunders fokus-prime",
    subtitle: "Hurtig — inden næste opgave",
    body_md: [
      `# I dag\n`,
      `Energi og stress er ok. Du kan bruge et minut på at samle dig.\n`,
      `## 3 spørgsmål\n`,
      `Hvad er det vigtigste jeg vil have lavet i dag?\n`,
      `Hvad er den ene cue jeg vil holde fokus på?\n`,
      `Hvad er signalet fra min krop lige nu?\n`,
      `## Gå i gang\n`,
      `Du er klar.`,
    ].join("\n"),
    visual_pattern: "still_focus",
    duration_seconds: 60,
    category: "focus",
  };
}
