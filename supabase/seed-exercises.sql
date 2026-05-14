-- =================================================================
-- MakeIt // HQ — exercises library (seed)
-- =================================================================
-- 20 core lifts, each with structured muscle mapping
-- (primary/secondary/tertiary using slugs from
-- src/lib/data/muscle-groups.ts), ordered coaching cues, common
-- mistakes, why-it-matters, setup, progression/regression.
--
-- Run AFTER migrations 0001..0028 are applied. Idempotent: every
-- exercise upserts on slug — safe to re-run as we tune copy.
--
-- IMPORTANT: muscle slugs MUST match the MuscleGroup type. Order
-- inside each array is intentional (first = strongest contribution).

insert into public.exercises (
  slug, name, category, pattern, equipment, difficulty,
  primary_muscle, primary_muscles, secondary_muscles, tertiary_muscles,
  cue, cues, mistakes,
  why_matters, setup, progression, regression,
  display_order, is_published
) values

  -- 1 — Back Squat
  ('back-squat', 'Back Squat', 'lower-body', 'squat', 'barbell', 'intermediate',
   'Quads', '{quads,glutes}', '{hamstrings,lower_back}', '{abs,adductors,calves_back}',
   'Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet.',
   $$["Bryst op og spændt mave før du drukner under baren.","Knæ sporer tæerne — pres dem aktivt ud.","Sid lavt: hofte under knæ.","Driv gulvet væk og lås ud uden hyperextension.","Træk vejret ind i bunden, pust ud på vej op."]$$,
   $$[{"title":"Knæene falder ind","body":"Skubber kraften gennem inderlåret i stedet for at engagere glutes. Cue: pres knæene aktivt ud mod lillefingertåen."},{"title":"Bryst kollapser frem","body":"Mister bar-position. Hold albuerne ind under baren og pres brystet op — bagsiden skal være stiv."},{"title":"Hælen letter","body":"Vægten over fortæen. Sko med fast hæl + bevidst tryk i bagest tredjedel af foden."}]$$,
   'Bygger benstyrke fra bunden og tvinger hele kæden — core, ryg, hofte — til at arbejde samtidig.',
   'Bar i high-bar position på øvre traps. Fødderne skulderbredde, lille udadrotation. Spændt mave før liften.',
   'Tilføj pause i bunden, eller skift til front squat for mere quads og oprejst torso.',
   'Goblet squat med en kettlebell, eller box squat for at lære dybdetilvænning.',
   10, true),

  -- 2 — Front Squat
  ('front-squat', 'Front Squat', 'lower-body', 'squat', 'barbell', 'advanced',
   'Quads', '{quads}', '{glutes,abs}', '{lower_back,calves_back,adductors}',
   'Albuer høje, torso oprejst, knæene først over tæerne.',
   $$["Albuerne højt og pegende fremad — kollaberer de, kollaberer brystet.","Torso lodret — ingen lean fremover.","Knæene må gerne ride forbi tæerne.","Mave hård som en murstensvæg gennem hele liften.","Bunden lav — hofte under knæ uden hælen letter."]$$,
   $$[{"title":"Albuerne falder","body":"Baren ruller af og forreste løft kollapser. Træn front-rack mobility — håndleds- og skulderfleksibilitet er forudsætningen."},{"title":"Fremoverlæn","body":"Den klassiske squat-tendens dræber front squat. Tænk plast under hagen og squat lodret ned."}]$$,
   'Den mest quad-dominerende stang-øvelse vi har — bygger oprejst styrke og kræver brutal core.',
   'Bar i front rack på forreste delts. Albuer høje. Stance lidt smallere end back squat.',
   'Tempo (3 sek nedad + 2 sek pause i bund). Eller pause front squat.',
   'Goblet squat eller zercher squat hvis front rack mobility er begrænset.',
   20, true),

  -- 3 — Conventional Deadlift
  ('deadlift', 'Conventional Deadlift', 'full-body', 'hinge', 'barbell', 'intermediate',
   'Back/Hams', '{hamstrings,glutes,lower_back}', '{lats,traps,quads}', '{forearms,abs,calves_back}',
   'Lats engageret, baren tæt på kroppen, tryk gulvet væk.',
   $$["Lats engageret — træk baren ind i kroppen, ikke væk fra den.","Stang over midtfod ved opstart.","Skuldre lige over baren — ikke bag.","Pres gulvet væk, ikke træk baren op.","Lås hofterne ud i toppen uden hyperextension."]$$,
   $$[{"title":"Hofte skyder op først","body":"Du laver en stiff-leg pull med dårligt knæ-engagement. Cue: pres gulvet væk — knæ og hofte ekstenderer samtidig."},{"title":"Rygsænkning ved lockout","body":"Hofterne overstrækker bagud. Stop ved hip extension neutral — ingen lean back."},{"title":"Baren svinger ud fra kroppen","body":"Tab af lat-engagement. Hold baren tæt på lår og skin hele vejen."}]$$,
   'Den øvelse der bedst tester hele bagsiden — fra hælen til nakken. Bygger den styrke der overfører til alt.',
   'Bar over midtfod. Skin tæt på baren. Grip lige uden for benene. Træk slæk ud af baren før liften.',
   'Pause-deadlift 2 cm over gulv, eller deficit pull for ekstra range.',
   'Trap bar deadlift eller block pull fra knæhøjde.',
   30, true),

  -- 4 — Romanian Deadlift
  ('rdl', 'Romanian Deadlift', 'lower-body', 'hinge', 'barbell', 'intermediate',
   'Hamstrings', '{hamstrings,glutes}', '{lower_back,lats}', '{forearms,abs,traps}',
   'Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen.',
   $$["Knæene let bøjede — låses ind i den vinkel.","Hofterne tilbage, ikke ned. Stang skinger ned langs lår.","Lats engageret — bar holdes tæt på kroppen.","Stop når hamstrings siger stop — ikke når baren rammer gulv.","Lås ved at presse hofterne fremad mod stangen."]$$,
   $$[{"title":"Knæ bøjer for meget","body":"Bliver til en deadlift. Hold knævinklen konstant — det er hofte-bevægelse, ikke knæ-bevægelse."},{"title":"Baren glider fremad","body":"Hamstrings bliver inaktive. Tænk bar nøjagtig på låret — som om du skraber lårhårene væk."}]$$,
   'Renest mulig hamstring og glute stimulus uden quads-dominans. Bygger den bagside back squat ikke kan ramme.',
   'Stang i hip extension start. Stance let smallere end deadlift. Knæ let bøjede og fastlåst.',
   'Single-leg RDL eller deficit (stå på en plate).',
   'Dumbbell RDL for nemmere bar path.',
   40, true),

  -- 5 — Bench Press
  ('bench', 'Bench Press', 'upper-body-push', 'push-horizontal', 'barbell', 'intermediate',
   'Chest', '{chest,front_delts,triceps}', '{forearms}', '{abs,lats}',
   'Skulderblade tilbage og ned, ben i gulvet, bar til midten af brystet.',
   $$["Skuldre tilbage og ned — pres dem ind i bænken.","Ben i gulvet, hofte aktiv — bench er en helkrops-øvelse.","Baren ned til midten af brystet, albuer omkring 45° ud.","Pust ud på vej op, hold core spændt hele vejen.","Lås albuerne uden at miste skulder-position."]$$,
   $$[{"title":"Albuerne flagrer 90° ud","body":"Skader skulderen og fjerner triceps engagement. Hold 45° vinkel mellem overarm og torso."},{"title":"Halsen rejser sig","body":"Mister scapular retraction. Cue: tryk hovedet ind i bænken og hold der."},{"title":"Bagdel forlader bænk","body":"Cheats range of motion. Hofte skal røre bænken hele liften."}]$$,
   'Hovedøvelse for bryststyrke og overkrops-push. Mest brugte målestok for overkropskraft.',
   'Skulderblade tilbage og ned. Bro i ryggen ok. Fødderne plantet. Grip ca. ringfinger på bar-ringen.',
   'Paused bench eller tempo bench (3 sek nedad).',
   'Dumbbell bench eller floor press hvis skulder-fleksibilitet er begrænset.',
   50, true),

  -- 6 — Paused Bench
  ('paused-bench', 'Paused Bench', 'upper-body-push', 'push-horizontal', 'barbell', 'advanced',
   'Chest', '{chest,front_delts,triceps}', '{forearms}', '{abs,lats}',
   'Pause 1-2 sekunder med baren rørende brystet før eksplosiv pres.',
   $$["Pause 1-2 sekunder med bar rørende brystet.","Bevar al spænding i pausen — slap aldrig af.","Eksplosiv koncentrisk lige efter pausen.","Albuer og scapula låst hele vejen.","Pust først ud efter low-mid point."]$$,
   $$[{"title":"Bouncer ud af pausen","body":"Eliminerer hele pointen. Markér pausen visuelt — coachen tæller højt, eller læg en chip på brystet."},{"title":"Slapper af i pausen","body":"Mister al lagret elastisk energi. Hold core og lats spændte under hele pausen."}]$$,
   'Bygger bottom-end bench power og fjerner stretch-reflex-snyderi. Bedste raw strength carryover.',
   'Som bench press. Pause-tæller eller chip på brystet.',
   'Long pause (3 sek+) eller weight increase.',
   'Standard bench med touch-and-go, eller pin press.',
   60, true),

  -- 7 — Overhead Press
  ('ohp', 'Overhead Press', 'shoulders', 'push-vertical', 'barbell', 'intermediate',
   'Shoulders', '{front_delts,triceps}', '{chest,traps}', '{abs,forearms}',
   'Bar fra front rack til lockout direkte over midtfod.',
   $$["Stang i front rack — albuer let foran baren.","Spændt mave og glutes — som en stående plank.","Træk hovedet tilbage så baren passerer ansigt.","Stang ender direkte over midtfod, ikke fremover.","Ingen ben-drive — strict pres hele vejen."]$$,
   $$[{"title":"Ryglæn","body":"Bench press på gulv — fjerner OHP intentet. Hold core spændt og torso lodret. Kan stangen ikke op uden læn, vægten er for tung."},{"title":"Stang ender fremover","body":"Lockout-position over panden i stedet for over midtfod. Træk haglen ind og pres op og bagover så bar finder linjen."}]$$,
   'Den øvelse der bedst tester core-stabilitet under load. Bygger skulder-styrke og total kæde-stivhed.',
   'Bar i front rack. Stance omkring hofte. Mave hård. Albuer let foran baren.',
   'Push press hvis lockout-styrken er der, eller seated OHP for ren skulder-load.',
   'Dumbbell shoulder press eller seated barbell press.',
   70, true),

  -- 8 — Push Press
  ('push-press', 'Push Press', 'shoulders', 'push-vertical', 'barbell', 'advanced',
   'Shoulders', '{front_delts,triceps}', '{chest,traps,quads,glutes}', '{abs,forearms,calves_back}',
   'Lille dyk i benene, ekstendér eksplosivt, lås ud over hovedet.',
   $$["Dip lille — knæ blødt, ikke et squat.","Drive eksplosivt fra benene op gennem stangen.","Hovedet trækkes tilbage så baren passerer ansigt.","Lås benene FØR du låser armene over hovedet.","Stang ender direkte over midtfoden, ikke fremover."]$$,
   $$[{"title":"For dybt dip","body":"Bliver til en thruster. Dip skal være 5-10 cm — knæene må aldrig forbi 30°."},{"title":"Forward lean","body":"Bar går fremover og du mister lockout. Hold torso lodret i hele dippet."}]$$,
   'Lærer dig at producere helkrops kraft op gennem en kæde. Stærkeste overhead-øvelse for de fleste.',
   'Bar i front rack. Stance omkring hofte. Albuerne let foran baren.',
   'Push jerk (split eller squat catch) når lockout-styrken er der.',
   'Strict overhead press for at bygge bremsen først.',
   80, true),

  -- 9 — Pull-up
  ('pull-up', 'Pull-up', 'upper-body-pull', 'pull-vertical', 'bodyweight', 'intermediate',
   'Lats', '{lats,biceps}', '{rear_delts,forearms}', '{traps,abs}',
   'Hænge fuld stræk, træk albuerne ned mod hofterne, bryst til bar.',
   $$["Hænge fuld stræk i bunden — ingen genvej.","Træk albuerne ned mod hofterne, ikke op.","Bryst hen til baren, ikke hagen.","Skulderblade engageret før armene begynder at trække.","Kontrolleret nedad — eccentric tæller dobbelt."]$$,
   $$[{"title":"Kipping på styrketræning","body":"Cheat-rep. Hvis du laver pull-ups for at bygge styrke, eliminer al hofte-sving."},{"title":"Halv range","body":"Stop ikke ved hagen — bryst skal røre baren. Halv-pull = halv adaptation."}]$$,
   'Den øvelse der bedst tester relativ overkrops-styrke. Lats, rygkraft og greb på én gang.',
   'Bar i greb-bredde lidt udenfor skuldre. Pronated grip (overhand). Spændt core.',
   'Weighted pull-up via dipping belt, eller L-sit pull-up.',
   'Negativ-only (kun nedad), eller assisted med band.',
   90, true),

  -- 10 — Barbell Row
  ('row', 'Barbell Row', 'upper-body-pull', 'pull-horizontal', 'barbell', 'intermediate',
   'Back', '{lats,rear_delts}', '{biceps,traps}', '{forearms,lower_back,abs}',
   'Hofte fast, ryggen flad, ro til nedre bryst.',
   $$["Hofte fast — kun overkrop bevæger sig.","Ryggen flad — ingen lordose eller kyfose.","Træk til nedre bryst, ikke navlen.","Albuerne pegende lige bagud, ikke ud til siden.","Pause kort i toppen før kontrolleret nedad."]$$,
   $$[{"title":"Hoftesving (kipping row)","body":"Mister al upper-back stimulus. Hold over-krops vinklen konstant — kun arme og scapula bevæger sig."},{"title":"Ryg-rund i bunden","body":"Skader nedre ryg. Hold neutral wirbelsøjle og let spændt mave hele tiden."}]$$,
   'Horisontal-træk-king. Bygger den back thickness pull-ups ikke kan ramme, og balancerer bench-volumen.',
   'Hængende ved hoftehøjde. Knæ let bøjede. Skulderblade trukket sammen før første træk.',
   'Pendlay row (fra dødt på hvert rep) eller deficit row med plates.',
   'Chest-supported row eller seated cable row.',
   100, true),

  -- 11 — Walking Lunge
  ('lunge', 'Walking Lunge', 'lower-body', 'lunge', 'barbell', 'intermediate',
   'Quads/Glutes', '{quads,glutes}', '{hamstrings,adductors}', '{abs,calves_back,lower_back}',
   'Lange skridt, lodret torso, push fra hælen på forreste fod.',
   $$["Lange skridt — bagerste knæ må aldrig touch gulvet i high tempo set.","Lodret torso — ingen fremoverlæn.","Tryk fra hælen på forreste fod.","Forreste knæ over (ikke forbi) ankel.","Smooth overgang mellem hvert skridt — ingen pause."]$$,
   $$[{"title":"For korte skridt","body":"Knæet ryger forbi tæerne og quads tager kontant. Tag længere skridt for at fordele load."},{"title":"Torso falder fremover","body":"Aktiverer lænd i stedet for benene. Hold brystet højt — som om en streng trækker dig op fra issen."}]$$,
   'Unilateral ben-træning. Fanger hvor venstre/højre er ude af balance og bygger funktionel single-leg styrke.',
   'Bar i back-squat position eller dumbbells i hænderne. Lang gangbane — minimum 8-10 meter.',
   'Reverse lunge med pause i bunden, eller bulgarian split squat.',
   'Static split squat uden vandring.',
   110, true),

  -- 12 — Hanging Knee Raise
  ('khr', 'Hanging Knee Raise', 'core', 'core', 'bodyweight', 'beginner',
   'Core', '{abs}', '{obliques}', '{forearms}',
   'Kontrolleret tempo, brug ikke momentum.',
   $$["Kontrolleret tempo — 2 sek op, 2 sek ned.","Ingen sving — start fra full dead hang.","Træk knæ til bryst, ikke til hofte.","Hold pause i toppen før eccentric.","Pust ud på vej op, ind på vej ned."]$$,
   $$[{"title":"Momentum","body":"Du svinger benene op. Test: kan du pause i toppen 1 sekund? Hvis nej — slow it down."},{"title":"Halv range","body":"Knæene når kun til hofte. Sigt mod bryst-niveau — det er hvor abs faktisk skal arbejde."}]$$,
   'Bygger funktionel core-styrke der direkte overfører til squat, deadlift og OHP — alt hvor du skal holde spænding.',
   'Hænge fra pull-up bar. Spændt core fra start. Skulderblade ikke fuldt slap.',
   'Hanging leg raise (straight legs) eller toes-to-bar.',
   'Knee raise på captain''s chair eller dipping bars.',
   120, true),

  -- 13 — Hip Thrust
  ('hip-thrust', 'Hip Thrust', 'lower-body', 'hinge', 'barbell', 'intermediate',
   'Glutes', '{glutes}', '{hamstrings,abs}', '{quads,lower_back}',
   'Lock hofterne ud og squeeze i toppen — det er en glute-øvelse, ikke en lænd-øvelse.',
   $$["Skulderblade ind på bænk, øjne på loft i toppen.","Hagen ned mod bryst — ingen hovedhyperextension.","Pres knæene let udad gennem hele liften.","Lås hofterne — bækken neutral i toppen, ingen overstrækning.","1-2 sek pause i toppen før kontrolleret nedad."]$$,
   $$[{"title":"Hyperextension i toppen","body":"Lænden tager over for glutes. Pres hagen mod brystet og spænd maven i toppen — bækken skal være neutral."},{"title":"Fødderne for tæt på krop","body":"Bliver et quad-dominant pres. Fødder skal være længere ude så skinneben er lodret i lockout."}]$$,
   'Den øvelse der rammer glutes hårdest — uden den ryg- og knæ-stress squat og deadlift har.',
   'Skulderbladene mod en bænk. Bar over hoftekam med en pad. Fødderne plantet hofte-brede.',
   'Single-leg hip thrust eller pause hip thrust.',
   'Glute bridge på gulv uden bænk eller barbell.',
   130, true),

  -- 14 — Push-up
  ('push-up', 'Push-up', 'upper-body-push', 'push-horizontal', 'bodyweight', 'beginner',
   'Chest', '{chest,triceps,front_delts}', '{abs}', '{forearms,glutes,quads}',
   'Planke fra ankel til hoved, bryst til gulv, eksplosiv op.',
   $$["Krop ret som en planke fra ankel til top af hovedet.","Hænder under skuldre, fingre pegende frem.","Albuer omkring 45° ud, ikke 90°.","Bryst rører gulvet før du presser op.","Spændt mave og glutes hele tiden — ingen hængerøv."]$$,
   $$[{"title":"Hofte falder","body":"Plank-formen kollapser. Spænd glutes og abs FØR du starter."},{"title":"Halv range","body":"Mange laver kun øvre 30%. Bryst rører gulv eller det tæller ikke."}]$$,
   'Den portable push-øvelse. Bygger functional pushing strength og core-stabilitet på én gang.',
   'Hænder under skuldre. Tæer på gulv. Krop spændt fra hæl til hoved.',
   'Decline push-up (fødder hævet), diamond push-up eller archer push-up.',
   'Knee push-up eller incline (hænder på bænk).',
   140, true),

  -- 15 — Dip
  ('dip', 'Dip', 'upper-body-push', 'push-vertical', 'bodyweight', 'intermediate',
   'Chest', '{chest,triceps}', '{front_delts}', '{forearms,abs}',
   'Skuldre ned, kontrolleret dybde, lås ud uden at miste position.',
   $$["Skuldre nede fra ørerne — ikke shruggede.","Krop let leaned forward = bryst-fokus, lodret = triceps-fokus.","Albuerne 45° ud (bryst) eller tæt på krop (triceps).","Albuer ned til 90°, ikke dybere — skulder-sikkerhed.","Lås ud fuldt uden at miste skulderposition."]$$,
   $$[{"title":"Shruggede skuldre","body":"Truer rotator-manchet. Træk skuldrene ned og hold der hele tiden."},{"title":"For dyb dip","body":"Albuer under 90° lægger pres på rotator cuff. Stop ved albuerne i ret vinkel."}]$$,
   'Den eneste lodrette push der rammer både bryst og triceps tungt — og kræver intet andet end to barer.',
   'Parallelbars eller dipping station. Krop fri af gulvet, ben krydset bagud eller lige ned.',
   'Weighted dip via dipping belt.',
   'Bench dip eller assisted dip med band.',
   150, true),

  -- 16 — Plank
  ('plank', 'Plank', 'core', 'core', 'bodyweight', 'beginner',
   'Core', '{abs}', '{obliques,lower_back}', '{glutes,front_delts}',
   'Ret linje fra ankel til hoved, spændt fra ende til ende.',
   $$["Albuer under skuldre, underarme parallelt.","Krop ret linje — hofte hverken oppe eller ned.","Spændt mave som om du venter på et slag.","Glutes spændt hårdt — fjerner load fra lænden.","Træk hagen let ind — ingen kink i nakken."]$$,
   $$[{"title":"Hofte synker","body":"Lænden overtager. Cue: tryk gulvet væk med underarmene og spænd glutes som om du holder en mønt mellem dem."},{"title":"Numse op i luften","body":"Bliver til en let down-dog. Hold hofteleddet i ret linje med skuldre."}]$$,
   'Bygger isometrisk core-styrke der oversættes til alle store løft. Plank-time forudser deadlift-stabilitet.',
   'Underarme på gulv, tæer plantet. Spændt mave fra start. Stopur klar.',
   'Side plank, plank med arm-løft eller weighted plank.',
   'Knee plank eller underarme på en bænk for mindre vinkel.',
   160, true),

  -- 17 — Barbell Curl
  ('barbell-curl', 'Barbell Curl', 'arms', 'pull-vertical', 'barbell', 'beginner',
   'Biceps', '{biceps}', '{forearms}', '{front_delts}',
   'Albuer ved siden, stang fra fuld stræk til hage-højde.',
   $$["Albuerne LÅSER ved siden — de bevæger sig ikke en cm.","Stang fra fuld stræk til hage-højde.","Pause kort i toppen, squeeze biceps.","Kontrolleret nedad — 2 sek minimum.","Ingen body sway, ingen back arch."]$$,
   $$[{"title":"Body english","body":"Du svinger med kroppen for at flytte stangen. Stå op mod en væg hvis du ikke kan disciplinere bevægelsen."},{"title":"Albuer flytter sig fremover","body":"Front delts tager over. Hold albuerne fast ved siden — som om de er limede til ribbene."}]$$,
   'Isolerer biceps direkte. Mest effektive måde at bygge arm-størrelse på.',
   'Stå oprejst. Stang i underhåndsgreb, skulder-bredde. Albuer fast ved siden.',
   'Tempo curl (4 sek nedad) eller drag curl.',
   'Dumbbell curl eller cable curl for constant tension.',
   170, true),

  -- 18 — Tricep Pushdown
  ('tricep-pushdown', 'Tricep Pushdown', 'arms', 'push-vertical', 'cable', 'beginner',
   'Triceps', '{triceps}', '{forearms}', '{chest,lats}',
   'Albuer ved siden, fuld lockout i bunden.',
   $$["Albuerne LÅSER ved siden — de bevæger sig ikke.","Start fra 90° i albuen, pres ned til fuld stræk.","Lock-out i bunden — squeeze 1 sek.","Kontrolleret nedad eccentric — 2 sek.","Lats spændt for at låse albue-position."]$$,
   $$[{"title":"Albuer vandrer fremover","body":"Front delt tager over. Cue: albuer mod ribbenene hele tiden."},{"title":"Brug af kropsvægt","body":"Du bøjer dig fremover og smider vægten ned. Stå oprejst — stangens vægt skal bevæges af triceps alene."}]$$,
   'Isolerer triceps — bygger lockout-styrken der overfører til bench og overhead press.',
   'Cable maskine med rope eller V-bar. Stå oprejst tæt på maskine. Albuer fast ved siden.',
   'Rope pushdown med spread i bunden, eller single-arm pushdown.',
   'Lighter weight + tempo, eller seated overhead tricep extension.',
   180, true),

  -- 19 — Lateral Raise
  ('lateral-raise', 'Lateral Raise', 'shoulders', 'push-vertical', 'dumbbell', 'beginner',
   'Shoulders', '{front_delts}', '{traps,rear_delts}', '{forearms}',
   'Hæv til skulderhøjde, lillefinger først.',
   $$["Albuer let bøjede — hold den vinkel konstant.","Hæv til skulderhøjde, ikke højere.","Førerkant er lillefingeren, ikke tommelfinger.","Kontrolleret tempo — ingen swing.","Pause kort i toppen, kontrolleret ned."]$$,
   $$[{"title":"Sving fra hoften","body":"Bygger ikke skuldre. Stå mod en væg hvis du ikke kan disciplinere bevægelsen."},{"title":"Tommelfinger i toppen pegende op","body":"Aktiverer front delts. Hold lillefinger højere end tommel — det targeterer side delt."}]$$,
   'Eneste isolerede øvelse for side-delts. Bygger skulder-bredde og 3D look.',
   'Stå oprejst med dumbbells ved siden. Albuer let bøjede. Spændt mave.',
   'Cable lateral raise eller lean-away lateral (for stretch).',
   'Machine lateral eller liggende lateral på en skrå bænk.',
   190, true),

  -- 20 — Standing Calf Raise
  ('standing-calf-raise', 'Standing Calf Raise', 'lower-body', 'push-vertical', 'machine', 'beginner',
   'Calves', '{calves_back}', '{calves_front}', '{glutes,abs}',
   'Fuld stræk i bunden, eksplosivt op, squeeze i toppen.',
   $$["Fuld stræk i bunden — strækkes, mærkes.","Hæv på storetåballen, ikke yderkant.","Pause 1-2 sek i top — squeeze.","Lige knæ — ingen bouncing eller bøjning.","Kontrolleret nedad — 2 sek."]$$,
   $$[{"title":"Halv range","body":"Hæver kun 5 cm. Calves har enorm range — brug den eller drop øvelsen."},{"title":"Bouncing","body":"Stretch-reflex gør al arbejdet. Pause i top OG bund af hver rep."}]$$,
   'Calves vokser kun fra direkte stimulus og full range. Skipper du dem, ser bens udvikling underligt ud.',
   'Standing calf raise machine. Skulder under pad. Fortæer på platform, hæl frit.',
   'Single-leg calf raise eller weight increase.',
   'Bodyweight calf raise på et trin.',
   200, true)

on conflict (slug) do update set
  name              = excluded.name,
  category          = excluded.category,
  pattern           = excluded.pattern,
  equipment         = excluded.equipment,
  difficulty        = excluded.difficulty,
  primary_muscle    = excluded.primary_muscle,
  primary_muscles   = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  tertiary_muscles  = excluded.tertiary_muscles,
  cue               = excluded.cue,
  cues              = excluded.cues,
  mistakes          = excluded.mistakes,
  why_matters       = excluded.why_matters,
  setup             = excluded.setup,
  progression       = excluded.progression,
  regression        = excluded.regression,
  display_order     = excluded.display_order,
  is_published      = excluded.is_published;
