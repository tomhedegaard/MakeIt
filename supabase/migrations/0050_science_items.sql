-- =================================================================
-- MakeIt // HQ — Science feed datastore (Science-sektion v1)
-- =================================================================
-- Spec: docs/science/MakeIt_Science_Sektion_Teknisk_Spec.md §7
-- Brief: docs/science/MakeIt_Science_ClaudeCode_Brief.md
--
-- One canonical row per study processed by the daily pipeline
-- (scripts/science-feed.ts → /api/cron/science-feed). Stores BOTH
-- published and rejected studies so the reject log is auditable
-- ("open brain"): you can always see WHY a study did not reach the
-- feed, which is also how the publish thresholds get calibrated.
--
-- Read path: anon may SELECT only status = 'published' rows (RLS).
-- Write path: service-role only (the job bypasses RLS) — never the
-- browser. There is intentionally no anon/auth write policy.
--
-- Idempotency: the pipeline upserts on `source_id` (the stable
-- Europe PMC id, always present). `doi` is the human dedup key and
-- is unique but nullable, so it cannot be the conflict target for
-- rejected rows that never resolved a DOI.
-- =================================================================

create table if not exists public.science_items (
  id                uuid primary key default gen_random_uuid(),
  source_id         text not null,                                  -- Europe PMC id — idempotency key
  doi               text,                                           -- dedup / external link key (unique, nullable)
  title             text not null,
  domain            text check (domain in ('mad', 'krop', 'sind')), -- null for rejected-before-scoring rows
  evidence_level    text,                                           -- meta_analysis / systematic_review / rct / cochrane_review / guideline
  evidence_badge    text,                                           -- Danish display badge (e.g. "Meta-analyse")
  journal           text,
  published_date    date,
  indexed_date      date,
  open_access       boolean not null default false,
  source_url        text,                                           -- DOI link to the external primary source
  tldr_da           text,                                           -- LLM (or template) Danish summary
  effect_da         text,                                           -- verbatim reported effect, when stated
  caveat_da         text,                                           -- one-line caveat, when relevant
  source_conclusion text,                                           -- verbatim conclusion from the abstract
  score             numeric,                                        -- total 0–1 publish score
  score_parts       jsonb,                                          -- {relevance,evidence,recency,source,consensus} — audit
  verified          boolean not null default false,                 -- number-verification passed
  summary_method    text,                                           -- llm / template / template-fallback
  status            text not null check (status in ('published', 'rejected')),
  reject_reason     text,                                           -- why it did not reach the feed
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint science_items_source_id_unique unique (source_id),
  constraint science_items_doi_unique unique (doi)
);

comment on table public.science_items is
  'Daily science feed. One row per processed study, published OR rejected (audit/open-brain). Anon reads published only; service-role writes.';
comment on column public.science_items.source_id is
  'Stable Europe PMC id. Idempotency key — the pipeline upserts on this.';
comment on column public.science_items.score_parts is
  'Score breakdown {relevance,evidence,recency,source,consensus} for threshold calibration.';
comment on column public.science_items.reject_reason is
  'For status=rejected: which gate/threshold the study failed.';

-- Feed query: newest, highest-scoring published studies, optionally per domain.
create index if not exists idx_science_items_published
  on public.science_items (status, score desc, published_date desc);
create index if not exists idx_science_items_domain_date
  on public.science_items (domain, published_date desc);

-- updated_at maintenance on re-runs.
create or replace function public.touch_science_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists science_items_touch_updated_at on public.science_items;
create trigger science_items_touch_updated_at
  before update on public.science_items
  for each row execute function public.touch_science_items_updated_at();

-- ---- RLS ---------------------------------------------------------
alter table public.science_items enable row level security;

-- Public, read-only: anyone (anon + authenticated) may read published
-- rows. This powers /science and the public RSS/JSON feeds.
drop policy if exists "science_items_public_read" on public.science_items;
create policy "science_items_public_read"
  on public.science_items
  for select
  using (status = 'published');

-- No insert/update/delete policy: writes happen exclusively via the
-- service-role client in the daily job, which bypasses RLS.
