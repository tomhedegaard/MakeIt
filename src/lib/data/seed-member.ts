/**
 * Historical seeder. Used to write STR-12 / PR-Block at week four
 * plus a fabricated squat day and three upcoming sessions into live
 * member tables whenever a connected member had zero sessions.
 *
 * That destroyed first-run trust: brand-new invite accounts saw week 4,
 * DELOAD (week % 4 === 0), and invented weights as if they were theirs.
 *
 * Kept as an exported no-op so leftover callers cannot reintroduce the
 * write. Demo mode uses in-memory mocks (`TODAY_SESSION`) instead.
 * Onboarding still generates a real week-1 program from the member profile
 * — that path is honest and is not this seeder.
 */
export function memberStarterWrites(): readonly never[] {
  return [];
}

export async function ensureMemberStarter(memberId: string): Promise<void> {
  void memberId;
}
