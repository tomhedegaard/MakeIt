-- =================================================================
-- MakeIt // HQ — Danish title + conclusion for the Science feed
-- =================================================================
-- The paper title and the verbatim abstract conclusion were shown in
-- English. The daily job (src/lib/science/run.ts) now translates both
-- with Claude and keeps a translation only when every number in it
-- appears verbatim in the original (same guardrail idea as tldr_da).
--
-- translated_at marks an attempt, kept even when the translation was
-- discarded, so a study that fails the number check is not retried
-- (and billed) every day. Null = not attempted yet: the job fills
-- those, a few per run, which also back-fills existing rows.
--
-- Additive and nullable: the page falls back to the English original
-- wherever a column is null. RLS is unchanged (anon reads published).
-- =================================================================

alter table public.science_items
  add column if not exists title_da             text,
  add column if not exists source_conclusion_da text,
  add column if not exists translated_at        timestamptz;

comment on column public.science_items.title_da is
  'Danish title. Null when not translated or when the translation failed the number check.';
comment on column public.science_items.source_conclusion_da is
  'Danish version of source_conclusion, same number check.';
comment on column public.science_items.translated_at is
  'When translation was attempted (success or discarded). Null = the job will try.';

create index if not exists science_items_untranslated_idx
  on public.science_items (score desc)
  where status = 'published' and translated_at is null;
