# Plan — Dashboard Today-prose (A3)

**Spec:** [`docs/superpowers/specs/2026-09-03-dashboard-today-prose.md`](../specs/2026-09-03-dashboard-today-prose.md)
**Branch:** `cursor/dashboard-today-prose-734a`

> Small atomic conventional commits, Danish prefix (`docs(spec):`, `feat(today):`, `feat(dashboard):`).

## Locked decisions

1. Pure templates only. No Claude on `/dashboard` load.
2. Compose existing signals. No migration. No service-role.
3. Session state is **today in Europe/Copenhagen**, not `getTodayCard`’s
   next-open-session. New small fetcher in `src/lib/data/dashboard.ts`.
4. Demo uses `demoSteadySeries` + `TODAY_SESSION` + `hasMindCheckToday`
   (true). Do not copy `demoInsightStream`’s false mind flag.
5. Domain stroke on the lead signal only. Body text stays `--fg-dim`.
   Status via `--ok/--warn`. No CTA in the prose block.
6. Crisis copy stays out. Presence/nudge for mind-check only.

## Steps

- [ ] Spec
- [ ] Plan
- [ ] Pure builder + vitest (`src/lib/dashboard/today-prose.ts`)
- [ ] `getTodaySessionSignal` + composer `getTodayProse()`
- [ ] i18n da+en + `TodayProse` + wire `/dashboard`
- [ ] `npm test`
- [ ] Demo verify MUNK-01 (browser)
- [ ] PR against main — body lists verified vs assumed signals
