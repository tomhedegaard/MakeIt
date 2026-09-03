# Plan — cron-health alerting (B3)

**Spec:** [`2026-09-03-cron-health-alerting.md`](../specs/2026-09-03-cron-health-alerting.md)
**Base:** `main` @ `cf0f158` · **branch:** `cursor/cron-health-alerting-6f14`

Små atomare commits. Danske conventional prefixes.

---

## Commit 1 — docs

- [x] Spec + this plan

## Commit 2 — pure evaluator + tests

- [x] `src/lib/cron/health.ts` — watched ids, felt-mapping, `isEmptySuccess`, streak, alert
- [x] `src/lib/cron/health.test.ts` — 3 tomme succeser → alert; candidates=0 er ikke tom; adapt `no_change` er ikke tom

## Commit 3 — migration + types

- [x] `supabase/migrations/0060_cron_run_log.sql`
- [x] `src/lib/supabase/database.types.ts` — `cron_run_log` (hånd-edit; ingen `db:types` / `db:push`)

## Commit 4 — data-lag

- [x] `src/lib/data/cron-runs.ts` — `recordCronRun` (swallow) + `getCronHealth` (demo-ærlig, ingen alert)

## Commit 5 — wire watched ruter

- [x] `mental-coach-daily`, `adapt-program-daily`, `draft-form-check-replies`, `coach-morning-report`
- [x] Kun succes-JSON-stien. Auth, schedule, work-body urørt. Øvrige 12 ruter urørte

## Commit 6 — /coach/system + i18n

- [x] Sektion + «crons quiet»-chip
- [x] `messages/{da,en}/Coach.json` `system.crons*`

## Verify

- [x] `npm test` — 820 passed | 3 skipped
- [x] Dual mode: `/coach/system` viser ærlig demo-tom, ingen spam-alert
- [x] Ingen `db:push`, ingen merge til `main`, ingen secret-rotation
