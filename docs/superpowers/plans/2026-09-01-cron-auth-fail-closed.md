# Plan — cron-auth fail-closed

**Spec:** [`2026-09-01-cron-auth-fail-closed.md`](../specs/2026-09-01-cron-auth-fail-closed.md)
**Base:** `main` @ `a3e4696` · **branch:** `cursor/cron-secret-fail-closed-d742`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [x] Spec + this plan

## Commit 2 — helper + tests

- [x] `src/lib/cron/auth.ts` — `isCronAuthorized` (pure) + `assertCronAuth` (401 | null)
- [x] `src/lib/cron/auth.test.ts` — missing, empty, wrong bearer, correct bearer

## Commit 3 — wire all 16 routes

- [x] Every `src/app/api/cron/*/route.ts` calls `assertCronAuth(request)` and returns the 401 if present
- [x] Includes `coach-digest` and `streak-milestone-nudge` (already fail-closed; switch so there is one path)
- [x] Do not change schedules, work bodies, or service-role usage

## Verify

- [x] `npm test` — 665 passed | 3 skipped (includes 10 new cron-auth tests)
- [x] No `db:push`, no merge to `main`, no secret rotation
