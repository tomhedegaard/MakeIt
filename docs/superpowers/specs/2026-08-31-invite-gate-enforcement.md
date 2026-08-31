# Closed-beta invite-gate — enforce in connected mode

**Date:** 2026-08-31 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/invite-gate-enforcement-c826` against `main` @ `64e0076`
**Out of scope:** privacy-policy rewrite, Art.20 export, CRON_SECRET Bearer, middleware default-deny, module-subscription, CI, crisis pipeline, mental_sessions, handle_new_user rewrite, live `db:push`, merge to `main`, secret rotation

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `64e0076` after `git fetch origin main`:

| Claim | Evidence |
|---|---|
| `public.is_invite_valid(p_code)` exists, SECURITY DEFINER, granted to `anon` + `authenticated` | `0002_session_actions.sql` 52–67; `database.types.ts` Functions |
| No TypeScript caller of `is_invite_valid` in `src/` | `rg is_invite_valid src` → only the generated types file |
| Signup / magic / OAuth reject only `code.length < 4` | `src/app/login/actions.ts` 80, 148, 214 |
| `handle_new_user` inserts `members` on any `auth.users` insert; no invite check | `0001_init.sql` 218–255 |
| Callback consume is best-effort and uses the user-scoped client | `src/app/auth/callback/route.ts` 24–27, 60–68 |
| `invite_codes` has RLS on and **no client policies** (service-role only) | `0001_init.sql` 272, 295–296 |
| Authenticated UPDATE therefore cannot consume; failure is silent | no policy + callback does not check the update error |
| Demo codes live only in `auth.ts`; login renders `MockForm` iff `!SUPABASE_ENABLED` | `src/lib/auth.ts` 13–19, 51–53, 82–87; `src/app/login/page.tsx` 60–64 |
| `getSession()` ignores `mi_session` when Supabase is on | `src/lib/auth.ts` 51–53 |
| Migration collision: all remotes max at `0058`. `0059` is free. Never edit 0001/0002 | `git ls-tree` across every `origin/*` |

---

## 1. Problem

The closed-beta invite gate is a form length-check. A visitor with an email and any 4+ character dummy code can start magic-link, password signup, or OAuth. `handle_new_user` then creates a `members` row. Invite consume in the callback cannot write under RLS, so the dummy is never spent.

---

## 2. Decision

**Validate with the existing `is_invite_valid` RPC before creating a user or sending a magic link or starting OAuth. Consume after the auth user exists, via service-role (allowed on the OAuth callback and on the password-signup server-action branch that is not a demo path). Fail closed if the RPC or consume write is down. Demo mode is unchanged.**

Rejected alternatives (one line each):

- New `consume_invite` SECURITY DEFINER RPC (0059) — atomic and clean, but the app would fail-closed on every signup until live `db:push`. This PR must not push. Service-role UPDATE works on the schema that is already live.
- Client RLS on `invite_codes` — would let any authenticated user read/mutate the catalogue. The comment in 0001 says service-role only.
- Change `handle_new_user` to require an invite — invite is not on the JWT; would need `raw_user_meta_data` and still not consume. Widens the PR; raw `signUp` via the public anon key stays a residual (accepted).
- Treat `MUNK-01` et al. as valid in connected mode — leaks the demo split. Forbidden.
- Consume on every OAuth/magic login — the form is a closed-beta gate for returning users (`Login.oauth.intro`); incrementing `uses_count` on every Google login would burn multi-use codes. Consume only for newly created auth users.

---

## 3. Behaviour

### A. Connected-mode validation (before user creation / mail / OAuth)

Call `is_invite_valid` with the normalised code (`trim` + `upper`, matching the SQL).

Paths: `magicLinkAction`, `passwordAction` when `mode === "signup"`, `oauthAction`.

Admit only when the RPC returns JSON `true`. `false`, `null`, error, or missing client → `/login?err=invite`. Same existing i18n key — do not leak "DB down" vs "bad code".

Shape check (`length >= 4`) stays as a cheap first reject. It is **not** sufficient.

Password **sign-in** still does not take an invite (unchanged).

### B. Consume (after the user exists)

Service-role UPDATE on `invite_codes`:

1. If `used_by = this user` → success (idempotent replay).
2. If expired or `uses_count >= max_uses` → fail.
3. Else increment `uses_count`, set `used_by` / `used_at`, guarded by `uses_count` match (optimistic lock). No row updated → fail.

Call consume when `decideInviteConsume` says so: newly created auth user (`created_at` within 7 days) **and** an invite is present. Missing invite on a new user → reject (sign out). Existing user → do not consume (gate was already checked at the action).

Where:

- `/auth/callback` after `exchangeCodeForSession` (magic / confirm / OAuth).
- `passwordAction` signup when `data.session` is returned (email-confirm off).

Consume failure on a new user: `signOut` + `/login?err=invite`. Never best-effort.

Never import or call service-role from `mockLoginAction` or any other demo path.

### C. Demo mode

Unchanged. `mockLoginAction` + `isValidMockInvite`. `MockForm` only when `SUPABASE_ENABLED` is false. `getSession()` still ignores `mi_session` when Supabase is on. Demo codes do not appear in the connected validator.

### D. i18n

Reuse `Login.errors.invite` (`da` / `en`). No new copy.

---

## 4. Modules

| File | Role |
|---|---|
| `src/lib/invite-gate.ts` | Pure: normalise, shape, admit-validation, new-user window, consume decision. Unit-tested. |
| `src/lib/data/invites.ts` | Glue: `is_invite_valid` via user/anon server client; consume via `createServiceClient()`. `server-only`. |
| `src/app/login/actions.ts` | Call validate on connected signup paths; consume on immediate-session signup. |
| `src/app/auth/callback/route.ts` | Consume or reject; no longer silent best-effort UPDATE. |

No migration. `0059` left unused.

---

## 5. Tests

Vitest on the pure module only (existing style: `describe` / `it` / `expect`, no DB).

Cover: dummy 4+ char is not admitted without RPC `true`; RPC `null`/error fail-closed; demo codes are not special-cased; new user without invite → reject; new user with invite → consume; existing user → skip consume; replay (`used_by` same) is admit at the decision layer via idempotent consume result.
