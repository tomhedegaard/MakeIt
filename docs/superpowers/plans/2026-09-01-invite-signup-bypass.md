# Plan — residual anon signUp invite-bypass

**Spec:** [`2026-09-01-invite-signup-bypass.md`](../specs/2026-09-01-invite-signup-bypass.md)
**Base:** `main` @ `cf2940e` · **branch:** `cursor/invite-signup-bypass-f98f`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [x] Spec + this plan

## Commit 2 — pure helper + tests

- [x] `src/lib/invite-gate.ts` — `alreadyAdmitted` on `decideInviteConsume`
- [x] `src/lib/invite-gate.test.ts`

## Commit 3 — migration 0059

- [x] `supabase/migrations/0059_invite_consumed_gate.sql`
- [x] Hand-edit `database.types.ts` (no `db:types --linked`)

## Commit 4 — wire consume + layouts

- [x] `src/lib/data/invites.ts` — RPC first, service-role fallback only if function missing
- [x] `src/app/login/actions.ts` — signup metadata; un-admitted password sign-in
- [x] `src/app/auth/callback/route.ts` — admitted probe
- [x] `src/lib/auth.ts` + app/coach/onboarding gates — leftover Auth user → sign out

## Verify

- [x] `npm test` — 700 passed + 3 skipped (2026-09-01)
- [x] Demo path: `/login` without Supabase → `MUNK-01` → `/dashboard` → `/coaching` (browser, 2026-09-01)
- [x] No `db:push`, no merge to `main`, no secret rotation
- [x] PR states live apply waits for Tom; dashboard signup-disable is optional and is **not** a substitute (would block official OTP/OAuth)
