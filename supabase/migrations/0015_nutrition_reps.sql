-- =================================================================
-- MakeIt // HQ — nutrition Reps awards
-- =================================================================
-- Two awards trigger from new nutrition_logs rows:
--
--   1. PHOTO LOG (+10 Reps) — every log row with photo_path set.
--      Idempotent on (reference_type='nutrition_log_photo',
--      reference_id=log.id) so a re-trigger or backfill can't
--      double-pay.
--
--   2. COOKING STREAK (+50 Reps) — milestone payouts when an
--      'eaten' log lands on day 3 / 7 / 14 / 30 of a consecutive
--      eaten-day streak ending on the inserted row's date.
--      Idempotent on (member_id, reference_type='cooking_streak_<N>')
--      so each milestone is paid at most once per member, ever.
--      Breaking and re-establishing a streak does NOT re-pay —
--      the streak reward is for sustained habit, not farming.
--
-- Skipped logs (status='skipped') don't count toward the streak.
-- The daily check-in itself isn't rewarded — that habit is its
-- own reward via the streak counter on the card.

create or replace function public.award_nutrition_log_reps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak_len integer := 0;
  v_milestone  integer;
  v_streak_ref text;
begin
  -- ---------------------------------------------------------------
  -- 1) Photo log (+10)
  -- ---------------------------------------------------------------
  if new.photo_path is not null then
    insert into public.reps_transactions
      (member_id, delta, reason, reference_type, reference_id)
    select new.member_id, 10, 'Måltid logget med foto',
           'nutrition_log_photo', new.id
    where not exists (
      select 1 from public.reps_transactions
      where reference_type = 'nutrition_log_photo'
        and reference_id   = new.id
    );
  end if;

  -- ---------------------------------------------------------------
  -- 2) Cooking-streak milestone (+50)
  --
  -- Only count 'eaten' rows. We compute the consecutive run of
  -- distinct days ending on new.logged_for_date by walking
  -- backwards via a recursive CTE. Capped at 31 to bound work
  -- (longest milestone is 30; one extra step is enough to detect
  -- "we're past 30, no new payout").
  -- ---------------------------------------------------------------
  if new.status = 'eaten' then
    with recursive run(d, n) as (
      select new.logged_for_date, 1
      where exists (
        select 1 from public.nutrition_logs
        where member_id      = new.member_id
          and logged_for_date = new.logged_for_date
          and status          = 'eaten'
      )
      union all
      select (r.d - interval '1 day')::date, r.n + 1
      from run r
      where r.n < 31
        and exists (
          select 1 from public.nutrition_logs
          where member_id      = new.member_id
            and logged_for_date = (r.d - interval '1 day')::date
            and status          = 'eaten'
        )
    )
    select coalesce(max(n), 0) into v_streak_len from run;

    -- Hit a milestone today?
    foreach v_milestone in array array[3, 7, 14, 30] loop
      if v_streak_len = v_milestone then
        v_streak_ref := 'cooking_streak_' || v_milestone::text;
        insert into public.reps_transactions
          (member_id, delta, reason, reference_type, reference_id)
        select new.member_id, 50,
               'Madstreak: ' || v_milestone::text || ' dage',
               v_streak_ref, new.id
        where not exists (
          select 1 from public.reps_transactions
          where member_id      = new.member_id
            and reference_type = v_streak_ref
        );
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists nutrition_log_reps on public.nutrition_logs;
create trigger nutrition_log_reps
  after insert on public.nutrition_logs
  for each row execute function public.award_nutrition_log_reps();
