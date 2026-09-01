# Plan — cron-auth fail-closed

**Spec:** [`2026-09-01-cron-auth-fail-closed.md`](../specs/2026-09-01-cron-auth-fail-closed.md)
**Base:** `main` @ `a3e4696` · **branch:** `cursor/cron-secret-fail-closed-d742`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [ ] Spec + this plan

## Commit 2 — helper + tests

- `src/lib/cron/auth.ts` — `isCronAuthorized` (pure) + `assertCronAuth` (401 | null)
- `src/lib/cron/auth.test.ts` — missing, empty, wrong bearer, correct bearer

## Commit 3 — wire all 16 routes

- Every `src/app/api/cron/*/route.ts` calls `assertCronAuth(request)` and returns the 401 if present
- Includes `coach-digest` and `streak-milestone-nudge` (already fail-closed; switch so there is one path)
- Do not change schedules, work bodies, or service-role usage

## Verify

- `npm test`
- No `db:push`, no merge to `main`, no secret rotation
