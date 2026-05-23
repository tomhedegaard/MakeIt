# HRV V2.5 — Reps milestones (sync-streak + first-connection bonus)

**Date:** 2026-05-23 · **Spec revision:** 2 (2026-05-23 — corrected column references, switched first-connection seen-mechanism to URL query param)
**Status:** Approved (design)
**Phase:** V2.5 — closes the "Reps integration" slot in the HRV roadmap
**Module path:** integrates into `/hrv`, the OAuth callback, and the existing `/reps` ledger

> Roadmap context: [`2026-05-15-hrv-module-design.md`](./2026-05-15-hrv-module-design.md) §8 ("Reps integration") and §10 (guardrails). The original §8 listed three reward streams — (A) first-connection bonus, (B) sustained sync-streak, (C) insights-reviewed counter. **V2.5 ships A + B only.** Insights-reviewed (C) is deferred until weekly-insights view-tracking exists.

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status |
|---|---|---|
| Reps ledger | `supabase/migrations/0001_init.sql:154` — `reps_transactions(member_id, delta, reason, reference_type, reference_id, created_at)` | Shipped — idempotency via `where not exists` on `(member_id, reference_type)` |
| Streak-events table | `supabase/migrations/0032_hrv_module.sql:116` — `hrv_streak_events` with `milestone int check in (7,14,30,90)` + `unique(member_id, milestone)` + RLS `members_own_streak_events` | Shipped — **gets one new column `seen_at`** in V2.5's migration |
| HRV readings table | `supabase/migrations/0032_hrv_module.sql:60` + alterations in `0037_hrv_wearables.sql:33-45` — `hrv_readings(member_id, measured_at, timezone nullable, …)`. **No `logged_for_date` column** — distinct-day count uses `measured_at` | Shipped — trigger target |
| Available index | `idx_hrv_readings_member_measured` on `(member_id, measured_at desc)` | Shipped — sufficient for the trigger's per-member scan |
| Trigger pattern reference | `supabase/migrations/0015_nutrition_reps.sql` — `award_nutrition_log_reps()` AFTER INSERT trigger with idempotent `where not exists` ledger insert | Shipped — template for V2.5's `award_hrv_sync_streak_reps()` |
| Wearable OAuth callback | `src/app/api/wearables/[provider]/callback/route.ts:134-148` — service-role upsert into `hrv_wearable_connections` | Shipped — V2.5 adds first-connection bonus insert immediately after, gated on `where not exists` |
| Connect-actions | `src/app/(app)/hrv/connect-actions.ts` (`disconnectWearable`, `setCycleTracking`) | Shipped — V2.5 adds one new `markHrvMilestoneSeen(milestone)` action mirroring the same shape |
| Sync cron | `src/app/api/cron/hrv-wearable-sync/route.ts:142-150` — service-role insert into `hrv_readings` | Shipped — DB trigger fires from this insert; **no TypeScript changes needed in the cron handler** |
| `/hrv` page | `src/app/(app)/hrv/page.tsx` | Shipped — new progress line and toast mount here |
| `/reps` page | `src/app/(app)/reps/page.tsx` — chronological ledger reader | Shipped — milestone rows appear automatically; no UI changes |
| `member_action_logs` (NOT used here) | `supabase/migrations/0024_member_action_logs.sql:27` — `action` CHECK is `('plan_regen','meal_swap','weight_log','pref_update')` | Shipped — **deliberately not extended** in V2.5; first-connection celebration uses a URL query param instead of a DB seen-marker |

---

## 1. Overview & positioning

V2.5 turns the existing `hrv_streak_events` skeleton into a working reward loop. Members are paid Reps for **two** kinds of engagement — both tied to actions they actually control:

1. **First-wearable-connection bonus** — +100 Reps, one time per member, lifetime.
2. **Sustained sync-streak** — payouts at 7 / 14 / 30 / 90 *distinct synced days*. Each milestone pays once per member, ever.

Streak is counted as **distinct UTC dates with at least one `hrv_readings` row**, not consecutive calendar days, not member-local dates. This is a deliberate brand choice: HRV sync is plumbing, not a ritual. A member who switches WHOOP→Oura keeps their streak (baseline still resets — that's physics — but the loyalty counter doesn't). A member who travels and forgets the wearable for two days isn't punished. UTC is chosen over member-local because `hrv_readings.timezone` is nullable and unreliable from wearable payloads; the ≤1-day edge-error at date boundaries is irrelevant for a cumulative count.

**Brand positioning.** We pay for staying connected, not for hitting the right HRV value. The §10 guardrails of the master spec are non-negotiable: we never reward a high reading, a recovered reading, or an improved trend — those are outside the member's control. Insights-reviewed (the original "C" reward) is deferred to a later phase, after weekly-insights view-tracking exists.

---

## 2. Goals & non-goals

### Goals

- Pay +100 Reps once, on the member's **first** active wearable connection (any provider).
- Pay 50 / 100 / 200 / 500 Reps at the member's **first time** reaching 7 / 14 / 30 / 90 distinct synced UTC dates.
- Make both rewards **idempotent at the DB level** — no double-pay under reconnects, backfills, or trigger replays.
- Surface progress on `/hrv` so members see what's coming.
- Surface milestone payouts via the existing `/reps` ledger plus a one-time toast on `/hrv`.
- Zero changes to the sync-cron TypeScript path — the trigger handles everything from the moment a reading lands.

### Non-goals (V2.5)

- **Insights-reviewed counter** — deferred. No counter on `hrv_weekly_insights`, no view-tracking, no payout for reading the Sunday insight.
- **Push notifications** for milestones — push is reserved for HRV anomalies / coach alerts (§8 of master spec). Adding milestone push risks members muting HRV push entirely.
- **180 / 365-day milestones** — the existing CHECK constraint covers 7/14/30/90 only. We do not extend it; can be re-evaluated in V2.6+ once we see what fraction of members reach 90.
- **Dedicated `/reps` milestone section** — the existing ledger surfaces the payouts; a separate section would duplicate information.
- **Retroactive payouts** for members already past a milestone at deploy time. See §9 (Rollout).
- **Negative payouts / streak resets** — we never claw back Reps. A member who hits 90 but then has a quiet month keeps the 500.
- **Widening `member_action_logs.action` CHECK** — out of scope for a Reps feature. The first-connection celebration uses a URL query param instead of a DB seen-marker.

### Out of scope (other V2 sub-phases, not V2.5)

- V2.6 — D-prong adaptive periodization (Claude program generator reads 28-day HRV trend).
- V2.7+ — Insights-reviewed reward, requires weekly-insights view-tracking schema first.
- W4 — Native iOS HealthKit companion.

---

## 3. Reward rules

### 3.1 First-connection bonus (+100 Reps)

**Trigger:** the moment the OAuth callback upserts a row in `hrv_wearable_connections` with `status='active'`. Same try/catch boundary as the existing best-effort `registerUser` + initial-sync steps further down the callback.

**Idempotency:** `where not exists (select 1 from reps_transactions where member_id = $1 and reference_type = 'hrv_first_connection')`. Engangs across the member's *entire history*: reconnects, provider switches, disconnect-and-reconnect — none of them pay again.

**Ledger row:**
- `delta = 100`
- `reason = 'Første wearable forbundet'`
- `reference_type = 'hrv_first_connection'` — **this is the idempotency key**
- `reference_id = <connection_id>` — forensic pointer to the connection that triggered the payout, not used for de-duplication

### 3.2 Sync-streak milestones

**Trigger:** AFTER INSERT on `hrv_readings`. The trigger function `award_hrv_sync_streak_reps()` runs on every new row.

**Streak definition:**

```sql
select count(distinct (measured_at at time zone 'UTC')::date)
  from hrv_readings
 where member_id = new.member_id;
```

Member-level, all connections, all providers, all sources (`whoop` / `oura` / `polar` / `apple_health` / `camera_ppg`). The trigger fires after NEW is inserted, so the count already includes the just-inserted row.

**Why distinct-days, not consecutive.** Consecutive-day streaks punish wearable downtime that has nothing to do with loyalty — battery flat, travel, sensor irritation, provider outage. Distinct-days rewards the underlying behavior without the cliff-edge.

**Milestone payouts:**

| Milestone | Reps | `reference_type` |
|---|---|---|
| 7 distinct UTC dates | 50 | `hrv_sync_streak_7` |
| 14 | 100 | `hrv_sync_streak_14` |
| 30 | 200 | `hrv_sync_streak_30` |
| 90 | 500 | `hrv_sync_streak_90` |

Total: 850 Reps over a ~3-month engagement arc. Floor (50) matches `nutrition_reps` cooking-streak; ceiling (500) is 2× a completed session. Calibrated to feel meaningful without devaluing the per-session reward.

**Idempotency:** two layers.
1. `hrv_streak_events` `unique (member_id, milestone)` blocks duplicate event rows at the constraint level.
2. The ledger insert uses `where not exists` on `(member_id, reference_type='hrv_sync_streak_<N>')`.

Both layers must hold. **The single source of truth for "has this member been paid milestone N?" is `reps_transactions`.** `hrv_streak_events` is a denormalized convenience for the `/hrv` UI and audit. If the two get out of sync due to a half-completed earlier deploy, the trigger heals: the ledger insert succeeds even when the event-row insert no-ops, and vice versa.

**Edge case — count crosses multiple milestones in one insert.** If a backfill or batched cron run pushes the count from 6 → 14, the trigger pays *both* the 7- and 14-day milestone in the same invocation. The loop checks `count >= milestone AND not yet paid` per milestone, not `count == milestone`. Historical backfills are correctly compensated.

**Short-circuit.** Once the 90-day milestone row exists in `hrv_streak_events`, the trigger early-returns without running the COUNT — there are no more milestones to pay.

---

## 4. Data path

### 4.1 Trigger function

In migration `0039_hrv_reps_milestones.sql` (see §7):

```sql
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

  -- Distinct UTC dates across all of the member's readings,
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

      -- Event row (denormalized; drives the /hrv UI).
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

drop trigger if exists hrv_readings_streak_reps on public.hrv_readings;
create trigger hrv_readings_streak_reps
  after insert on public.hrv_readings
  for each row execute function public.award_hrv_sync_streak_reps();
```

**Why `security definer`.** The trigger writes to `reps_transactions`, which has RLS allowing only own-row reads. The trigger fires from service-role inserts (sync-cron, OAuth-callback) where this is moot today — but `security definer` future-proofs against a path where a member-context insert into `hrv_readings` becomes legal (e.g. a manual self-log UI). Consistent with `award_nutrition_log_reps`.

**Why no recursive CTE (unlike nutrition).** Nutrition counts a *consecutive* run of days. We count *distinct days*. `count(distinct …)` is a single index-scoped scan — cheaper and clearer than walking backward day-by-day.

### 4.2 First-connection bonus — server-side insert from OAuth callback

In `src/app/api/wearables/[provider]/callback/route.ts`, immediately after the existing upsert at lines 134–148, inside the same `try` block as the connection persistence (because a connection-without-bonus is an acceptable transient state; a bonus-without-connection is not):

```ts
// First-connection bonus — engangs per member, lifetime.
// Idempotent via where-not-exists on (member_id, reference_type).
// Best-effort: failure logs but does not abort the callback —
// the connection has already persisted.
let awardedFirstConnectionBonus = false;
try {
  const { data: existingBonus } = await service
    .from("reps_transactions")
    .select("id")
    .eq("member_id", user.id)
    .eq("reference_type", "hrv_first_connection")
    .maybeSingle();

  if (!existingBonus) {
    const { data: conn } = await service
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
        reference_id: conn?.id ?? null,
      });
    if (!insertError) {
      awardedFirstConnectionBonus = true;
    } else {
      console.error("hrv first-connection bonus insert failed", insertError);
    }
  }
} catch (e) {
  console.error("hrv first-connection bonus path failed", e);
}
```

After the callback finishes its work, append `?welcome_bonus=1` to the redirect URL **iff** `awardedFirstConnectionBonus === true`. The `/hrv` page consumes and strips this query param on first render (see §5.3).

**Why not a server action via `connect-actions.ts`?** The connect-action only launches the OAuth flow — it doesn't insert the connection row. The row is inserted by the callback. The callback is the right home.

**Why query param, not `member_action_logs`?** `member_action_logs.action` has a CHECK constraint of `('plan_regen','meal_swap','weight_log','pref_update')`. Widening it for a one-time UI seen-marker is overkill — the celebration is a transient delight, not an audit trail. The query param disappears after one render; the ledger row is the durable record.

### 4.3 `/hrv` progress reader

New function in `src/lib/data/hrv.ts`:

```ts
export type HrvSyncProgress = {
  daysSynced: number;                     // count(distinct UTC date)
  nextMilestone: 7 | 14 | 30 | 90 | null; // null when all four paid
  nextMilestoneReps: number | null;
  unseenMilestone:
    | { milestone: 7 | 14 | 30 | 90; reps: number }
    | null;                               // for the toast — highest unseen
};

export async function getHrvSyncProgress(memberId: string): Promise<HrvSyncProgress>;
```

Two cheap reads:
1. `select count(distinct (measured_at at time zone 'UTC')::date) from hrv_readings where member_id = $1`.
2. `select milestone, reps_awarded from hrv_streak_events where member_id = $1 and seen_at is null order by milestone desc limit 1` — returns the **highest** unseen milestone (so a stacked 7+14 pay shows the 14-toast, not the 7).

`nextMilestone` is derived in TypeScript from `daysSynced` + the set of already-paid milestones (one extra `select milestone from hrv_streak_events where member_id = $1`): the smallest member of `[7,14,30,90]` not yet in the table. When all four are paid, return `null`.

**Demo mode (`!SUPABASE_ENABLED`).** Returns the natural empty state `{ daysSynced: 0, nextMilestone: 7, nextMilestoneReps: 50, unseenMilestone: null }` — same as a real member with zero readings. No special-case branching.

### 4.4 Mark-seen server action

New action in `src/app/(app)/hrv/connect-actions.ts`, mirroring `setCycleTracking`:

```ts
"use server";
export async function markHrvMilestoneSeen(milestone: number): Promise<void>;
```

Body:
```sql
update hrv_streak_events
   set seen_at = now()
 where member_id = auth.uid()
   and milestone = $1
   and seen_at is null;
```

RLS `members_own_streak_events` (already shipped) covers this — `for all using (member_id = auth.uid())`.

---

## 5. UI

### 5.1 `/hrv` — sync-streak progress line

A passive line mounted under the existing readiness card.

**Visible states:**

- `daysSynced = 0` → render nothing. The connect-flow / warming-up surface already speaks here.
- `daysSynced > 0, nextMilestone != null` → `"Sync-streak: 12 dage · næste milestone om 2 dage (+100 Reps)"`.
- `daysSynced > 0, nextMilestone = null` → `"Sync-streak: 117 dage · alle milestones gennemført"`. Quiet end-state, no progress bar.

No progress bar component, no animated counter — one line, one font weight, one color. Matches the V2.4 readiness-banner aesthetic.

### 5.2 `/hrv` — milestone toast (sync-streak)

When `HrvSyncProgress.unseenMilestone` is non-null, render a dismissible toast:

> *🎉 90-dages HRV-streak nået. +500 Reps tilføjet.*

(Match the existing celebration vocabulary at plan-time — check the form-check / session-completion patterns for emoji conventions and copy in `src/components/` and adjust if those don't use 🎉.)

On render, the toast's client-component effect calls `markHrvMilestoneSeen(milestone)` so the next visit shows nothing.

**Stacked unseen milestones.** If a member is paid 7 *and* 14 in the same insert (count jumped 5 → 14), the toast shows the **highest** milestone only (14). The `/reps` ledger surfaces both payouts; the toast is celebration, not audit. Marking the 14-toast seen also marks the 7-toast seen — implementation: the action accepts a `milestone` arg but the resolver behind `markHrvMilestoneSeen` updates `seen_at` for the targeted row only; the lower milestone's row still has `seen_at is null`, but the §4.3 query returns the *highest* unseen, so the lower one never surfaces a toast (effectively suppressed). This is acceptable — we never want to fire two toasts in sequence.

### 5.3 `/hrv` — first-connection celebration (query param)

When `/hrv` loads with `?welcome_bonus=1` in the URL:

> *🎉 Wearable forbundet. +100 Reps tilføjet.*

The page strips the query param via `history.replaceState` on first mount so a refresh doesn't re-show. No DB read, no seen-flag, no `member_action_logs` row. The ledger row in `reps_transactions` is the durable record.

If a member somehow lands on `/hrv?welcome_bonus=1` without ever having been awarded (e.g. someone pastes the URL): the celebration shows once, then disappears on refresh. Harmless — no Reps are awarded by the page, only by the callback.

### 5.4 `/reps` — no changes

The existing ledger reads `reps_transactions` chronologically. Both bonus types appear automatically with their `reason` text. We add nothing.

---

## 6. Testing

Unit + integration tests live alongside the existing HRV suite (`src/lib/hrv/*.test.ts` for pure logic, RLS/trigger tests via the migration test harness).

### 6.1 SQL trigger — minimum cases

- Fresh member, insert 1st reading → no payout (1 < 7).
- Insert 7 readings spread over 7 distinct UTC dates → exactly one `reps_transactions` row with `reference_type='hrv_sync_streak_7'` and exactly one `hrv_streak_events` row with `milestone=7`.
- Insert a *second* reading on the same UTC date as an existing one → distinct-count unchanged, no payout.
- Insert a *second* reading on the 7th date → no second 7-day payout (idempotency).
- Insert a reading with a backdated `measured_at` on day 5 of an existing 30-day streak → no new payout, distinct-count unchanged.
- Insert a backfill that crosses 7 *and* 14 (count goes 6 → 14) → both milestones paid in the same trigger invocation. Two `reps_transactions` rows, two `hrv_streak_events` rows.
- Insert from a *second* connection (provider switch) → distinct-count is at member level, switch does not reset; milestones accrue.
- Insert after the 90-day milestone is already paid → trigger early-returns, no COUNT query (observable in PG `EXPLAIN`).
- UTC date-boundary case: two readings ~1 minute apart on either side of midnight UTC count as **two** distinct days. Documented behavior — accepted as ≤1-day edge-error.

### 6.2 First-connection bonus — minimum cases

- Member with zero connections completes OAuth → 1 `reps_transactions` row with `reference_type='hrv_first_connection'`, `delta=100`. Redirect URL contains `?welcome_bonus=1`.
- Same member disconnects and re-connects → no second bonus row. Redirect URL does **not** contain `?welcome_bonus=1`.
- Same member connects a second provider (WHOOP after Oura) → no second bonus row, no `?welcome_bonus=1`.
- OAuth callback raises after the connection upsert but before the bonus insert → next reconnect of the same provider retries the bonus path and the `where not exists` check awards it.

### 6.3 `/hrv` UI

- `daysSynced=0` → progress line absent.
- `daysSynced=5` → "Sync-streak: 5 dage · næste milestone om 2 dage (+50 Reps)".
- `daysSynced=117` (all four paid) → "Sync-streak: 117 dage · alle milestones gennemført".
- Unseen 30-day milestone → toast renders, calls `markHrvMilestoneSeen(30)`, second visit shows nothing.
- Stacked unseen (7 and 14 both `seen_at is null`) → toast shows 14 only; subsequent loads show nothing (the lower milestone never surfaces).
- `?welcome_bonus=1` in URL → first-connection toast renders once, query param disappears from URL, refresh shows nothing.

### 6.4 RLS / authorization

- A member cannot mark another member's milestone as seen (existing `members_own_streak_events` policy blocks; verify with a deliberate cross-member call).
- `reps_transactions` RLS already enforces own-row read; no new policies needed.

---

## 7. Migration `0039_hrv_reps_milestones.sql`

Idempotent, additive. No data changes outside V2.5's tables.

Order:
1. `alter table hrv_streak_events add column if not exists seen_at timestamptz;`
2. `create or replace function award_hrv_sync_streak_reps()` (body in §4.1).
3. `drop trigger if exists hrv_readings_streak_reps on hrv_readings;`
4. `create trigger hrv_readings_streak_reps after insert on hrv_readings for each row execute function award_hrv_sync_streak_reps();`

**Header comment must call out:**
- "Adds the read-receipt column for milestone toasts."
- "Registers the AFTER INSERT trigger that pays sync-streak Reps."
- "No backfill — members past a milestone at deploy time accrue the milestone naturally within ~5 days of normal sync. See spec §9.2."

No changes to `member_action_logs.action` CHECK. No changes to `hrv_streak_events.milestone` CHECK (no 180/365 in this phase). No changes to RLS.

---

## 8. Guardrails — what we refuse to do (V2.5-specific)

- **Never reward the HRV value itself.** No "you recovered!" bonus, no "improved baseline" bonus, no "balanced ANS" bonus. The reward layer touches only sync existence and milestone counts.
- **Never claw back.** A member who paused for 2 months keeps every Rep they earned.
- **No push for milestones.** Push channel is reserved for HRV anomalies and coach alerts (§8 of master spec).
- **No leaderboards / peer comparisons of streak counts.** Out of brand (§2 of master spec).
- **No insights-reviewed counter in V2.5.** Deferred. If we ship it half-built ("reward for clicking the insight"), members game the click and the signal dies.
- **Trigger function is scoped tightly.** It selects from `hrv_readings` and writes to `hrv_streak_events` + `reps_transactions`. It does not touch `members`, `subscriptions`, `member_settings`, or any non-HRV table.

---

## 9. Rollout & verification

### 9.1 Deploy steps

1. Migration `0039_hrv_reps_milestones.sql` ships first. The trigger immediately starts paying milestones for *new* `hrv_readings` inserts.
2. The callback patch (§4.2) ships in the same deploy. First-connection bonuses start awarding on the next OAuth callback.
3. The `/hrv` UI changes (§5.1, §5.2, §5.3) ship in the same deploy. Progress line and toasts go live immediately.

All three pieces are in one PR — partial rollouts would let members hit the bonus path without seeing the celebration, or see the celebration query param without an awarded bonus.

### 9.2 No retroactive payout

Members already past a milestone at deploy time do **not** get retroactively paid. The trigger pays only on AFTER INSERT. A retroactive script would require coordinating event-row inserts with ledger inserts manually and runs the risk of double-paying members whose next sync happens to land mid-script.

**Cost of skipping retro:** trivial — the streak counter is cumulative, so a member already at 25 distinct days hits the 30-day milestone within ~5 days of normal sync and is paid then. Documented in the migration header comment.

### 9.3 Same rule for first-connection bonus

Members already connected at deploy time do **not** get the +100. The bonus exists to drive new onboarding; pre-existing members got the value of the module pre-bonus. Documented in §2.

### 9.4 Demo mode

The cron and the callback are both gated on `SUPABASE_ENABLED`. In demo mode there are no inserts on `hrv_readings`, no OAuth callbacks, no service-role writes — the trigger and the callback insert are unreachable. `/hrv` returns the natural empty `HrvSyncProgress` (§4.3) and renders no progress line, no toasts.

### 9.5 Manual verification on staging

After staging deploy, with a connected test account:
1. `select count(distinct (measured_at at time zone 'UTC')::date) from hrv_readings where member_id = <test>;` — note baseline N.
2. Insert one synthetic `hrv_readings` row with `measured_at = now() + interval '1 day'` (forces a new distinct date). Confirm:
   - If N+1 equals 7/14/30/90: one new `hrv_streak_events` row and one new `reps_transactions` row.
   - Otherwise: no new rows.
3. Visit `/hrv`: progress line reflects the new count; toast renders if a milestone fired.
4. Click through dismiss; refresh `/hrv`: toast does not re-render; `hrv_streak_events.seen_at` is populated.
5. Visit `/reps`: ledger shows the new milestone row.

---

## 10. Phasing of V2 remainder (for context)

| Phase | Scope | Status |
|---|---|---|
| V2.4 | Session readiness nudge (B-prong, pure) | Shipped (2026-05-21) |
| **V2.5** | **Reps milestones — A+B (this spec)** | **Design approved** |
| V2.6 | D-prong adaptive periodization (Claude reads 28-day HRV trend in program-generator) | Not yet planned |
| V2.7+ | Insights-reviewed reward (the deferred "C" from §8 of master spec) — requires weekly-insights view-tracking schema | Backlog |
| W4 | Native iOS HealthKit companion | Separate sub-project |

---

## 11. Open questions / future work

- **Insights-reviewed counter (deferred).** When V2.7+ tackles this, we need a `hrv_weekly_insights.viewed_at` column or equivalent. Likely a separate small migration; payout calibration TBD (probably 25 Reps / weekly-insight reviewed, with a per-week cap of 1).
- **Possible 180/365 milestones.** Re-evaluate when telemetry shows the 90-day completion rate. If a significant cohort plateaus there with a long active sync history, a 180 milestone (+1000 Reps?) might be worth adding via a CHECK-constraint widening migration.
- **Member-local timezone for streak counting.** UTC is the V2.5 choice — simple, deterministic, ≤1-day edge-error. If the V2.6 D-prong needs day-level alignment to the member's actual calendar (likely yes — periodization is weekly), the streak counter can be migrated to a member-timezone derivation in lockstep. Requires either a member-level timezone column (we'd add to `members` or `hrv_settings`) or per-row `hrv_readings.timezone` to become reliable.
- **Streak visibility in coach UI.** Munk currently has no view of member streaks. Probably worth a small line on the coach member-detail card in a later phase; out of scope here.
- **HrvSettings consolidation (note from V2.4 review).** If V2.6 adds another `hrv_settings` boolean, consolidate the three near-identical server actions (`setCycleTracking`, `setSessionSuggestionEnabled`, +1) into `updateHrvSettings(partial)`. V2.5 does not touch `hrv_settings`, so this stays deferred.
- **Connection-churn anti-gaming.** If a member disconnects/reconnects the same provider repeatedly to game *anything*, the current rules don't pay them — the streak counts readings (not connections), and the first-connection bonus is idempotent. We don't need anti-gaming code in this phase.
