# Cron-health alerting — stille tomme kørsler synlige (B3)

**Date:** 2026-09-03 · **Spec revision:** 1
**Status:** Approved to implement (Tom, this conversation)
**Branch:** `cursor/cron-health-alerting-6f14` against `main` @ `cf0f158` (Today-prose PR #58 merget)
**Out of scope:** module billing, wearables keys, Today-prose, Priority Inbox-features, cron-auth (allerede PR #44 `assertCronAuth`), rotation af `CRON_SECRET`, Sentry fra bunden, ny mail-vendor, live `db:push`, merge til `main`

---

## 0. Verified in tree (not assumed)

Re-verified on `main` @ `cf0f158` after `git fetch origin main`. `vercel.json` lists 16 cron paths; `src/app/api/cron/*/route.ts` has exactly those 16. Auth is fail-closed via `assertCronAuth` (PR #44). Ingen Sentry-dependency (`src/app/error.tsx` nævner Sentry kun som kommentar). `member_action_logs` (0024) er member-scopet rate-limit med lukket `action`-CHECK — uegnet som cron-log.

Højeste migration på *alle* remotes: `0059_invite_consumed_gate.sql`. Ingen `0060+` på nogen remote. Næste frie nummer: **0060**.

| Cron | Schedule | JSON (succes) | 200 + `ok:true` ved 0 nyttigt? | 3× tom = ægte fejl? |
|---|---|---|---|---|
| `adapt-program-daily` | 03:30 dagligt | `eligible, persisted, skipped_*, refined, failed` | ja (`failed` tælles, `ok` forbliver true) | **ja** — hvis `eligible>0` og motoren aldrig evaluerede (`persisted+skipped_no_action==0`) |
| `mental-coach-daily` | 04:30 dagligt | `candidates, generated, fallback, nudged, skipped, failed` | ja (inkl. `generated==0` + fallback/nudge) | **ja** — `candidates>0` og `generated==0` (Claude død / serial fail). Fallback-only tæller som tom ift. Claude |
| `draft-form-check-replies` | 04:00 dagligt | `pending, drafted, skipped_no_draft, failed` | ja | **ja** — `pending>0` og `drafted==0` (Claude/timeout) |
| `coach-morning-report` | 05:00 dagligt | `coaches, written, emailed, failed` (`ok: failed===0`) | `written==0` kun hvis upsert fejler pr. coach | **ja** — `coaches>0` og `written==0` |
| `science-feed` | 05:30 dagligt | `published, rejected` | ja | nej — 0 published er en stille dag i feedet |
| `hrv-wearable-sync` | 05:00 dagligt | `processed, readings` | ja | nej i denne PR (wearables keys ude; 0 readings er ofte legitimt) |
| `hrv-alert-detect` | 06:00 dagligt | `created, skipped, notTriggered` | ja | nej — 0 alerts er sundt |
| `mind-check-nudge` | 18:00 dagligt | `candidates, nudged` | ja | nej — 0 nudges = alle har tjekket ind |
| `streak-milestone-nudge` | 15:00 dagligt | nudge-counts | ja | nej — tom er default |
| `hrv-weekly-insights` | søn 18:00 | `insights, skipped, claudeUsed` | ja | nej i v0 — 3 kørsler = 3 uger; tom uge er legitim |
| `mental-weekly-insights` | søn 18:00 | `candidates, pushed` | ja | nej i v0 (samme) |
| `coach-digest` · `coach-quality-score` | man 06:00 | digest / scores | ja | nej i v0 |
| `buddy-streak-weekly` · `buddy-mental-weekly-checkin` | man 07:00 | pair/push-counts | ja | nej — tom er ofte sundt |
| `buddy-rematch-weekly` | søn 19:00 | rematch-counts | ja | nej — 0 rematch er happy path |

`/coach/system` er allerede ops-fladen (env-presence, reminders, DB-KPI). Priority Inbox er membersignaler — forkert sted. Resend + morning-report-mail findes og no-op'er uden nøgle; en *ny* mailskabelon ville være et nyt send-spor. Ingen Sentry.

---

## 1. Problem

Vercel Cron ser HTTP 200. Ruterne svarer `{ ok: true }` selv når per-member-arbejde fejlede, eller når `generated`/`persisted`/`drafted` er 0. Stille død af Claude-nøgle, serial timeouts eller tomme kørsler er usynlige. Auth er allerede fail-closed — dette er **observability**.

---

## 2. Decision

**Option A + B.** Lille `cron_run_log` skrevet af de watched crons. Ren evaluator: 3 på hinanden følgende *succeser* med 0 nyttigt arbejde (og `candidates>0`) → alert. Overflade: chip + liste på `/coach/system` (eksisterende ops-side).

Ikke C i denne PR: Resend-stien findes, men en ny Munk-mail er spam-risiko og et nyt template-spor. Morning-report kan piggybackes senere. Ikke Priority Inbox (forkert domæne). Ikke Sentry.

Rejected alternatives (one line each):

- Genbruge `member_action_logs` — kræver `member_id`, lukket action-CHECK, rate-limit-semantik.
- Kun Vercel-logs — det er præcis det usynlige hul (`ok:true` er grønt).
- Ny health-cron i `vercel.json` — unødvendig; evaluering sker ved read tid + ved skrivning.
- Email ved tærskel — findes som sti, men «don't spam» + ingen ny vendor-skabelon i v0.

---

## 3. Watched crons og «generated»

Feltet `generated` i loggen er *nyttigt primærarbejde*, mappet pr. cron:

| Cron | `candidates` | `generated` | Tom succes |
|---|---|---|---|
| `mental-coach-daily` | `candidates` | `generated` (Claude-refleksioner) | opted-in findes, 0 Claude-outputs (fallback-only og nudge-only tæller som tom — det *er* Claude-død / ingen refleksion) |
| `adapt-program-daily` | `eligible` | `persisted + skipped_no_action` | opted-in findes, motoren evaluerede ingen (alle failed eller ingen session). Ren `no_change` er **ikke** tom |
| `draft-form-check-replies` | `pending` | `drafted` | der ligger pending checks, 0 drafts |
| `coach-morning-report` | `coaches` | `written` | coaches findes, 0 rækker skrevet |

En kørsel er en **tom succes** iff `ok && candidates > 0 && generated === 0`.

`candidates==0` (ingen opted-in / ingen pending / ingen coaches) er *ikke* tom — der var intet at lave.

**Streak:** blandt kørsler nyeste-først ignoreres `ok===false` (Vercel viser allerede 500). De seneste succeser i træk: hvis ≥3 er tomme → `alert`. En ikke-tom succes nulstiller. Tærskel: `EMPTY_STREAK_THRESHOLD = 3`.

---

## 4. Behaviour

### 4.1 Skema — `0060_cron_run_log.sql`

```
cron_run_log (
  id uuid pk default gen_random_uuid(),
  cron text not null,
  ok boolean not null,
  generated int not null default 0,
  failed int not null default 0,
  candidates int not null default 0,
  ran_at timestamptz not null default now()
)
```

Index `(cron, ran_at desc)`. RLS on. Ingen client INSERT/UPDATE/DELETE. `SELECT` for `is_current_user_coach()` (system-siden er admin-gated i appen; coaches må læse). Service-role bypasser. Restrictive `invite_admitted_only` så 0059-gaten gælder. Append-only. Ikke med i art. 20-eksport (ikke member-data).

Typer hånd-opdateres i `database.types.ts` (ingen `db:types` / `db:push` i denne PR).

### 4.2 Pure modul — `src/lib/cron/health.ts`

`extractRunStats(cron, body)`, `isEmptySuccess(run)`, `emptySuccessStreak(runsNewestFirst)`, `shouldAlertEmptyStreak(runs)`. Ingen I/O. Cron-navne som union af de fire watched ids.

### 4.3 Data — `src/lib/data/cron-runs.ts`

`recordCronRun(client, stats)` — never throws (log + swallow). Kaldes kun fra watched cron-ruter *efter* auth, på succes-JSON-stien (200). 401 logges ikke (ingen service-client). 500 forbliver Vercel-synlig; v0 logger dem ikke.

`getCronHealth()` — user-scoped `createClient()`. Demo (`!supabase`): ærlig tom tilstand, **ingen** alert-chip. Connected: sidste ~20 rækker pr. watched cron → evaluator.

### 4.4 Ruter

De fire watched ruter mapper deres JSON gennem `extractRunStats` + `recordCronRun` umiddelbart før `NextResponse.json`. `assertCronAuth`, schedules, work-body og service-role-brug ændres ikke. Øvrige 12 ruter urørte.

### 4.5 `/coach/system`

Ny sektion «Crons» under reminders: pr. watched cron status (ok / tom-stille / ingen kørsler / demo). Hvis `shouldAlertEmptyStreak` for mindst én: en «crons quiet»-række i reminders-listen (`severity: warn`). Demo: «Crons kører ikke i demo» — ingen falsk alarm.

Ingen hardcodet copy. Nøgler i `messages/{da,en}/Coach.json` `system.crons*`.

### 4.6 Dual mode + fail-closed

Crons kræver allerede service-role + `CRON_SECRET`. Demo har ingen cron-kørsel. System-siden renderer uden tabellen. `assertCronAuth` urørt.

---

## 5. Tests

`src/lib/cron/health.test.ts` (pure):

1. `candidates==0` + `generated==0` + `ok` → ikke tom.
2. `candidates>0` + `generated==0` + `ok` → tom.
3. `ok` + arbejde (`generated>0`) → ikke tom.
4. `ok===false` tæller ikke i streak (springes over).
5. 2 tomme succeser → ingen alert; 3 → alert.
6. Ikke-tom succes midt i rækken nulstiller.
7. `extractRunStats` for alle fire watched crons (felt-mapping).
8. Adapt: kun `skipped_no_action` (ingen persist) er **ikke** tom.

Ingen glue-/route-tests.

---

## 6. i18n / migration

i18n: `Coach.system` da+en (coach-facing). Migration: **0060** (ny fil; aldrig rediger gamle). Ingen `db:push`.
