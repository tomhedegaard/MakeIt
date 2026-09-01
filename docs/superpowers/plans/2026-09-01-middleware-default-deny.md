# Plan — middleware default-deny

**Spec:** [`2026-09-01-middleware-default-deny.md`](../specs/2026-09-01-middleware-default-deny.md)
**Base:** `main` @ `f7f268c` · **branch:** `cursor/middleware-default-deny-9321`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [x] Spec + this plan

## Commit 2 — helper + tests

- [x] `src/lib/auth/public-paths.ts` — `isPublicPath` / `needsAuth` (pure)
- [x] `src/lib/auth/public-paths.test.ts` — listed paths + `(app)` filesystem walk

## Commit 3 — wire middleware

- [x] `src/middleware.ts` uses the helper; matcher still skips `api/`
- [x] Demo cookie session unchanged (`mi_session`)
- [x] `docs/PLATFORM_OVERVIEW.md` §3.2 matches the invert

## Verify

- [x] `npm test` — 696 passed | 3 skipped
- [x] Unauthenticated `/mind` → 307 `/login?next=/mind`; `/` and `/login` stay 200
- [x] Demo `mi_session=MUNK-01` reaches `/dashboard` 200; `/science/feed.json` 200; `/api/settings/export` 401 (own auth)
- [x] No `db:push`, no merge to `main`, no secret rotation
