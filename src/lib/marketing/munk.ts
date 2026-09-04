/**
 * Public Munk presence — only facts already in repo copy.
 *
 * Known (from messages/Email welcome + Marketing crew/form-check):
 *   - Name: Mikael Munk
 *   - Role: head coach in the crew
 *   - Reviews form-checks personally; AI drafts do not go out unsigned
 *   - Invite codes come from him or an existing crew member
 *   - Reachable at COMPANY.emails.headCoach and @Munk in the feed
 *   - Company city: København (COMPANY.legal.address)
 *
 * Missing approved asset: a portrait of Mikael Munk. Do not invent
 * a photo, biography, years of experience, or achievements.
 * When an approved image exists, set MUNK_PORTRAIT_SRC to its
 * public path and render it from MunkSection.
 */
export const MUNK_PORTRAIT_SRC: string | null = null;

export const MUNK_HANDLE = "Munk";
