# GDPR-ærlighed — privacy-tekst + art. 20-eksport

**Date:** 2026-08-31 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/gdpr-honesty-export-f0ca` against `main` @ `fe7e284`
**Out of scope:** invite-gate residual, CRON_SECRET Bearer, middleware default-deny, dual-mode cleanup, module-subscription, CI, crisis pipeline, `mental_sessions` RLS, stopping Anthropic calls, inventing CVR/DPA, consent-checkbox product, live `db:push`, merge to `main`, mass-deletion of biometric rows

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `fe7e284` after `git fetch origin main` (invite-gate PR #41 is merged):

| Claim | Evidence |
|---|---|
| Journal body is sent to Claude Haiku (first 4000 chars) | `moderation-claude.ts` `body.slice(0, 4000)` via `moderateJournalText`; caller `src/lib/data/mind.ts` |
| Mind-check **note** (not journal body) goes to Sonnet in daily coach | `coach-context.ts` `mind_today.note`; `mental-coach-daily/route.ts` 129–154 |
| Journal UI claims exclusive visibility | `JournalForm.tsx` placeholder + helper + saved-state; `journal/page.tsx` subtitle; `mind/settings/page.tsx` subtitle; `Mind.json` `disclaimer.privacy_journal` + `safety.privacy` |
| Privacy §01 omits journal / mind-check / mental coach / cirkler / nutrition / messages / weight | `messages/{da,en}/Legal.json` `privacy.s01.items` |
| §03 Anthropic: program + form-check only | `Legal.json` `s03.items.anthropic` |
| No art. 9 category, no consent basis for health data | no keys in Legal.json; `privacy/page.tsx` has no special-category section |
| `COMPANY.legal.cvr` is `null` | `src/lib/company.ts` 34 — do **not** invent a CVR |
| Wearable page claims 30-day deletion on disconnect | `privacy/page.tsx` 137–142, hardcoded Danish |
| Disconnect only sets `status: revoked` | `hrv/connect-actions.ts` 123–126. No delete of `hrv_readings` / tokens / 30-day job |
| Art. 20 export lists 10 collections, claims completeness | `api/settings/export/route.ts` 66–80. Note: «Indeholder alt vi gemmer der er dit.» |
| Settings UI says «everything» | `Settings.json` `data.title` / `data.description` |
| Demo export is 503 | same route, `!SUPABASE_ENABLED` → `{ error: "Data export only available in connected mode." }` |
| SELECT-own (or participant) RLS exists for the missing tables | 0046, 0047, 0032, 0037, 0013, 0025, 0017, 0021, 0045, 0016, 0024, 0057. **No new migration.** |
| 0057 + 0058 are in tree; user states they are live | `0057_mental_safety_alerts.sql`, `0058_mental_sessions_personal_rls.sql`. Never edit old migrations. |
| Wearable tokens are ciphertext on the connection row | `hrv_wearable_connections.access_token` / `refresh_token` (0037). Must not land in the download. |
| Push rows hold Web Push keys | `push_subscriptions.p256dh` / `auth` (0016). Redact. |

---

## 1. Problem

Two high-severity honesty bugs. Processing does not change.

1. **Privacy policy and Mind UI lie.** Journal and mind-check text leave the platform (Anthropic as processor). Copy says only the member sees them, never Munk/coaches/others. Anthropic is others. Policy omits søjle 5 / art. 9 categories and the real Anthropic purposes. Wearable §08 invents a 30-day deletion job that does not exist.

2. **Art. 20 export claims completeness and omits almost all sensitive member-owned rows.** Authed + RLS-scoped — not a leak, an incomplete right.

---

## 2. Decision

**Tell the truth in member-facing copy (da+en). Expand the user-scoped export. Honest wearable retention. No deletion job. No consent-checkbox product. Anthropic stays.**

Rejected alternatives (one line each):

- Implement wearable deletion on disconnect to match the old copy — larger job; risk of mass-deleting live biometric rows. Default is honest copy.
- Stop sending journal / mind-check text to Anthropic — out of scope; this PR does not change who data is sent to.
- Add an art. 9 consent checkbox — product work, explicitly out of this PR.
- Invent a CVR so the policy looks complete — `cvr` is `null`; keep the existing fallback.
- Service-role on the export path so missing RLS cannot hide rows — forbidden (user-triggered + must work in demo).

---

## 3. Behaviour

### A. Privacy policy (`Legal.json` + `privacy/page.tsx`)

§01 adds the categories we actually process: journal, mind-check, mental coach, cirkler, nutrition, messages, weight. Existing items stay.

§02 `deliver` mentions Mind / nutrition / HRV, not only program + form-check + feed.

§03 Anthropic: program generation, form-check, **journal/crisis-text moderation (Haiku, excerpt)**, and **daily mental coach (Sonnet, mind-check including optional note)**. Still: business-tier request lifecycle. Do not claim Anthropic never sees mental text.

New §08 — særlige kategorier (art. 9): journal, mind-check, mental coach, cirkler, HRV/biometrics, nutrition. Legal basis we currently rely on: art. 9(2)(a) explicit consent by using those modules (Mind onboarding acknowledgement; wearable OAuth). Honest that there is no separate per-category consent checkbox in this version. Stop processing by stopping use + account deletion.

Wearable block moves to i18n §09 (was hardcoded «08»). Disconnect: access token is revoked (`status: revoked`); **readings and connection metadata are retained until account deletion**. No 30-day deletion job. Account-deletion 30/90-day window in §06 is unchanged (separate claim).

Update «Senest opdateret» to august 2026. CVR stays null-fallback.

### B. Journal / Mind UI

Do not claim exclusive visibility if a processor sees the text.

Honest: Munk/coaches/other members do not see the journal body (owner-only RLS). A processor (Anthropic) may see an excerpt for crisis-text moderation. Mind-check notes may be sent to Anthropic for the daily coach. Safety-modal «we have not shared anything with anyone» is false after moderation — fix it.

i18n every new/changed string in `messages/{da,en}`. Journal form/page hardcoded Danish becomes keys.

### C. Art. 20 export

User-scoped `createClient()` only. No `createServiceClient`.

Include member-owned / participant-scoped rows:

**Already:** members, sessions (+ nested sets), posts, post_comments, post_reactions, reps_transactions, reward_redemptions, form_checks, program_assignments, tier_events, challenge_participants.

**Add:** journal_entries, mind_check_logs, mental_settings, mental_settings_log, mental_coach_outputs, mental_session_completions, mental_cirkel_posts (`author_id`), mental_safety_alerts, hrv_readings, hrv_settings, hrv_lifestyle_logs, hrv_wearable_connections (no tokens), hrv_alerts, nutrition_profiles, nutrition_plans, nutrition_meals (RLS via plan), nutrition_logs, nutrition_skip_days, conversations (member or coach), messages (participant RLS), weight_logs, buddy_pairs (`member_a` or `member_b`), push_subscriptions (no p256dh/auth), member_action_logs.

Failed select (table missing locally) → that key `[]` and name in `omitted`. Never 500 the whole export.

Redact `access_token`, `refresh_token`, `p256dh`, `auth` even if a future select is `*`.

Payload `note` must not say «alt» / «everything». Prefer listing that the file is the member-owned rows we can read under RLS, plus `omitted` if any.

**Demo:** 200 JSON, `mode: "demo"`, empty collections, honest note that demo has no connected database. Require session (401 if logged out). Do not crash.

Settings copy: drop «everything»; describe the categories actually exported.

### D. Tests, i18n, dual mode

- Vitest on the pure export helper: payload keys, empty-collection shape, secret redaction, demo vs connected notes.
- New/changed member copy in both locales.
- Dual mode: settings page + `/api/settings/export` + `/privacy` work without Supabase.

### E. Non-goals

Stopping Anthropic. Deleting biometric rows. Consent UI. New migration (unless a SELECT-own policy were missing — it is not). Rewriting the whole legal suite or Marketing.json.
