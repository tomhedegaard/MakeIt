/**
 * Synthetic / script-seeded programs must never appear in the member
 * library or be self-assigned. Coach admin and the adaptive-demo seed
 * may still hold the row (unpublished) so cron e2e keeps working.
 *
 * Prefix matches `scripts/seed-adaptive-demo.mjs` (`ADAPTIVE-DEMO-STR`
 * today; future `ADAPTIVE-DEMO-*` variants stay denylisted).
 */

export const SYNTHETIC_PROGRAM_CODE_PREFIX = "ADAPTIVE-DEMO";

export function isSyntheticProgramCode(
  code: string | null | undefined,
): boolean {
  if (!code) return false;
  return code.trim().toUpperCase().startsWith(SYNTHETIC_PROGRAM_CODE_PREFIX);
}

export function excludeSyntheticPrograms<T extends { code: string }>(
  programs: readonly T[],
): T[] {
  return programs.filter((p) => !isSyntheticProgramCode(p.code));
}

/** Member self-assign policy used by `startProgramAction`. */
export function canMemberAssignProgram(opts: {
  code: string;
  isPublished: boolean;
}): boolean {
  return opts.isPublished && !isSyntheticProgramCode(opts.code);
}
