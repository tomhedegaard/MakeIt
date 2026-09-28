/**
 * Ownership rule for `mental_sessions` slugs.
 *
 * SQL RLS is the source of truth (migration 0058). This helper exists so
 * the same rule can be unit-tested and applied as defense-in-depth in
 * the data layer. No new column: personal rows are
 * `personal-<memberId>-<YYYY-MM-DD>` (see persistPersonalSession).
 *
 * Spec: docs/superpowers/specs/2026-08-30-mental-sessions-rls-privacy.md
 */

export const PERSONAL_SESSION_SLUG_PREFIX = "personal-";

const PERSONAL_SLUG_RE = /^personal-(.+)-(\d{4}-\d{2}-\d{2})$/;

export function isPersonalSessionSlug(slug: string): boolean {
  return slug.startsWith(PERSONAL_SESSION_SLUG_PREFIX);
}

export function personalSessionSlug(memberId: string, forDate: string): string {
  return `${PERSONAL_SESSION_SLUG_PREFIX}${memberId}-${forDate}`;
}

export function parsePersonalSessionSlug(
  slug: string,
): { memberId: string; forDate: string } | null {
  const match = PERSONAL_SLUG_RE.exec(slug);
  if (!match) return null;
  return { memberId: match[1], forDate: match[2] };
}

/**
 * Mirrors 0058 SELECT policies:
 * - library (slug does not start with `personal-`) → any authenticated viewer
 * - personal-<memberId>-<date> → owner only
 * - malformed `personal-*` → deny (fail-closed; matches neither SQL policy)
 */
export function canAuthenticatedReadMentalSession(args: {
  slug: string;
  viewerId: string;
}): boolean {
  if (!isPersonalSessionSlug(args.slug)) return true;
  const parsed = parsePersonalSessionSlug(args.slug);
  if (!parsed) return false;
  return parsed.memberId === args.viewerId;
}
