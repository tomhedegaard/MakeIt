-- =================================================================
-- MakeIt // HQ — meal-image cache + image_url on meals
-- =================================================================
-- Cache table: meal title (normalized) → Unsplash image metadata.
-- Persisted as a separate table so multiple members + multiple
-- plans that include "Skyr med bær og havre" share the same
-- cached image. Without this, every plan generation hits Unsplash
-- once per meal which (a) costs latency and (b) burns the API
-- rate-limit quickly.
--
-- Normalization rule (in app code): lowercase + strip punctuation
-- + collapse whitespace. So "Skyr med bær & havre!" and "skyr med
-- bær og havre" hit the same cache key.
--
-- Attribution is mandatory per Unsplash API ToS — store photographer
-- name + profile URL with the cached entry so we can render it on
-- the meal card without re-querying.

create table if not exists public.meal_image_cache (
  title_normalized  text primary key,
  url               text not null,
  thumb_url         text not null,
  attribution_name  text not null,
  attribution_url   text not null,
  source            text not null default 'unsplash'
                       check (source in ('unsplash', 'curated', 'ai')),
  cached_at         timestamptz not null default now()
);

create index if not exists idx_meal_image_cache_recent
  on public.meal_image_cache (cached_at desc);

-- meal_image_cache is read by anyone authenticated (cache lookup
-- is cheap + non-sensitive — just an image URL + photographer
-- name). Writes are server-only via service-role from the
-- nutrition-planner action.
alter table public.meal_image_cache enable row level security;

create policy "meal_image_cache read authenticated"
  on public.meal_image_cache for select
  to authenticated
  using (true);

-- Add image_url column to nutrition_meals — denormalized for fast
-- meal-card render without a join. Populated at meal-insert time
-- from the cache (or null if Unsplash returned nothing).
alter table public.nutrition_meals
  add column if not exists image_url       text,
  add column if not exists image_thumb_url text,
  add column if not exists image_attribution_name text,
  add column if not exists image_attribution_url  text;
