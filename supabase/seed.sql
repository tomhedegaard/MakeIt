-- =================================================================
-- MakeIt // HQ — seed data for closed beta
-- =================================================================
-- Idempotent seed — safe to run multiple times.
-- Run AFTER 0001_init.sql.

-- Invite codes (initial batch — same set as the dev mock)
insert into public.invite_codes (code, max_uses, note) values
  ('MUNK-01',       100, 'Personal invite from Mikael Munk'),
  ('MAKEIT-CREW',    100, 'Crew invite'),
  ('FOUNDERS-2026',  50,  'Founders cohort'),
  ('STRAPIT-50K',    25,  'Celebrating 50.000 sold straps'),
  ('AMAGERBRO-169',  25,  'IRL meet attendees')
on conflict (code) do nothing;

-- Exercises library
insert into public.exercises (slug, name, cue, primary_muscle) values
  ('back-squat',       'Back Squat',       'Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.',                       'Quads'),
  ('front-squat',      'Front Squat',      'Albuer høje, torso oprejst, knæene først over tæerne.',                          'Quads'),
  ('deadlift',         'Conventional Deadlift', 'Lats engageret, baren tæt på kroppen, tryk gulvet væk.',                    'Back/Hams'),
  ('rdl',              'Romanian Deadlift','Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen.',                     'Hamstrings'),
  ('bench',            'Bench Press',      'Skulderblade tilbage og ned, ben i gulvet, bar til midten af brystet.',           'Chest'),
  ('paused-bench',     'Paused Bench',     'Pause 1-2 sekunder med baren rørende brystet før eksplosiv pres.',                 'Chest'),
  ('push-press',       'Push Press',       'Lille dyk i benene, ekstendér eksplosivt, lås ud over hovedet.',                  'Shoulders'),
  ('pull-up',          'Pull-up',          'Hænge fuld stræk, træk albuerne ned mod hofterne, bryst til bar.',                'Lats'),
  ('row',              'Barbell Row',      'Hofte fast, ryggen flad, ro til nedre bryst.',                                     'Back'),
  ('lunge',            'Walking Lunge',    'Lange skridt, lodret torso, push fra hælen på forreste fod.',                     'Quads/Glutes'),
  ('khr',              'Hanging Knee Raise','Kontrolleret tempo, brug ikke momentum.',                                         'Core')
on conflict (slug) do nothing;

-- Programs (matches the demo content)
insert into public.programs (code, name, type, description, weeks, level) values
  ('STR-12','PR-Block',             'Strength',
    'Klassisk linær periodisering med RPE-styring. Bygget til at tage din squat, bench og DL til nye PR''er på 12 uger.',
    12, 'Intermediate / Advanced'),
  ('HYP-08','Build Phase',          'Hypertrophy',
    'Volumen-fokuseret blok med bro-split logik for ben, ryg og skuldre. Mest reps, mest masse.',
    8,  'All levels'),
  ('PWR-10','Powerbuilding',        'Hybrid',
    '50/50 strength og hypertrofi. Tunge top-sets på big lifts, accessory-arbejde til æstetik.',
    10, 'Intermediate'),
  ('DL-06', 'Deadlift Specialization','Specialization',
    'Seks uger fokuseret 100% på dødløft. Pause-pulls, deficits, og en peak-protokol til ny 1RM.',
    6,  'Advanced')
on conflict (code) do nothing;

-- Challenges (current month)
insert into public.challenges (slug, name, description, goal_metric, goal_target, reward_text, starts_at, ends_at) values
  ('100k-volume-may-2026',
   '100K Volumen Club',
   'Løft 100.000 kg samlet volumen i maj og bliv medlem af 100K-klubben.',
   'volume_kg',
   100000,
   'Limited sølv-cuff + 1.000 Reps',
   '2026-05-01 00:00:00+02',
   '2026-05-31 23:59:59+02')
on conflict (slug) do nothing;
