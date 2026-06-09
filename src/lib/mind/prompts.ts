/**
 * Journaling prompt rotation. Weighted by today's mind-check signal —
 * high stress steers toward grounding/gratitude, low energy toward
 * compassion, otherwise rotation by ISO day-of-year.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §6
 */

import type { MindCheckLog } from "./types";

export type PromptKey =
  | "best_of_day"
  | "training_takeaway"
  | "worry_now"
  | "thank_someone"
  | "proud_of"
  | "self_message"
  | "freeform"
  | "ground_breath"
  | "compassion_tired";

export const PROMPTS: Record<PromptKey, string> = {
  best_of_day: "Hvad var bedst ved i dag?",
  training_takeaway: "Hvad tager du med fra dagens træning?",
  worry_now: "Hvad bekymrer dig lige nu?",
  thank_someone: "Hvem hjalp dig — og fortjener tak?",
  proud_of: "En ting du er stolt af denne uge.",
  self_message:
    "Hvis du kunne sige noget til dig selv fra i morges, hvad ville det være?",
  freeform: "Skriv frit.",
  ground_breath: "Tre lange åndedrag. Hvad mærker du nu i kroppen?",
  compassion_tired:
    "Hvad ville en god ven sige til dig, hvis de vidste hvor træt du er?",
};

const ROTATION: PromptKey[] = [
  "best_of_day",
  "training_takeaway",
  "worry_now",
  "thank_someone",
  "proud_of",
  "self_message",
  "freeform",
];

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

/**
 * Pick today's prompt. If the latest mind-check shows high stress,
 * skew to grounding. If low energy, skew to compassion. Otherwise
 * use the deterministic day-of-year rotation.
 */
export function pickPromptForToday(
  todayMindCheck: Pick<MindCheckLog, "energy" | "stress"> | null,
  today: Date = new Date(),
): { key: PromptKey; text: string } {
  if (todayMindCheck) {
    if (todayMindCheck.stress >= 4) {
      return { key: "ground_breath", text: PROMPTS.ground_breath };
    }
    if (todayMindCheck.energy <= 2) {
      return { key: "compassion_tired", text: PROMPTS.compassion_tired };
    }
  }
  const idx = dayOfYear(today) % ROTATION.length;
  const key = ROTATION[idx] ?? "freeform";
  return { key, text: PROMPTS[key] };
}
