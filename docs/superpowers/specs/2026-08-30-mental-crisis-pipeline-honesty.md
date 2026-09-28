# Mental crisis pipeline — honesty fix

**Date:** 2026-08-30 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/mental-crisis-pipeline-honesty-b21b` against `main` @ `2bfc8d1`
**Out of scope:** privacy-policy rewrite, Art.20 export, invite-gate, `mental_sessions` RLS, CI, module-subscription branch, live `db:push`, push/mail notify

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `2bfc8d1`:

| Claim | Evidence |
|---|---|
| Members cannot INSERT `hrv_alerts` | `0032_hrv_module.sql`: `members_read_own_alerts` is SELECT-only; `coach_manages_alerts` is `FOR ALL` via `is_current_user_coach()` |
| `escalateMentalSafetyToCoach` writes `hrv_alerts` via user-scoped `createClient()` | `src/lib/data/mind.ts` ~528–596. Demo branch `console.info` + fake id. No service-role call |
| Escalate action only logs | `escalate-actions.ts` `console.info` — no push, no mail |
| Modal claims Munk was notified | `MentalResourcesModal.tsx` sent-state: “Munk får besked.” + Fortæl Munk button |
| `HrvAlertCard` reads `lifestyle_flags.*` unguarded | `HrvAlertCard.tsx` 42–45, 114–120. A `mental_safety` payload would throw |
| `getOpenHrvAlerts` would mix mental-safety into HRV queue | Filters only `source !== "adaptive_v0"` (`coach.ts` 508–510) |
| `combineModerationVerdicts` fail-open | `if (!claude) return "clean"` (`moderation-claude.ts` 130). Wrapper returns `null` on missing key / API / parse error |
| Keywords are explicit-phrase only | `crisis-keywords.ts` — oblique language is Claude’s job |
| Journal RLS is owner-only | `0046` policy `journal_entries_owner_all`. Comment in `getMentalSafetyMetrics` claiming Munk can SELECT is false |
| Safety dashboard zeros are structural | `openMentalAlerts` counts `hrv_alerts` inserts that members cannot write; journal counts are the viewer’s own rows |
| Migration collision | All remotes: last file is `0056_waitlist.sql`. `0057` is free |

---

## 1. Problem

Two user-visible lies, plus a coach dashboard that pretends it can see crisis volume it cannot.

1. **Fail-open moderation.** Claude-null looks like “all clear”. A down Anthropic (or missing key) plus oblique crisis language never surfaces Livslinien.
2. **Fortæl Munk notify-without-write.** The member is told Munk was notified. The write target is the wrong table, the wrong RLS, and there is no notify channel.
3. **Fake coverage.** `/coach/safety` renders journal KPIs and open-alert zeros as if Munk could aggregate others’ journals and as if escalations landed.

A strength coach is not a crisis service. Livslinien / 112 must always show on crisis. Raw journal text is never forwarded.

---

## 2. Decision

**Fail-closed combiner + dedicated `mental_safety_alerts` table with member INSERT (no service-role) + honest copy + honest Safety UI.**

Rejected alternatives (one line each):

- Hide Fortæl Munk until a write path exists — smaller, but drops the consent-gated member-written summary the pillar already promised. Chosen only if the table+RLS path could not stay small. It can.
- Service-role insert from the journal server action — violates the service-role rule (crons/webhooks/OAuth only) and cannot live on a demo path.
- Keep writing `hrv_alerts` after adding member INSERT — reuses HRV as a suicide-signal bus; `HrvAlertCard` assumes `lifestyle_flags`.

Push/mail notify is out of this PR. Success copy must say the summary was **saved** for Munk to see on Safety — never that he was **notified**.

---

## 3. Behaviour

### A. Fail-closed moderation

`combineModerationVerdicts(keywordIsCrisis, claude)` (extracted to a pure module):

| keyword | claude | result |
|---|---|---|
| true | any / null | `crisis` (keyword still wins) |
| false | null | `flagged` — **not** `clean` |
| false | `crisis` | `crisis` |
| false | `flagged` | `flagged` |
| false | `clean` | `clean` |

`flagged` (not `crisis`) on Claude-null: Livslinien modal still shows (`JournalForm` already opens on `flagged | crisis`); we do not inflate the crisis label when the model never ran.

On Claude-null the journal write logs `[mind] moderation_claude_null` and stores `claude:null` in `moderation_reason`. Users never see a raw AI error.

Wrapper contract unchanged: `moderateJournalText` still returns `null` on failure.

### B. Fortæl Munk

New table `public.mental_safety_alerts` (migration `0057`):

- Columns: `id`, `member_id`, `summary` (4–1000 chars), `status` (`open`/`seen`/`closed`), `created_at`, `updated_at`
- **Never** stores journal body
- RLS: member INSERT/SELECT/UPDATE own rows (`member_id = auth.uid()`); coach SELECT all + UPDATE status
- User-scoped `createClient()` insert — no `createServiceClient` on this path
- Demo: no write, `persisted: false`, no service-role import
- Same-day reuse of an open row (update summary) — keep existing idempotency intent
- Stop all mental-safety writes to `hrv_alerts`
- `getOpenHrvAlerts` also filters `source === "mental_safety"` so leftovers cannot enter the HRV queue
- `HrvAlertCard` guards missing `lifestyle_flags`

Return shape:

```
{ ok: true, alertId, persisted: true }           // durable row written
{ ok: true, alertId, persisted: false }          // demo — do not claim saved
{ ok: false, error }                             // RLS / validation / write fail — never claim success
```

Copy: Livslinien + 112 always visible (resources + sent). Sent-state distinguishes persisted vs demo. Errors map to i18n keys — no raw PostgREST text.

### C. Safety UI

`getMentalSafetyMetrics` stops querying `journal_entries` in connected mode.

- `journalCoverage: "unavailable" | "demo"`
- Connected: no journal KPI numbers. Copy explains owner-only RLS.
- Open alerts come from `mental_safety_alerts` (coach-readable). If the select fails (0057 not applied), show “cannot read” — not a fake zero presented as coverage.
- Demo: existing mock journal numbers, labeled as demo. `openMentalAlerts = 0`.
- Render member handle + member-written summary. Not `HrvAlertCard`.

### D. Dual mode

Escalate and metrics keep a `!SUPABASE_ENABLED` branch. No service-role call. MUNK-01 still logs in and journals.

### E–G. Tests, i18n, migration

- Vitest on the pure combiner + escalate validate/classify helpers
- New/changed member copy in `messages/{da,en}/Mind.json` (`safety.*`)
- `0057_mental_safety_alerts.sql` — designed for local `db:reset`. **Not** pushed live in this PR

---

## 4. Non-goals

Push, mail, Auto-forward of journal text, coach “mark seen” actions, privacy policy, live migration apply, widening `/coach/queue` into a crisis inbox.
