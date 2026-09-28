# Cron-auth fail-closed når CRON_SECRET mangler

**Date:** 2026-09-01 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/cron-secret-fail-closed-d742` against `main` @ `a3e4696`
**Out of scope:** middleware default-deny, invite residual, CI, waitlist service-role, module billing, privacy, mental_sessions, Sentry/pager/alerting, cron-schedule changes, service-role on new paths, live `db:push`, merge to `main`, secret rotation

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `a3e4696` after `git fetch origin main` (PR #42 privacy export is on this head). `vercel.json` lists 16 cron paths; `src/app/api/cron/*/route.ts` has exactly those 16 files. No other `CRON_SECRET` checks in `src/`.

| Route | Auth today | Fail-closed? |
|---|---|---|
| `coach-digest` | `if (!expected \|\| auth !== \`Bearer ${expected}\`)` | **yes** (reference) |
| `streak-milestone-nudge` | same as coach-digest | **yes** (already fixed on main; user list had it as vulnerable on an earlier head) |
| `adapt-program-daily` | `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` | no |
| `draft-form-check-replies` | same | no |
| `mental-coach-daily` | same | no |
| `hrv-wearable-sync` | same | no |
| `coach-morning-report` | same | no |
| `science-feed` | same | no |
| `hrv-alert-detect` | same | no |
| `coach-quality-score` | same | no |
| `buddy-streak-weekly` | same | no |
| `buddy-mental-weekly-checkin` | same | no |
| `mind-check-nudge` | same | no |
| `hrv-weekly-insights` | same | no |
| `mental-weekly-insights` | same | no |
| `buddy-rematch-weekly` | same | no |

When `CRON_SECRET` is unset, the 14 vulnerable checks compare the header to the string `Bearer undefined`. An attacker who sends that header is authenticated. Empty `CRON_SECRET=""` compares to `Bearer ` (trailing space) — also a guessable token.

---

## 1. Problem

Cron routes are the service-role door. Auth that interpolates a missing env var into the expected bearer is not auth.

---

## 2. Decision

**One helper, `assertCronAuth(request)`, used by every cron route including the two that already fail-close. Missing or empty `CRON_SECRET` → 401 JSON, no work.**

Rejected alternatives (one line each):

- Copy the coach-digest `if` into the 14 routes — same bug class will reappear on the next cron.
- Middleware default-deny for `/api/cron` — out of scope; next item.
- Alerting when the secret is missing — out of scope; next item.

---

## 3. Behaviour

`src/lib/cron/auth.ts`:

- Read `Authorization` from the request and `CRON_SECRET` from env.
- Admit only when the secret is a non-empty string **and** the header is exactly `Bearer ${secret}`.
- Otherwise return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`.
- Return `null` when admitted (caller continues).

Routes keep `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 60` where they already export them. Success JSON is unchanged. 401 bodies become JSON (the 14 that returned plain `"unauthorized"` today).

Dual mode: crons already require service-role; this PR does not add service-role to new paths or change demo data.

---

## 4. Tests

`src/lib/cron/auth.test.ts` covers the helper only (all routes call it):

1. Secret missing → 401, including `Authorization: Bearer undefined`.
2. Secret empty (`""`) → 401.
3. Wrong bearer → 401.
4. Correct bearer → admitted (`null`).

---

## 5. i18n / migration

None. Cron responses are ops JSON, not member-facing copy. No schema change.
