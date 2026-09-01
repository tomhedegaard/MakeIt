# Middleware default-deny — public allowlist

**Date:** 2026-09-01 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/middleware-default-deny-9321` against `main` @ `f7f268c`
**Out of scope:** invite residual anon signUp, CI, waitlist service-role, cron alerting, module billing, privacy copy, `middleware.ts` → `proxy.ts` rename, live `db:push`, merge to `main`, secret rotation

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `f7f268c` (PR #44 cron auth is merged). `src/middleware.ts` still uses a positive `PROTECTED` list. Matcher skips `_next/static`, `_next/image`, `favicon.ico`, `api/`, and image extensions. Crons and Stripe webhook stay matcher-skipped and self-auth. `/api/settings/export` is also matcher-skipped and already calls `getSession()`.

`(app)/layout.tsx` and `coach/layout.tsx` call `getSession()` and redirect, so current pages are not open today. There is no test that fails when someone adds `src/app/foo/page.tsx` outside the `(app)` group.

| Path | In `PROTECTED` today? | Intended |
|---|---|---|
| `/dashboard` `/coaching` `/community` `/reps` `/profile` `/session` `/onboarding` `/coach` `/billing` `/settings` `/train` | yes | member/coach |
| `/mind` `/hrv` `/nutrition` `/messages` `/buddy` `/science` `/coach-school` `/program` | **no** | member (journal, biometrics, DM, …) |
| `/` `/login` `/privacy` `/terms` | no | public |
| `/#waitlist` (same page as `/`) | no | public |
| `/science/feed.json` `/science/feed.xml` | no | public feeds (outside `(app)`) |
| `/auth/callback` | no | public (code exchange) |
| `/.well-known/*` `/manifest.webmanifest` `/sw.js` `/offline.html` | no | public PWA / AASA |

Next.js 16.2 deprecates `middleware.ts` in favour of `proxy.ts` (rename only). This PR keeps `src/middleware.ts` — house pattern, production already runs it. The classifier is a pure module so a later rename is mechanical.

Matcher investigation: a matcher that lists only protected prefixes cannot default-deny a new `src/app/foo/page.tsx`. Inverting inside the existing matcher (skip `api/` + static, public allowlist, everything else requires a session) does that without 401'ing marketing or PWA, **if `/` is exact-match only**.

---

## 1. Problem

A positive protected list is right for a marketing site. Wrong default for an app with journal and biometrics. The forgotten member routes are only safe because the `(app)` layout redirects — a new page outside that group ships open.

---

## 2. Decision

**Default-deny in middleware: public allowlist, everything else in the matcher requires a session.**

`/` is exact-match. `/science` stays protected (member UI). Only `/science/feed.json` and `/science/feed.xml` are public. `/api` is **not** on the public list and stays matcher-skipped — no hole that lets `/api/settings/export` through without its own session check.

Rejected alternatives (one line each):

- Expand `PROTECTED` to every current app route + a scan test — still a positive list; a page outside `(app)` is forgotten again.
- Matcher that enumerates protected prefixes — cannot default-deny unknown paths; `/` is awkward.
- Rename to `proxy.ts` in this PR — out of scope; same logic either file.

---

## 3. Behaviour

`src/lib/auth/public-paths.ts` (pure):

- `isPublicPath(pathname)` / `needsAuth(pathname)`.
- Trailing slash normalised except for `/`.
- Public exact: `/`, `/manifest.webmanifest`, `/sw.js`, `/offline.html`, `/hrv-ppg-probe.html`, `/science/feed.json`, `/science/feed.xml`.
- Public prefixes: `/login`, `/privacy`, `/terms`, `/auth`, `/.well-known`, `/_next`.
- `/science` is not a prefix of the feeds. `/api` is never public.

`src/middleware.ts` asks the helper. Supabase mode still refreshes cookies on every matched request, then redirects unauthenticated non-public paths to `/login?next=`. Demo mode still admits `mi_session` on protected paths. `MUNK-01` still lands on `/dashboard`.

Matcher unchanged: skip `api/`, `_next/static`, `_next/image`, favicon, image extensions.

Dual mode: no new service-role, no schema change.

---

## 4. Tests

`src/lib/auth/public-paths.test.ts`:

1. Public: `/`, `/login`, `/privacy`, `/terms`, `/science/feed.json`, `/science/feed.xml`, `/auth/callback`, `/.well-known/apple-app-site-association`, `/manifest.webmanifest`.
2. Protected: `/mind`, `/hrv`, `/nutrition`, `/messages`, `/buddy`, `/science`, `/coach-school`, `/program/foo`, `/dashboard`, `/api/settings/export`.
3. `/` is not a prefix of `/mind`.
4. Filesystem walk of every `page.tsx` under `src/app` (route groups stripped): paths other than `/`, `/login`, `/privacy`, `/terms` must `needsAuth`. A new `(app)` page is therefore protected; adding it to the public list without updating the known-public set fails the test.

---

## 5. i18n / migration

None. Redirect target is existing `/login`. No schema change. No new service-role.
