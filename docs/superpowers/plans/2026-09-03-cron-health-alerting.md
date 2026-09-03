# Plan — cron-health alerting (B3)

**Spec:** [`2026-09-03-cron-health-alerting.md`](../specs/2026-09-03-cron-health-alerting.md)
**Base:** `main` @ `cf0f158` · **branch:** `cursor/cron-health-alerting-6f14`

Små atomare commits. Danske conventional prefixes.

---

## Commit 1 — docs

- [ ] Spec + this plan

## Commit 2 — pure evaluator + tests

- [ ] `src/lib/cron/health.ts` — watched ids, felt-mapping, `isEmptySuccess`, streak, alert
- [ ] `src/lib/cron/health.test.ts` — 3 tomme succeser → alert; candidates=0 er ikke tom; adapt `no_change` er ikke tom

## Commit 3 — migration + types

- [ ] `supabase/migrations/0060_cron_run_log.sql`
- [ ] `src/lib/supabase/database.types.ts` — `cron_run_log` (hånd-edit; ingen `db:types` / `db:push`)

## Commit 4 — data-lag

- [ ] `src/lib/data/cron-runs.ts` — `recordCronRun` (swallow) + `getCronHealth` (demo-ærlig, ingen alert)

## Commit 5 — wire watched ruter

- [ ] `mental-coach-daily`, `adapt-program-daily`, `draft-form-check-replies`, `coach-morning-report`
- [ ] Kun succes-JSON-stien. Auth, schedule, work-body urørt. Øvrige 12 ruter urørte

## Commit 6 — /coach/system + i18n

- [ ] Sektion + «crons quiet»-chip
- [ ] `messages/{da,en}/Coach.json` `system.crons*`

## Verify

- [ ] `npm test`
- [ ] Dual mode: `/coach/system` viser ærlig demo-tom, ingen spam-alert
- [ ] Ingen `db:push`, ingen merge til `main`, ingen secret-rotation
