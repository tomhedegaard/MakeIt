/**
 * Words member-facing food and body copy never uses (spec 2026-09-27 §S):
 * no moral words about food, no exercise as payment, no "remaining", and
 * no target-weight language. Shared by every copy gate on these surfaces.
 */
export const FORBIDDEN_DA =
  /\b(snyd|synd|cheat|fortjent|brænd\w* (det|den) af|usund|dårlig mad|god mad|tilbage i dag|kcal tilbage|kg tilbage|slank|tab dig|forbudt|målvægt|idealvægt|ideal|fedtprocent)\b/i;
export const FORBIDDEN_EN =
  /\b(cheat|sinful|guilt|earn(ed)? it|burn it off|junk|bad food|good food|remaining|calories left|kg to go|slim|lose weight|forbidden|goal weight|target weight|ideal weight|body fat)\b/i;
