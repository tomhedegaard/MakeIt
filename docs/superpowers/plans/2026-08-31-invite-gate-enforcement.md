# Plan — closed-beta invite-gate enforcement

**Spec:** [`2026-08-31-invite-gate-enforcement.md`](../specs/2026-08-31-invite-gate-enforcement.md)
**Base:** `main` @ `64e0076` · **branch:** `cursor/invite-gate-enforcement-c826`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [ ] Spec + this plan

## Commit 2 — pure helper + tests

- `src/lib/invite-gate.ts`
- `src/lib/invite-gate.test.ts`

## Commit 3 — data glue + wire actions/callback

- `src/lib/data/invites.ts` (`server-only`; validate via existing RPC; consume via service-role)
- `src/app/login/actions.ts` — RPC gate on magic / signup / OAuth; consume on immediate-session signup; `mockLoginAction` untouched
- `src/app/auth/callback/route.ts` — fail-closed consume for new users; skip for existing
- Do not touch `src/lib/auth.ts` demo split, `login/page.tsx` MockForm branch, or `getSession()`

## Verify

- `npm test`
- Demo path: `/login` without Supabase → `MUNK-01` → `/dashboard`
- No `db:push`, no merge to `main`, no secret rotation
- No new migration (0059 left free)
