/**
 * Parse / clamp helpers for the session set-log stepper.
 * Accepts both "." and "," so Danish members can type 82,5.
 * Incomplete tokens ("", "82.") stay uncommitted so typing a decimal
 * does not snap the value mid-keystroke.
 */
export function parseStepperNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed === "." ||
    trimmed === "-." ||
    trimmed.endsWith(".")
  ) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function normalizeStepperNumber(
  n: number,
  min: number,
  max: number,
  step: number,
): number {
  const quantized = Number.isInteger(step) ? Math.round(n) : +n.toFixed(2);
  return Math.min(max, Math.max(min, quantized));
}

export function formatStepperNumber(n: number): string {
  return String(+n.toFixed(2));
}

export function commitStepperInput(
  raw: string,
  min: number,
  max: number,
  step: number,
): number | null {
  const parsed = parseStepperNumber(raw);
  if (parsed === null) return null;
  return normalizeStepperNumber(parsed, min, max, step);
}
