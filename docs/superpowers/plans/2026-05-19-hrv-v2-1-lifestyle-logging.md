# HRV Module — V2.1: Lifestyle Logging

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members can log daily lifestyle context — alcohol, sleep, how they feel, late meals, sickness, menstrual start — from the `/hrv` page. This is the foundation the V2 intelligence layer needs: the Claude weekly-insights correlations (V2.2) and one of the coach red-flag conditions (V2.3) both read these logs.

**Architecture:** The `hrv_lifestyle_logs` table already exists (migration 0031, RLS-enabled, member-owned). V2.1 adds a small migration to make daily logs idempotent (one row per member per day per event type), a set of server actions to write/read logs, a `LifestyleLogCard` quick-log component, and wires it into the `/hrv` page. Marking a day "sick" also flags that day's `hrv_readings` row so the baseline excludes it (spec §4/§5).

**Tech Stack:** Next.js 16.2.4, React 19, Supabase, TypeScript 5, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-15-hrv-module-design.md`](../specs/2026-05-15-hrv-module-design.md) rev 4.2 — §6 (insights cards consume these), §8 (lifestyle logs feed insights + the coach alert), §9 (`hrv_lifestyle_logs` schema).

**Depends on (shipped):** the W1-W3 HRV module — the `/hrv` page, `hrv_lifestyle_logs` + `hrv_readings` tables, `src/lib/data/hrv.ts`, `src/lib/supabase/server.ts`.

## Existing `hrv_lifestyle_logs` (migration 0031 — verified)

```
id uuid pk · member_id uuid → members · logged_for_date date not null
event_type text check in ('alcohol_drinks','sleep_hours','feeling','late_meal','sick','menstrual_start')
value jsonb not null · inserted_at timestamptz
```
RLS: `members_own_lifestyle_logs` (`for all using member_id = auth.uid()`) — members read+write their own rows via the normal session client (no service-role needed). There is **no** unique constraint on `(member_id, logged_for_date, event_type)` yet — V2.1's migration adds one so a day's log is editable, not duplicated.

## `value` jsonb shapes (one per event type)

| `event_type` | `value` shape | UI control |
|---|---|---|
| `alcohol_drinks` | `{ "count": number }` (0,1,2,3 — 3 means "3+") | 4-way selector |
| `sleep_hours` | `{ "hours": number }` | number input / stepper |
| `feeling` | `{ "state": "fresh"\|"ok"\|"tired"\|"stressed" }` | 4-way selector |
| `late_meal` | `{ "late": boolean }` | toggle |
| `sick` | `{ "sick": boolean }` | toggle |
| `menstrual_start` | `{ "date": "YYYY-MM-DD" }` | "Markér i dag"-action (only if cycle-tracking enabled) |

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `supabase/migrations/0033_hrv_lifestyle_unique.sql` | Unique `(member_id, logged_for_date, event_type)` on `hrv_lifestyle_logs` |
| `src/lib/hrv/lifestyle.ts` | Pure helpers — event-type constants, `value`-shape types, validation |
| `src/lib/hrv/lifestyle.test.ts` | Unit tests for the validation helpers |
| `src/app/(app)/hrv/lifestyle-actions.ts` | Server actions — `logLifestyleEvent`, (read via `src/lib/data/hrv.ts`) |
| `src/components/hrv/LifestyleLogCard.tsx` | Daily quick-log card |

**Modified files:**

| Path | Change |
|---|---|
| `src/lib/supabase/database.types.ts` | Regenerated after 0033 |
| `src/lib/data/hrv.ts` | Add `getTodayLifestyleLogs(memberId)` |
| `src/app/(app)/hrv/page.tsx` | Render `<LifestyleLogCard>` (connected, non-discovery states) |

---

## Chunk 1: Schema + pure helpers

### Task 1: Migration `0033_hrv_lifestyle_unique.sql`

**Files:** Create `supabase/migrations/0033_hrv_lifestyle_unique.sql`

- [ ] **Step 1:** Write the migration (idempotent, same header-comment style as prior migrations):
  ```sql
  -- =================================================================
  -- MakeIt // HQ — HRV lifestyle-log uniqueness (V2.1)
  -- =================================================================
  -- One lifestyle log per member per day per event type, so a day's
  -- entry is editable (upsert) rather than duplicated.
  create unique index if not exists idx_hrv_lifestyle_logs_unique
    on public.hrv_lifestyle_logs (member_id, logged_for_date, event_type);
  ```
- [ ] **Step 2:** Apply to the local stack: `npm run db:reset` (the local Supabase may need `npm run db:start` first; Docker required). Confirm all migrations 0001→0033 apply clean. If the local CLI/Docker is unavailable, note it and skip — the migration validates on first `db:push`.
- [ ] **Step 3:** Commit `feat(hrv): migration 0033 — unique lifestyle log per member/day/type`.

### Task 2: Regenerate Supabase types

**Files:** Modify `src/lib/supabase/database.types.ts`

- [ ] **Step 1:** Run `supabase gen types typescript --local > src/lib/supabase/database.types.ts` (the `db:types` npm script uses `--linked`; 0033 was applied locally — use the local variant).
- [ ] **Step 2:** `npx tsc --noEmit` — clean. Commit `chore(hrv): regenerate Supabase types for 0033`.

### Task 3: Lifestyle helpers (pure, TDD)

**Files:** Create `src/lib/hrv/lifestyle.ts`, `src/lib/hrv/lifestyle.test.ts`

- [ ] **Step 1: Write failing tests** for a pure `validateLifestyleValue(eventType, value)` helper that returns a typed-and-normalized `value` object or throws on invalid input:
  - `validateLifestyleValue("alcohol_drinks", { count: 2 })` → `{ count: 2 }`; `count` clamped to `0..3`; non-number → throws.
  - `validateLifestyleValue("sleep_hours", { hours: 7.5 })` → `{ hours: 7.5 }`; clamped to `0..24`; non-number → throws.
  - `validateLifestyleValue("feeling", { state: "tired" })` → ok; an unknown state → throws.
  - `validateLifestyleValue("late_meal", { late: true })` / `("sick", { sick: false })` → ok; non-boolean → throws.
  - `validateLifestyleValue("menstrual_start", { date: "2026-05-19" })` → ok; bad date string → throws.
  - An unknown `event_type` → throws.
  Also test exported constants: `LIFESTYLE_EVENT_TYPES` (the 6 strings) and `FEELING_STATES` (the 4 strings).

- [ ] **Step 2: Run — expect FAIL** (`npm test -- lifestyle`).

- [ ] **Step 3: Implement `lifestyle.ts`** — export `LIFESTYLE_EVENT_TYPES`, `FEELING_STATES`, the `value`-shape TypeScript types (a discriminated union keyed on event type is ideal), and `validateLifestyleValue`. Pure, no IO.

- [ ] **Step 4: Run — expect PASS.** `npx tsc --noEmit` clean. Commit `feat(hrv): lifestyle event helpers + validation`.

---

## Chunk 2: Actions + UI

### Task 4: Lifestyle-log server actions

**Files:** Create `src/app/(app)/hrv/lifestyle-actions.ts`; Modify `src/lib/data/hrv.ts`

- [ ] **Step 1: `logLifestyleEvent`** — a `"use server"` action `logLifestyleEvent(eventType: string, value: unknown)`:
  - Demo mode (`!SUPABASE_ENABLED`) → no-op `{ ok: true }`.
  - Resolve the member via the SSR session client (`@/lib/supabase/server`); no user → `{ ok: false, error: "no_session" }`.
  - `validateLifestyleValue(eventType, value)` (Task 3) — wrap in try/catch; an unknown `eventType` or invalid `value` throws → the action returns `{ ok: false, error: "invalid_value" }` (never let the throw 500).
  - **Upsert** a `hrv_lifestyle_logs` row keyed on `(member_id, logged_for_date, event_type)` with `logged_for_date` = today (the member's local date — accept the server date for V2.1; timezone refinement is later polish), `value` = the validated object. Use the session client — RLS `members_own_lifestyle_logs` permits it. Upsert via `.upsert(..., { onConflict: "member_id,logged_for_date,event_type" })` (the 0033 unique index backs it).
  - **Special case `sick`:** when `eventType === "sick"`, after the lifestyle-log upsert, also flag today's `hrv_readings` row so the baseline engine excludes/includes the day (spec §4/§5). Because the baseline reads **only the member's primary connection's** readings (spec §5), the flag must land on that connection's reading. Concretely, still using the **session client** (`members_own_readings` is `for all using (member_id = auth.uid())` — a member-scoped UPDATE is permitted under RLS):
    1. Find the primary connection: `hrv_wearable_connections` where `member_id` + `is_primary = true`, `.maybeSingle()`. No primary → skip the propagation silently.
    2. Find today's reading for it: `hrv_readings` where `connection_id` = that id AND `measured_at >= <UTC start of the current server date>` AND `measured_at < <UTC start of the next day>`, ordered `measured_at desc`, `.limit(1).maybeSingle()`. No row → skip silently (a later sync writes the reading; V2.1 does not retro-flag a not-yet-synced day — **known limitation**).
    3. `UPDATE` that row's `is_sick` to the logged boolean.
    Use the same server-date UTC day boundary as `logged_for_date` for consistency.
  - `revalidatePath("/hrv")`. Return `{ ok: true }`.

- [ ] **Step 2: `getTodayLifestyleLogs`** — add to `src/lib/data/hrv.ts`: `getTodayLifestyleLogs(memberId: string): Promise<Record<string, unknown>>` — returns a map of `event_type` → `value` for today's logs (so the card can pre-fill). Demo mode → `{}`.

- [ ] **Step 3:** `npx tsc --noEmit && npm run lint` clean. Commit `feat(hrv): lifestyle-log server actions + data read`.

### Task 5: `LifestyleLogCard` component

**Files:** Create `src/components/hrv/LifestyleLogCard.tsx`

- [ ] **Step 1: Implement** a `"use client"` card "I dag" — quick daily logging. Props: `initialLogs: Record<string, unknown>` (today's already-logged values, from `getTodayLifestyleLogs`), `cycleTrackingEnabled: boolean`. Controls per the `value`-shapes table above:
  - Alcohol — a 4-way selector (0 / 1 / 2 / 3+).
  - Sleep — an hours stepper or small number input.
  - Feeling — a 4-way selector (frisk / ok / træt / stresset).
  - Late meal — a toggle.
  - Sick — a toggle ("Syg i dag — udelades fra baseline").
  - Menstrual start — a "Markér menstruation startede i dag" button, **only rendered when `cycleTrackingEnabled`**.
  Each control, on change, calls `logLifestyleEvent(...)` (optimistic UI with rollback on `{ ok: false }`, like the settings toggles). Pre-fill controls from `initialLogs`. Read an existing HRV component (`ConnectionStatus.tsx`, `ReadinessLadder.tsx`) for the monochrome design tokens — no color accents.

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` clean. Commit `feat(hrv): LifestyleLogCard daily quick-log component`.

### Task 6: Wire into `/hrv`

**Files:** Modify `src/app/(app)/hrv/page.tsx`

- [ ] **Step 1:** In the `/hrv` page, render `<LifestyleLogCard>` below the readiness section in **all connected states** — warming-up (`discovery` + `provisional`), `active`, AND `StatePendingFirstSync` (connected but no readings yet — a member can have a sick day before their first sync, so the card belongs there too). NOT in the no-connection state. Demo mode hard-codes `connected: false` → only `StateNotConnected` renders → the card is naturally never reached (no extra guard needed).
  - Fetch `getTodayLifestyleLogs(memberId)` (Task 4).
  - Fetch `cycle_tracking_enabled`: query `hrv_settings` for the member with **`.maybeSingle()`** — a member who never opened HRV settings has **no `hrv_settings` row** (it is created lazily by `setCycleTracking`), so treat a missing row as `cycle_tracking_enabled: false`. Do NOT use `.single()` (it throws on no row).
  - Render `<LifestyleLogCard initialLogs={...} cycleTrackingEnabled={...} />`. Do not regress the existing W1/V1.x `/hrv` states or the `HrvSubNav`.

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` clean. Manual smoke: `npm run dev`, `/hrv` shows the log card; logging a value persists (re-load shows it pre-filled).

- [ ] **Step 3:** Commit `feat(hrv): lifestyle log card on /hrv`.

### Task 7: V2.1 verification

- [ ] **Step 1:** `npm test` — all green (incl. new `lifestyle` tests).
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm run build` — all pass.
- [ ] **Step 3: E2E (connected mode, local Supabase + dogfood data).** `npm run dev`, log in, `/hrv`: log alcohol/sleep/feeling/sick — confirm (via `docker exec ... psql`) `hrv_lifestyle_logs` rows appear, that re-logging the same type the same day **updates** (not duplicates — count stays 1 per type), and that logging `sick` sets `is_sick` on today's `hrv_readings` row if one exists.
- [ ] **Step 4:** Final commit `chore(hrv): V2.1 verification — lifestyle logging complete`.

---

## Done — V2.1 complete

Members log daily lifestyle context; the data lands in `hrv_lifestyle_logs`, one editable row per day per type. **Next:** V2.2 (Claude weekly insights) consumes these logs to surface per-member correlations; V2.3 (coach red-flag queue) reads the `sick`/`feeling` tags for one of its alert conditions.

**Not in V2.1:** the insights engine, the `/hrv/insights` page, the coach queue, session/periodization integration (V2.2-V2.5). Timezone-correct "today" (V2.1 uses the server date) and retro-flagging `is_sick` on a not-yet-synced day are noted limitations for later polish.
