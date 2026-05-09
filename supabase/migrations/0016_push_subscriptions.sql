-- =================================================================
-- MakeIt // HQ — push_subscriptions
-- =================================================================
-- Browser push subscriptions per member. One member can have many
-- subscriptions (different browsers / devices). The endpoint is
-- globally unique — re-subscribing from the same browser yields
-- the same endpoint, so we upsert on conflict.
--
-- p256dh + auth are the Web Push application server's view of the
-- client's keys (base64url-encoded), used by the server-side
-- web-push library when encrypting the payload.

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists idx_push_subs_member
  on public.push_subscriptions(member_id);

alter table public.push_subscriptions enable row level security;

-- Member can read / insert / delete only their own rows.
create policy "push_subs read own"
  on public.push_subscriptions for select to authenticated
  using (member_id = auth.uid());

create policy "push_subs insert own"
  on public.push_subscriptions for insert to authenticated
  with check (member_id = auth.uid());

create policy "push_subs delete own"
  on public.push_subscriptions for delete to authenticated
  using (member_id = auth.uid());

-- The server-side sender uses the service role to look up subs
-- across members (e.g. cron-driven daily check-in). Service role
-- bypasses RLS, no policy needed for that path.
