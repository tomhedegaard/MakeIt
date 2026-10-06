-- 0070_food_health.sql
--
-- Et sundt forhold til mad og krop (spec 2026-09-27 §S, plan F.4).
--
-- 1. member_body: kropsdata, pejlemærke og visningsvalg. Ligger ikke på
--    members, fordi members kan læses af alle indloggede (0062). Ejer
--    læser og skriver; coaches læser.
-- 2. pejlemaerke_changes: hver gang pejlemærket sættes, så et pejlemærke
--    der sænkes igen og igen kan ses af coachen som et tidligt tegn. En
--    trigger skriver loggen, så den ikke kan springes over; medlemmet kan
--    kun læse den.
-- 3. food_signals: tidlige tegn er beregnet ved læsning. Rækken husker kun,
--    hvornår coachen markerede dem som set. Kun coaches kan skrive, så et
--    medlem ikke kan skjule sit eget tegn. Hvornår medlemmet sidst fik det
--    bløde spørgsmål ved mind-check, står på member_body.
--
-- Designet til lokal `npm run db:reset`. Køres mod live, når Tom har sagt ja.

create table if not exists public.member_body (
  member_id        uuid primary key references public.members(id) on delete cascade,
  height_cm        integer check (height_cm between 120 and 230),
  birth_year       integer check (birth_year between 1900 and 2100),
  sex              text check (sex in ('f', 'm', 'unspecified')),
  pejlemaerke_kg   numeric(5,1) check (pejlemaerke_kg between 30 and 300),
  show_weight_card boolean not null default false,
  hide_numbers     boolean not null default false,
  food_question_asked_at timestamptz,
  updated_at       timestamptz not null default now(),
  -- Spec §S: aldrig et pejlemærke under BMI 18,5 for højden.
  constraint member_body_pejlemaerke_healthy check (
    pejlemaerke_kg is null
    or (height_cm is not null and pejlemaerke_kg >= 18.5 * (height_cm / 100.0) ^ 2)
  )
);

alter table public.member_body enable row level security;
drop policy if exists "member_body_owner" on public.member_body;
create policy "member_body_owner" on public.member_body
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());
drop policy if exists "member_body_coach_read" on public.member_body;
create policy "member_body_coach_read" on public.member_body
  for select using (public.is_current_user_coach());

create table if not exists public.pejlemaerke_changes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  kg         numeric(5,1) check (kg between 30 and 300),
  created_at timestamptz not null default now()
);
create index if not exists pejlemaerke_changes_member_idx
  on public.pejlemaerke_changes (member_id, created_at desc);

alter table public.pejlemaerke_changes enable row level security;
drop policy if exists "pejlemaerke_changes_owner_read" on public.pejlemaerke_changes;
create policy "pejlemaerke_changes_owner_read" on public.pejlemaerke_changes
  for select using (member_id = auth.uid());
drop policy if exists "pejlemaerke_changes_coach_read" on public.pejlemaerke_changes;
create policy "pejlemaerke_changes_coach_read" on public.pejlemaerke_changes
  for select using (public.is_current_user_coach());

create or replace function public.log_pejlemaerke_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pejlemaerke_kg is not null
     and (tg_op = 'INSERT' or new.pejlemaerke_kg is distinct from old.pejlemaerke_kg) then
    insert into public.pejlemaerke_changes (member_id, kg) values (new.member_id, new.pejlemaerke_kg);
  end if;
  return new;
end;
$$;

drop trigger if exists member_body_log_pejlemaerke on public.member_body;
create trigger member_body_log_pejlemaerke
  after insert or update of pejlemaerke_kg on public.member_body
  for each row execute function public.log_pejlemaerke_change();

create table if not exists public.food_signals (
  member_id        uuid primary key references public.members(id) on delete cascade,
  coach_seen_until timestamptz,
  coach_seen_by    uuid references public.members(id) on delete set null,
  updated_at       timestamptz not null default now()
);

alter table public.food_signals enable row level security;
drop policy if exists "food_signals_coach" on public.food_signals;
create policy "food_signals_coach" on public.food_signals
  for all using (public.is_current_user_coach()) with check (public.is_current_user_coach());

comment on table public.member_body is
  'Kropsdata, pejlemærke og visningsvalg (spec §S). Ikke på members, som alle indloggede kan læse.';
comment on column public.member_body.pejlemaerke_kg is
  'Retning, ikke mål. Aldrig under BMI 18,5 for medlemmets højde (constraint + app).';
comment on table public.food_signals is
  'Tidlige tegn beregnes ved læsning; her står kun coachens "set". Kun coaches læser og skriver.';
