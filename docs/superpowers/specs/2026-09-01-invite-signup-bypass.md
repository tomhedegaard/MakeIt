# Closed-beta residual — anon `signUp` bypasses invite gate

**Date:** 2026-09-01 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/invite-signup-bypass-f98f` against `main` @ `cf2940e`
**Out of scope:** CI, cron alerting, waitlist service-role, module billing, middleware (PR #45 done), privacy copy, live `db:push`, merge to `main`, secret rotation

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `cf2940e` after `git fetch --all --prune` and fast-forward. PR #41 (`fe7e284`) and PR #45 (`cf2940e`) are merged.

| Claim | Evidence |
|---|---|
| `handle_new_user` still inserts `public.members` on **any** `auth.users` insert; no invite check | `0001_init.sql` 218–255. `rg handle_new_user supabase/migrations` → only 0001. Never replaced. |
| Login / OAuth UI calls `is_invite_valid` and consumes via service-role after the user exists | `login/actions.ts` `requireValidConnectedInvite`; `src/lib/data/invites.ts`; `/auth/callback` |
| Direct `supabase.auth.signUp({ email, password })` with the **public anon key** creates `auth.users` without touching Next actions | Supabase Auth is a public API on the project URL. Our gate lives in server actions, not in Auth. |
| A members row + JWT is full app access | `getSession()` returns any `members` row (`auth.ts` 61–79). `(app)/layout.tsx` and `coach/layout.tsx` only check that. Middleware (PR #45) checks the Auth user, not invite. RLS: `members` readable to all authenticated; writes on own tables are `member_id = auth.uid()`. |
| Existing consume is idempotent on `used_by = this user`; new-user window is 7 days | `invites.ts` 52; `invite-gate.ts` `NEW_AUTH_USER_WINDOW_MS` / `decideInviteConsume` |
| `invite_codes.used_by` FK references `members(id)` | `0001_init.sql` 28 — a members row **must** exist before consume can set `used_by`. Cannot skip the insert. |
| Migration collision: every `origin/*` maxes at `0058`. `0059` is free. 0057 and 0058 are on `main`. Never edit 0001/0002 | `git ls-tree` across every remote branch |
| Demo codes live only in `auth.ts`; `MockForm` iff `!SUPABASE_ENABLED` | unchanged since PR #41 |

PR #41 **accepted this residual in writing** (spec §2: "raw `signUp` via the public anon key stays a residual"). It is no longer accepted.

---

## 1. Problem

A client that only has the anon key can:

1. `supabase.auth.signUp({ email, password })` → `auth.users` row.
2. `handle_new_user` creates `public.members` with no invite.
3. Session JWT + members row → `getSession()` succeeds → full member (dashboard, RLS writes, crew read).

The Next.js login form is not on that path. Magic-link confirm and OAuth callback that already consumed an invite are not the bug; the bug is provisioning on insert.

---

## 2. Decision

**Fail closed in the database.** New `members` rows start un-admitted (`invite_consumed_at` null). Admission happens only when a valid invite is consumed — in `handle_new_user` if `raw_user_meta_data.invite` is a live code, or via a new `consume_invite` SECURITY DEFINER RPC. Existing members are backfilled as admitted. Restrictive RLS hides every authenticated table from the un-admitted JWT.

`handle_new_user` **must** still insert a members row: `invite_codes.used_by` FKs to `members`, and Auth/app code assumes the profile exists. Deleting or banning the `auth.users` row in the trigger would abort OAuth (no metadata at insert) and magic-link confirm. Rejected.

Dashboard "disable signups" is **not** a substitute: it also blocks official `signInWithOtp` / OAuth for new emails. Optional Tom step only — see PR body. The DB path ships regardless.

Rejected alternatives (one line each):

- App-only flag check in `getSession` — bypass client talks to PostgREST with the JWT; RLS still admits `auth.uid()`.
- Raise in `handle_new_user` without invite metadata — rolls back `auth.users` insert; breaks OAuth and OTP user-create.
- Client RLS on `invite_codes` — same reject as PR #41.
- Treat demo codes as valid in connected mode — forbidden.
- Edit 0001/0002 in place — house rule.

---

## 3. Behaviour

### A. Schema (migration `0059`, not applied live)

- `members.invite_consumed_at timestamptz null`.
- Backfill: every **existing** row gets `coalesce(joined_at, now())`. Nobody who already has a members row is locked out.
- Protect trigger: clients cannot set the column. Only `makeit.allow_invite_consume=1` (set by our SECURITY DEFINER functions) or `postgres` / `service_role` / `supabase_admin`.

### B. `handle_new_user` (replaced in 0059, trigger kept)

Same handle derivation as 0001. Insert members with `invite_consumed_at = null`. If `raw_user_meta_data.invite` (or `invite_code`) normalises to a currently valid code, consume it in-function and stamp `invite_consumed_at`. Same-user replay (`used_by = new.id`) stamps without incrementing. Invalid / missing metadata → row stays un-admitted. Never raises (OAuth/OTP must succeed).

### C. `consume_invite(p_code)` SECURITY DEFINER

Granted to `authenticated` only (not `anon`). Uses `auth.uid()`.

1. No jwt → `false`.
2. Already admitted → `true` (do not burn another use).
3. `used_by = this user` → stamp flag, `true`.
4. Expired or `uses_count >= max_uses` → `false`.
5. Else increment + `used_by` / `used_at` with optimistic `uses_count` match; stamp flag; no row → `false`.

`is_current_user_invite_admitted()` SECURITY DEFINER STABLE: `invite_consumed_at is not null` for `auth.uid()`.

### D. Restrictive RLS

`AS RESTRICTIVE … TO authenticated` on every `public` table that already has RLS **except** `invite_codes` (still service-role / SECURITY DEFINER only). Same restrictive policy on `storage.objects` so an un-admitted JWT cannot upload form-check / chat media.

Service-role bypasses RLS (crons, webhooks). Anon policies (science public read, exercise-demo public bucket) unchanged.

### E. App wiring (works with and without 0059 applied)

Until Tom runs `db:push`, the new column/RPC/RLS do not exist live. Official signup must keep working.

- Password **signup** passes `options.data: { invite: code }` so the trigger can admit atomically after apply. `emailRedirectTo` unchanged.
- Magic OTP does **not** put the invite in user metadata (user is created when the mail is sent; consuming there would burn codes on abandoned inboxes). Callback still consumes.
- OAuth still stashes the cookie; callback consumes.
- `consumeInviteForUser`: try `consume_invite` RPC first. Missing function → existing service-role `invite_codes` UPDATE (PR #41). Other RPC errors → `null` (fail closed). Do not fall through to service-role after a real `false`.
- `decideInviteConsume` gains `alreadyAdmitted?: boolean | null`. `true` → allow. `false` → consume or reject (no 7-day escape). `null` / omitted → current 7-day window (pre-migration and RPC-down).
- Callback reads admitted via `is_current_user_invite_admitted`; missing RPC → `null`.
- Password **sign-in** of an un-admitted JWT: `members` select on the same client returns no row after RLS → `signOut` + `/login?err=invite`.
- `(app)` / coach / onboarding layouts: if `getSession()` is null and an Auth user exists, `signOut` + `/login?err=invite` so a leftover bypass cookie does not bounce.
- `getSession` does **not** select `invite_consumed_at` (deploy-before-push would 400 every page). After apply, restrictive RLS makes the row invisible → same as null.

### F. Demo mode

Unchanged. `mockLoginAction`, `isValidMockInvite`, `MUNK-01` → `/dashboard`. No service-role on demo paths. No service-role in client components.

### G. i18n

Reuse `Login.errors.invite` (`da` / `en`). No new copy.

---

## 4. Modules

| File | Role |
|---|---|
| `supabase/migrations/0059_invite_consumed_gate.sql` | Column, backfill, protect trigger, replace `handle_new_user`, RPCs, restrictive RLS |
| `src/lib/invite-gate.ts` + `.test.ts` | `alreadyAdmitted` on `decideInviteConsume` |
| `src/lib/data/invites.ts` | RPC consume + admitted probe; service-role fallback only if RPC missing |
| `src/app/login/actions.ts` | Signup metadata; un-admitted sign-in reject |
| `src/app/auth/callback/route.ts` | Pass admitted into `decideInviteConsume` |
| `src/lib/auth.ts` | Sign-out leftover Auth user when no member session |
| `src/app/(app)/layout.tsx`, `coach/layout.tsx`, `onboarding/page.tsx` | Use the leftover-session helper |
| `src/lib/supabase/database.types.ts` | Hand-edit column + two functions (`db:types --linked` would touch live) |

---

## 5. Tests

Vitest on the pure module (existing style).

- `alreadyAdmitted: true` → allow, even with no invite (magic/OAuth confirm after trigger consume).
- `alreadyAdmitted: false` + invite → consume, even if `created_at` is older than 7 days (bypass account later presenting a real code).
- `alreadyAdmitted: false` + no invite → reject.
- `alreadyAdmitted` omitted / `null` → existing 7-day behaviour (pre-migration).
- Dummy 4+ char still not admitted without RPC `true`. Demo codes not special-cased.

`npm test` must pass.
