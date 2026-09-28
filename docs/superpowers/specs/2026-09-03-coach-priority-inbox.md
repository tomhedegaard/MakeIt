# Coach Priority Inbox (A2)

**Date:** 2026-09-03 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/coach-priority-inbox-39eb` against `main` @ `ec67347` (PR #53 merged)
**Out of scope:** Dashboard Today prose (A3), module billing, CI, wearables keys,
Autoflow clones, Lenus partnership / coach SaaS / AI personalities, live
`db:push`, merge to `main`, secret rotation, new service-role paths

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `ec67347` after `git fetch origin main`:

| Claim | Evidence |
|---|---|
| Coach nav is 12 items; 01 Overview is `/coach` | `CoachShell.tsx` NAV |
| Overview shows KPIs + recent crew + form-check aside | `src/app/coach/page.tsx` |
| Queue already lists adaptive + HRV + form-checks as **separate** sections | `src/app/coach/queue/page.tsx` |
| Safety lists open `mental_safety_alerts` (admin-only page) | `src/app/coach/safety/page.tsx` + `getMentalSafetyMetrics` |
| Journals are owner-only; Safety never queries them in connected mode | `getMentalSafetyMetrics` `journalCoverage: "unavailable"` |
| `getOpenHrvAlerts` filters `adaptive_v0` **and** leftover `mental_safety` | `src/lib/data/coach.ts` |
| `getOpenAdaptiveAlerts` is the engine sign-off queue | same file |
| `getPendingFormChecks` is the review queue (4 demo mocks) | same file |
| Stale / at-risk members already queryable | `getMemberHealth()` buckets: 15–28d at-risk, 29d+ inactive |
| Morning report is cron + email only — **no** `/coach/morning` page | glob empty; `coach_morning_reports` written by cron |
| Morning-report urgent buckets = sustained-low count + adaptive count + form-check count | `src/lib/coach/morning-report.ts` — no per-item inbox |
| Demo HRV + adaptive fetchers return `[]` | `getOpenHrvAlerts` / `getOpenAdaptiveAlerts` |
| Demo Safety open alerts are honest-empty | `getMentalSafetyMetrics` demo: `openAlerts: []`, `alertsReadable: true` |
| Dual mode: no service-role on page paths | `createClient()` in `src/lib/data/*` |
| Last local migration is `0059` | `supabase/migrations/`; origin/main same. No `0060` on fetched main. **No migration in this PR.** |
| `/coach/*` is monochrome in v1 | `docs/DOMAIN_COLOR_SYSTEM.md` §8 |

## 1. Problem

Munk has the signals, but they live on three pages (Overview aside, Queue
sections, Safety, Analytics at-risk). There is no single ordered «who needs
me today» surface. The morning-report email is a daily digest, not an
action inbox.

## 2. Decision

**One ranked Priority Inbox on coach Overview (01), plus a dedicated
`/coach/inbox` reached from that section. No new nav item.**

`getCoachPriorityInbox()` in `src/lib/data/coach-priority-inbox.ts` merges
existing fetches. Pure rank/merge lives in `src/lib/coach/priority-inbox.ts`
and is unit-tested. Pages never query Supabase directly.

Rejected alternatives (one line each):

- New nav 13 Inbox — invents a parallel kingdom; Overview is already «today».
- Replace Queue with the inbox — Queue is the **act** surface (review buttons);
  Inbox is the **triage** surface. Keep both; inbox deep-links into Queue.
- Read `coach_morning_reports.payload` — cron-dependent, empty in demo, counts
  not rows. Same signals are already live via the fetchers below.

## 3. Signals

### Included (data is real)

| Kind | Source | Deep-link | Demo |
|---|---|---|---|
| `mental_safety` | `getMentalSafetyMetrics().openAlerts` (member-written summary only) | `/coach/safety` | Honest empty (do not invent a crisis row) |
| `hrv_alert` | `getOpenHrvAlerts` (already drops leftover `mental_safety`) | `/coach/queue` | 1–2 plausible mocks **in the inbox composer only** (Queue fetchers stay `[]` so Safety/Queue honesty is unchanged) |
| `adaptive` | `getOpenAdaptiveAlerts` | `/coach/queue` | 1 mock in the inbox composer only |
| `form_check` | `getPendingFormChecks` | `/coach/queue` | Existing 4 mocks |
| `stale_session` | `getMemberHealth().atRisk` where bucket is `atRisk` or `inactive` (15d+) | `/coach/members/[id]` | Existing analytics mocks (anders 22d, oliver 18d, jens 17d) |

### Excluded (and why)

| Candidate | Verdict |
|---|---|
| Journal crisis / flagged counts | Owner-only RLS. Safety already refuses fake zeros. Inbox never reads `journal_entries`. |
| Mind-check scores | Not a coach-visible crisis bus; buddy snapshot is opt-in and not Munk's 1:1 queue. |
| Morning-report cohort patterns | Already `/coach/patterns`. Cross-crew, not «this member needs you now». |
| Sustained-low list from morning payload | Count/aggregate for email; open HRV alerts + stale cover the actionable members without a new readings sweep. |
| Yesterday skip-count | Roll-up, not per-member. |
| Slowing (8–14d) | Analytics, not NOW. Inbox threshold is 15d+ (`atRisk` / `inactive`). |
| Pending redemptions | Fulfilment work, already 06 Redemptions + Overview KPI. |
| No-program count | Onboarding hygiene, not today's human queue. |
| Assignment-week drift | No dedicated query. Not inventing one. |

## 4. Ranking (pure)

Kind rank, then timestamp:

1. `mental_safety` — newest first
2. `hrv_alert` — newest first
3. `adaptive` — newest first
4. `form_check` — oldest first (longest wait)
5. `stale_session` — most days-since first

Same member may appear more than once (different actions, different hrefs).
That is correct: one row = one thing to do.

Each row: `@handle` · reason chip (i18n key, no hardcoded copy) · when ·
deep-link. Mental-safety rows do **not** render the summary body on Overview
(Safety page already does; inbox is triage).

Chip tone uses status tokens only: `--danger` mental_safety, `--warn`
hrv / adaptive / stale, monochrome form_check. No domain colors. No
domain colors on the row CTA.

## 5. Surfaces

### Overview (`/coach`)

Inbox is the first block after the KPI row. Title/intro copy shifts toward
«who needs you today». Preview of the first 8 rows + «Åbn hele indbakken».
Existing crew + form-check aside stay (they are activity, not triage).

### `/coach/inbox`

Same list, full length. Honest empty: demo or live, when the merged list is
empty, say so plainly (quiet morning — not manufactured urgency). If
`mental_safety_alerts` is unreadable (`alertsReadable === false`), show the
other items and a one-line note that Safety cannot be read — never a fake 0.

### Demo

MUNK-01 (`is_coach` + `is_admin`) opens Overview and sees a plausible mix
(form-checks + HRV + adaptive + stale). No service-role. No `.env` required.

## 6. i18n

New keys under `Coach.inbox` and a few `Coach.overview` additions, both
`messages/da/Coach.json` and `messages/en/Coach.json`. No hardcoded copy
in components.

## 7. Tests

`src/lib/coach/priority-inbox.test.ts` — merge order, timestamp tie-break,
hrefs, stale bucket filter, empty input, leftover-kind rejection (only
known kinds). `npm test` must pass.
