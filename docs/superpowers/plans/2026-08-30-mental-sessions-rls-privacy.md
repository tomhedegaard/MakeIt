# Plan — mental_sessions RLS privacy

**Spec:** [`2026-08-30-mental-sessions-rls-privacy.md`](../specs/2026-08-30-mental-sessions-rls-privacy.md)
**Base:** `main` @ `e0d9228` · **branch:** `cursor/mental-sessions-rls-privacy-85fd`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [ ] Spec + this plan

## Commit 2 — pure helper + tests

- `src/lib/mind/session-privacy.ts`: slug builder, parse, `isPersonalSessionSlug`, `canAuthenticatedReadMentalSession`
- `src/lib/mind/session-privacy.test.ts`
- Wire helper into `mind.ts` slug construction + `getSessionBySlug(slug, viewerId)` deny
- `mind/today/page.tsx` uses the builder (no hardcoded `personal-${id}-${date}` if we touch that line)

## Commit 3 — migration 0058

- Drop `mental_sessions_authed_read`
- Add `mental_sessions_library_read` + `mental_sessions_personal_owner_read`
- Recast `mental_sessions_munk_write` to INSERT/UPDATE/DELETE (same Munk predicate)
- Table comment updated. Do not edit 0046.

## Verify

- `npm test`
- Demo path: `/mind/today` + `/mind/sessions` without service-role
- No `db:push`, no merge to `main`
