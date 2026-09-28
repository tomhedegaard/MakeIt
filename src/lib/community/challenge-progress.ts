/**
 * Monthly challenge hero numbers.
 *
 * Demo mode keeps the rich 68.4 / 100K fixture Munk demos with.
 * Connected mode fail-closes to 0 — there is no live aggregate wired
 * yet, and the hardcoded bar destroyed first-run trust.
 */

export type ChallengeSurface = "demo" | "connected";

export type ChallengeProgressModel = {
  currentLabel: string;
  barPercent: number;
  youPercent: number;
  participantCount: number;
  enrolled: boolean;
};

const DEMO: ChallengeProgressModel = {
  currentLabel: "68.4 / 100K",
  barPercent: 68.4,
  youPercent: 68,
  participantCount: 128,
  enrolled: true,
};

const CONNECTED_EMPTY: ChallengeProgressModel = {
  currentLabel: "0 / 100K",
  barPercent: 0,
  youPercent: 0,
  participantCount: 0,
  enrolled: false,
};

export function communityChallengeProgress(
  surface: ChallengeSurface,
): ChallengeProgressModel {
  return surface === "demo" ? DEMO : CONNECTED_EMPTY;
}
