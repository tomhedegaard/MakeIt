# Plan — middleware default-deny

**Spec:** [`2026-09-01-middleware-default-deny.md`](../specs/2026-09-01-middleware-default-deny.md)
**Base:** `main` @ `f7f268c` · **branch:** `cursor/middleware-default-deny-9321`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [ ] Spec + this plan

## Commit 2 — helper + tests

- [ ] `src/lib/auth/public-paths.ts` — `isPublicPath` / `needsAuth` (pure)
- [ ] `src/lib/auth/public-paths.test.ts` — listed paths + `(app)` filesystem walk

## Commit 3 — wire middleware

- [ ] `src/middleware.ts` uses the helper; matcher still skips `api/`
- [ ] Demo cookie session unchanged (`mi_session`)
- [ ] `docs/PLATFORM_OVERVIEW.md` §3.2 matches the invert

## Verify

- [ ] `npm test`
- [ ] Unauthenticated `/mind` → `/login`; `/` and `/login` stay 200
- [ ] Demo `MUNK-01` still reaches `/dashboard`
- [ ] No `db:push`, no merge to `main`, no secret rotation
