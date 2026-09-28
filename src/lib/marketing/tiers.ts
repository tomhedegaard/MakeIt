/**
 * Public Reps tiers. Single source for the marketing surface
 * (Kalk CrewPlates). Member tier itself
 * is stored on members.tier; these floors are the published ladder.
 */
export const TIERS = [
  { key: "lifter", name: "Lifter", from: 0 },
  { key: "athlete", name: "Athlete", from: 1000 },
  { key: "beast", name: "Beast", from: 5000 },
  { key: "legend", name: "Legend", from: 15000 },
] as const;

export type TierKey = (typeof TIERS)[number]["key"];

export function tierForReps(reps: number) {
  return [...TIERS].reverse().find((t) => reps >= t.from) ?? TIERS[0];
}

export function progressToNext(reps: number): { next: TierKey; at: number; ratio: number } | null {
  const i = TIERS.findIndex((t) => t.key === tierForReps(reps).key);
  const next = TIERS[i + 1];
  if (!next) return null;
  return { next: next.key, at: next.from, ratio: Math.round((reps / next.from) * 1000) / 1000 };
}
