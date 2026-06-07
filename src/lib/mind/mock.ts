/**
 * Mock data for demo mode (no Supabase env). Used by every /mind
 * surface so the experience is fully clickable without backend.
 *
 * Deterministic: same date → same output. Avoids the dev-server
 * flicker that random seeds cause.
 */

import type {
  MentalSession,
  MentalSessionCategory,
  MentalSessionVisualPattern,
  MentalSettings,
  MentalSignal,
  MindCheckLog,
} from "./types";
import { DEFAULT_MENTAL_SETTINGS } from "./types";

const MOCK_MEMBER_ID = "mock-munk";

/** Stable PRNG: same seed → same sequence. */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoTimestampDaysAgo(daysAgo: number, hour = 8): string {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/**
 * 30 days of plausible mind-check logs for the mock member.
 * Patterns: realistic week-rhythm (weekend energy higher),
 * a dip in stress mid-period to make the graph readable.
 */
export function mockMindCheckLogs(days = 30): MindCheckLog[] {
  const rand = seededRand(2026_06_07);
  const out: MindCheckLog[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDateDaysAgo(i);
    const dow = new Date(date).getUTCDay(); // 0 = Sun
    const weekend = dow === 0 || dow === 6;
    // Base ranges with weekly modulation
    const energy = clamp1to5(weekend ? 4 : 3, rand);
    const stress = clamp1to5(
      // mid-period dip in stress (better) around day 12-18
      i > 11 && i < 19 ? 2 : 3,
      rand,
    );
    const focus = clamp1to5(weekend ? 3 : 4, rand);
    out.push({
      id: `mock-mc-${i}`,
      member_id: MOCK_MEMBER_ID,
      logged_at: isoTimestampDaysAgo(i),
      logged_date: date,
      energy,
      stress,
      focus,
      note: i === 0 ? "Lidt træt — sov dårligt." : null,
      source: i % 5 === 0 ? "evening_nudge" : "manual",
      created_at: isoTimestampDaysAgo(i),
    });
  }
  return out;
}

function clamp1to5(base: number, rand: () => number): number {
  const jitter = Math.floor(rand() * 3) - 1; // -1, 0, +1
  const v = base + jitter;
  return Math.max(1, Math.min(5, v));
}

/** Derive the same MentalSignal shape Adaptive Engine consumes. */
export function mockMentalSignal(): MentalSignal {
  const logs = mockMindCheckLogs(7);
  const med = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? null;
  };
  return {
    energy_median_7d: med(logs.map((l) => l.energy)),
    stress_median_7d: med(logs.map((l) => l.stress)),
    focus_median_7d: med(logs.map((l) => l.focus)),
    low_for_days: 0,
    freshness_days: 0,
  };
}

export function mockMentalSettings(): MentalSettings {
  return {
    member_id: MOCK_MEMBER_ID,
    ...DEFAULT_MENTAL_SETTINGS,
    last_mind_check_at: isoTimestampDaysAgo(0),
    current_streak_days: 12,
    longest_streak_days: 18,
    created_at: isoTimestampDaysAgo(40),
    updated_at: isoTimestampDaysAgo(0),
  };
}

type HeroSeed = {
  slug: string;
  category: MentalSessionCategory;
  title: string;
  subtitle: string;
  duration_seconds: number;
  visual_pattern: MentalSessionVisualPattern;
};

const HERO_SEEDS: HeroSeed[] = [
  { slug: "box-breath-4-4-4-4-da", category: "breathing", title: "Box breath 4-4-4-4", subtitle: "For indre ro — 3 min", duration_seconds: 180, visual_pattern: "box_breath_4_4_4_4" },
  { slug: "coherence-5-5-da", category: "breathing", title: "Coherence 5-5", subtitle: "For HRV-løft — 4 min", duration_seconds: 240, visual_pattern: "coherence_5_5" },
  { slug: "pre-session-priming-da", category: "focus", title: "Pre-session priming", subtitle: "90 sekunder før løft", duration_seconds: 90, visual_pattern: "still_focus" },
  { slug: "restart-from-brain-fog-da", category: "focus", title: "Genstart efter pause", subtitle: "Fra hjerne-tåge til klart sigte — 3 min", duration_seconds: 180, visual_pattern: "still_focus" },
  { slug: "wind-down-beast-mode-da", category: "recovery", title: "Vind ned efter beast-mode", subtitle: "Skift fra på til af — 4 min", duration_seconds: 240, visual_pattern: "wave_4_8" },
  { slug: "sleep-body-scan-da", category: "recovery", title: "Sov bedre — body scan", subtitle: "Til sengetid — 5 min", duration_seconds: 300, visual_pattern: "none" },
  { slug: "debrief-what-worked-da", category: "debrief", title: "Hvad gik godt? Hvad næste gang?", subtitle: "Efter en god session — 2 min", duration_seconds: 120, visual_pattern: "still_focus" },
  { slug: "debrief-bad-session-da", category: "debrief", title: "Når træningen var dårlig", subtitle: "Lige efter en lortesession — 3 min", duration_seconds: 180, visual_pattern: "still_focus" },
];

/** 8 hero sessions matching the seed in migration 0046. */
export function mockHeroSessions(): MentalSession[] {
  return HERO_SEEDS.map((s, i) => ({
    id: `mock-mental-session-${i}`,
    slug: s.slug,
    category: s.category,
    title: s.title,
    subtitle: s.subtitle,
    duration_seconds: s.duration_seconds,
    body_md: "(mock body — full markdown lives in DB; see migration 0046 §12)",
    visual_pattern: s.visual_pattern,
    audio_url: null,
    voice: null,
    generated_by: "claude",
    prompt_seed: null,
    locale: "da",
    is_hero: true,
    published_at: isoTimestampDaysAgo(30),
    created_at: isoTimestampDaysAgo(30),
  }));
}
