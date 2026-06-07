-- =================================================================
-- MakeIt // HQ — Søjle 5: Mental Health Pillar v0 (MH-1)
-- =================================================================
-- Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §4
--
-- Foundation migration for the mental health pillar:
--   - daily mind-check, private journaling, AI sessions catalog,
--   - tier-gated crew sharing, AI mental coach output cache,
--   - cirkel groups (Beast+), safety moderation tracking.
--
-- All changes are additive. Surfaces and crons layer on this schema
-- across MH-2..MH-10.
--
-- Structure:
--   1. mind_check_visible_to() helper for buddy mutual-opt-in RLS
--   2. members.acknowledged_mental_disclaimer_at column
--   3. mental_settings (one row per member, tier-gated toggles)
--   4. mind_check_logs (daily, unique per date)
--   5. journal_entries (private, moderation status)
--   6. mental_sessions catalog (AI-generated, hero + personal)
--   7. mental_session_completions
--   8. mental_coach_outputs (daily AI coach cache)
--   9. mental_cirkler + mental_cirkel_members
--  10. mental_settings_log (audit trail for opt-in toggles)
--  11. RLS policies — journal is hard-private, mind-check
--      mutual-opt-in-readable, sessions globally readable
--  12. Seed mental_sessions hero rows (MH-5 uses these directly)
-- =================================================================

-- ---------------------------------------------------------------------
-- 2) members.acknowledged_mental_disclaimer_at
-- ---------------------------------------------------------------------
-- First-time /mind visit shows a "not clinical" disclaimer. The stamp
-- here gates the rest of the /mind surfaces.
alter table public.members
  add column if not exists acknowledged_mental_disclaimer_at timestamptz;

comment on column public.members.acknowledged_mental_disclaimer_at is
  'Mental Health Pillar (Søjle 5) — set on first /mind/onboarding tap-through. Gates /mind/* surfaces.';

-- ---------------------------------------------------------------------
-- 3) mental_settings — one row per member, tier-gated sharing toggles
-- ---------------------------------------------------------------------
create table if not exists public.mental_settings (
  member_id                       uuid primary key references public.members(id) on delete cascade,
  buddy_share_enabled             boolean not null default false,
  cirkel_share_aggregate_enabled  boolean not null default false,
  cirkel_share_daily_enabled      boolean not null default false,
  ai_coach_enabled                boolean not null default true,
  notif_mind_check_evening        boolean not null default true,
  notif_ai_coach_morning          boolean not null default true,
  notif_buddy_mental_alert        boolean not null default true,
  last_mind_check_at              timestamptz,
  current_streak_days             int not null default 0,
  longest_streak_days             int not null default 0,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

comment on table public.mental_settings is
  'Per-member mental health settings — privacy toggles, AI-coach opt-in, push prefs, streak state.';

-- ---------------------------------------------------------------------
-- 4) mind_check_logs — daily 60-second mental signal
-- ---------------------------------------------------------------------
create table if not exists public.mind_check_logs (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  logged_at    timestamptz not null default now(),
  logged_date  date not null default (now() at time zone 'UTC')::date,
  energy       smallint not null check (energy between 1 and 5),
  stress       smallint not null check (stress between 1 and 5),
  focus        smallint not null check (focus between 1 and 5),
  note         text check (note is null or length(note) <= 280),
  source       text not null default 'manual'
               check (source in ('manual', 'morning_nudge', 'evening_nudge', 'post_session')),
  created_at   timestamptz not null default now()
);

create unique index if not exists mind_check_logs_member_date_uidx
  on public.mind_check_logs (member_id, logged_date);

create index if not exists mind_check_logs_member_date_desc_idx
  on public.mind_check_logs (member_id, logged_date desc);

comment on table public.mind_check_logs is
  'Daily 60-second mental signal: energy/stress/focus 1-5 + optional 280-char note. One per member per UTC day.';

-- ---------------------------------------------------------------------
-- 5) journal_entries — always private to author, moderation-tracked
-- ---------------------------------------------------------------------
create table if not exists public.journal_entries (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members(id) on delete cascade,
  logged_at          timestamptz not null default now(),
  logged_date        date not null default (now() at time zone 'UTC')::date,
  prompt             text,
  body               text not null check (length(body) between 1 and 2000),
  moderation_status  text not null default 'pending'
                     check (moderation_status in ('pending','clean','flagged','crisis')),
  moderation_reason  text,
  created_at         timestamptz not null default now()
);

create unique index if not exists journal_entries_member_date_uidx
  on public.journal_entries (member_id, logged_date);

create index if not exists journal_entries_member_logged_at_desc_idx
  on public.journal_entries (member_id, logged_at desc);

comment on table public.journal_entries is
  'Private journal — never readable by anyone but the author. RLS enforces. Moderation runs out-of-band.';

-- ---------------------------------------------------------------------
-- 6) mental_sessions — AI-generated content catalog
-- ---------------------------------------------------------------------
create table if not exists public.mental_sessions (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  category          text not null check (category in ('breathing','focus','recovery','debrief')),
  title             text not null,
  subtitle          text,
  duration_seconds  int not null check (duration_seconds between 60 and 600),
  body_md           text not null,
  visual_pattern    text not null
                    check (visual_pattern in ('box_breath_4_4_4_4','coherence_5_5','wave_4_8','still_focus','none')),
  audio_url         text,
  voice             text,
  generated_by      text not null default 'claude'
                    check (generated_by in ('claude','human','imported')),
  prompt_seed       jsonb,
  locale            text not null default 'da' check (locale in ('da','en')),
  is_hero           boolean not null default false,
  published_at      timestamptz default now(),
  created_at        timestamptz not null default now()
);

create index if not exists mental_sessions_category_idx
  on public.mental_sessions (category, locale, is_hero desc, published_at desc);

comment on table public.mental_sessions is
  '1-10 min mental sessions. Hero = evergreen library (MH-5). Non-hero = personal daily (MH-4). Text+visual in v0; audio_url stored for v1 voice rollout.';

-- ---------------------------------------------------------------------
-- 7) mental_session_completions — drives Reps + history
-- ---------------------------------------------------------------------
create table if not exists public.mental_session_completions (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members(id) on delete cascade,
  session_id      uuid not null references public.mental_sessions(id) on delete cascade,
  completed_at    timestamptz not null default now(),
  completed_date  date not null default (now() at time zone 'UTC')::date,
  context         text check (context is null or context in
                  ('library','prescribed_by_coach','suggested_by_adaptive','pre_session','post_session')),
  created_at      timestamptz not null default now()
);

create unique index if not exists mental_session_completions_uniq_per_day_uidx
  on public.mental_session_completions (member_id, session_id, completed_date);

create index if not exists mental_session_completions_member_completed_at_desc_idx
  on public.mental_session_completions (member_id, completed_at desc);

-- ---------------------------------------------------------------------
-- 8) mental_coach_outputs — daily AI coach output cache
-- ---------------------------------------------------------------------
create table if not exists public.mental_coach_outputs (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members(id) on delete cascade,
  for_date           date not null,
  body_md            text not null,
  prompt_seed        jsonb,
  moderation_status  text not null default 'clean'
                     check (moderation_status in ('clean','flagged')),
  created_at         timestamptz not null default now()
);

create unique index if not exists mental_coach_outputs_member_date_uidx
  on public.mental_coach_outputs (member_id, for_date);

-- ---------------------------------------------------------------------
-- 9) mental_cirkler + mental_cirkel_members
-- ---------------------------------------------------------------------
create table if not exists public.mental_cirkler (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  leader_id    uuid references public.members(id) on delete set null,
  max_members  int not null default 6 check (max_members between 3 and 10),
  created_at   timestamptz not null default now()
);

create table if not exists public.mental_cirkel_members (
  cirkel_id             uuid not null references public.mental_cirkler(id) on delete cascade,
  member_id             uuid not null references public.members(id) on delete cascade,
  joined_at             timestamptz not null default now(),
  daily_share_opt_in    boolean not null default false,
  primary key (cirkel_id, member_id)
);

create index if not exists mental_cirkel_members_member_idx
  on public.mental_cirkel_members (member_id);

-- ---------------------------------------------------------------------
-- 10) mental_settings_log — audit trail for privacy toggle changes
-- ---------------------------------------------------------------------
create table if not exists public.mental_settings_log (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  field       text not null,
  old_value   text,
  new_value   text,
  changed_at  timestamptz not null default now()
);

create index if not exists mental_settings_log_member_changed_at_desc_idx
  on public.mental_settings_log (member_id, changed_at desc);

-- ---------------------------------------------------------------------
-- 1) mind_check_visible_to() — buddy mutual-opt-in predicate for RLS
-- ---------------------------------------------------------------------
-- viewer can see owner's mind-check IFF:
--   (a) viewer == owner, OR
--   (b) viewer and owner are in an active buddy_pair AND both
--       opted in to buddy_share_enabled in mental_settings.
-- Defined after the buddy infra (0045) is present so we can reference
-- buddy_pairs directly.
create or replace function public.mind_check_visible_to(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer = owner
    or exists (
      select 1
        from public.buddy_pairs bp
        join public.mental_settings ms_v on ms_v.member_id = viewer
        join public.mental_settings ms_o on ms_o.member_id = owner
       where bp.unpaired_at is null
         and (
           (bp.member_a = viewer and bp.member_b = owner)
           or (bp.member_a = owner and bp.member_b = viewer)
         )
         and ms_v.buddy_share_enabled = true
         and ms_o.buddy_share_enabled = true
    );
$$;

grant execute on function public.mind_check_visible_to(uuid, uuid) to authenticated;

-- =================================================================
-- 11) RLS policies
-- =================================================================

alter table public.mental_settings           enable row level security;
alter table public.mind_check_logs           enable row level security;
alter table public.journal_entries           enable row level security;
alter table public.mental_sessions           enable row level security;
alter table public.mental_session_completions enable row level security;
alter table public.mental_coach_outputs      enable row level security;
alter table public.mental_cirkler            enable row level security;
alter table public.mental_cirkel_members     enable row level security;
alter table public.mental_settings_log       enable row level security;

-- mental_settings: owner all; Munk reads all for safety review.
drop policy if exists "mental_settings_owner_all" on public.mental_settings;
create policy "mental_settings_owner_all"
  on public.mental_settings
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "mental_settings_munk_read" on public.mental_settings;
create policy "mental_settings_munk_read"
  on public.mental_settings
  for select
  using (public.is_current_user_munk());

-- mind_check_logs: owner all; buddy reads via mutual-opt-in predicate.
drop policy if exists "mind_check_logs_owner_all" on public.mind_check_logs;
create policy "mind_check_logs_owner_all"
  on public.mind_check_logs
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "mind_check_logs_buddy_read" on public.mind_check_logs;
create policy "mind_check_logs_buddy_read"
  on public.mind_check_logs
  for select
  using (public.mind_check_visible_to(auth.uid(), member_id));

-- journal_entries: ONLY owner. No coach read. No Munk read. Hard rule.
drop policy if exists "journal_entries_owner_all" on public.journal_entries;
create policy "journal_entries_owner_all"
  on public.journal_entries
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- mental_sessions: any authed member reads. Munk writes everything;
-- writes for AI-generated personal sessions happen via service-role.
drop policy if exists "mental_sessions_authed_read" on public.mental_sessions;
create policy "mental_sessions_authed_read"
  on public.mental_sessions
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "mental_sessions_munk_write" on public.mental_sessions;
create policy "mental_sessions_munk_write"
  on public.mental_sessions
  for all
  using (public.is_current_user_munk())
  with check (public.is_current_user_munk());

-- mental_session_completions: owner all; Munk reads for analytics.
drop policy if exists "mental_session_completions_owner_all" on public.mental_session_completions;
create policy "mental_session_completions_owner_all"
  on public.mental_session_completions
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "mental_session_completions_munk_read" on public.mental_session_completions;
create policy "mental_session_completions_munk_read"
  on public.mental_session_completions
  for select
  using (public.is_current_user_munk());

-- mental_coach_outputs: owner reads. Writes happen via service-role
-- (the daily AI coach cron). Munk reads moderation flags only — but
-- since RLS is row-level, we leave body access to service-role for now
-- and Munk gets a separate aggregate view in MH-9.
drop policy if exists "mental_coach_outputs_owner_read" on public.mental_coach_outputs;
create policy "mental_coach_outputs_owner_read"
  on public.mental_coach_outputs
  for select
  using (member_id = auth.uid());

-- mental_cirkler + members: cirkel members read; leader/Munk write.
drop policy if exists "mental_cirkler_member_read" on public.mental_cirkler;
create policy "mental_cirkler_member_read"
  on public.mental_cirkler
  for select
  using (
    public.is_current_user_munk()
    or leader_id = auth.uid()
    or exists (
      select 1 from public.mental_cirkel_members mcm
       where mcm.cirkel_id = mental_cirkler.id and mcm.member_id = auth.uid()
    )
  );

drop policy if exists "mental_cirkler_munk_write" on public.mental_cirkler;
create policy "mental_cirkler_munk_write"
  on public.mental_cirkler
  for all
  using (public.is_current_user_munk())
  with check (public.is_current_user_munk());

drop policy if exists "mental_cirkel_members_self_read" on public.mental_cirkel_members;
create policy "mental_cirkel_members_self_read"
  on public.mental_cirkel_members
  for select
  using (
    member_id = auth.uid()
    or exists (
      select 1 from public.mental_cirkel_members mcm
       where mcm.cirkel_id = mental_cirkel_members.cirkel_id
         and mcm.member_id = auth.uid()
    )
    or public.is_current_user_munk()
  );

drop policy if exists "mental_cirkel_members_self_write" on public.mental_cirkel_members;
create policy "mental_cirkel_members_self_write"
  on public.mental_cirkel_members
  for all
  using (member_id = auth.uid() or public.is_current_user_munk())
  with check (member_id = auth.uid() or public.is_current_user_munk());

-- mental_settings_log: owner reads own; service-role writes.
drop policy if exists "mental_settings_log_owner_read" on public.mental_settings_log;
create policy "mental_settings_log_owner_read"
  on public.mental_settings_log
  for select
  using (member_id = auth.uid());

-- =================================================================
-- 12) Seed: 8 hero sessions (MH-5 catalog)
-- =================================================================
-- Inserted here so /mind/sessions has content the moment MH-5 ships.
-- Idempotent on (slug) — re-running migration is safe.

insert into public.mental_sessions
  (slug, category, title, subtitle, duration_seconds, body_md, visual_pattern, locale, is_hero)
values
  (
    'box-breath-4-4-4-4-da',
    'breathing',
    'Box breath 4-4-4-4',
    'For indre ro — 3 min',
    180,
    E'## Sæt dig op\n\nFødderne i gulvet. Skulderne ned. Du behøver ikke lukke øjnene.\n\n## Mønstret\n\nIndånd 4 sekunder · hold 4 · ud 4 · hold 4. Gentag.\n\nFølg ringen på skærmen — den trækker dig.\n\n## I 3 minutter\n\nMærk hvor luften lander. Ikke i hovedet. Nederst, i maven.\n\nTanker kommer. Lad dem passere. Tilbage til vejrtrækningen.\n\n## Når du er færdig\n\nTo stille minutter mere. Ikke mere program.',
    'box_breath_4_4_4_4',
    'da',
    true
  ),
  (
    'coherence-5-5-da',
    'breathing',
    'Coherence 5-5',
    'For HRV-løft — 4 min',
    240,
    E'## Hvad det gør\n\n5 sekunder ind, 5 sekunder ud. Cirka 6 åndedrag pr. minut. Det er den hastighed der maksimerer HRV.\n\n## Mønstret\n\nFølg den lange ring. Glat. Ingen pauser.\n\n## I 4 minutter\n\nDu vil bemærke at den anden runde er nemmere end den første. Det er hele pointen.\n\nLuften skal ud roligt — ikke skubbes ud. Som om du puster en lille flamme uden at slukke den.\n\n## Når du er færdig\n\nLav mind-check bagefter hvis du har lyst. Mange ser stress falde i tallene.',
    'coherence_5_5',
    'da',
    true
  ),
  (
    'pre-session-priming-da',
    'focus',
    'Pre-session priming',
    '90 sekunder før løft',
    90,
    E'## Lige nu\n\nDu er på vej til at træne. Måske er du varm, måske ikke.\n\n## 3 spørgsmål\n\n1. Hvad er den vigtigste sæt i dag?\n2. Hvad er én cue jeg vil holde fokus på?\n3. Hvad er det signal jeg vil aflæse fra min krop?\n\nDu behøver ikke svare højt. Svar i hovedet, hurtigt.\n\n## Sidste 30 sekunder\n\nLuk øjnene. Se den første sæt. Vægten letter. Du står oprejst.\n\nÅbn øjnene. Gå i gang.',
    'still_focus',
    'da',
    true
  ),
  (
    'restart-from-brain-fog-da',
    'focus',
    'Genstart efter pause',
    'Fra hjerne-tåge til klart sigte — 3 min',
    180,
    E'## Du har fået en pause\n\nTræningen, arbejde, livet — du var væk. Nu skal du tilbage.\n\n## Genstart\n\nIkke ved at presse hårdere. Ved at vælge ÉN ting.\n\n## I 90 sekunder\n\nLuk øjnene. Spørg: Hvad er det ene jeg vil have lavet før jeg går i seng i aften?\n\nIkke fem ting. Én ting.\n\n## I 90 sekunder mere\n\nÅbn øjnene. Se den ene ting. Hvor starter du? Det første konkrete skridt.\n\nNår alarmen ringer — start det skridt.',
    'still_focus',
    'da',
    true
  ),
  (
    'wind-down-beast-mode-da',
    'recovery',
    'Vind ned efter beast-mode',
    'Skift fra på til af — 4 min',
    240,
    E'## Hvad det handler om\n\nDu har lige presset. Nervesystemet er stadig oppe. Det er fint nu, men du vil have det ned før du sover.\n\n## Vejrtrækning 4-8\n\nIndånd 4. Ud 8. Lang ud. Følg ringen.\n\nDen lange udånding er den vigtige. Den fortæller kroppen: faren er væk.\n\n## I 4 minutter\n\nFørst er det måske svært at lave 8 sekunders udånding. Det bliver lettere efter et minut.\n\nIngen tanker om i morgen. Hvis de kommer, lad dem være. Tilbage til vejret.\n\n## Når du er færdig\n\nDrik et glas vand. Læg telefonen væk. Læs noget på papir, eller bare sid.',
    'wave_4_8',
    'da',
    true
  ),
  (
    'sleep-body-scan-da',
    'recovery',
    'Sov bedre — body scan',
    'Til sengetid — 5 min',
    300,
    E'## Mens du lægger dig\n\nLæg dig på ryggen. Tæppet over. Lyset slukket. Telefonen på lydløs.\n\n## Scan ovenfra\n\nIsse. Pande. Øjenlåg — tunge. Mund — afslappet kæbe.\n\nFor hvert område: ind, ud, slip det.\n\n## Ned\n\nNakke. Skuldre — lad dem falde. Arme. Hænder. Bryst — det stiger og falder af sig selv.\n\nMave. Hofter. Lår — slap helt af. Knæ. Læg. Fødder.\n\n## Hele kroppen\n\nNu hele kroppen samtidig. Den er tung. Sengen bærer den.\n\nTanker om i morgen kommer. Send dem videre. De skal nok komme igen i morgen.\n\n## Slut\n\nDu er klar. Hvis du falder i søvn under scanningen — godt. Det er målet.',
    'none',
    'da',
    true
  ),
  (
    'debrief-what-worked-da',
    'debrief',
    'Hvad gik godt? Hvad næste gang?',
    'Efter en god session — 2 min',
    120,
    E'## Stop op\n\nDu er lige færdig. Inden du går videre — 2 minutter.\n\n## Hvad virkede?\n\nÉn ting. Helt konkret. Cue, opvarmning, tempo, mindset — hvad var det?\n\n## Hvorfor virkede det?\n\nDu havde gjort noget anderledes. Hvad var det?\n\n## Næste gang\n\nHvordan får du den samme ting med igen? Skriv det evt. ned i en journalpost.\n\n## Nu kan du gå\n\nDen lille notits — den er guld. Det er sådan du bliver bedre.',
    'still_focus',
    'da',
    true
  ),
  (
    'debrief-bad-session-da',
    'debrief',
    'Når træningen var dårlig',
    'Lige efter en lortesession — 3 min',
    180,
    E'## Det var dårligt\n\nFair. Det sker. Lad os tale om hvad du gør med det.\n\n## Hvad var virkelig galt?\n\nVar det vægten? Eller var det dig? Energi? Søvn? Hovedet? Stress udefra?\n\nVær ærlig. Det er kun dig der hører dette.\n\n## Hvad bærer du IKKE med dig?\n\nÉn ting du nægter at lade ramme i morgen. Lad det blive her, på dette gulv.\n\n## Hvad lærte du?\n\nÉn lille ting. "Næste gang…" — fyld ud.\n\nMåske skal Adaptive Engine vide noget? Tjek HRV og mind-check inden næste session — det taler med engine.\n\n## Færdig\n\nGå ud. Ingen tilbagekig.',
    'still_focus',
    'da',
    true
  )
on conflict (slug) do nothing;
