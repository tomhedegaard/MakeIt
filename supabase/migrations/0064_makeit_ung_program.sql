-- 0064_makeit_ung_program.sql
--
-- MakeIt Ung, del 2: træning
-- (docs/superpowers/specs/2026-09-27-makeit-ung-design.md, afsnit 3).
--
-- programs.audience separates the adult catalogue from programmes for
-- young members. The adult catalogue carries fixed kilos in its
-- blueprints (STR-12's top squat set is 102.5 kg) and the generator
-- falls back to adult 1RM defaults, so a young member must never be able
-- to start an adult programme, and an adult never sees a youth one.
--
-- UNG-01 · Grundstyrke: three full-body days of technique-first
-- training with dumbbells, kettlebells, cable and bodyweight. No kilo
-- prescriptions at all (weight null): the member chooses a weight they
-- can lift with two or three reps in reserve (target RPE 7), and the
-- weekly progression builds only on their own logged sets (0064 pairs
-- with a youth rule in week progression: hold the weight above RPE 7.5).
-- No max attempts, no 1RM. Exercises link to the library by slug.
--
-- Programme content should be reviewed by Munk before the pilot starts.
--
-- Designed for local `npm run db:reset`. Do not apply to live until
-- Tom explicitly accepts `npm run db:push`.

alter table public.programs
  add column if not exists audience text not null default 'adult'
    check (audience in ('adult', 'youth'));

comment on column public.programs.audience is
  'adult = the MakeIt // HQ catalogue; youth = MakeIt Ung (15–17). A member only sees and starts programmes for their own account_type.';

do $$
declare
  v_program uuid;
  v_day     uuid;
begin
  if exists (select 1 from public.programs where code = 'UNG-01') then
    return;
  end if;

  insert into public.programs (code, name, type, description, weeks, level, is_published, audience)
  values (
    'UNG-01',
    'Grundstyrke',
    'Strength',
    'Tre helkropsdage med fokus på teknik. Du vælger selv en vægt, hvor du kunne tage to eller tre gentagelser mere. Ingen maksforsøg.',
    8,
    'Begynder',
    true,
    'youth'
  )
  returning id into v_program;

  insert into public.program_days (program_id, position, day_label, title, estimated_minutes)
  values (v_program, 1, 'Dag A', 'Ben og skub', 45)
  returning id into v_day;
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-goblet-squat'), 'Goblet Squat', 'Hold håndvægten tæt ind til brystet. Sid ned mellem hælene, bryst op, knæ følger tæerne.', 1, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'incline-push-up'), 'Incline Push-up', 'Hænderne på en bænk. Kroppen er én lige planke fra hoved til hæl.', 2, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-row-unilateral'), 'Dumbbell Row', 'Ryggen flad, træk albuen mod hoften. 8 pr. arm.', 3, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-feet-elevated-glute-bridge'), 'Glute Bridge', 'Pres gennem hælene, stram balderne i toppen, ingen svaj i lænden.', 4, '[{"reps": 12, "weight": null, "rpe": 7, "rest_sec": 60}, {"reps": 12, "weight": null, "rpe": 7, "rest_sec": 60}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'plank'), 'Plank', 'Hold 30 sekunder. Stram mave og balder, rolig vejrtrækning.', 5, '[{"reps": 30, "weight": null, "rpe": null, "rest_sec": 60}, {"reps": 30, "weight": null, "rpe": null, "rest_sec": 60}]'::jsonb);

  insert into public.program_days (program_id, position, day_label, title, estimated_minutes)
  values (v_program, 2, 'Dag B', 'Hofte og træk', 45)
  returning id into v_day;
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'kettlebell-romanian-deadlift'), 'Romanian Deadlift', 'Skub hoften bagud med let bøjede knæ. Ryggen er flad hele vejen.', 1, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-seated-overhead-press'), 'Seated Overhead Press', 'Pres lige op, ribbenene nede, ingen svaj.', 2, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'inverted-row'), 'Inverted Row', 'Kroppen lige som en planke. Træk brystet op mod stangen.', 3, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-goblet-reverse-lunge'), 'Reverse Lunge', 'Træd bagud, bagerste knæ ned mod gulvet. 8 pr. ben.', 4, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 75}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'elbow-side-plank'), 'Side Plank', 'Hold 20 sekunder pr. side. Hoften oppe, kroppen lige.', 5, '[{"reps": 20, "weight": null, "rpe": null, "rest_sec": 45}, {"reps": 20, "weight": null, "rpe": null, "rest_sec": 45}]'::jsonb);

  insert into public.program_days (program_id, position, day_label, title, estimated_minutes)
  values (v_program, 3, 'Dag C', 'Hele kroppen', 45)
  returning id into v_day;
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-goblet-split-squat'), 'Split Squat', 'Lang skridtlængde, overkroppen oprejst. 8 pr. ben.', 1, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'dumbbell-bench-press'), 'Dumbbell Bench Press', 'Skulderbladene samlet, albuerne i 45 grader. Kontrol ned.', 2, '[{"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}, {"reps": 8, "weight": null, "rpe": 7, "rest_sec": 90}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'machine-seated-cable-row'), 'Seated Cable Row', 'Rank ryg, træk håndtaget mod navlen, skuldrene ned.', 3, '[{"reps": 10, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 10, "weight": null, "rpe": 7, "rest_sec": 75}, {"reps": 10, "weight": null, "rpe": 7, "rest_sec": 75}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'single-legged-romanian-deadlifts'), 'Single-Leg Romanian Deadlift', 'Stå på ét ben og vip fra hoften. Hold dig til noget, hvis balancen driller. 6 pr. ben.', 4, '[{"reps": 6, "weight": null, "rpe": 7, "rest_sec": 60}, {"reps": 6, "weight": null, "rpe": 7, "rest_sec": 60}]'::jsonb);
  insert into public.program_day_exercises (program_day_id, exercise_id, exercise_name, cue, position, sets)
  values (v_day, (select id from public.exercises where slug = 'kettlebell-farmers-carry'), 'Farmers Carry', 'Gå 30 meter med rank ryg og rolige skridt.', 5, '[{"reps": 30, "weight": null, "rpe": 7, "rest_sec": 60}, {"reps": 30, "weight": null, "rpe": 7, "rest_sec": 60}, {"reps": 30, "weight": null, "rpe": 7, "rest_sec": 60}]'::jsonb);
end $$;

-- ---------------------------------------------------------------- *
-- Backfill the server-written claims the middleware trusts
-- (src/lib/youth/routes.ts) for young accounts created in del 1,
-- before app_metadata carried them. Consent = guardian AND youth.
-- ---------------------------------------------------------------- *

update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'account_type', 'youth',
  'consent_mind', coalesce(g.guardian_consent_mind and g.youth_consent_mind, false),
  'consent_recovery', coalesce(g.guardian_consent_recovery and g.youth_consent_recovery, false)
)
from public.members m
left join public.guardianships g
  on g.youth_member_id = m.id and g.status = 'active'
where m.id = u.id
  and m.account_type = 'youth';
