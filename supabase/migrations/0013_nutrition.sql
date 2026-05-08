-- =================================================================
-- MakeIt // HQ — nutrition (meal planner) v1
-- =================================================================
-- Hybrid AI meal planner: weekly plans built from anchor recipes +
-- component meals, with photo-log adherence. Brand constraint:
-- whole foods, no refined seed oils, minimal UPF. Constraint engine
-- lives in app code (src/lib/nutrition/brand.ts) — schema is neutral.
--
-- Tables:
--   nutrition_profiles  — per-member preferences (allergies, diet, goal)
--   nutrition_plans     — one per (member, ISO Monday)
--   nutrition_meals     — meals slotted by day + slot in a plan
--   nutrition_logs      — photo-log adherence entries
-- Storage:
--   meal-photos bucket (private, member-scoped, coaches read all)

-- ---------------------------------------------------------------- *
-- 1. nutrition_profiles
-- ---------------------------------------------------------------- *
create table if not exists public.nutrition_profiles (
  member_id              uuid primary key references public.members(id) on delete cascade,
  goal                   text not null default 'maintain'
                            check (goal in ('cut','recomp','mass','maintain')),
  -- Targets default null → derived from member.max_*_kg + bodyweight
  -- in app code at read time, can be overridden here.
  daily_kcal_target      integer,
  daily_protein_g_target integer,
  -- Lifestyle
  meals_per_day          integer not null default 3
                            check (meals_per_day between 2 and 6),
  household_size         integer not null default 1
                            check (household_size between 1 and 8),
  cooking_level          text not null default 'intermediate'
                            check (cooking_level in ('basic','intermediate','advanced')),
  budget_level           text not null default 'standard'
                            check (budget_level in ('lean','standard','premium')),
  -- Dietary lens
  diet                   text not null default 'omnivore'
                            check (diet in ('omnivore','pescatarian','vegetarian','vegan')),
  -- Free-text preference lists
  allergies              text[] not null default '{}'::text[],
  dislikes               text[] not null default '{}'::text[],
  preferences            text[] not null default '{}'::text[],
  -- Schedule preferences
  cook_days              text[] not null default '{}'::text[], -- ISO weekday names member is willing to cook
  fish_per_week          integer not null default 2 check (fish_per_week between 0 and 7),
  -- Metadata
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------- *
-- 2. nutrition_plans
-- ---------------------------------------------------------------- *
create table if not exists public.nutrition_plans (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.members(id) on delete cascade,
  week_start          date not null, -- ISO Monday
  -- Snapshot of targets used to generate this plan
  daily_kcal          integer,
  daily_protein_g     integer,
  daily_carbs_g       integer,
  daily_fat_g         integer,
  -- Generation metadata
  generator           text not null default 'mock'
                         check (generator in ('claude','mock','manual')),
  generator_model     text,
  notes               text,
  -- Soft-delete
  archived_at         timestamptz,
  generated_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (member_id, week_start)
);
create index if not exists idx_nutrition_plans_member_week
  on public.nutrition_plans(member_id, week_start desc);

-- ---------------------------------------------------------------- *
-- 3. nutrition_meals
-- ---------------------------------------------------------------- *
create table if not exists public.nutrition_meals (
  id              uuid primary key default gen_random_uuid(),
  plan_id         uuid not null references public.nutrition_plans(id) on delete cascade,
  day_index       integer not null check (day_index between 0 and 6), -- 0=Mon
  slot            text not null check (slot in ('morgen','frokost','aften','snack','pre','post')),
  -- Hybrid model: 'recipe' = anchor cookable; 'component' = bowl-style swap
  kind            text not null default 'recipe'
                     check (kind in ('recipe','component')),
  title           text not null,
  description     text,
  -- Ingredients: [{ name: string, amount: number, unit: string, allowlistGroup?: string }]
  ingredients     jsonb not null default '[]'::jsonb,
  -- Steps: ["Step 1...", "Step 2..."]
  steps           jsonb not null default '[]'::jsonb,
  -- Estimated nutrition (per portion)
  est_kcal        integer,
  est_protein_g   integer,
  est_carbs_g     integer,
  est_fat_g       integer,
  -- Training-day awareness: align high-carb meals with high-volume days
  carb_density    text not null default 'standard'
                     check (carb_density in ('low','standard','high')),
  prep_minutes    integer,
  -- UI flags
  swappable       boolean not null default true,
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_nutrition_meals_plan_day
  on public.nutrition_meals(plan_id, day_index, slot);

-- ---------------------------------------------------------------- *
-- 4. nutrition_logs (photo-log adherence)
-- ---------------------------------------------------------------- *
create table if not exists public.nutrition_logs (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.members(id) on delete cascade,
  -- The meal this is logged against — may be null if member ate something
  -- unplanned but still wants to log it.
  meal_id             uuid references public.nutrition_meals(id) on delete set null,
  logged_for_date     date not null,
  logged_for_slot     text check (logged_for_slot in ('morgen','frokost','aften','snack','pre','post')),
  -- Storage path inside meal-photos bucket (member_id/uuid.jpg). Null if no photo.
  photo_path          text,
  -- AI grading (set by photo-log Claude after upload)
  match_score         integer check (match_score between 0 and 100),
  protein_estimate    text check (protein_estimate in ('low','on_target','high')),
  ai_headline         text,
  ai_notes            text,
  graded_at           timestamptz,
  -- Member self-report
  rating              integer check (rating between 1 and 5),
  notes               text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_nutrition_logs_member_date
  on public.nutrition_logs(member_id, logged_for_date desc);

-- ---------------------------------------------------------------- *
-- 5. RLS
-- ---------------------------------------------------------------- *
alter table public.nutrition_profiles enable row level security;
alter table public.nutrition_plans    enable row level security;
alter table public.nutrition_meals    enable row level security;
alter table public.nutrition_logs     enable row level security;

-- Profiles
drop policy if exists "nutrition profile own"        on public.nutrition_profiles;
drop policy if exists "nutrition profile coach read" on public.nutrition_profiles;
create policy "nutrition profile own"
  on public.nutrition_profiles for all to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());
create policy "nutrition profile coach read"
  on public.nutrition_profiles for select to authenticated
  using (public.is_current_user_coach());

-- Plans
drop policy if exists "nutrition plans own"        on public.nutrition_plans;
drop policy if exists "nutrition plans coach read" on public.nutrition_plans;
create policy "nutrition plans own"
  on public.nutrition_plans for all to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());
create policy "nutrition plans coach read"
  on public.nutrition_plans for select to authenticated
  using (public.is_current_user_coach());

-- Meals (joined via plan)
drop policy if exists "nutrition meals own"        on public.nutrition_meals;
drop policy if exists "nutrition meals coach read" on public.nutrition_meals;
create policy "nutrition meals own"
  on public.nutrition_meals for all to authenticated
  using (
    exists (
      select 1 from public.nutrition_plans p
      where p.id = nutrition_meals.plan_id
        and p.member_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.nutrition_plans p
      where p.id = nutrition_meals.plan_id
        and p.member_id = auth.uid()
    )
  );
create policy "nutrition meals coach read"
  on public.nutrition_meals for select to authenticated
  using (public.is_current_user_coach());

-- Logs
drop policy if exists "nutrition logs own"        on public.nutrition_logs;
drop policy if exists "nutrition logs coach read" on public.nutrition_logs;
create policy "nutrition logs own"
  on public.nutrition_logs for all to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());
create policy "nutrition logs coach read"
  on public.nutrition_logs for select to authenticated
  using (public.is_current_user_coach());

-- ---------------------------------------------------------------- *
-- 6. Storage bucket — meal-photos
-- ---------------------------------------------------------------- *
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  false,
  10485760,             -- 10 MB
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meal-photos upload own" on storage.objects;
create policy "meal-photos upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal-photos read own" on storage.objects;
create policy "meal-photos read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal-photos coach read all" on storage.objects;
create policy "meal-photos coach read all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and public.is_current_user_coach()
  );

drop policy if exists "meal-photos delete own" on storage.objects;
create policy "meal-photos delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------- *
-- 7. updated_at triggers
-- ---------------------------------------------------------------- *
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_nutrition_profiles_updated on public.nutrition_profiles;
create trigger trg_nutrition_profiles_updated
  before update on public.nutrition_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_nutrition_plans_updated on public.nutrition_plans;
create trigger trg_nutrition_plans_updated
  before update on public.nutrition_plans
  for each row execute function public.touch_updated_at();
