# mental_sessions RLS — personal rows owner-only

**Date:** 2026-08-30 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/mental-sessions-rls-privacy-85fd` against `main` @ `e0d9228`
**Out of scope:** privacy-policy rewrite, Art.20 export, invite-gate, CRON_SECRET, module-subscription branch, CI, live `db:push`, push/mail notify, owner INSERT for personal rows

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `e0d9228` (after fast-forward from stale local `f4339e1`):

| Claim | Evidence |
|---|---|
| `mental_sessions` has no `member_id` / `is_personal` column | `0046_mental_health_pillar_v0.sql` 117–136; `database.types.ts` `mental_sessions.Row` |
| Personal rows are keyed by slug `personal-<memberId>-<YYYY-MM-DD>` | `src/lib/data/mind.ts` `getTodayPersonalSession` / `persistPersonalSession`; pillar spec §7 MH-4 |
| Blanket SELECT: any authenticated member | `0046` policy `mental_sessions_authed_read` `USING (auth.role() = 'authenticated')` |
| `body_md` and `prompt_seed` sit on the same row | table DDL + persist upsert |
| Journal is owner-only | `0046` `journal_entries_owner_all` — no coach/Munk SELECT |
| Writes are Munk-only, not too open | `mental_sessions_munk_write` `FOR ALL` via `is_current_user_munk()`. No member INSERT |
| `FOR ALL` also grants Munk SELECT of personal scripts | Postgres `FOR ALL` includes SELECT. No coach UI reads `mental_sessions` (`src/app/coach/**` has zero refs) |
| Persist path is user-scoped, not service-role | `persistPersonalSession` → `createClient()`. Demo returns `{ id: demo-personal-<date> }` without DB |
| Non-Munk persist already fails RLS; today page falls back to ephemeral | `mind/today/page.tsx` 92–114. Pre-existing; not in this PR |
| Cron `mental-coach-daily` writes `mental_coach_outputs`, not `mental_sessions` | `src/app/api/cron/mental-coach-daily/route.ts` |
| Library runner can load any slug, including `personal-*` | `getSessionBySlug` + `/mind/sessions/[slug]` — leak path in the app |
| Hero/library slugs never start with `personal-` | seeds in 0046/0048/0049 + `mock.ts` `HERO_SEEDS` |
| Coach UI does not require personal-script read | no `getTodayPersonalSession` / `body_md` / `prompt_seed` under `/coach` |
| Migration collision | All remotes: max is `0057`. `0058` is free. Never edit 0046 |

---

## 1. Problem

`mental_sessions` was modelled as a shared catalog. Personal daily scripts were later stored in the same table. The SELECT policy was never split.

Any authenticated member can `SELECT` another member’s `personal-<memberId>-<date>` row — including `body_md` and `prompt_seed` — via the browser client or `/mind/sessions/<slug>`.

---

## 2. Decision

**Split SELECT into two policies keyed on the existing slug. Recast Munk `FOR ALL` to INSERT/UPDATE/DELETE so writes stay Munk-only but implicit SELECT of personal scripts closes. Owner-only for personal rows. No new column. No coach-read.**

Rejected alternatives (one line each):

- Add `member_id` / `is_personal` — cleaner long-term, but a backfill + type regen for a column the slug already encodes. Prefer the existing key.
- Key off `is_hero = false` — table comment says non-hero = personal, but a flipped flag would leak; slug prefix is the insert contract.
- Add coach/Munk SELECT of personal scripts — no UI requires it; journal is owner-only; default is owner-only.
- Add member INSERT for personal rows — writes are not too open; persist already has an ephemeral fallback. Would widen the PR.

SQL policy is the source of truth. The slug/ownership rule is also expressed in a pure TS helper so the intent is unit-tested.

---

## 3. Behaviour

### A. SELECT

Drop `mental_sessions_authed_read`.

1. **`mental_sessions_library_read`** — `FOR SELECT`  
   `auth.role() = 'authenticated' AND slug NOT LIKE 'personal-%'`  
   Shared hero/library rows stay readable by every authenticated member (including coaches).

2. **`mental_sessions_personal_owner_read`** — `FOR SELECT`  
   `auth.uid() IS NOT NULL AND slug LIKE ('personal-' || auth.uid()::text || '-%')`  
   Personal rows are owner-only.

Malformed `personal-*` slugs match neither policy → deny (fail-closed).

### B. Writes

Who can mutate does not change: only Munk (plus service-role on cron/webhook paths, unused for this table today).

`mental_sessions_munk_write` is recast from `FOR ALL` to INSERT + UPDATE + DELETE with the same `is_current_user_munk()` predicate, so Munk no longer gains SELECT of personal scripts through the write policy.

### C. App / demo

- `personalSessionSlug` / `canAuthenticatedReadMentalSession` live in `src/lib/mind/session-privacy.ts`.
- Data layer builds personal slugs via the helper. `getSessionBySlug(slug, viewerId)` returns `null` when the helper denies (defense in depth; RLS still enforces).
- Demo mode: no service-role. `getTodayPersonalSession` / `getHeroSessions` / `getSessionBySlug` keep their `!SUPABASE_ENABLED` mock/null branches. Persist still returns a demo id.

No user-facing copy changes. No i18n keys.

---

## 4. Migration

`supabase/migrations/0058_mental_sessions_personal_rls.sql`

Do not edit 0046 in place. Do not `db:push` live.

---

## 5. Done when

- `npm test` passes
- PR against `main`
- PR body states verified vs assumed; confirms no merge and no `db:push`
- `0058` has no collision across remotes
