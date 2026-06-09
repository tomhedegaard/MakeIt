-- =================================================================
-- MakeIt // HQ — Søjle 5: Mental Health Pillar v0 (MH-10)
-- =================================================================
-- Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §10
--
-- Cirkler are asynkron group check-ins for Beast+ members. One
-- weekly post per member per cirkel. Reactions (🔥 💪 ❤) drive
-- engagement without surfacing journal text.
--
-- All tables are additive on top of 0046's mental_cirkler and
-- mental_cirkel_members.
-- =================================================================

create table if not exists public.mental_cirkel_posts (
  id            uuid primary key default gen_random_uuid(),
  cirkel_id     uuid not null references public.mental_cirkler(id) on delete cascade,
  author_id     uuid not null references public.members(id) on delete cascade,
  posted_at     timestamptz not null default now(),
  posted_week   text not null,                       -- ISO week YYYY-WW
  body          text not null check (length(body) between 1 and 600),
  mind_share    jsonb,                               -- optional: { energy, stress, focus } when daily_share_opt_in
  created_at    timestamptz not null default now()
);

-- One post per member per cirkel per ISO week.
create unique index if not exists mental_cirkel_posts_one_per_week_uidx
  on public.mental_cirkel_posts (cirkel_id, author_id, posted_week);

create index if not exists mental_cirkel_posts_cirkel_posted_at_desc_idx
  on public.mental_cirkel_posts (cirkel_id, posted_at desc);

create table if not exists public.mental_cirkel_post_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.mental_cirkel_posts(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  reaction    text not null check (reaction in ('fire', 'flex', 'heart')),
  created_at  timestamptz not null default now()
);

-- One reaction-type per member per post.
create unique index if not exists mental_cirkel_post_reactions_uniq_idx
  on public.mental_cirkel_post_reactions (post_id, member_id, reaction);

-- ---------------------------------------------------------------------
-- RLS — cirkel members read+write their own cirkel's posts/reactions.
-- ---------------------------------------------------------------------

alter table public.mental_cirkel_posts            enable row level security;
alter table public.mental_cirkel_post_reactions   enable row level security;

drop policy if exists "mental_cirkel_posts_member_read" on public.mental_cirkel_posts;
create policy "mental_cirkel_posts_member_read"
  on public.mental_cirkel_posts
  for select
  using (
    public.is_current_user_munk()
    or exists (
      select 1 from public.mental_cirkel_members mcm
       where mcm.cirkel_id = mental_cirkel_posts.cirkel_id
         and mcm.member_id = auth.uid()
    )
  );

drop policy if exists "mental_cirkel_posts_author_write" on public.mental_cirkel_posts;
create policy "mental_cirkel_posts_author_write"
  on public.mental_cirkel_posts
  for all
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.mental_cirkel_members mcm
       where mcm.cirkel_id = mental_cirkel_posts.cirkel_id
         and mcm.member_id = auth.uid()
    )
  );

drop policy if exists "mental_cirkel_post_reactions_member_read" on public.mental_cirkel_post_reactions;
create policy "mental_cirkel_post_reactions_member_read"
  on public.mental_cirkel_post_reactions
  for select
  using (
    public.is_current_user_munk()
    or exists (
      select 1 from public.mental_cirkel_posts mcp
       join public.mental_cirkel_members mcm on mcm.cirkel_id = mcp.cirkel_id
       where mcp.id = mental_cirkel_post_reactions.post_id
         and mcm.member_id = auth.uid()
    )
  );

drop policy if exists "mental_cirkel_post_reactions_self_write" on public.mental_cirkel_post_reactions;
create policy "mental_cirkel_post_reactions_self_write"
  on public.mental_cirkel_post_reactions
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());
