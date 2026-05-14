/**
 * Muscle-group taxonomy + Danish labels.
 *
 * The naming follows the convention of "what you see on the body"
 * rather than strict anatomical terms — members aren't anatomists,
 * and "Bryst" reads more naturally than "Pectoralis major" in
 * exercise descriptions. The 18 groups cover ~95% of compound-lift
 * targeting; finer divisions (e.g. medial vs lateral head of
 * triceps, vastus medialis vs lateralis) are deliberately omitted
 * for v1 — the cognitive load doesn't pay off until members are
 * doing isolation work.
 */

export type MuscleGroup =
  // Front view
  | "neck"
  | "chest"
  | "front_delts"
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "calves_front"
  // Back view
  | "traps"
  | "rear_delts"
  | "lats"
  | "triceps"
  | "lower_back"
  | "glutes"
  | "hamstrings"
  | "calves_back";

export type AnatomyView = "front" | "back";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  neck: "Nakke",
  chest: "Bryst",
  front_delts: "Skuldre (front)",
  biceps: "Biceps",
  forearms: "Underarme",
  abs: "Mavemuskler",
  obliques: "Skrå mave",
  quads: "Forlår",
  calves_front: "Skinneben",
  traps: "Trapezius",
  rear_delts: "Skuldre (bag)",
  lats: "Rygmuskler",
  triceps: "Triceps",
  lower_back: "Lænd",
  glutes: "Balder",
  hamstrings: "Baglår",
  calves_back: "Lægge",
};

export const FRONT_MUSCLES: MuscleGroup[] = [
  "neck",
  "chest",
  "front_delts",
  "biceps",
  "forearms",
  "abs",
  "obliques",
  "quads",
  "calves_front",
];

export const BACK_MUSCLES: MuscleGroup[] = [
  "traps",
  "rear_delts",
  "triceps",
  "forearms",
  "lats",
  "lower_back",
  "glutes",
  "hamstrings",
  "calves_back",
];

/**
 * Which view a muscle group is visible from. Used to pick the right
 * figure when an exercise targets a mix (e.g. deadlift hits lats +
 * quads — show back view since the dominant work is posterior).
 */
export function viewForMuscles(muscles: MuscleGroup[]): AnatomyView {
  const backCount = muscles.filter((m) => BACK_MUSCLES.includes(m)).length;
  const frontCount = muscles.filter((m) => FRONT_MUSCLES.includes(m)).length;
  return backCount >= frontCount ? "back" : "front";
}
