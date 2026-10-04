-- 0068_hrv_share_consent.sql
--
-- HRV-deling med coach bliver et udtrykkeligt samtykke (bølge 4, Tom
-- 2026-10-04). HRV er helbredsdata (GDPR art. 9); indtil nu var
-- hrv_settings.share_to_coach "true" som standard, uden at medlemmet blev
-- spurgt, og uden en knap til at slå det fra.
--
-- 1. Standarden er "fra". Nye rækker deler ikke, før medlemmet siger ja.
-- 2. Eksisterende rækker sættes til "fra" og markeres som ikke-besvaret
--    (share_to_coach_decided_at is null), så HRV-siden spørger dem.
-- 3. Coachens adgang til alerts og stribe-events følger samtykket, så et
--    tilbagekald også skjuler gamle data. Cron'en skriver alerts med
--    service-rollen og påvirkes ikke af RLS.

alter table public.hrv_settings
  alter column share_to_coach set default false,
  add column if not exists share_to_coach_decided_at timestamptz;

update public.hrv_settings
   set share_to_coach = false,
       share_to_coach_decided_at = null,
       updated_at = now()
 where share_to_coach is distinct from false
    or share_to_coach_decided_at is not null;

comment on column public.hrv_settings.share_to_coach is
  'Udtrykkeligt samtykke til at coachen læser medlemmets HRV-data. Standard false (0068).';
comment on column public.hrv_settings.share_to_coach_decided_at is
  'Hvornår medlemmet sidst svarede på spørgsmålet om deling. Null = ikke spurgt endnu.';

-- Coach-adgang til alerts: læse og opdatere (markér som set m.m.) kun når
-- medlemmet deler. Indsæt/slet sker kun fra service-rollen.
drop policy if exists "coach_manages_alerts" on public.hrv_alerts;
drop policy if exists "coach_reads_opted_alerts" on public.hrv_alerts;
create policy "coach_reads_opted_alerts" on public.hrv_alerts
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
       where s.member_id = hrv_alerts.member_id
         and s.share_to_coach = true
    )
  );
drop policy if exists "coach_updates_opted_alerts" on public.hrv_alerts;
create policy "coach_updates_opted_alerts" on public.hrv_alerts
  for update using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
       where s.member_id = hrv_alerts.member_id
         and s.share_to_coach = true
    )
  );

drop policy if exists "coach_reads_streak_events" on public.hrv_streak_events;
create policy "coach_reads_streak_events" on public.hrv_streak_events
  for select using (
    public.is_current_user_coach()
    and exists (
      select 1 from public.hrv_settings s
       where s.member_id = hrv_streak_events.member_id
         and s.share_to_coach = true
    )
  );
