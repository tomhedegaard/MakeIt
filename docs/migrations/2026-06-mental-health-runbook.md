# Søjle 5 — Mental Health Pillar migration runbook

**Date:** 2026-06-08
**Branch:** `claude/makeit-online-platform-XF2UE`
**Scope:** apply migrations 0045 → 0046 → 0047 → 0048 → 0049 + regenerate `database.types.ts` against live Supabase.

> This runbook covers the cumulative migration debt for Søjle 4 (0045, still pending per memory) and Søjle 5 (0046, 0047, 0048). Run them as one block.

---

## 0. Pre-flight

Before you touch the live DB:

```bash
# 1. Confirm local Supabase CLI is linked to the live project
supabase status
supabase projects list

# 2. Confirm you're on the right branch with all four migrations present
cd ~/MakeIt
git status                                # clean tree
ls supabase/migrations | grep -E "00(45|46|47|48)_"
# expect:
#   0045_crew_coaching_pyramid_v0.sql
#   0046_mental_health_pillar_v0.sql
#   0047_mental_cirkel_posts.sql
#   0048_mind_hero_polish.sql

# 3. Backup the live DB (cheap insurance — Supabase has automated
#    backups but a manual snapshot here costs nothing).
#    In Supabase dashboard: Project → Database → Backups → "Create backup".
```

**Rule of thumb**: every migration is idempotent (`if not exists`, `on conflict do nothing`, `drop policy if exists ... create policy ...`). Re-running a migration that's already been applied is safe.

---

## 1. Apply migrations — Supabase dashboard SQL editor

Order matters. 0046 depends on 0045 (the `mind_check_visible_to()` helper references `buddy_pairs` from 0045). Run sequentially, verify after each.

### 1a. Apply 0045 — Crew Coaching Pyramid v0

In Supabase dashboard → **SQL Editor** → New query.

```bash
# Open the file:
cat supabase/migrations/0045_crew_coaching_pyramid_v0.sql
```

Paste the contents, click **Run**. Expect 0 errors.

**Verification:**

```sql
-- Tables created
select count(*) as t from information_schema.tables
 where table_schema = 'public'
   and table_name in (
     'buddy_pairs','buddy_interactions','co_coach_assignments',
     'coach_reviews','coaching_lessons','lesson_progress',
     'coach_quality_scores'
   );
-- expect: 7

-- Munk is tagged
select handle, coach_tier from public.members
 where lower(handle) = 'munk' or email = 'munk@nowmakeit.eu';
-- expect: coach_tier = 'munk'

-- is_current_user_munk() function exists
select pg_get_functiondef('public.is_current_user_munk()'::regprocedure);
```

If the Munk row isn't there yet (fresh DB), the bootstrap is a no-op. Re-run safely after creating the member.

### 1b. Apply 0046 — Mental Health Pillar v0

```bash
cat supabase/migrations/0046_mental_health_pillar_v0.sql
```

Paste, **Run**.

**Verification:**

```sql
-- New tables
select count(*) as t from information_schema.tables
 where table_schema = 'public'
   and table_name in (
     'mental_settings','mind_check_logs','journal_entries',
     'mental_sessions','mental_session_completions',
     'mental_coach_outputs','mental_cirkler','mental_cirkel_members',
     'mental_settings_log'
   );
-- expect: 9

-- 8 hero sessions seeded
select count(*) as hero_count from public.mental_sessions where is_hero = true;
-- expect: 8

-- Helper function present
select pg_get_functiondef('public.mind_check_visible_to(uuid,uuid)'::regprocedure);

-- members.acknowledged_mental_disclaimer_at column
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'members'
   and column_name = 'acknowledged_mental_disclaimer_at';
```

**RLS smoke-test** (as a non-Munk member via the JS client, NOT in SQL editor):
- Insert your own mind_check_logs row → succeeds
- Read another member's journal_entries → empty result (RLS blocks)

### 1c. Apply 0047 — Mental Cirkler Posts

```bash
cat supabase/migrations/0047_mental_cirkel_posts.sql
```

Paste, **Run**.

**Verification:**

```sql
select count(*) as t from information_schema.tables
 where table_schema = 'public'
   and table_name in ('mental_cirkel_posts','mental_cirkel_post_reactions');
-- expect: 2

-- Constraints exist
select conname from pg_constraint
 where conname like 'mental_cirkel_posts%' or conname like 'mental_cirkel_post_reactions%';
-- expect: includes mental_cirkel_posts_one_per_week_uidx + others
```

### 1d. Apply 0048 — Hero session polish round 1

```bash
cat supabase/migrations/0048_mind_hero_polish.sql
```

Paste, **Run**.

**Verification:**

```sql
-- The 4 updated sessions should have ≥ 800 chars in body_md
select slug, length(body_md) as chars
  from public.mental_sessions
 where slug in (
   'coherence-5-5-da',
   'pre-session-priming-da',
   'wind-down-beast-mode-da',
   'debrief-bad-session-da'
 );
-- expect: all four rows, chars > 800 for the long ones
```

### 1e. Apply 0049 — Hero session polish round 2 + EN parity

```bash
cat supabase/migrations/0049_mind_hero_polish_complete_plus_en.sql
```

Paste, **Run**.

**Verification:**

```sql
-- All 8 DA hero sessions are now polished (≥ 600 chars each)
select slug, length(body_md) as chars
  from public.mental_sessions
 where is_hero = true and locale = 'da'
 order by slug;
-- expect: 8 rows, all chars > 600

-- 8 EN hero sessions seeded
select count(*) as en_count from public.mental_sessions
 where is_hero = true and locale = 'en';
-- expect: 8
```

---

## 2. Regenerate `database.types.ts`

```bash
cd ~/MakeIt
npm run db:types
git diff src/lib/supabase/database.types.ts | head -60
```

Expect a large diff with the new tables. Commit it:

```bash
git add src/lib/supabase/database.types.ts
git commit -m "chore(db): regenerate types after 0045-0049 (Søjle 5)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## 3. Optional post-cleanup — remove the `mindDb()` untyped wrapper

Once `database.types.ts` knows about all the new tables, the `mindDb()` shim in `src/lib/data/mind.ts` is no longer needed.

```bash
# Find all call sites
grep -rn "mindDb(" src/
# Each call is of the form:  mindDb(supabase).from("mental_settings")...
# Rewrite each to:           supabase.from("mental_settings")...
```

Then delete the `mindDb` export + the `UntypedTable`/`UntypedClient` interfaces from `src/lib/data/mind.ts`. Run `npm run lint && npx tsc --noEmit` after; the typed `from(...)` calls should compile cleanly against the new generated types.

**This is optional** — the wrapper works fine. Worth doing within a sprint of the migrations landing, before the shim becomes ambient.

---

## 4. Cron sanity — verify the three new schedules

```bash
cat vercel.json | jq '.crons[] | select(.path | contains("mind") or contains("mental"))'
```

Expect:

```json
{ "path": "/api/cron/mind-check-nudge", "schedule": "0 18 * * *" }
{ "path": "/api/cron/mental-coach-daily", "schedule": "30 4 * * *" }
{ "path": "/api/cron/buddy-mental-weekly-checkin", "schedule": "0 7 * * 1" }
```

After production deploy:

- Wait for the next 18:00 UTC and confirm `mind-check-nudge` ran (check Vercel logs).
- Wait for 04:30 UTC and confirm `mental-coach-daily` ran.
- Wait for next Monday 07:00 UTC for `buddy-mental-weekly-checkin`.

Set `CRON_SECRET` in Vercel env if not already done — the routes return 401 without it.

If `ANTHROPIC_API_KEY` is missing in prod, the AI-coach cron will silently fall back to the deterministic template. That's an acceptable degraded state — but worth setting the key intentionally.

---

## 5. Rollback (only if something is on fire)

The migrations are additive — no destructive changes. Rollback options:

**A. Soft rollback (preferred):** disable the relevant cron + hide `/mind` nav links. Migration tables stay; nothing depends on data flowing yet.

```ts
// In src/components/app/AppShell.tsx remove the "/mind" entry from NAV.
// In src/components/app/MobileTabBar.tsx replace mind back with messages.
// Restore vercel.json crons block to pre-Søjle-5 state.
```

**B. Hard rollback:** drop the new tables. Use only if data is corrupted somehow.

```sql
-- 0047
drop table if exists public.mental_cirkel_post_reactions;
drop table if exists public.mental_cirkel_posts;

-- 0046
drop table if exists public.mental_settings_log;
drop table if exists public.mental_cirkel_members;
drop table if exists public.mental_cirkler;
drop table if exists public.mental_coach_outputs;
drop table if exists public.mental_session_completions;
drop table if exists public.mental_sessions;
drop table if exists public.journal_entries;
drop table if exists public.mind_check_logs;
drop table if exists public.mental_settings;
drop function if exists public.mind_check_visible_to(uuid, uuid);
alter table public.members drop column if exists acknowledged_mental_disclaimer_at;

-- 0045 — leave alone unless explicitly rolling back Søjle 4 too.
```

---

## 6. What blocks if migrations aren't run

- **`/mind/*` surfaces** — work in demo mode (no Supabase env), but switch to error states for connected-mode members until 0046 lands.
- **Search Reps awards** — `awardMindCheckStreak` and friends silently fail (table not found), logged as `[mind] ... failed (non-fatal)`.
- **CC-8 + CC-10 crons** — already blocked by 0045 pending per project memory; this runbook clears that too.
- **AI mental-coach cron** — every member skip is logged; no member-visible impact.
- **Buddy mental-checkin cron** — same, all skip-logged.

So the live impact while migrations sit unapplied is: production members get no Søjle 5 behavior. Demo mode users see everything. Crons fire and produce structured skip-logs.

---

## 7. After everything lands — flip the Adaptive integration?

C-checkpoint decided: **wait** (see `memory/project_soejle5_shipped.md`). The pure helpers (`mentalAwareEngineInput`, `decorateDecisionWithMentalReason`) sit in `src/lib/mind/snapshot-contribution.ts` with 23 tests. When mind-check has ~2 weeks of live data, flip is a ~15-line insertion in `src/lib/adaptive/data.ts:buildEngineInput` (try/catch + `computeMentalSignal` + wrap return).
