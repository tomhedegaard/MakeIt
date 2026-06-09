-- =================================================================
-- MakeIt // HQ — Søjle 5: Mental Health Pillar (B-layer polish)
-- =================================================================
-- Rewrites 4 of the 8 hero sessions with sharper craft — one per
-- category. Same structure (H2 sections), same duration, same
-- visual_pattern. Content goes from functional to premium so demo
-- mode and live mode showcase what the pillar can be.
--
-- Idempotent: UPDATE-by-slug. Safe to re-run.
-- =================================================================

update public.mental_sessions
   set title    = 'Coherence 5-5',
       subtitle = 'For HRV-løft — 4 min',
       body_md  = E'## Hvad du laver\n\nDu trækker vejret i et tempo der maksimerer din HRV. Det er ikke åndedrag for hyggens skyld — det er træning af nervesystemet, samme princip som styrketræning.\n\n5 sekunder ind. 5 sekunder ud. Ca. 6 åndedrag pr. minut. Følg den lange ring på skærmen.\n\n## Det første minut\n\nDet er svært. Din vejrtrækning vil snyde dig — gå hurtigere, eller blive korthugget. Lad det være. Ringen trækker dig.\n\nMund åben eller lukket. Næse eller mund. Det er ligegyldigt. Det vigtige er rytmen.\n\n## Det andet minut\n\nDu vil bemærke at dine skuldre allerede er sunket. Det er målet. Den parasympatiske nerve har overtaget. Kroppen siger: ingen fare.\n\nHvis tanker kommer, lad dem passere. Tilbage til ringen.\n\n## Det tredje og fjerde minut\n\nNu føles det nemt. Det er sjældent du får et signal fra kroppen om at noget rent fysisk virker. Det her er et af dem.\n\nLuk øjnene de sidste 30 sekunder hvis du vil. Lyt til din egen vejrtrækning.\n\n## Når du er færdig\n\nLav mind-check bagefter hvis du har lyst. Mange ser stress falde et eller to trin.\n\nDet her er det billigste værktøj du nogensinde får. Det koster 4 minutter og fungerer hver gang.'
 where slug = 'coherence-5-5-da';

update public.mental_sessions
   set title    = 'Pre-session priming',
       subtitle = '90 sekunder inden du tager fat',
       body_md  = E'## Lige nu\n\nDu er minutter fra at træne. Det er nu hovedet skal vælge hvad det er for en session.\n\nIngen taler om det her. De fleste går direkte til vægten og håber. Du gør det modsatte.\n\n## Tre spørgsmål\n\n1. **Hvad er den vigtigste sæt i dag?** Ikke i programmet. I dag. Den ene sæt der gør dagen til en god dag uanset hvad der ellers sker.\n\n2. **Hvad er den ene cue jeg holder fokus på?** Knæ ud. Hoften løfter. Spænd op før loftet. Vælg én. Hvis du vælger tre, vælger du ingen.\n\n3. **Hvad er signalet fra min krop?** Står du flygtigt? Mangler du varme i hofterne? Føles ryggen kort? Det er gratis information. Brug den i opvarmningen.\n\n## Sidste 30 sekunder\n\nLuk øjnene. Se din vigtigste sæt. Vægten letter. Du står oprejst. Du sætter den ned.\n\nDu står stadig oprejst.\n\nÅbn øjnene. Gå.'
 where slug = 'pre-session-priming-da';

update public.mental_sessions
   set title    = 'Vind ned efter beast-mode',
       subtitle = 'Skift fra på til af — 4 min',
       body_md  = E'## Hvor du er nu\n\nDu har lige skubbet hårdt. Pulsen er nede igen, men nervesystemet er stadig oppe. Det er fint at det er oppe — det skal det være lige efter en hård session. Men hvis du vil sove i nat, vil du have det ned før du går i seng.\n\nDet her tager 4 minutter og er det stærkeste værktøj du har til søvn efter sen træning.\n\n## Mønstret\n\n4 sekunder ind. 8 sekunder ud. Den lange udånding er pointet. Den fortæller hjernen: faren er væk.\n\nFølg ringen.\n\n## I de første to minutter\n\nDe første otte sekunders udånding er svære. Kroppen vil have luft hurtigere. Lad være med at tvinge — gå langsommere og længere ud hver gang.\n\nLæg en hånd på maven hvis du har lyst. Mærk den falde langsomt.\n\n## I de sidste to minutter\n\nNu er det blevet nemt. Du er kommet ned.\n\nIngen telefon når du går herfra. Ingen mails. Drik et glas vand. Læs noget på papir. Eller bare sid.\n\n## Når du er færdig\n\nProtein. Vand. Måske et bad. Sengen er tæt på.\n\nDu har gjort to ting i dag der gør forskel: presset, og bremset. De fleste glemmer den anden.'
 where slug = 'wind-down-beast-mode-da';

update public.mental_sessions
   set title    = 'Når træningen var dårlig',
       subtitle = 'Lige efter en lortesession — 3 min',
       body_md  = E'## Det var skidt\n\nFair. Det sker. Vi taler om hvad du gør med det inden du går herfra.\n\nIngen quick fix. Ingen "se det positive". Bare en kort, ærlig samtale med dig selv.\n\n## Hvad var virkelig galt?\n\nVar det vægten? Eller var det dig?\n\nSøvn? Energi? Stress udefra? Tanker du har slæbt med dig? Et måltid der ikke ramte? En ting du var bange for at fejle, og så sneg det sig ind?\n\nVær ærlig. Det er kun dig der hører dette.\n\n## Hvad bærer du IKKE med dig?\n\nÉn ting du nægter at lade ramme i morgen. Lad det blive her, på dette gulv.\n\nDen sætter du sko-side ned på. Ikke mere.\n\n## Hvad lærte du?\n\nÉn lille ting. "Næste gang…" — fyld ud.\n\nMåske er det noget med opvarmning. Måske er det noget med tankegang. Måske er det noget med at logge mind-check INDEN næste session — så Adaptive Engine kan justere før du står med stangen i hånden.\n\n## Sidste ting\n\nSkriv det evt. ned i journalen. To linjer. Du vil takke dig selv om en måned.\n\nGå. Ingen tilbagekig. Næste session er ikke i dag.'
 where slug = 'debrief-bad-session-da';
