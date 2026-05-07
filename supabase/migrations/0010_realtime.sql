-- =================================================================
-- MakeIt // HQ — realtime subscriptions
-- =================================================================
-- Enable Postgres logical replication on tables the live feed relies
-- on. Supabase exposes the supabase_realtime publication; adding a
-- table here lets the JS client subscribe to inserts/updates/deletes
-- via channel('public:posts').on('postgres_changes', ...).
--
-- RLS still applies on reads — a subscriber only receives change
-- payloads they're allowed to see.

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.post_reactions;
