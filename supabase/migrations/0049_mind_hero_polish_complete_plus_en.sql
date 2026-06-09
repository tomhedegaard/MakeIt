-- =================================================================
-- MakeIt // HQ — Søjle 5: Mental Health Pillar (B-layer polish round 2)
-- =================================================================
-- Round 1 (0048) polished 4 of 8 DA hero sessions. This migration:
--   1. Polishes the remaining 4 DA hero sessions for parity.
--   2. Seeds 8 EN hero sessions (one per slug, en-locale).
--
-- Idempotent: UPDATE-by-slug for DA, INSERT ... ON CONFLICT DO NOTHING
-- for EN. Safe to re-run.
-- =================================================================

-- ---------------------------------------------------------------------
-- DA polish — the remaining 4 sessions
-- ---------------------------------------------------------------------

update public.mental_sessions
   set title    = 'Box breath 4-4-4-4',
       subtitle = 'For indre ro — 3 min',
       body_md  = E'## Sæt dig op\n\nFødderne i gulvet. Skulderne ned. Du behøver ikke lukke øjnene — det her er ikke meditation, det er teknik.\n\n## Mønstret\n\n4 sekunder ind. 4 sekunder hold. 4 sekunder ud. 4 sekunder hold. Gentag.\n\nFølg ringen på skærmen. Den trækker dig.\n\n## I de første 90 sekunder\n\nDu vil mærke at den anden runde er nemmere end den første. Det er pointet — kroppen får signalet om at det her er sikkert.\n\nMærk hvor luften lander. Ikke i hovedet. Nederst, i maven.\n\n## I de sidste 90 sekunder\n\nTanker kommer. Lad dem passere. Tilbage til vejret.\n\nHvis du går i stå med pausen — det er fint. Bare hold blødt og gå videre med næste fase når du er klar.\n\n## Når du er færdig\n\nTo stille minutter mere. Ingen telefon. Lad effekten få lov til at sætte sig.\n\nDet her er det mest pålidelige værktøj du har til at skifte mode på krævelse.'
 where slug = 'box-breath-4-4-4-4-da';

update public.mental_sessions
   set title    = 'Genstart efter pause',
       subtitle = 'Fra hjerne-tåge til klart sigte — 3 min',
       body_md  = E'## Du har fået en pause\n\nTræningen, arbejde, livet — du var væk. Nu skal du tilbage.\n\nDe fleste presser bare hårdere når de starter op igen. Det virker sjældent. Du gør det modsatte.\n\n## Tilbage med ÉN ting\n\nIkke en liste. Ikke en plan for hele ugen. ÉN ting du vil have lavet før du går i seng i aften.\n\nDen behøver ikke være stor.\n\n## I 90 sekunder\n\nLuk øjnene. Spørg: Hvad er den ene ting?\n\nLad svaret komme. Det første spontane svar er som regel det rigtige.\n\n## I 90 sekunder mere\n\nÅbn øjnene. Se den ene ting. Hvor starter du?\n\nDet første konkrete skridt — ikke "begynd", men noget du fysisk gør. Åbn dokumentet. Skift tøj. Skriv første sætning.\n\n## Når alarmen ringer\n\nGå direkte til det skridt. Ingen tilbagekig.\n\nResten af dagen sætter sig selv når den første ting er i gang.'
 where slug = 'restart-from-brain-fog-da';

update public.mental_sessions
   set title    = 'Sov bedre — body scan',
       subtitle = 'Til sengetid — 5 min',
       body_md  = E'## Mens du lægger dig\n\nLæg dig på ryggen. Tæppet over. Lyset slukket. Telefonen på lydløs eller i et andet rum.\n\nDet her er en teknik, ikke et tjek. Du skal ikke "blive bedre til det" — du skal bare gøre det.\n\n## Scan ovenfra\n\nIsse. Pande. Øjenlåg — tunge. Mund — afslappet kæbe.\n\nFor hvert område: mærk det, ånd ud, slip det.\n\n## Ned gennem kroppen\n\nNakke. Skuldre — lad dem falde mod gulvet, ikke mod ørerne. Arme. Hænder.\n\nBryst — det stiger og falder af sig selv. Maven. Hofterne — lad dem hvile tungt i sengen.\n\nLår — slap helt af, også indersiden. Knæ. Læg. Fødder — helt ude i tæerne.\n\n## Hele kroppen samtidig\n\nNu hele kroppen samtidig. Den er tung. Sengen bærer den. Du bærer ikke noget.\n\nTanker om i morgen kommer. Send dem videre. De skal nok komme igen i morgen — de behøver ikke besøge dig nu.\n\n## Slut\n\nDu er klar. Hvis du falder i søvn under scanningen — godt. Det er målet.\n\nHvis ikke: bliv liggende. Søvnen finder dig.'
 where slug = 'sleep-body-scan-da';

update public.mental_sessions
   set title    = 'Hvad gik godt? Hvad næste gang?',
       subtitle = 'Efter en god session — 2 min',
       body_md  = E'## Stop op\n\nDu er lige færdig. Det gik godt. Inden du går videre — 2 minutter.\n\nDe fleste gode sessioner ryger ud af kroppen igen fordi vi ikke ankrer dem. Du gør det her.\n\n## Hvad virkede?\n\nÉn ting. Helt konkret.\n\nVar det opvarmningen? Cuen? Tempoet? Mindset? En lille teknisk justering?\n\nVælg den én.\n\n## Hvorfor virkede det?\n\nDu havde gjort noget anderledes. Hvad var det?\n\n"Jeg åndede dybt mellem sættene." "Jeg satte mig grundigere op før første sæt." "Jeg lod tempoet være langsommere på vejen ned."\n\n## Næste gang\n\nHvordan får du den samme ting med igen?\n\nSkriv det evt. ned i din journal med to ord. Du vil takke dig selv om en måned når mønstret begynder at dukke op.\n\n## Nu kan du gå\n\nDen lille notits — det er sådan du bliver bedre.\n\nIkke flere reps. Mere bevidsthed.'
 where slug = 'debrief-what-worked-da';

-- ---------------------------------------------------------------------
-- EN — 8 hero sessions, en-locale parity
-- ---------------------------------------------------------------------

insert into public.mental_sessions
  (slug, category, title, subtitle, duration_seconds, body_md, visual_pattern, locale, is_hero)
values
  (
    'box-breath-4-4-4-4-en',
    'breathing',
    'Box breath 4-4-4-4',
    'For inner calm — 3 min',
    180,
    E'## Set yourself up\n\nFeet on the floor. Shoulders down. You don''t need to close your eyes — this is technique, not meditation.\n\n## The pattern\n\n4 seconds in. 4 hold. 4 out. 4 hold. Repeat.\n\nFollow the ring on the screen. It pulls you.\n\n## First 90 seconds\n\nYou''ll notice the second round is easier than the first. That''s the point — your body learns this is safe.\n\nNotice where the air lands. Not in your head. Lower, in the belly.\n\n## Last 90 seconds\n\nThoughts will come. Let them pass. Back to the breath.\n\nIf you stumble on the hold — fine. Just breathe softly and pick up the next phase when you''re ready.\n\n## When you''re done\n\nTwo quiet minutes more. No phone. Let the effect settle.\n\nThis is the most reliable tool you have for shifting mode on demand.',
    'box_breath_4_4_4_4',
    'en',
    true
  ),
  (
    'coherence-5-5-en',
    'breathing',
    'Coherence 5-5',
    'For HRV lift — 4 min',
    240,
    E'## What you''re doing\n\nYou''re breathing at the rate that maximizes your HRV. This isn''t breathwork for the vibe — it''s nervous system training, same principle as strength training.\n\n5 seconds in. 5 seconds out. About 6 breaths per minute. Follow the long ring on screen.\n\n## The first minute\n\nIt''s hard. Your breath will try to cheat you — go faster, or break up. Let it. The ring pulls you.\n\n## The second minute\n\nYou''ll notice your shoulders have already dropped. That''s the target. The parasympathetic nerve has taken over. The body says: no danger.\n\nIf thoughts come, let them pass. Back to the ring.\n\n## The third and fourth minute\n\nNow it feels easy. It''s rare you get a signal from the body that something purely physical is working. This is one of them.\n\n## When you''re done\n\nDo a mind-check after if you want. Many see stress drop a notch or two.',
    'coherence_5_5',
    'en',
    true
  ),
  (
    'pre-session-priming-en',
    'focus',
    'Pre-session priming',
    '90 seconds before you lift',
    90,
    E'## Right now\n\nYou''re minutes from training. This is where the head picks what kind of session it''s going to be.\n\nNo one talks about this. Most people walk straight to the weight and hope. You do the opposite.\n\n## Three questions\n\n1. **What''s the most important set today?** The one set that makes today a good day no matter what else happens.\n\n2. **What''s the one cue I''m holding focus on?** Knees out. Hips drive. Brace before the lift. Pick one. If you pick three, you pick none.\n\n3. **What''s my body signaling?** Are you light on your feet? Hips cold? Back short? It''s free information. Use it in the warm-up.\n\n## Last 30 seconds\n\nClose your eyes. See your most important set. The weight lifts. You stand up. You set it down.\n\nYou''re still standing.\n\nOpen your eyes. Go.',
    'still_focus',
    'en',
    true
  ),
  (
    'restart-from-brain-fog-en',
    'focus',
    'Restart from a break',
    'From brain fog to a clear shot — 3 min',
    180,
    E'## You had a break\n\nTraining, work, life — you were gone. Now you''re coming back.\n\nMost people just press harder when restarting. Rarely works. You do the opposite.\n\n## Back with ONE thing\n\nNot a list. Not a plan for the whole week. ONE thing you want done before bed tonight.\n\nIt doesn''t have to be big.\n\n## In 90 seconds\n\nClose your eyes. Ask: what''s the one thing?\n\nLet the answer come. The first spontaneous answer is usually the right one.\n\n## In another 90 seconds\n\nOpen your eyes. See the one thing. Where do you start?\n\nThe first concrete step — not "begin," but something you physically do. Open the document. Change clothes. Write the first sentence.\n\n## When the timer rings\n\nGo straight to that step. No looking back.\n\nThe rest of the day sets itself once the first thing is moving.',
    'still_focus',
    'en',
    true
  ),
  (
    'wind-down-beast-mode-en',
    'recovery',
    'Wind down from beast mode',
    'Switch from on to off — 4 min',
    240,
    E'## Where you are\n\nYou just pushed hard. Pulse is down again, but the nervous system is still up. That''s fine right after a hard session — but if you want to sleep tonight, you want it down before bed.\n\nThis takes 4 minutes and is the strongest sleep-after-late-training tool you have.\n\n## The pattern\n\n4 in. 8 out. The long exhale is the point. It tells the brain: the threat is gone.\n\n## First two minutes\n\nThe first 8-second exhales are hard. Your body wants air faster. Don''t force — go slower and longer each time.\n\n## Last two minutes\n\nNow it''s easy. You''ve come down.\n\nNo phone when you leave here. Drink a glass of water. Read something on paper. Or just sit.\n\n## When you''re done\n\nProtein. Water. Maybe a shower. Bed is close.\n\nYou did two things today that matter: pushed, and braked. Most people forget the second one.',
    'wave_4_8',
    'en',
    true
  ),
  (
    'sleep-body-scan-en',
    'recovery',
    'Sleep better — body scan',
    'For bedtime — 5 min',
    300,
    E'## As you lie down\n\nLie on your back. Blanket on. Lights off. Phone silent or in another room.\n\nThis is a technique, not a test. You''re not "getting better at it" — you''re just doing it.\n\n## Scan from above\n\nCrown. Forehead. Eyelids — heavy. Mouth — jaw soft.\n\nFor each area: notice it, breathe out, release it.\n\n## Down through the body\n\nNeck. Shoulders — let them fall toward the floor, not the ears. Arms. Hands.\n\nChest — rises and falls on its own. Belly. Hips — let them rest heavy in the bed.\n\nThighs — fully soft, also the inner ones. Knees. Calves. Feet — out into the toes.\n\n## Whole body together\n\nNow the whole body together. It''s heavy. The bed holds it. You''re not holding anything.\n\nThoughts about tomorrow will come. Send them on. They''ll be back tomorrow — they don''t need to visit now.\n\n## End\n\nYou''re ready. If you fall asleep during the scan — good. That''s the goal.\n\nIf not: stay lying. Sleep will find you.',
    'none',
    'en',
    true
  ),
  (
    'debrief-what-worked-en',
    'debrief',
    'What worked? What next time?',
    'After a good session — 2 min',
    120,
    E'## Stop\n\nYou''re just done. It went well. Before you move on — 2 minutes.\n\nMost good sessions leak right back out of the body because we don''t anchor them. You do this.\n\n## What worked?\n\nOne thing. Concretely.\n\nWarm-up? Cue? Tempo? Mindset? A small technical adjustment?\n\nPick the one.\n\n## Why did it work?\n\nYou did something different. What was it?\n\n"I breathed deeply between sets." "I set up more carefully before the first set." "I let the tempo stay slower on the way down."\n\n## Next time\n\nHow do you bring the same thing back?\n\nWrite it in your journal with two words if you want. You''ll thank yourself in a month when the pattern starts to show up.\n\n## Now you can go\n\nThat little note — that''s how you get better.\n\nNot more reps. More awareness.',
    'still_focus',
    'en',
    true
  ),
  (
    'debrief-bad-session-en',
    'debrief',
    'When the session was bad',
    'Right after a rough one — 3 min',
    180,
    E'## It was rough\n\nFair. It happens. We''ll talk about what you do with it before you walk out.\n\nNo quick fix. Just a short, honest conversation with yourself.\n\n## What was actually wrong?\n\nWas it the weight? Or was you?\n\nSleep? Energy? Stress from outside? Thoughts you dragged in? A meal that didn''t hit? Something you were afraid to fail at, and so it crept in?\n\nBe honest. Only you hear this.\n\n## What are you NOT carrying out?\n\nOne thing you refuse to let bleed into tomorrow. Leave it here, on this floor.\n\nThat''s the one you set your foot on. No more.\n\n## What did you learn?\n\nOne small thing. "Next time…" — fill it in.\n\nMaybe it''s something about warm-up. Something about mindset. Something about logging a mind-check BEFORE next session — so the Adaptive Engine can adjust before you''ve got the bar in your hand.\n\n## Last thing\n\nWrite it in the journal if you want. Two lines. You''ll thank yourself in a month.\n\nGo. No looking back. Next session isn''t today.',
    'still_focus',
    'en',
    true
  )
on conflict (slug) do nothing;
