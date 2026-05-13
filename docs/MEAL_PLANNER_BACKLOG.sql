-- =================================================================
-- Meal-planner backlog seed
-- =================================================================
-- Run in Supabase SQL Editor to populate /coach/system → Backlog
-- with the remaining "improvements to make us best-in-class" we
-- evaluated but didn't ship in the current push (commits 1-5).
--
-- All entries are inserted as 'open' priority 'medium' unless noted.
-- Edit/reprioritize via the admin backlog UI afterward.
--
-- Idempotency: insert is plain (not upsert) — running twice creates
-- duplicates. Run once.

insert into public.backlog_items (kind, title, description, priority) values

  ('feature', 'Streak-celebration + milestone push',
   'Vi har Reps-fundamentet for streaks (3/7/14/30-dages cooking-streak fra migration 0015). Beef UI op: lock-in animation når streak rammer milestone + push-notifikation dagen før næste milestone (FOMO-driver). Brand-tonen: ingen badges/medaljer, hellere typografisk "07 DAGE" stempel.',
   'medium'),

  ('feature', 'Off-plan quick-log shortcut',
   'Plan-bryder-flow: en lille "Spiste noget andet"-knap på /nutrition der lader brugeren logge en off-plan måltid med blot kcal + protein-estimat. Tracker uden at bryde streak. Hjælper med honesty > broken streaks. UI: floating button bottom-right på mobile, knap i header på desktop.',
   'medium'),

  ('feature', 'Pantry awareness (light version)',
   'Når shopping-listen genereres, trækker den fra hvad medlemmet allerede har. Implementering: simple "marker ingrediens som har den" på shopping-listen — gemmes som pantry_items (member_id, ingredient, qty, expires_at). Næste planlæg-week subtraherer fra indkøbsliste. Reducerer mad-spild + indkøbstid.',
   'low'),

  ('feature', 'Conversational tweaks via chat',
   'Chat-boks på /nutrition: "mindre ris næste uge", "jeg hadede laksen", "mere kylling". Claude parser intent → opdaterer profile.dislikes / profile.preferences. Personalisering uden at brugeren skal navigere til /nutrition/preferences. Latency-tolerant — accept med spinner i 3-5 sek.',
   'medium'),

  ('feature', 'Foto-baseret off-plan logging via Claude vision',
   'User tager foto af en spist måltid → Claude vision identificerer + estimerer macros mod brand-allowlist. Bedre end Cal AI fordi vi constrainer til kendte ingredienser. Cost: ~$0.005 per foto. Skab forventning: "AI-estimat, ikke laboratorie-præcis".',
   'medium'),

  ('feature', 'Voice input til måltid-logging',
   '"Hey MakeIt, jeg spiste en banan og to æg" → browser speech-to-text → Claude parser → opretter nutrition_log. iOS/Android-only først (Web Speech API). Reducerer logging-friction til <5 sek per måltid.',
   'low'),

  ('feature', 'Coach: weekly digest-email af crew adherence',
   'Når /coach/members/[id] adherence-sektionen er bygget (commit 5 i denne push), næste skridt er en ugentlig email-rollup af alle crew-medlemmer: tabel med adherence%, vægt-delta, suggested-action per medlem. Sender via Resend mandag morgen. Coach kan handle på listen før dagen begynder.',
   'high'),

  ('feature', 'Crew challenges — fælles macro-target uger',
   '"100g protein challenge: 7 dage × 100g+". Crew-leaderboard, Reps-multiplier x2 under challenge-uger. Skema: challenges (id, slug, kind, threshold, starts_at, ends_at) + challenge_participants. Driver fællesskab + accountability.',
   'medium'),

  ('feature', 'Apple Health / Whoop / Oura integration',
   'Pull recovery score → recommend protein-boost på lave recovery-dage. Pull workout type → bias macros mod træningsdag (vi har allerede dag-flag, men recovery score er ekstra signal). Premium-integration play.',
   'low'),

  ('feature', 'Smart-scale integration (Withings / Renpho)',
   'Auto-log af vægt via OAuth-flow + webhook. Plus body composition (fat%, lean mass). Fjerner manuel weigh-in friction. Plan adjuster bliver mere troværdig når scale-data flyder kontinuerligt.',
   'low');
