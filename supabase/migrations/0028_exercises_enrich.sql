-- =================================================================
-- MakeIt // HQ — exercises library enrichment
-- =================================================================
-- The original `exercises` table (0001_init.sql) carried a single
-- `cue` string and a single `primary_muscle` text label. Good enough
-- to bootstrap programs, not enough to drive a top-tier exercise
-- module: the production UI needs ordered coaching cues, common
-- mistakes, full primary/secondary/tertiary muscle mapping (matching
-- src/lib/data/muscle-groups.ts), setup notes, progression /
-- regression pointers, and category metadata for filtering.
--
-- Strategy: additive only. The legacy `cue` and `primary_muscle`
-- columns stay so existing `session_exercises` reads keep working;
-- the new structured columns light up the new /train/exercises/* UI
-- once the seed lands.

alter table public.exercises
  add column if not exists category text,
  add column if not exists pattern text,
  add column if not exists equipment text,
  add column if not exists difficulty text check (
    difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  add column if not exists primary_muscles text[] not null default '{}',
  add column if not exists secondary_muscles text[] not null default '{}',
  add column if not exists tertiary_muscles text[] not null default '{}',
  add column if not exists cues jsonb not null default '[]'::jsonb,
  add column if not exists mistakes jsonb not null default '[]'::jsonb,
  add column if not exists why_matters text,
  add column if not exists setup text,
  add column if not exists progression text,
  add column if not exists regression text,
  add column if not exists demo_asset_url text,
  add column if not exists display_order int not null default 0,
  add column if not exists is_published boolean not null default false;

-- Filter index for the listing page
create index if not exists exercises_category_idx
  on public.exercises (category)
  where is_published = true;

create index if not exists exercises_published_order_idx
  on public.exercises (is_published, display_order);
