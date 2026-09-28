/**
 * House rule: no dashes (— or –) in copy. The model is told so, but a
 * small model still slips, so the answer is tidied where it is shown:
 * a dash between words becomes a comma, which reads right in Danish and
 * English alike ("A human—Munk—signs off" → "A human, Munk, signs off").
 */
export function tidyAnswer(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*([.!?])/g, "$1");
}
