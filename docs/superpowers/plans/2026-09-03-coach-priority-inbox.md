# Plan — Coach Priority Inbox (A2)

**Spec:** [`docs/superpowers/specs/2026-09-03-coach-priority-inbox.md`](../specs/2026-09-03-coach-priority-inbox.md)
**Branch:** `cursor/coach-priority-inbox-39eb`

> Small atomic conventional commits, Danish prefix (`docs(spec):`, `feat(coach):`).

## Locked decisions

1. Enhance `/coach` Overview + add `/coach/inbox`. No new nav item.
2. Compose existing `src/lib/data/*` fetchers. No migration.
3. Pure merge in `src/lib/coach/priority-inbox.ts` (tested). Glue in
   `src/lib/data/coach-priority-inbox.ts`.
4. Demo HRV/adaptive mocks live in the inbox composer only.
5. Mental-safety demo stays honest-empty (Safety page contract).
6. Monochrome coach UI; status via `--ok/--warn/--danger` on chips only.

## Steps

- [x] Spec
- [x] Pure merge + vitest
- [x] Data composer `getCoachPriorityInbox()`
- [x] i18n da+en
- [x] `PriorityInboxList` + Overview section + `/coach/inbox`
- [x] `npm test` (787 passed, 3 skipped)
- [x] Demo verify MUNK-01 (browser)
- [x] PR against main — body lists verified vs assumed signals
- [x] CI lint: `ConnectDotsStream` setState-in-effect (landed med #54, blokerede denne PR)
