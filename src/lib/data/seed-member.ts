/**
 * Starter-session seed — retired for connected members.
 *
 * Used to upsert STR-12 · week 4 · DELOAD with invented squat numbers
 * whenever a member had zero sessions. That looked like personal truth
 * for a brand-new invite user (0 streak, no wearable). Trust break.
 *
 * Real programs come from onboarding (`completeOnboardingAction` →
 * `generateProgram`). Demo mode (`!SUPABASE_ENABLED`) still uses the
 * in-memory TODAY_SESSION fixture and is labeled in the app chrome.
 *
 * Kept as a no-op so existing call sites do not invent a new backend.
 */
export async function ensureMemberStarter(_memberId: string): Promise<void> {
  return;
}
