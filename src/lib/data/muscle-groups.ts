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
import type { RnbhSlug, AnatomyView } from "./anatomy/paths";

export type MuscleGroup =
  // Front view
  | "neck"
  | "chest"
  | "front_delts"
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "adductors"
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

export type { AnatomyView } from "./anatomy/paths";

export type MuscleTier = "primary" | "secondary" | "tertiary";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  neck: "Nakke",
  chest: "Bryst",
  front_delts: "Skuldre (front)",
  biceps: "Biceps",
  forearms: "Underarme",
  abs: "Mavemuskler",
  obliques: "Skrå mave",
  adductors: "Inderlår",
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
  "adductors",
  "quads",
  "calves_front",
];

export const BACK_MUSCLES: MuscleGroup[] = [
  "neck",
  "traps",
  "rear_delts",
  "triceps",
  "forearms",
  "lats",
  "lower_back",
  "glutes",
  "adductors",
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

/**
 * Map an upstream rnbh slug to our MuscleGroup, with view-context
 * because `deltoids` means anterior delts from the front and
 * posterior delts from the back. Slugs that aren't real muscle
 * groups (joints, extremities, hair) map to null so the renderer
 * tints them as part of the body silhouette without ever lighting
 * them up.
 */
export function slugToMuscle(
  slug: RnbhSlug,
  view: AnatomyView,
): MuscleGroup | null {
  switch (slug) {
    case "abs":
      return "abs";
    case "adductors":
      return "adductors";
    case "biceps":
      return "biceps";
    case "calves":
      return "calves_back";
    case "chest":
      return "chest";
    case "deltoids":
      return view === "front" ? "front_delts" : "rear_delts";
    case "forearm":
      return "forearms";
    case "gluteal":
      return "glutes";
    case "hamstring":
      return "hamstrings";
    case "lower-back":
      return "lower_back";
    case "neck":
      return "neck";
    case "obliques":
      return "obliques";
    case "quadriceps":
      return "quads";
    case "tibialis":
      return "calves_front";
    case "trapezius":
      return "traps";
    case "triceps":
      return "triceps";
    case "upper-back":
      return "lats";
    case "ankles":
    case "feet":
    case "hair":
    case "hands":
    case "head":
    case "knees":
      return null;
  }
}
