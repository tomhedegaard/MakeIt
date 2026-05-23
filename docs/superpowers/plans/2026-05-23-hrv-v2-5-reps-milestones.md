# HRV V2.5 — Reps milestones implementation plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pay members Reps for (A) their first wearable connection (+100, lifetime engangs) and (B) reaching distinct-day sync milestones at 7/14/30/90 (+50/+100/+200/+500, each engangs). Surface progress and celebrations on `/hrv`. Zero changes to the sync-cron TypeScript path.

**Architecture:** One Postgres migration (`0039_hrv_reps_milestones.sql`) adds a `seen_at` column to `hrv_streak_events` and installs an `AFTER INSERT` trigger on `hrv_readings` that pays milestone Reps with two-layer idempotency. The OAuth callback awards the first-connection bonus right after persisting the connection (best-effort, idempotent via `where not exists`) and threads a `?welcome_bonus=1` query param into the redirect. `/hrv` reads progress via a new data function, renders a one-line progress display plus two toasts (milestone payouts use a `seen_at` DB marker; welcome-bonus uses a URL-stripped query param).

**Tech Stack:** Next.js 16, React 19 (server components), Supabase (Postgres triggers + RLS), TypeScript 5, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md`](../specs/2026-05-23-hrv-v2-5-reps-milestones-design.md) (rev 2).

**Depends on (shipped):**
- `reps_transactions(member_id, delta, reason, reference_type, reference_id, created_at)` from `0001_init.sql:154`.
- `hrv_readings(member_id, measured_at, …)` with index `idx_hrv_readings_member_measured` on `(member_id, measured_at desc)` from `0032_hrv_module.sql:60-84`.
- `hrv_streak_events(member_id, milestone int check in (7,14,30,90), reps_awarded, triggered_at, unique(member_id, milestone))` with RLS `members_own_streak_events` from `0032_hrv_module.sql:116-122`.
- `hrv_wearable_connections` (status='active') + OAuth callback at `src/app/api/wearables/[provider]/callback/route.ts`.
- `setSessionSuggestionEnabled` server-action template at `src/app/(app)/hrv/connect-actions.ts:218`.
- `StateActive` HRV-page component at `src/app/(app)/hrv/page.tsx:347`.
- `member_action_logs` is **not** used — its CHECK constraint forbids new actions and we deliberately don't widen it.

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `supabase/migrations/0039_hrv_reps_milestones.sql` | (a) `alter hrv_streak_events add column if not exists seen_at timestamptz`. (b) `award_hrv_sync_streak_reps()` plpgsql function (security definer): short-circuits when 90-milestone exists, otherwise counts distinct UTC dates and pays every unpaid milestone with two-layer idempotency. (c) AFTER INSERT trigger on `hrv_readings`. |
| `src/lib/hrv/progress.ts` | Pure logic — `deriveSyncProgress({ daysSynced, paidMilestones, latestUnseen }) → HrvSyncProgress`. Takes already-fetched data, returns the typed shape. Zero Supabase, fully unit-testable in Node. |
| `src/lib/hrv/progress.test.ts` | Unit tests for `deriveSyncProgress` (10 fixtures covering: zero readings; mid-progression; just-paid milestone; stacked unseen; all four paid; empty unseen). |
| `src/components/hrv/HrvSyncStreakLine.tsx` | Server component — renders the one-line progress display from a `HrvSyncProgress` prop. Returns `null` when `daysSynced=0`. |
| `src/components/hrv/HrvMilestoneToast.tsx` | Client component — dismissible toast that calls `markHrvMilestoneSeen` on mount-effect. Sole responsibility: the sync-streak celebration. |
| `src/components/hrv/HrvWelcomeBonusToast.tsx` | Client component — reads `?welcome_bonus=1`, renders the +100 celebration once, strips the query param via `history.replaceState`. |

**Modified files:**

| Path | Change |
|---|---|
| `src/lib/data/hrv.ts` | Add `HrvSyncProgress` type + `getHrvSyncProgress(memberId)` I/O wrapper. Three Supabase reads (distinct-date count, paid milestones, highest unseen). Delegates the typed-shape derivation to `deriveSyncProgress` from `src/lib/hrv/progress.ts`. |
| `src/app/(app)/hrv/connect-actions.ts` | Add `markHrvMilestoneSeen(milestone: number)` — mirrors `setSessionSuggestionEnabled` shape. Updates `hrv_streak_events.seen_at = now()` for the calling member's row with that milestone. |
| `src/app/api/wearables/[provider]/callback/route.ts` | Insert first-connection bonus into `reps_transactions` (best-effort, idempotent via `where not exists`) between the existing connection upsert (line 148) and the initial-sync block (line 162). Append `?welcome_bonus=1` to the success redirect at line 234 iff the bonus was just awarded. |
| `src/app/(app)/hrv/page.tsx` | Call `getHrvSyncProgress(member.id)` on the supabase branch. Mount `<HrvWelcomeBonusToast />` + `<HrvMilestoneToast />` near the top of the Container (above `HrvSubNav`). Mount `<HrvSyncStreakLine progress={progress} />` inside `StateActive`'s render (below the readiness card). |
| `src/lib/supabase/database.types.ts` | Regenerated via `npm run db:types` after the migration runs. `hrv_streak_events.seen_at: string \| null` appears in Row/Insert/Update. |

**No changes to:** the sync-cron handler (the trigger handles everything), `/reps/page.tsx` (existing ledger surfaces the rows automatically), RLS policies, `hrv_settings`, `hrv_readings` columns, `member_action_logs`.

---

## Chunk 1: Migration & trigger

The migration is the foundation — everything downstream reads or relies on either the new column or the trigger's writes. One task creates the migration; one task verifies the trigger end-to-end against a local Supabase before any TS code goes in.

### Task 1: Migration `0039_hrv_reps_milestones.sql`

**Files:**
- Create: `supabase/migrations/0039_hrv_reps_milestones.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated)

- [ ] **Step 1: Read `node_modules/next/dist/docs/` only if you touch Next.js code in this task.** This task is pure SQL — skip. Read `supabase/migrations/0015_nutrition_reps.sql` once as the pattern reference (`security definer`, `set search_path`, `where not exists` ledger insert, `on conflict do nothing` event-row insert).

- [ ] **Step 2: Write the migration.** Create `supabase/migrations/0039_hrv_reps_milestones.sql`:

  ```sql
  -- =================================================================
  -- MakeIt // HQ — HRV V2.5 Reps milestones
  -- =================================================================
  -- (a) Adds hrv_streak_events.seen_at — read-receipt for the /hrv
  --     milestone toast (clears the celebration after one view).
  --
  -- (b) Installs award_hrv_sync_streak_reps() — an AFTER INSERT
  --     trigger on hrv_readings that pays sync-streak Reps as the
  --     member crosses 7 / 14 / 30 / 90 distinct UTC dates of synced
  --     readings.
  --
  --     Streak semantics:
  --       - distinct (measured_at at time zone 'UTC')::date, all
  --         providers, all sources — member-level.
  --       - one-time per (member_id, milestone): two-layer
  --         idempotency via the unique constraint on
  --         hrv_streak_events AND a where-not-exists check on
  --         reps_transactions.reference_type. The ledger is the
  --         source of truth; the event row is a denormalised
  --         convenience for the /hrv UI.
  --       - count crosses multiple milestones in one insert? All
  --         unpaid milestones are paid in the same trigger
  --         invocation.
  --       - short-circuit once the 90-day milestone is recorded —
  --         no more milestones to pay, skip the COUNT.
  --
  -- No backfill — members already past a milestone at deploy time
  -- are paid at their next sync that crosses the next threshold.
  -- See spec §9.2.
  --
  -- Additive, idempotent — safe to re-run.
  -- =================================================================

  -- ---------- hrv_streak_events: seen_at ----------
  alter table public.hrv_streak_events
    add column if not exists seen_at timestamptz;

  -- ---------- trigger function ----------
  create or replace function public.award_hrv_sync_streak_reps()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_distinct_days integer := 0;
    v_milestone     integer;
    v_payout        integer;
    v_streak_ref    text;
  begin
    -- Short-circuit: if the 90-day milestone is already recorded,
    -- there is nothing more to pay. Avoids a COUNT on every sync
    -- past day 90.
    if exists (
      select 1 from public.hrv_streak_events
      where member_id = new.member_id and milestone = 90
    ) then
      return new;
    end if;

    -- Distinct UTC dates across ALL of the member's readings,
    -- including NEW. Uses idx_hrv_readings_member_measured.
    select count(distinct (measured_at at time zone 'UTC')::date)
      into v_distinct_days
      from public.hrv_readings
     where member_id = new.member_id;

    -- Pay every unpaid milestone the member has now passed.
    foreach v_milestone in array array[7, 14, 30, 90] loop
      if v_distinct_days >= v_milestone then
        v_payout := case v_milestone
                      when 7  then 50
                      when 14 then 100
                      when 30 then 200
                      when 90 then 500
                    end;
        v_streak_ref := 'hrv_sync_streak_' || v_milestone::text;

        -- Event row (denormalised; drives the /hrv UI).
        insert into public.hrv_streak_events
          (member_id, milestone, reps_awarded)
        values
          (new.member_id, v_milestone, v_payout)
        on conflict (member_id, milestone) do nothing;

        -- Ledger row (source of truth for "paid").
        insert into public.reps_transactions
          (member_id, delta, reason, reference_type, reference_id)
        select new.member_id, v_payout,
               'HRV sync-streak: ' || v_milestone::text || ' dage',
               v_streak_ref, new.id
        where not exists (
          select 1 from public.reps_transactions
          where member_id      = new.member_id
            and reference_type = v_streak_ref
        );
      end if;
    end loop;

    return new;
  end;
  $$;

  -- ---------- trigger ----------
  drop trigger if exists hrv_readings_streak_reps on public.hrv_readings;
  create trigger hrv_readings_streak_reps
    after insert on public.hrv_readings
    for each row execute function public.award_hrv_sync_streak_reps();

  -- ---------- read-side RPC: distinct-day count ----------
  -- PostgREST cannot express count(distinct expr) in a select.
  -- This RPC mirrors the trigger's COUNT — single source of truth
  -- for "how many distinct UTC dates has this member synced".
  -- security invoker (the default) — the caller's RLS applies and
  -- only own-row hrv_readings are visible. No security definer
  -- needed because the function only reads.
  create or replace function public.get_hrv_distinct_day_count(p_member_id uuid)
  returns integer
  language sql
  stable
  as $$
    select count(distinct (measured_at at time zone 'UTC')::date)::integer
      from public.hrv_readings
     where member_id = p_member_id;
  $$;

  grant execute on function public.get_hrv_distinct_day_count(uuid)
    to authenticated;
  ```

- [ ] **Step 3: Lint the migration.**

  ```bash
  npm run db:lint
  ```

  Expected: no errors. `db:lint` runs `supabase db lint` against the new file. If it complains about `security definer` without `set search_path`, the `set search_path = public` line satisfies it.

- [ ] **Step 4: Apply locally.**

  ```bash
  npm run db:reset
  ```

  Expected: migration runs cleanly; supabase shell reports `Applying migration 0039_hrv_reps_milestones.sql...` with no errors. Re-run a second time to confirm idempotency — the `add column if not exists`, `create or replace function`, and `drop trigger if exists` / `create trigger` lines all tolerate re-application.

- [ ] **Step 5: Regenerate database types.**

  ```bash
  npm run db:types
  ```

  Expected: `src/lib/supabase/database.types.ts` updates. Run `git diff src/lib/supabase/database.types.ts` and confirm the diff is **only**:
  - `hrv_streak_events.seen_at: string | null` appearing in Row, Insert, and Update.
  - A new `get_hrv_distinct_day_count` entry under the `Functions` section with `Args: { p_member_id: string }` and `Returns: number`.

  No other tables changed.

- [ ] **Step 6: Typecheck.**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. (No callers yet — but a sanity gate before commit.)

- [ ] **Step 7: Commit.**

  ```bash
  git add supabase/migrations/0039_hrv_reps_milestones.sql src/lib/supabase/database.types.ts
  git commit -m "feat(hrv): migration 0039 — sync-streak Reps trigger + RPC

  Adds:
  - hrv_streak_events.seen_at (read-receipt for /hrv toast)
  - award_hrv_sync_streak_reps() AFTER INSERT trigger that pays
    Reps at 7/14/30/90 distinct UTC dates of synced readings.
    Two-layer idempotency (unique constraint + ledger
    where-not-exists). Short-circuits once the 90-day milestone
    is recorded.
  - get_hrv_distinct_day_count(uuid) RPC — read-side counterpart
    so the /hrv page can fetch the count via a single PostgREST
    call instead of walking all reading rows.

  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md §3, §4, §7

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 2: Trigger verification against local Supabase

**Files:** None (uses the running local stack from Task 1).

This task is *verification*, not testing. The project has no SQL integration-test harness (the nutrition_reps trigger has no automated test either). We verify the trigger by exercising it through `supabase db` shell against the local DB. The output of these queries IS the test.

- [ ] **Step 1: Open a psql shell against the local supabase.**

  ```bash
  npx supabase db psql
  ```

  Verify the trigger is registered:

  ```sql
  select tgname, tgenabled
    from pg_trigger
   where tgrelid = 'public.hrv_readings'::regclass
     and tgname = 'hrv_readings_streak_reps';
  ```

  Expected: one row, `tgenabled='O'` (enabled).

- [ ] **Step 2: Create a throwaway test member + active connection.**

  ```sql
  -- Reuses the seed member if present; otherwise create one.
  -- The supabase auth schema is bypassed here — we insert directly
  -- into public.members (the existing seed pattern).
  insert into public.members (id, email, display_name)
  values ('00000000-0000-0000-0000-00000000beef',
          'streak-test@example.com',
          'Streak Test')
  on conflict (id) do nothing;

  insert into public.hrv_wearable_connections
    (id, member_id, provider, access_token, status, is_primary)
  values
    ('00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-00000000beef',
     'whoop', 'fake-cipher', 'active', true)
  on conflict (member_id, provider) do nothing;
  ```

  Expected: no errors. (If the test member happens to exist with a different shape, adjust the seed columns to match local schema — the FK is the only hard requirement.)

- [ ] **Step 3: Insert 6 readings on 6 distinct UTC dates — should NOT pay any milestone.**

  ```sql
  -- Clean slate for the test member.
  delete from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type like 'hrv_sync_streak_%';
  delete from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef';
  delete from public.hrv_readings
   where member_id = '00000000-0000-0000-0000-00000000beef';

  -- 6 readings, days 1-6 (UTC).
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  select '00000000-0000-0000-0000-00000000beef',
         ('2026-05-01 06:00:00 UTC'::timestamptz + (d || ' days')::interval),
         'whoop', 'high', 35.0, 3.55, 'discovery'
    from generate_series(0, 5) d;

  -- Expect zero ledger / event rows.
  select count(*) as paid
    from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type like 'hrv_sync_streak_%';
  -- Expected: paid=0.

  select count(*) as events
    from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef';
  -- Expected: events=0.
  ```

- [ ] **Step 4: Insert the 7th reading on a 7th distinct date — should pay exactly the 7-day milestone.**

  ```sql
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  values ('00000000-0000-0000-0000-00000000beef',
          '2026-05-07 06:00:00 UTC'::timestamptz,
          'whoop', 'high', 35.0, 3.55, 'discovery');

  select milestone, reps_awarded, seen_at
    from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef';
  -- Expected: exactly one row, milestone=7, reps_awarded=50, seen_at IS NULL.

  select delta, reason, reference_type
    from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type like 'hrv_sync_streak_%';
  -- Expected: exactly one row, delta=50, reference_type='hrv_sync_streak_7'.
  ```

- [ ] **Step 5: Insert a second reading on day 7 — distinct-count unchanged, no second payout.**

  ```sql
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  values ('00000000-0000-0000-0000-00000000beef',
          '2026-05-07 22:00:00 UTC'::timestamptz,
          'whoop', 'high', 35.0, 3.55, 'discovery');

  select count(*) as paid
    from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type = 'hrv_sync_streak_7';
  -- Expected: paid=1 (still).
  ```

- [ ] **Step 6: Stacked milestones — jump count from 7 to 14 in one insert.**

  ```sql
  -- Add 7 more distinct dates (days 8-14). The 7th of these crosses
  -- the 14-day threshold. The 14-day milestone should pay; the
  -- 7-day milestone is already paid and must not re-pay.
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  select '00000000-0000-0000-0000-00000000beef',
         ('2026-05-08 06:00:00 UTC'::timestamptz + (d || ' days')::interval),
         'whoop', 'high', 35.0, 3.55, 'discovery'
    from generate_series(0, 6) d;

  select milestone, reps_awarded
    from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef'
   order by milestone;
  -- Expected: two rows: (7, 50) and (14, 100).

  select reference_type, delta
    from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type like 'hrv_sync_streak_%'
   order by created_at;
  -- Expected: two rows: (hrv_sync_streak_7, 50) and
  --                     (hrv_sync_streak_14, 100).
  ```

- [ ] **Step 7: Cross 30 and 90 in one large insert — pays both, single trigger invocation.**

  ```sql
  -- Push the count from 14 → 90 in one batch insert.
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  select '00000000-0000-0000-0000-00000000beef',
         ('2026-05-15 06:00:00 UTC'::timestamptz + (d || ' days')::interval),
         'whoop', 'high', 35.0, 3.55, 'discovery'
    from generate_series(0, 75) d;

  select milestone, reps_awarded
    from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef'
   order by milestone;
  -- Expected: four rows: (7, 50), (14, 100), (30, 200), (90, 500).

  select sum(delta) as total
    from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type like 'hrv_sync_streak_%';
  -- Expected: total = 850.
  ```

- [ ] **Step 8: Short-circuit — insert after 90 is recorded, COUNT is skipped.**

  ```sql
  -- We can't directly observe "COUNT was skipped", but we can
  -- confirm no spurious writes happen on further inserts.
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  values ('00000000-0000-0000-0000-00000000beef',
          '2027-01-01 06:00:00 UTC'::timestamptz,
          'whoop', 'high', 35.0, 3.55, 'discovery');

  select count(*) as events
    from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef';
  -- Expected: events=4 (no change).
  ```

  (Optional: prefix the insert with `EXPLAIN ANALYZE` and confirm no scan over `hrv_readings` happens — the short-circuit query is the only one executed. Not required for sign-off.)

- [ ] **Step 9: UTC date-boundary case — two readings ~1 minute apart across midnight UTC count as two distinct days.**

  ```sql
  -- Clean slate again.
  delete from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef'
     and reference_type like 'hrv_sync_streak_%';
  delete from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef';
  delete from public.hrv_readings
   where member_id = '00000000-0000-0000-0000-00000000beef';

  -- One reading just before midnight UTC; one just after.
  insert into public.hrv_readings
    (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd,
     warm_up_state)
  values
    ('00000000-0000-0000-0000-00000000beef',
     '2026-05-01 23:59:30 UTC'::timestamptz,
     'whoop', 'high', 35.0, 3.55, 'discovery'),
    ('00000000-0000-0000-0000-00000000beef',
     '2026-05-02 00:00:30 UTC'::timestamptz,
     'whoop', 'high', 35.0, 3.55, 'discovery');

  select count(distinct (measured_at at time zone 'UTC')::date) as distinct_days
    from public.hrv_readings
   where member_id = '00000000-0000-0000-0000-00000000beef';
  -- Expected: distinct_days=2.
  ```

- [ ] **Step 10: Cleanup test member.**

  ```sql
  delete from public.reps_transactions
   where member_id = '00000000-0000-0000-0000-00000000beef';
  delete from public.hrv_streak_events
   where member_id = '00000000-0000-0000-0000-00000000beef';
  delete from public.hrv_readings
   where member_id = '00000000-0000-0000-0000-00000000beef';
  delete from public.hrv_wearable_connections
   where member_id = '00000000-0000-0000-0000-00000000beef';
  delete from public.members
   where id = '00000000-0000-0000-0000-00000000beef';
  ```

- [ ] **Step 11: Commit verification.** No code changes — this is a checkpoint between the SQL chunk and the TS chunks.

  ```bash
  git commit --allow-empty -m "chore(hrv): verify 0039 trigger against local supabase

  Manually exercised the AFTER INSERT trigger:
  - 6 readings → no payout
  - 7 readings → +50 (milestone 7)
  - duplicate same-date insert → no second payout
  - jump 7→14 → +100 stacked
  - jump 14→90 → +200 + +500 stacked, total 850
  - post-90 insert → short-circuit, no work
  - UTC date-boundary → counts both sides

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 2: First-connection bonus path

The OAuth callback already persists the connection and runs a best-effort initial sync. We splice the bonus insert between those two steps and thread a `?welcome_bonus=1` query param into the success redirect.

### Task 3: First-connection bonus in OAuth callback

**Files:**
- Modify: `src/app/api/wearables/[provider]/callback/route.ts`

- [ ] **Step 1: Read `node_modules/next/dist/docs/`** for the relevant Next.js APIs you're about to touch — `NextResponse.redirect`, route handler request shape. The callback already uses `NextResponse.redirect(new URL(path, request.url))` via the local `redirectTo` helper at line 21; you only need to confirm the helper accepts the path-with-query form. (It does — `new URL("/hrv?welcome_bonus=1", request.url)` is a well-formed URL.)

- [ ] **Step 2: Declare the bonus-awarded flag OUTSIDE the outer try block.** The outer try starts around line 89 (`try { ... } catch (error) { ... return redirectTo(...connect_failed) }` at lines 228–231) and the success redirect at line 234 is *after* the catch. A `let` declared inside the outer try would be out of scope at line 234.

  Find the existing top-of-handler block where local variables (`user`, `tokens`, etc.) get resolved, and add this declaration **before** the outer try opens:

  ```ts
  // V2.5: tracks whether the first-wearable-connection +100 Reps
  // bonus fired during this callback. Read at line 234's redirect
  // to thread ?welcome_bonus=1 into the success URL. Declared at
  // the top scope so it survives the outer try/catch.
  let awardedFirstConnectionBonus = false;
  ```

  Locate the right home: just above the outer `try {` that wraps the whole post-OAuth-exchange block. If multiple try blocks exist, this one is the one whose catch returns `connect_failed`.

- [ ] **Step 3: Insert the bonus path inside the outer try.** Immediately after the connection upsert at line 148 and **before** the existing `try { await providerImpl.registerUser?.(...) }` block at line 156, add the bonus-award block in its own inner try/catch:

  ```ts
  // First-wearable-connection bonus (+100 Reps), engangs per
  // member, lifetime. Idempotent via where-not-exists on
  // (member_id, reference_type='hrv_first_connection'). Best-
  // effort: a failure here is logged but never aborts the
  // callback — the connection has already persisted.
  try {
    const { data: existingBonus } = await service
      .from("reps_transactions")
      .select("id")
      .eq("member_id", user.id)
      .eq("reference_type", "hrv_first_connection")
      .maybeSingle();

    if (!existingBonus) {
      // Resolve the connection_id we just upserted, for forensics.
      const { data: bonusConn } = await service
        .from("hrv_wearable_connections")
        .select("id")
        .eq("member_id", user.id)
        .eq("provider", provider)
        .maybeSingle();

      const { error: insertError } = await service
        .from("reps_transactions")
        .insert({
          member_id: user.id,
          delta: 100,
          reason: "Første wearable forbundet",
          reference_type: "hrv_first_connection",
          reference_id: bonusConn?.id ?? null,
        });

      if (insertError) {
        console.error(
          "[wearables/callback] first-connection bonus insert failed:",
          insertError,
        );
      } else {
        awardedFirstConnectionBonus = true;
      }
    }
  } catch (bonusError) {
    console.error(
      "[wearables/callback] first-connection bonus path failed:",
      bonusError,
    );
  }
  ```

  `awardedFirstConnectionBonus` is the top-level `let` from Step 2 — it's mutated here and read at line 234.

- [ ] **Step 4: Thread the query param into the success redirect.** Change the existing line 234:

  ```ts
  // Before:
  return redirectTo(request, "/hrv");

  // After:
  return redirectTo(
    request,
    awardedFirstConnectionBonus ? "/hrv?welcome_bonus=1" : "/hrv",
  );
  ```

  The error-path redirect (`return redirectTo(request, "/hrv?error=connect_failed")` at line 230) is unchanged — error and welcome-bonus are mutually exclusive (the bonus path is unreachable when the outer catch fires before line 234).

- [ ] **Step 5: Typecheck.**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 6: Lint.**

  ```bash
  npx next lint
  ```

  Expected: no errors. The new block follows the file's existing pattern of `service.from(...).select(...).maybeSingle()` and named error logging.

- [ ] **Step 7: Manual verification against local supabase.**

  Start the local stack if not already running:

  ```bash
  npm run db:start && npm run dev
  ```

  Then, in `npx supabase db psql`:

  ```sql
  -- Confirm there is NO existing bonus for the test member.
  select id, delta, reference_type
    from public.reps_transactions
   where member_id = '<your local member uuid>'
     and reference_type = 'hrv_first_connection';
  -- Expected: zero rows.
  ```

  Walk through the OAuth flow in the browser (or use a saved mock callback URL hitting `/api/wearables/whoop/callback?code=...&state=...`). After redirect:

  ```sql
  -- After the callback completes:
  select id, delta, reference_type, reference_id
    from public.reps_transactions
   where member_id = '<your local member uuid>'
     and reference_type = 'hrv_first_connection';
  -- Expected: exactly one row, delta=100, reference_id matches
  --           the connection id.
  ```

  Browser URL after redirect: should be `/hrv?welcome_bonus=1` (query param visible until the toast strips it in Chunk 4).

  Disconnect (via existing `disconnectWearable` action) and reconnect:

  ```sql
  select count(*) from public.reps_transactions
   where member_id = '<your local member uuid>'
     and reference_type = 'hrv_first_connection';
  -- Expected: still 1 row. Idempotency holds.
  ```

  Redirect URL after reconnect: should be `/hrv` (no welcome_bonus param — the where-not-exists check found the existing bonus, so `awardedFirstConnectionBonus` stayed false).

- [ ] **Step 8: Commit.**

  ```bash
  git add src/app/api/wearables/\[provider\]/callback/route.ts
  git commit -m "feat(hrv): +100 Reps first-wearable-connection bonus

  Awards +100 Reps in reps_transactions with
  reference_type='hrv_first_connection' on the first OAuth callback
  for any provider. Idempotent via where-not-exists — reconnects
  and provider switches never re-pay. Threads ?welcome_bonus=1
  into the success redirect so /hrv can render the celebration.

  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md §3.1, §4.2

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 3: Data layer

Two pieces: a pure derivation function (unit-testable) and an I/O wrapper (Supabase reads), plus a server action for marking milestones seen. All consumed by the UI in Chunk 4.

### Task 4: Pure `deriveSyncProgress` + tests

**Files:**
- Create: `src/lib/hrv/progress.ts`
- Create: `src/lib/hrv/progress.test.ts`

- [ ] **Step 1: Write the failing tests first.** Create `src/lib/hrv/progress.test.ts`:

  ```ts
  import { describe, it, expect } from "vitest";
  import {
    deriveSyncProgress,
    type DeriveSyncProgressInput,
    type HrvSyncProgress,
  } from "./progress";

  function input(
    over: Partial<DeriveSyncProgressInput> = {},
  ): DeriveSyncProgressInput {
    return {
      daysSynced: 0,
      paidMilestones: [],
      latestUnseen: null,
      ...over,
    };
  }

  describe("deriveSyncProgress", () => {
    it("returns empty progress when daysSynced=0", () => {
      expect(deriveSyncProgress(input())).toEqual<HrvSyncProgress>({
        daysSynced: 0,
        nextMilestone: 7,
        nextMilestoneReps: 50,
        unseenMilestone: null,
      });
    });

    it("returns nextMilestone=7 when below 7 with no paid milestones", () => {
      expect(deriveSyncProgress(input({ daysSynced: 5 })).nextMilestone).toBe(7);
      expect(
        deriveSyncProgress(input({ daysSynced: 5 })).nextMilestoneReps,
      ).toBe(50);
    });

    it("returns nextMilestone=14 when 7 is paid", () => {
      expect(
        deriveSyncProgress(input({ daysSynced: 12, paidMilestones: [7] }))
          .nextMilestone,
      ).toBe(14);
    });

    it("returns nextMilestone=30 when 7 and 14 are paid", () => {
      expect(
        deriveSyncProgress(
          input({ daysSynced: 22, paidMilestones: [7, 14] }),
        ).nextMilestone,
      ).toBe(30);
    });

    it("returns nextMilestone=90 when 7, 14, 30 are paid", () => {
      expect(
        deriveSyncProgress(
          input({ daysSynced: 60, paidMilestones: [7, 14, 30] }),
        ).nextMilestone,
      ).toBe(90);
    });

    it("returns nextMilestone=null when all four milestones paid", () => {
      expect(
        deriveSyncProgress(
          input({
            daysSynced: 117,
            paidMilestones: [7, 14, 30, 90],
          }),
        ),
      ).toEqual<HrvSyncProgress>({
        daysSynced: 117,
        nextMilestone: null,
        nextMilestoneReps: null,
        unseenMilestone: null,
      });
    });

    it("nextMilestoneReps is the canonical payout for the nextMilestone", () => {
      // 7→50, 14→100, 30→200, 90→500.
      expect(
        deriveSyncProgress(input({ daysSynced: 0 })).nextMilestoneReps,
      ).toBe(50);
      expect(
        deriveSyncProgress(input({ daysSynced: 8, paidMilestones: [7] }))
          .nextMilestoneReps,
      ).toBe(100);
      expect(
        deriveSyncProgress(input({ daysSynced: 25, paidMilestones: [7, 14] }))
          .nextMilestoneReps,
      ).toBe(200);
      expect(
        deriveSyncProgress(
          input({ daysSynced: 75, paidMilestones: [7, 14, 30] }),
        ).nextMilestoneReps,
      ).toBe(500);
    });

    it("surfaces latestUnseen verbatim", () => {
      const result = deriveSyncProgress(
        input({
          daysSynced: 30,
          paidMilestones: [7, 14, 30],
          latestUnseen: { milestone: 30, reps: 200 },
        }),
      );
      expect(result.unseenMilestone).toEqual({ milestone: 30, reps: 200 });
    });

    it("unseenMilestone is null when no row was unseen", () => {
      const result = deriveSyncProgress(
        input({ daysSynced: 30, paidMilestones: [7, 14, 30] }),
      );
      expect(result.unseenMilestone).toBeNull();
    });

    it("paidMilestones order does not matter", () => {
      expect(
        deriveSyncProgress(
          input({ daysSynced: 22, paidMilestones: [14, 7] }),
        ).nextMilestone,
      ).toBe(30);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail.**

  ```bash
  npx vitest run src/lib/hrv/progress.test.ts
  ```

  Expected: 10 failing — `Cannot find module './progress'` or equivalent.

- [ ] **Step 3: Implement `deriveSyncProgress`.** Create `src/lib/hrv/progress.ts`:

  ```ts
  /**
   * HRV V2.5 — pure sync-progress derivation.
   *
   * Takes already-fetched data (distinct-day count, the set of
   * milestones the member has been paid, and optionally the most
   * recent unseen milestone) and returns the typed shape consumed
   * by /hrv. Zero Supabase, zero React — fully unit-testable.
   *
   * Milestone ladder is fixed: 7 → 50, 14 → 100, 30 → 200, 90 → 500
   * (matches award_hrv_sync_streak_reps trigger in
   * migration 0039_hrv_reps_milestones.sql).
   */

  export type MilestoneDay = 7 | 14 | 30 | 90;

  const MILESTONE_LADDER: ReadonlyArray<{
    day: MilestoneDay;
    reps: number;
  }> = [
    { day: 7, reps: 50 },
    { day: 14, reps: 100 },
    { day: 30, reps: 200 },
    { day: 90, reps: 500 },
  ];

  export type HrvSyncProgress = {
    /** count(distinct UTC-date) of the member's hrv_readings. */
    daysSynced: number;
    /** Smallest unpaid milestone; null when all four are paid. */
    nextMilestone: MilestoneDay | null;
    /** Payout for `nextMilestone`; null when `nextMilestone` is null. */
    nextMilestoneReps: number | null;
    /** The highest-milestone row still `seen_at is null`, for the toast. */
    unseenMilestone: { milestone: MilestoneDay; reps: number } | null;
  };

  export type DeriveSyncProgressInput = {
    daysSynced: number;
    paidMilestones: ReadonlyArray<number>;
    latestUnseen: { milestone: MilestoneDay; reps: number } | null;
  };

  export function deriveSyncProgress(
    input: DeriveSyncProgressInput,
  ): HrvSyncProgress {
    const paid = new Set<number>(input.paidMilestones);
    const next = MILESTONE_LADDER.find((m) => !paid.has(m.day)) ?? null;

    return {
      daysSynced: input.daysSynced,
      nextMilestone: next ? next.day : null,
      nextMilestoneReps: next ? next.reps : null,
      unseenMilestone: input.latestUnseen,
    };
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass.**

  ```bash
  npx vitest run src/lib/hrv/progress.test.ts
  ```

  Expected: 10 passing.

- [ ] **Step 5: Commit.**

  ```bash
  git add src/lib/hrv/progress.ts src/lib/hrv/progress.test.ts
  git commit -m "feat(hrv): deriveSyncProgress + 10 unit tests

  Pure derivation function that turns (daysSynced, paidMilestones,
  latestUnseen) into the typed HrvSyncProgress shape consumed by
  /hrv. Single source of truth for the milestone ladder
  (7/14/30/90 → 50/100/200/500) on the read side; trigger is
  source on the write side.

  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md §4.3

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 5: `getHrvSyncProgress` I/O wrapper + `markHrvMilestoneSeen` action

**Files:**
- Modify: `src/lib/data/hrv.ts`
- Modify: `src/app/(app)/hrv/connect-actions.ts`

- [ ] **Step 1: Add the I/O wrapper to `src/lib/data/hrv.ts`.** After the existing `getTodaysReadinessNudge` definition, add:

  ```ts
  // V2.5 — sync-streak progress for /hrv.
  // See spec §4.3.
  export type { HrvSyncProgress } from "@/lib/hrv/progress";

  import {
    deriveSyncProgress,
    type MilestoneDay,
  } from "@/lib/hrv/progress";

  /**
   * Reads three cheap queries from Supabase and feeds them into the
   * pure deriveSyncProgress for the typed shape:
   *
   *   1. count(distinct (measured_at at time zone 'UTC')::date) from
   *      hrv_readings — the member's total distinct synced days.
   *   2. The set of milestones already paid (rows in hrv_streak_events).
   *   3. The highest-milestone row still `seen_at is null` — drives the
   *      one-shot toast on /hrv.
   *
   * Demo mode (no Supabase): returns the empty state — no special path,
   * same as a real member with zero readings.
   */
  export async function getHrvSyncProgress(
    memberId: string,
  ): Promise<HrvSyncProgress> {
    const supabase = await createClient();
    if (!supabase) {
      return deriveSyncProgress({
        daysSynced: 0,
        paidMilestones: [],
        latestUnseen: null,
      });
    }

    // (1) distinct-day count via the RPC added in migration 0039.
    // Postgres counts inside the DB — symmetric with the trigger's
    // own COUNT and no row-cap risk for high-N members.
    const { data: rpcCount, error: countError } = await supabase.rpc(
      "get_hrv_distinct_day_count",
      { p_member_id: memberId },
    );
    if (countError) {
      console.error("[getHrvSyncProgress] count RPC failed:", countError);
      return deriveSyncProgress({
        daysSynced: 0,
        paidMilestones: [],
        latestUnseen: null,
      });
    }
    const daysSynced: number = rpcCount ?? 0;

    // (2) Paid milestones.
    const { data: paidRows, error: paidError } = await supabase
      .from("hrv_streak_events")
      .select("milestone")
      .eq("member_id", memberId);
    if (paidError) {
      console.error("[getHrvSyncProgress] paid query failed:", paidError);
    }
    const paidMilestones: number[] = (paidRows ?? []).map(
      (r) => r.milestone,
    );

    // (3) Highest unseen milestone — drives the toast. Highest, not
    // lowest, so a stacked 7+14 pay shows the 14-toast.
    const { data: unseenRow, error: unseenError } = await supabase
      .from("hrv_streak_events")
      .select("milestone, reps_awarded")
      .eq("member_id", memberId)
      .is("seen_at", null)
      .order("milestone", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (unseenError) {
      console.error("[getHrvSyncProgress] unseen query failed:", unseenError);
    }

    const latestUnseen = unseenRow
      ? {
          milestone: unseenRow.milestone as MilestoneDay,
          reps: unseenRow.reps_awarded,
        }
      : null;

    return deriveSyncProgress({ daysSynced, paidMilestones, latestUnseen });
  }
  ```

  > **Why the RPC.** PostgREST cannot express `count(distinct expr)` natively. We could fetch all `measured_at` rows and dedupe client-side, but high-N members (5 years of daily syncs ≈ 1825 rows) would hit the PostgREST default 1000-row cap and silently return a wrong count. The RPC `get_hrv_distinct_day_count` (defined in migration 0039) counts inside Postgres — symmetric with the trigger and bounded by an index scan on `idx_hrv_readings_member_measured`.

- [ ] **Step 2: Add the mark-seen server action to `src/app/(app)/hrv/connect-actions.ts`.** Mirror the existing `setSessionSuggestionEnabled` (line 218) exactly:

  ```ts
  /**
   * Marks the calling member's milestone row as seen, so the /hrv
   * toast disappears on the next page load. No-op in demo mode.
   * RLS members_own_streak_events covers this — the service-role
   * client is therefore overkill but matches the pattern in this
   * file (which always uses createServiceClient for mutations and
   * filters on member_id explicitly).
   */
  export async function markHrvMilestoneSeen(
    milestone: number,
  ): Promise<ActionResult> {
    if (!SUPABASE_ENABLED) return { ok: true };

    const memberId = await getCurrentMemberId();
    if (!memberId) return { ok: false, error: "no_session" };

    const service = createServiceClient();
    const { error } = await service
      .from("hrv_streak_events")
      .update({ seen_at: new Date().toISOString() })
      .eq("member_id", memberId)
      .eq("milestone", milestone)
      .is("seen_at", null);

    if (error) return { ok: false, error: "update_failed" };

    revalidatePath("/hrv");
    return { ok: true };
  }
  ```

- [ ] **Step 3: Typecheck.**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Lint.**

  ```bash
  npx next lint
  ```

  Expected: no errors.

- [ ] **Step 5: Unit-test sanity sweep** (the existing nudge / baseline / etc tests must still pass — we haven't changed any of their inputs, but a typo in `hrv.ts` could break the imports).

  ```bash
  npx vitest run
  ```

  Expected: all green.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/lib/data/hrv.ts src/app/\(app\)/hrv/connect-actions.ts
  git commit -m "feat(hrv): getHrvSyncProgress + markHrvMilestoneSeen action

  Read-side wiring: three Supabase queries (distinct-day count,
  paid milestones, highest unseen) feed deriveSyncProgress for the
  typed HrvSyncProgress shape. Mark-seen action mirrors the
  setSessionSuggestionEnabled shape and updates seen_at on the
  member's own row only.

  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md §4.3, §4.4

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 4: UI

Three components: the progress line on `StateActive`, the milestone toast, the welcome-bonus toast. The page wires them together. No new tests — the V2.4 plan precedent is "pure logic gets unit tests, JSX/Supabase gets manual dogfood".

### Task 6: `HrvSyncStreakLine` + page wiring inside `StateActive`

**Files:**
- Create: `src/components/hrv/HrvSyncStreakLine.tsx`
- Modify: `src/app/(app)/hrv/page.tsx`

- [ ] **Step 1: Create the progress-line component.** `src/components/hrv/HrvSyncStreakLine.tsx`:

  ```tsx
  import type { HrvSyncProgress } from "@/lib/hrv/progress";

  type Props = { progress: HrvSyncProgress };

  /**
   * V2.5 sync-streak progress line for /hrv.
   *
   * Three visible states (spec §5.1):
   *   - daysSynced = 0 → render nothing
   *   - daysSynced > 0, nextMilestone != null → "Sync-streak: N
   *     dage · næste milestone om M dage (+R Reps)"
   *   - daysSynced > 0, nextMilestone = null → "Sync-streak: N
   *     dage · alle milestones gennemført"
   */
  export function HrvSyncStreakLine({ progress }: Props) {
    if (progress.daysSynced === 0) return null;

    const { daysSynced, nextMilestone, nextMilestoneReps } = progress;

    let detail: string;
    if (nextMilestone === null || nextMilestoneReps === null) {
      detail = "alle milestones gennemført";
    } else {
      const remaining = nextMilestone - daysSynced;
      detail =
        remaining <= 0
          ? `næste milestone i dag (+${nextMilestoneReps} Reps)`
          : `næste milestone om ${remaining} ${
              remaining === 1 ? "dag" : "dage"
            } (+${nextMilestoneReps} Reps)`;
    }

    return (
      <p
        className="text-xs text-fg-dim"
        data-testid="hrv-sync-streak-line"
      >
        Sync-streak: {daysSynced} {daysSynced === 1 ? "dag" : "dage"} · {detail}
      </p>
    );
  }
  ```

  Singular/plural handled both for the count and the "om M dage" gap. Edge case where `remaining <= 0` (count already at or past the milestone but the trigger hasn't fired yet — possible during a between-cron window) renders "næste milestone i dag" rather than "om -1 dage".

- [ ] **Step 2: Wire the progress line into `HrvPage`.** Don't change `StateActive`'s signature — both `StateActive` and `StateWarmingUp` render a `<section>` card, and the progress line should appear under whichever one is mounted. Keep the line outside the state components so it works uniformly. Its own `daysSynced === 0` guard auto-hides it for `StateNotConnected` and `StatePendingFirstSync`.

  In `src/app/(app)/hrv/page.tsx`:

  1. Add the imports near the top of the file (alongside the existing `getTodayLifestyleLogs` and `LifestyleLogCard` imports):

     ```ts
     import { getHrvSyncProgress } from "@/lib/data/hrv";
     import { HrvSyncStreakLine } from "@/components/hrv/HrvSyncStreakLine";
     ```

  2. Inside `HrvPage()`, after `state` is resolved (around the current line 173) and before the JSX `return (...)`, fetch progress unconditionally. The function is demo-safe — it returns the empty state when Supabase is unavailable:

     ```ts
     const progress = await getHrvSyncProgress(member.id);
     ```

  3. In the JSX `return`, insert `<HrvSyncStreakLine progress={progress} />` immediately after the `state.needsReauth` block and the state-switch ternary, before `{lifestyleCard}`. Concretely, find this existing block (around lines 212–230):

     ```tsx
     {!state.connected ? (
       <StateNotConnected />
     ) : state.latest && state.latest.warmUpState !== "active" ? (
       <StateWarmingUp ... />
     ) : state.latest ? (
       <StateActive ... />
     ) : (
       <StatePendingFirstSync ... />
     )}

     {lifestyleCard}
     ```

     Insert the line between the ternary and `{lifestyleCard}`:

     ```tsx
     {!state.connected ? (
       <StateNotConnected />
     ) : state.latest && state.latest.warmUpState !== "active" ? (
       <StateWarmingUp ... />
     ) : state.latest ? (
       <StateActive ... />
     ) : (
       <StatePendingFirstSync ... />
     )}

     <HrvSyncStreakLine progress={progress} />

     {lifestyleCard}
     ```

  The existing `<Container className="space-y-8">` provides the vertical rhythm — no extra wrapper needed.

- [ ] **Step 3: Typecheck.**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Manual dogfood.** With local supabase running and a member who has at least one `hrv_readings` row in the active state:

  - Visit `/hrv` — verify the line "Sync-streak: N dage · næste milestone om M dage (+R Reps)" appears below the readiness card.
  - Insert two more readings on distinct UTC dates via psql:
    ```sql
    insert into public.hrv_readings (member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd, warm_up_state)
    values
      ('<you>', now() - interval '1 day', 'whoop', 'high', 35.0, 3.55, 'active'),
      ('<you>', now() - interval '2 day', 'whoop', 'high', 35.0, 3.55, 'active');
    ```
    Refresh `/hrv` — the day count goes up by 2.
  - Edit `progress` via SQL (temporarily inject all four milestones into `hrv_streak_events` for the test member) — refresh and verify the line says "alle milestones gennemført".
  - Clean up: `delete from public.hrv_streak_events where member_id = '<you>';`

- [ ] **Step 5: Commit.**

  ```bash
  git add src/components/hrv/HrvSyncStreakLine.tsx src/app/\(app\)/hrv/page.tsx
  git commit -m "feat(hrv): sync-streak progress line on /hrv

  One-line passive display under the readiness card on /hrv,
  showing distinct-day count and the next milestone with payout.
  Singular/plural for both 'dag'/'dage' and the remaining-gap.
  Rendered only when daysSynced > 0; quiet end-state when all
  four milestones gennemført.

  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md §5.1

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 7: Milestone toast + welcome-bonus toast + page mounts

**Files:**
- Create: `src/components/hrv/HrvMilestoneToast.tsx`
- Create: `src/components/hrv/HrvWelcomeBonusToast.tsx`
- Modify: `src/app/(app)/hrv/page.tsx`

- [ ] **Step 1: Create the milestone toast.** `src/components/hrv/HrvMilestoneToast.tsx`:

  ```tsx
  "use client";

  import { useEffect, useState } from "react";
  import { markHrvMilestoneSeen } from "@/app/(app)/hrv/connect-actions";
  import type { MilestoneDay } from "@/lib/hrv/progress";

  type Props = {
    unseen: { milestone: MilestoneDay; reps: number } | null;
  };

  /**
   * V2.5 sync-streak milestone celebration toast (spec §5.2).
   *
   * Renders only when an unseen milestone row exists. The on-mount
   * effect calls markHrvMilestoneSeen so the next /hrv visit shows
   * nothing. Dismiss button is purely cosmetic — the seen-flag is
   * what determines visibility on subsequent loads.
   */
  export function HrvMilestoneToast({ unseen }: Props) {
    const [visible, setVisible] = useState(unseen !== null);

    useEffect(() => {
      if (unseen) {
        void markHrvMilestoneSeen(unseen.milestone);
      }
    }, [unseen]);

    if (!visible || !unseen) return null;

    return (
      <div
        role="status"
        aria-live="polite"
        className="surface-2 rounded-2xl px-4 py-3 text-sm flex items-center gap-3"
        style={{ borderColor: "var(--line-bright)" }}
        data-testid="hrv-milestone-toast"
      >
        <span aria-hidden="true">🎉</span>
        <span className="flex-1">
          {unseen.milestone}-dages HRV-streak nået. +{unseen.reps} Reps tilføjet.
        </span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-fg-dim"
          aria-label="Luk besked"
        >
          Luk
        </button>
      </div>
    );
  }
  ```

  > **Emoji check at plan-execution time.** Read `src/components/sessions/SessionCompleteCelebration.tsx` (or whichever component owns the session-completion celebration). If it uses an emoji of 🎉, match it. If it uses a different glyph or no emoji at all, drop the `<span aria-hidden>🎉</span>` from this component and the welcome-bonus toast below. The spec §5.2 explicitly defers this to plan-time inspection.

- [ ] **Step 2: Create the welcome-bonus toast.** `src/components/hrv/HrvWelcomeBonusToast.tsx`:

  ```tsx
  "use client";

  import { useEffect, useState } from "react";
  import { useSearchParams } from "next/navigation";

  /**
   * V2.5 first-wearable-connection celebration toast (spec §5.3).
   *
   * Triggered by the ?welcome_bonus=1 query param that the OAuth
   * callback appends on a fresh bonus award. Strips the param from
   * the URL on mount via history.replaceState so a refresh does
   * NOT re-show the toast. No DB state.
   */
  export function HrvWelcomeBonusToast() {
    const searchParams = useSearchParams();
    const hasParam = searchParams?.get("welcome_bonus") === "1";
    const [visible, setVisible] = useState(hasParam);

    useEffect(() => {
      if (hasParam && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("welcome_bonus");
        window.history.replaceState({}, "", url.toString());
      }
    }, [hasParam]);

    if (!visible) return null;

    return (
      <div
        role="status"
        aria-live="polite"
        className="surface-2 rounded-2xl px-4 py-3 text-sm flex items-center gap-3"
        style={{ borderColor: "var(--line-bright)" }}
        data-testid="hrv-welcome-bonus-toast"
      >
        <span aria-hidden="true">🎉</span>
        <span className="flex-1">Wearable forbundet. +100 Reps tilføjet.</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-fg-dim"
          aria-label="Luk besked"
        >
          Luk
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 3: Mount both toasts on the page.** In `src/app/(app)/hrv/page.tsx`, near the top of the Container (just below `<HrvSubNav />`, above the needsReauth alert):

  ```tsx
  <HrvWelcomeBonusToast />
  <HrvMilestoneToast unseen={progress.unseenMilestone} />
  ```

  Add the imports:

  ```ts
  import { HrvMilestoneToast } from "@/components/hrv/HrvMilestoneToast";
  import { HrvWelcomeBonusToast } from "@/components/hrv/HrvWelcomeBonusToast";
  ```

- [ ] **Step 4: Typecheck.**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Lint.**

  ```bash
  npx next lint
  ```

  Expected: no errors.

- [ ] **Step 6: Manual dogfood — milestone toast.** With the local supabase running:

  ```sql
  -- Inject an unseen milestone row for the test member.
  insert into public.hrv_streak_events (member_id, milestone, reps_awarded, seen_at)
  values ('<you>', 7, 50, null)
  on conflict (member_id, milestone) do update set seen_at = null;
  ```

  Visit `/hrv`. Verify:
  - Toast appears at top of page: "7-dages HRV-streak nået. +50 Reps tilføjet."
  - Refresh `/hrv` — toast is gone (`seen_at` populated by the on-mount effect).
  - SQL check: `select milestone, seen_at from public.hrv_streak_events where member_id = '<you>' and milestone = 7;` — `seen_at` is non-null.

  Cross-check stacked behaviour:

  ```sql
  insert into public.hrv_streak_events (member_id, milestone, reps_awarded, seen_at)
  values ('<you>', 7, 50, null), ('<you>', 14, 100, null)
  on conflict (member_id, milestone) do update set seen_at = null;
  ```

  Visit `/hrv`. Verify the toast shows **14** (the higher milestone), not 7. Refresh — toast is gone. Verify in SQL that the 14-row's `seen_at` is set but the 7-row's `seen_at` is still null (the page query selected only the highest unseen, so only 14 was marked).

- [ ] **Step 7: Manual dogfood — welcome-bonus toast.** Visit `/hrv?welcome_bonus=1` directly. Verify:
  - Toast appears: "Wearable forbundet. +100 Reps tilføjet."
  - URL strips the `?welcome_bonus=1` param immediately (the address bar shows `/hrv` after a beat).
  - Refresh the page — toast does not re-render (param is gone).

- [ ] **Step 8: Clean up test rows.**

  ```sql
  update public.hrv_streak_events
     set seen_at = now()
   where member_id = '<you>' and seen_at is null;
  ```

  (Or `delete` them — they were injected manually for the test.)

- [ ] **Step 9: Commit.**

  ```bash
  git add src/components/hrv/HrvMilestoneToast.tsx src/components/hrv/HrvWelcomeBonusToast.tsx src/app/\(app\)/hrv/page.tsx
  git commit -m "feat(hrv): milestone + welcome-bonus celebration toasts

  Two client components mounted on /hrv:
  - HrvMilestoneToast: renders when the highest unseen row in
    hrv_streak_events exists for the current member; on mount,
    calls markHrvMilestoneSeen so subsequent visits show nothing.
  - HrvWelcomeBonusToast: renders when ?welcome_bonus=1 is in
    the URL; strips the param via history.replaceState so a
    refresh does not re-show it.

  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md §5.2, §5.3

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 5: Verification

Final sanity sweep + shipping commit. Matches the pattern from prior HRV phases.

### Task 8: Full suite + build + verification commit

**Files:** None — verification only.

- [ ] **Step 1: Run the full unit-test suite.**

  ```bash
  npx vitest run
  ```

  Expected: all green. Includes the 10 new `deriveSyncProgress` tests in `src/lib/hrv/progress.test.ts` alongside the pre-existing HRV tests (nudge, baseline, alert, insights, lifestyle, ppg, rmssd, trend-chart).

- [ ] **Step 2: Typecheck + lint.**

  ```bash
  npx tsc --noEmit && npx next lint
  ```

  Expected: no errors.

- [ ] **Step 3: Production build.**

  ```bash
  npm run build
  ```

  Expected: build succeeds. `/hrv` still builds as a dynamic route (it always was — it reads cookies via Supabase). No new dynamic routes introduced. The two new client components add ~3 KB to the `/hrv` chunk; acceptable.

- [ ] **Step 4: SQL re-verification on a clean local DB.** Defence against any "works on my machine" drift:

  ```bash
  npm run db:reset
  ```

  Then in psql, repeat the Chunk 1 / Task 2 verification queries (Steps 2–9 of Task 2). Expected: identical outcomes — the migration is deterministic.

- [ ] **Step 5: End-to-end dogfood checklist.** With local supabase + dev server running and the test member set up:

  - [ ] Fresh member with zero readings → `/hrv` shows no sync-streak line, no toasts. Connect a wearable through the OAuth flow → land on `/hrv?welcome_bonus=1` → toast appears → URL becomes `/hrv` → toast persists until dismissed or refresh.
  - [ ] After first sync produces 1 reading → `/hrv` shows "Sync-streak: 1 dag · næste milestone om 6 dage (+50 Reps)".
  - [ ] Inject 6 more readings on distinct UTC dates via psql → `/hrv` shows the 7-day toast on next visit, and `/reps` ledger shows a new "+50 HRV sync-streak: 7 dage" row.
  - [ ] Refresh `/hrv` → no toast, line now says "Sync-streak: 7 dage · næste milestone om 7 dage (+100 Reps)".
  - [ ] Disconnect + reconnect via UI → no new `+100 hrv_first_connection` row in `reps_transactions` → no welcome-bonus query param on redirect → no toast.
  - [ ] `/reps` ledger displays the milestone payouts and the first-connection bonus with their `reason` text.

- [ ] **Step 6: Verification commit** (matches the chore-verification pattern from earlier phases — `caf2cea`, `b7d6062`, `2efcac5`):

  ```bash
  git commit --allow-empty -m "chore(hrv): V2.5 verification — Reps milestones complete

  Plan: docs/superpowers/plans/2026-05-23-hrv-v2-5-reps-milestones.md
  Spec: docs/superpowers/specs/2026-05-23-hrv-v2-5-reps-milestones-design.md

  Verified:
  - 10 new deriveSyncProgress tests pass; full vitest suite green.
  - tsc + lint + build clean.
  - Migration 0039 applies cleanly + is re-runnable.
  - SQL verification reproduced on clean local DB: 0/7/14/30/90
    payout thresholds, idempotency, stacked-milestone behaviour,
    short-circuit after 90, UTC date-boundary case.
  - Manual dogfood: welcome-bonus toast (one-shot, URL-stripped);
    milestone toast (one-shot, seen_at marker); progress line
    plural/singular; /reps ledger surfaces both payout kinds.

  Closes V2.5 — Reps milestones slot in the HRV roadmap.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

- [ ] **Step 7: Push the branch** (deployment happens automatically via the existing Vercel git integration):

  ```bash
  git push origin claude/makeit-online-platform-XF2UE
  ```

---

## Risk & rollback

- **Scope of change is small** — one SQL migration, one server-action addition, one OAuth-callback patch (~50 lines), one pure data function, three small UI components, one page wiring change. No new dependencies, no new cron, no new Claude call.
- **DB-side is the highest-risk piece** — the trigger writes to `reps_transactions`, which directly affects the member's Reps balance shown across the app. Mitigations: (a) idempotency at two layers prevents double-pay; (b) the short-circuit means existing high-frequency members past day 90 incur no extra work; (c) the trigger is read-restricted to two tables; (d) manual SQL verification on a clean DB is mandatory before shipping (Task 8 Step 4).
- **No retroactive payout** — explicitly chosen in spec §9.2. Members already past a milestone will hit the next threshold within ~days of normal sync and be paid then. No member is permanently denied; the cost is at most a few extra days of waiting.
- **Rollback path** — revert the merge in three steps if needed:
  1. Revert the UI commits (Tasks 6, 7) → `/hrv` returns to pre-V2.5 layout. Safe at any time.
  2. Revert the OAuth-callback patch (Task 3) → no more first-connection bonuses awarded. Existing bonus rows remain in the ledger.
  3. Drop the trigger + function via a follow-up migration:
     ```sql
     drop trigger if exists hrv_readings_streak_reps on public.hrv_readings;
     drop function if exists public.award_hrv_sync_streak_reps();
     ```
     Existing `hrv_streak_events` and `reps_transactions` rows remain — they are valid ledger history regardless of whether the trigger is live.
- **Demo mode** — `SUPABASE_ENABLED=false` makes the OAuth callback unreachable, the cron unreachable, and `getHrvSyncProgress` return the natural empty state. No toasts, no progress line, no surprises.
