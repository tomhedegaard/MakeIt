# Plan — mental crisis pipeline honesty

**Spec:** [`2026-08-30-mental-crisis-pipeline-honesty.md`](../specs/2026-08-30-mental-crisis-pipeline-honesty.md)
**Base:** `main` @ `2bfc8d1` · **branch:** `cursor/mental-crisis-pipeline-honesty-b21b`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [x] Spec + this plan

## Commit 2 — fail-closed combiner

- Extract `combineModerationVerdicts` to `src/lib/mind/moderation.ts` (no `server-only`)
- Null Claude → `flagged`; keyword still wins `crisis`
- `moderation-claude.ts` re-exports / callers updated
- Log `moderation_claude_null` + persist `claude:null` in reason
- Tests: `src/lib/mind/moderation.test.ts`

## Commit 3 — dedicated table + escalate path

- `supabase/migrations/0057_mental_safety_alerts.sql`
- Hand-typed row in `src/lib/mind/types.ts` + `database.types.ts` (no live `db:types`)
- Pure helpers `src/lib/mind/escalate.ts` + `escalate.test.ts`
- Rewrite `escalateMentalSafetyToCoach` off `hrv_alerts`
- Filter `mental_safety` out of `getOpenHrvAlerts`; guard `HrvAlertCard`
- Rewrite `getMentalSafetyMetrics` (no journal aggregate in connected mode)

## Commit 4 — honest UI + i18n

- `messages/{da,en}/Mind.json` `safety.*`
- `MentalResourcesModal` via `useTranslations("Mind.safety")`
- `/coach/safety` stops rendering fake journal zeros as coverage; lists `mental_safety_alerts`

## Verify

- `npm test`
- Demo path: no `createServiceClient` on escalate; MUNK-01 still functions
- No `db:push`, no merge to `main`
