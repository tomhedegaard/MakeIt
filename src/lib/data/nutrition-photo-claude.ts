/**
 * Claude multimodal meal-photo grader.
 *
 * STUB — full implementation lands in commit 3 of the nutrition
 * feature. Returns null so the log-action skips grading until the AI
 * is wired. Signature locked.
 */
import "server-only";

export type MealPhotoGrade = {
  matchScore: number;
  proteinEstimate: "low" | "on_target" | "high";
  aiHeadline: string;
  aiNotes: string;
};

export type MealPhotoGradeOpts = {
  photoBase64: string;
  mimeType: string;
  plannedTitle: string;
  plannedIngredients: Array<{ name: string }>;
};

export async function gradeMealPhoto(opts: MealPhotoGradeOpts): Promise<MealPhotoGrade | null> {
  void opts;
  return null;
}
