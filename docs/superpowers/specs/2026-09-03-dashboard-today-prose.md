# Dashboard Today-prose (A3)

**Date:** 2026-09-03 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/dashboard-today-prose-734a` against `main` @ `5df1171` (PR #56 merged)
**Out of scope:** Coach Priority Inbox (done), module billing Fase B, cron
alerting, wearables keys, voice, CI, Lenus/Everfit clones, Noom curriculum,
live `db:push`, merge to `main`, secret rotation, new service-role paths,
new always-on Claude call on dashboard load

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `5df1171` after `git fetch origin main`:

| Claim | Evidence |
|---|---|
| `/dashboard` is Today / 01 — greeting + KPI wall, no coach prose | `src/app/(app)/dashboard/page.tsx` |
| Next open session card does **not** filter `scheduled_for = today` | `getTodayCard` orders `scheduled`/`active` ascending, limit 1 |
| Week-strip already classifies assigned / done / rest on Copenhagen today | `src/lib/data/coaching.ts` `todayIso()` + `rest: !session` |
| Session statuses are `scheduled` \| `active` \| `completed` \| `skipped` | `src/lib/workout.ts` `SessionStatus` |
| Demo session is `TODAY_SESSION` (`active`, «Dag A — Squat») | `src/lib/workout.ts` |
| Demo HRV is mature + lav / out of band | `demoSteadySeries()` + `buildHrvBandView`; chip uses the same fixture |
| `getLatestHrvReading` / `getTodaysReadinessNudge` return `null` in demo | `src/lib/data/hrv.ts` — `createClient()` null |
| Dashboard chip queries `hrv_readings` inline (page, not data layer) | `getHrvChipData` in `dashboard/page.tsx` |
| `getOpenHrvAlerts` is coach-wide, not member-today | `src/lib/data/coach.ts` — no member-id filter |
| Members can SELECT own `hrv_alerts` | `0032` policy `members_read_own_alerts` |
| Demo mind-check **includes today** | `hasMindCheckToday` → `mockMindCheckLogs(1)` has `i=0` = today |
| Demo mental-coach output is `null` | `getTodayMentalCoachOutput` early-return |
| Insight-stream demo independently sets `mindCheckedToday: false` | `demoInsightStream` — existing inconsistency with MindTile |
| Morning-report headlines are pure Danish templates, no Claude | `buildMorningHeadline` |
| Adaptive strip + insight cards emit **copy keys**, UI resolves i18n | `engine-strip.ts`, `insight-stream.ts` |
| Claude wrappers return `null`; mind fallback is a long 3-section letter | `coach-fallback.ts` — wrong shape for 1–3 Today sentences |
| Last local migration is `0059` | `supabase/migrations/`. **No migration in this PR.** |
| Dual mode: no service-role on page paths | `createClient()` in `src/lib/data/*` |
| Dashboard tiles may use domain stroke + kicker; body/CTA stay mono | `docs/DOMAIN_COLOR_SYSTEM.md` §3 + §8 |
| Status via `--ok/--warn/--danger`; no `--info` | same doc §5 |

## 1. Problem

Today opens as a passive KPI wall (handle, streak, tiles, session card).
The member already has the signals (HRV chip, session card, MindTile) but
nothing *says* what today is. Google Health Coach’s Today tab leads with
a short proactive line. MakeIt should too — without an AI error surface.

## 2. Decision

**Pure template builder. No Claude on dashboard load.**

Same shape as A2 / morning-report / engine-strip:

- Pure rank + pick in `src/lib/dashboard/today-prose.ts` (unit-tested).
- Glue in `src/lib/data/today-prose.ts` — composes existing fetchers +
  demo fixtures. Pages never query Supabase directly.
- Server component `TodayProse` under the greeting on `/dashboard`.
- Copy keys in `Dashboard.todayProse` (da + en). No hardcoded strings.

Rejected alternatives (one line each):

- Claude polish with null-fallback — legal under the wrapper contract, but
  an always-on dashboard call is not cached/cheap; morning-report and the
  strip already prove templates are enough. Revisit only if copy feels
  robotic after v1.
- Read `mental_coach_outputs` / morning-report payload — cron-dependent,
  empty in demo, wrong audience (coach digest / long reflection).
- Reuse `demoInsightStream` flags — that stream lies about mind-check
  (`false` while `hasMindCheckToday` is `true`). Prose follows real fetchers.

## 3. Signals

### Included (data is real)

| Kind | Source | Demo |
|---|---|---|
| `hrv` | Latest reading → `qualitativeFromBucket` + `isOutOfBand`. Live: `getLatestHrvReading`. | `demoSteadySeries()` → lav / out of band (same as chip) |
| `session` | Row with `scheduled_for` = Copenhagen today. `scheduled`/`active` → assigned; `completed` → done; `skipped` → skipped; no row → rest. **New small fetcher** — `getTodayCard` is «next open session», not today. | `TODAY_SESSION` → assigned, label «Dag A — Squat» |
| `mind` | `hasMindCheckToday` (presence only — no scores, no journal, no safety) | `true` (mock logs include today) |

### Excluded (and why)

| Candidate | Verdict |
|---|---|
| Open `hrv_alerts` row | No member-today fetcher. `getOpenHrvAlerts` is coach-wide. Readiness lav already carries the actionable state. Do not invent a member alert query in v1. |
| `getTodaysReadinessNudge` | `null` in demo; live also gated on wearable connection + 36h freshness. Qualitative from the reading is the shared signal. |
| Mind-check scores / 7d median | Soft presence/nudge only. Scores belong on `/mind`, not Today prose. |
| `mental_coach_outputs` body | Long letter; demo is null; would look like an AI miss. |
| Journal / `mental_safety_alerts` / Livslinien copy | Crisis pipeline stays in `MentalResourcesModal`. Today never mentions it. |
| Nutrition check-in / form-check banner / streak KPI | Already have tiles. Prose does not dump them. |
| Insight-stream cards | Separate «connect the dots» surface. Prose does not duplicate their CTAs. |

## 4. Ranking (pure)

Builder emits **1–3 sentence keys** (never a wall). Rank, then take the
prefix. `mindLogged` is filler — only kept when the list would otherwise
be shorter than 2. Empty input → one `quiet` line.

| Rank | Key | When |
|---|---|---|
| 0 | `hrvLav` | reading exists and qualitative is `lav` |
| 1 | `sessionAssigned` / `sessionAssignedWithLabel` | today is assigned |
| 2 | `sessionSkipped` | today was skipped |
| 3 | `mindNudge` | no mind-check today |
| 4 | `sessionDone` / `sessionDoneWithLabel` | today is completed |
| 5 | `hrvRo` | reading exists and qualitative is `ro` |
| 6 | `sessionRest` | no session row today |
| 7 | `hrvMidt` | reading exists and qualitative is `midt` |
| 8 | `mindLogged` | check exists **and** fewer than 2 stronger lines |
| ∞ | `quiet` | nothing else fired |

Tone (status tokens only, never domain hue on body text):

- `hrvLav` → `--warn`
- `hrvRo` / `sessionDone*` / `mindLogged` → `--ok`
- rest / skipped / quiet / midt / assigned / nudge → monochrome

Lead domain (optional 24×2 `domain-stroke` only): first line’s domain
(`heart` / `body` / `mind`). No domain color on the paragraph, no CTA
button in the block.

## 5. Surfaces

### `/dashboard` (member Today)

Prose sits **between the greeting header and `BodyMap`** — first voice
on the page, full width, not squeezed by the streak column.

Eyebrow + 1–3 sentences in `--fg-dim`. Optional domain-stroke + status
dot (`--warn` / `--ok`). Existing tiles stay.

### Demo (MUNK-01, no Supabase)

Expected lines from existing fixtures: `hrvLav` + `sessionAssignedWithLabel`.
Mind-check is present, so `mindLogged` is dropped (already 2 stronger lines).
No service-role. No `.env` required.

### Empty / missing

No HRV + rest + mind already logged → `sessionRest` + `mindLogged`
(honest calm, not manufactured urgency).

Truly empty input → `quiet`: «Stille start. Når signalerne lander,
skriver vi her.»

## 6. i18n

New keys under `Dashboard.todayProse` in both `messages/da/Dashboard.json`
and `messages/en/Dashboard.json`. Sentence keys match the builder.
`{label}` interpolation for session variants. No hardcoded copy.

Danish is source. English is parallel, not a tone shift.

## 7. Tests

`src/lib/dashboard/today-prose.test.ts`:

- rank order and 3-line cap
- `mindLogged` dropped when 2+ stronger lines exist
- `mindNudge` kept (actionable)
- assigned / done / rest / skipped
- no HRV → no invented heart line
- empty → single `quiet`
- demo fixture → `hrvLav` + labelled assigned, not `mindLogged`
- never emits crisis / Livslinien / safety keys

`npm test` must pass. No migration. No `db:push`.
