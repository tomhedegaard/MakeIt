# Plan — GDPR-ærlighed i privacy + art. 20-eksport

**Spec:** [`2026-08-31-gdpr-honesty-privacy-export.md`](../specs/2026-08-31-gdpr-honesty-privacy-export.md)
**Base:** `main` @ `fe7e284` · **branch:** `cursor/gdpr-honesty-export-f0ca`

Small atomic commits. Danish conventional prefixes.

---

## Commit 1 — docs

- [ ] Spec + this plan

## Commit 2 — ærlig legal-copy

- `messages/{da,en}/Legal.json`: §01 nye kategorier; §02 deliver; §03 Anthropic; ny §08 art. 9; §09 wearable (ærlig revoke/retention); intro-dato august 2026
- `privacy/page.tsx`: render nye nøgler; fjern hardcoded wearable-afsnit
- Ingen CVR. Ingen sletning af `hrv_readings`

## Commit 3 — ærlig journal / Mind-copy

- `messages/{da,en}/Mind.json` + `Settings.json`
- `JournalForm.tsx`, `journal/page.tsx`, `mind/settings` subtitle — i18n, ingen «kun du»

## Commit 4 — eksport + tests

- Pure helper `src/lib/privacy/export.ts` + `export.test.ts`
- Data-lag `src/lib/data/export.ts` (user-scoped client, never service-role)
- `api/settings/export/route.ts`: connected + demo 200
- Settings copy matcher listen (commit 3)

## Verify

- `npm test`
- Demo: `/privacy` + `/settings` + `GET /api/settings/export` (MUNK-01) — no crash, honest demo payload
- No `db:push`, no merge to `main`
