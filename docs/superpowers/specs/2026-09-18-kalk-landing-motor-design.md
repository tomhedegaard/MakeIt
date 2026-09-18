# Kalk-landingen: motoren live

**Dato:** 2026-09-18 · **Spec-revision:** 1
**Status:** Retning valgt af Tom (C, "motoren live", med premium-positionering som mål)
**Branch:** `claude/kalk-landing-motor` fra `main` @ `5dc9923`
**Forudsætninger:** F4 leveret og i produktion (PR #104), Kalk-landingen live i Production siden 2026-09-17
**Mockups:** https://claude.ai/artifact/UucnFEHaMd7ExMn8b67yGs (A, B, C som hero og som hele sider)
**Uden for scope:** ny sidestruktur, nye sektioner, coach-konsollen, appens flader, mailskabeloner, prisfremstilling

---

## 0. Verificeret i koden (ikke antaget)

| Påstand | Evidens |
|---|---|
| `evaluateAdaptation(input: EngineInput): CandidateDecision` er ren: kun type-imports, ingen DB, ingen `server-only` | `src/lib/adaptive/engine.ts:29-65` |
| `EngineInput` kan bygges syntetisk. Felterne er `adaptiveProgramEnabled`, `latestReading` (`measuredAt`, `warmUpState`, `readinessBucket`, `isSick`), `veryLowDaysLast5`, `rpeDriftLast14d`, `lifestyle` (`sleepHoursAvg2d`, `alcoholLast2d`, `feelingLast3d`), `recentSessions`, `recentFormChecks`, `daysSinceHeavyLift`, `nextSession`, `now` | `src/lib/adaptive/types.ts:54-165` |
| Motoren læser **ikke** rå HRV-millisekunder. Den læser `readinessBucket` plus livsstil | `engine.ts`, `types.ts:119-124` |
| Buckets er **relative**, ikke absolutte: `classifyReadiness` sammenligner 7-dages snit med 60-dages baseline ± SWC og giver fem buckets, inklusive `very_high`. Der findes ingen ms-grænser i appen | `src/lib/hrv/baseline.ts:60-79`, `src/lib/hrv/types.ts:10-15` |
| `EngineInput` kræver også `memberId`, og `nextSession` kræver `sessionId`, `scheduledFor`, `title`, `week` og øvelser med `sessionExerciseId`, `position` og `hasLighterVariant`. **Der findes intet vægtfelt** i `NextSessionExerciseInfo` | `types.ts:86-108` |
| `explainerScenarioInput()` er et færdigt, testlåst `EngineInput`, som i dag driver den rigtige motor på `/hrv/learn/adaptive` | `src/lib/adaptive/mock-scenarios.ts:36`, `src/app/(app)/hrv/learn/adaptive/page.tsx` |
| Den danske sætning hedder `decision.explanationDa` og bygges af `buildTopSetExplanation` i `engine.ts`. `formatExplanationDa` findes ikke (kun som forældet kommentar i `types.ts:170`) | `engine.ts` |
| `very_low` rammer en hård regel før livsstil overhovedet læses: motoren foreslår `paused_session` med `humanReviewRecommended: true` | `engine.ts` |
| `DemoLoop` sætter selv `mix-blend-multiply` over `bg-bg-2`. Der er ingen duotone-tone, og `className` rammer kun yderelementet | `src/components/marketing/DemoLoop.tsx` |
| Hjerte-cellen i bentoen er `data-theme="nat"`, hvor multiply ville udslette klippet | `SystemsBento.tsx:39,125` |
| Lav søvn er en tærskel i motoren: gennemsnit under 5,5 timer over to dage | `engine.ts:38` (`LOW_SLEEP_THRESHOLD_HOURS`) |
| Stress og træthed kommer ind som `feelingLast3d` i mængden `{tired, stressed}` | `engine.ts:53` (`LOW_FEELING_STATES`) |
| Motorens grænser: den må sænke topsæt, sænke volumen, gøre accessory valgfri, foreslå en lettere variant og afkorte. Pause og deload **foreslår** den, men de markeres til Munk og gennemføres først med hans accept | `engine.ts`, spec 2026-09-17 §4 C1 |
| Landingen ligger bag `LANDING_VARIANT` og består af otte sektioner i `src/components/marketing/kalk/` | `KalkLanding.tsx`, `src/lib/marketing/landing-variant.ts` |
| `DemoLoop` afspiller MoveKit-klip kun i syne, holder pause ved reduceret bevægelse og har en synlig pause-knap | `src/components/marketing/DemoLoop.tsx` |
| 19 MoveKit-klip ligger bundlet som `.webm`, `.mp4` og et `-poster.jpg` | `public/exercise-demos/` |
| Kalks kvalitetsporte gælder allerede: kontrast, ingen tankestreger, højst tre eyebrows, ingen hardcodet copy | `src/lib/marketing/kalk/copy.test.ts`, `src/lib/design/kalk-theme.test.ts` |
| Landingens copy ligger i `messages/{da,en}/Marketing.json` under `kalk` | samme |

## 1. Problem

Landingen viser produktet, men den **beviser** det ikke. En besøgende læser, at motoren skriver dagens pas om efter nattens tal, og skal tro på det. Samtidig er Kalks premium-indtryk båret af typografi alene: der er ingen bevægelse eller materiale, der får siden til at føles som udstyr frem for en hjemmeside.

## 2. Beslutning

**Heroen bliver motoren.** Den besøgende trækker i tre tal fra sin egen nat, og dagens pas skrives om foran dem med **appens rigtige regelfunktion**, `evaluateAdaptation`, kørt i browseren.

- **Ærlighed er hele pointen.** Landingen kalder den samme funktion som produktionen. Ændres reglerne i appen, ændres landingen samme dag. En test låser, at der kun findes én motor.
- **Premium bevares.** H1 "Bygget til dem der løfter.", den ene sætning og den monokrome knap bliver stående. Riggen erstatter vægtskive-tallene i højre side, ikke fortællingen i venstre.
- **Ingen nye sektioner.** De otte sektioner består. Motor-sektionen bliver beviset udfoldet, resten løftes håndværksmæssigt.
- **Ingen nye biblioteker.** Bevægelse er CSS og `IntersectionObserver`.

Fravalgt, én linje hver:
- *Egen forenklet motorlogik på landingen:* to sandheder, der før eller siden modsiger hinanden.
- *Serverkald pr. skyder-træk:* latenstid, kold start og en API-flade at passe på, for noget der er ren funktion.
- *3D eller WebGL i hero:* Tom valgte letvægt. Wauw skal komme fra præcision og bevis.
- *Fuld omskrivning af siden (retning B eller ny struktur):* siden er en dag gammel og virker.

## 3. Sådan kører motoren i browseren

### 3.1 Den ene delte funktion

`evaluateAdaptation` er ren og importeres direkte i en klientkomponent. Der skrives **ingen** kopi af reglerne.

### 3.2 Broen: tre tal til `EngineInput`

Skyderne giver tre værdier. En ny ren modul-fil `src/lib/marketing/kalk/engine-demo.ts` oversætter dem til et `EngineInput`:

| Skyder | Interval | Mapper til |
|---|---|---|
| Søvn | 3,0-9,0 t, trin 0,5 | `lifestyle.sleepHoursAvg2d` |
| HRV | 42-86 ms, trin 1 | `latestReading.readinessBucket` via demo-båndet i §3.3 |
| Stress | 1-5 | `lifestyle.feelingLast3d`: 4-5 → `stressed`, 3 → `null`, 1-2 → `null` |

Grundlaget er **ikke** et nyt literal, men `explainerScenarioInput()` fra `src/lib/adaptive/mock-scenarios.ts`, som allerede er testlåst og driver motoren på `/hrv/learn/adaptive`. `engine-demo.ts` kopierer det og overskriver **præcis tre felter**:

1. `latestReading.readinessBucket`
2. `lifestyle.sleepHoursAvg2d`
3. `lifestyle.feelingLast3d`

**Alt andet bliver stående, og det er med vilje.** Scenariets historik er allerede harmløs og udløser ingen regel: `veryLowDaysLast5: 1` (tærsklen er 3), `rpeDriftLast14d: 0.3` (tærsklen er 1,5), RPE-afvigelse 0,5 (tærsklen er 1,0), ingen sprungne sessioner og ingen form-checks. Der skal derfor ikke "neutraliseres" noget.

**Rør ikke ved `measuredAt` eller `now`.** Scenariet har målingen 05:30 og `now` 07:00, altså halvanden time gammel og langt inden for grænsen på 36 timer. Sætter man `measuredAt` til den rigtige nutid, mens `now` bliver stående som scenariets mock-tid, bliver alderen negativ, og motoren svarer `stale_reading` og `no_change` ved **alle** skyder-positioner. Demoen ville se død ud.

**Topsættets vægt lever ikke i motoren.** `NextSessionExerciseInfo` har intet vægtfelt. Motoren svarer med en handling og `decision.params.percent`, som er valgfri og i dag altid 10 ved en topsæt-sænkning (`engine.ts:242`, typen tillader 5, 10 og 15). Landingen viser 150 kg som sin egen visning, regner den nye vægt ud af procenten og falder tilbage til 10 %, hvis feltet mangler. Det siges i copy: tallet er et eksempel, procenten er motorens.

### 3.3 Det ene sted landingen digter: ms til bucket

Appen har **ingen** absolutte ms-grænser. `classifyReadiness` sammenligner dit eget 7-dages snit med din egen 60-dages baseline (`src/lib/hrv/baseline.ts:60-79`). En besøgende har hverken baseline eller historik, så landingen har brug for et tal, folk kan genkende fra deres ur.

Landingen bruger derfor et **demo-bånd**, som er landingens egen fiktion og ikke en påstand om appen:

| HRV på skyderen | `readinessBucket` |
|---|---|
| 42-51 ms | `low` |
| 52-74 ms | `normal` |
| 75-86 ms | `high` |

Skyderen går fra **42 til 86 ms**. `very_low` er med vilje uden for rækkevidde: den udløser motorens hårde regel om `paused_session` før livsstil overhovedet læses, og en pause er Munks beslutning, ikke en demo-pointe. `very_high` er også udeladt, fordi den ikke ændrer svaret i forhold til `high`.

Copy under skyderen siger det direkte: "Demo-bånd. I appen bliver båndet dit eget, målt mod din egen baseline." Bro-testen låser, at mapningen kun findes ét sted, og at den er landingens, ikke appens.

### 3.4 Fra beslutning til skærm

`CandidateDecision` giver `action`, `confidence`, reason-koder og en dansk forklaring. Telefonen viser:
- topsættet, med 150 overstreget i orange når motoren har ændret det,
- de berørte øvelser, hvor valgfri accessory tones ned,
- forklaringen fra motoren (`decision.explanationDa`, bygget af `buildTopSetExplanation`),
- "Behold original" som sekundær handling (ikke funktionel på landingen, men synlig, fordi den findes i appen),
- to hvorfor-chips med de tal, den besøgende selv satte. Ved stress på 3 eller derunder er `feelingLast3d` `null`, og `formatFeelingState` giver "-". Chippen viser i stedet søvn og HRV, så der aldrig står en tom værdi.

Chippene bruger de eksisterende hjælpere i `reason-narratives.ts` (`labelForReason`, `formatReadinessBucket`, `formatSleepHours`, `formatFeelingState`). Der skrives ingen ny forklarings-copy.

### 3.5 Fire svar, fire skærme

Inden for skyderens rækkevidde kan motoren svare fire ting. Alle fire skal have en skærm, ellers ser demoen i stedet ud til at være i stykker:

| Svar | Hvornår | Hvad telefonen viser |
|---|---|---|
| `top_set_reduction` | `low` plus mindst ét livsstilssignal | Topsættet overstreget og sat ned med motorens procent |
| `volume_reduction` | `low`, søvn på 5,5 timer eller mere og stress på 3 eller derunder | Topsættet står. Motoren dropper to accessory-sæt (`params.accessorySetsDropped`), og skærmen siger "droppet", ikke "valgfri" |
| `no_change` | `normal` eller `high` | Passet står uændret, med en linje om at alt er inden for båndet |
| Eskalering til Munk | hvis motoren sætter `humanReviewRecommended` | En linje om, at Munk kigger på det, før noget ændres. **Skyderen kan ikke nå dertil**, fordi mindst tre signaler er nødvendige, og demoen kan højst give to. Skærmen bygges som sikkerhedsnet, hvis appens regler ændrer sig, og testes derfor med et konstrueret input, ikke via skyderne |

**Den vigtige ærlighed:** med `normal` eller `high` bucket ændrer søvn og stress alene ikke svaret. Det er ikke en fejl i demoen, det er motorens faktiske regel, og copy siger det: "HRV er det, der åbner døren. Søvn og stress afgør, hvor meget."

Standardtilstanden er **5,0 timer, 46 ms, stress 4**, som giver `top_set_reduction`. Det første indtryk er altså en ændring, ikke en tom skærm.

## 4. Sektionerne

| # | Sektion | Hvad der sker |
|---|---|---|
| 1 | **Hero** | H1 og sætning uændret. Højre side bliver riggen: tre skydere, telefonen, båndet. Vægtskive-tallene 150/135 flytter ind i telefonen som det, motoren ændrer. |
| 2 | **Motor** | Beviset udfoldes: nattens tidslinje 23:40 → 05:30 → 06:45 som en SVG-kurve, der tegner sig i syne, og de fire grænser for hvad motoren må. "Behold original" forklares her. |
| 3 | **Fire systemer** | Bento beholdes. De **tre lyse** celler får MoveKit-klip gennem `DemoLoop`. Hjerte-cellen forbliver den ene mørke blok **uden klip**, fordi multiply udsletter et klip på mørk baggrund. |
| 4 | **Munk** | Uændret struktur. Tidsstempler og signatur strammes typografisk. |
| 5 | **Crewet** | Uændret. Skiver, markører og reps-måler. |
| 6 | **Stemmer** | Uændret og fortsat skjult i produktion, indtil D6 er løst. |
| 7 | **Adgang** | Uændret mørkt panel. Overskriften knytter an til demoen: du har prøvet motoren, prøv appen. |
| 8 | **FAQ og footer** | Uændret, plus ét nyt spørgsmål: "Er demoen på forsiden den rigtige motor?" Svar: ja, samme funktion. |

Taste-reglerne fra Kalk gælder uændret: nul tankestreger, højst én eyebrow pr. tre sektioner, ingen sektionsnumre, ét bevægelsesgreb pr. sektion.

## 5. Illustrationer

Alt bygges i kode. Ingen AI-genererede billeder.

- **Riggen:** SVG. Skiver, lineal og stang tegnes som vektor i Kalks tokens, så de er skarpe på alle skærme og skifter farve med temaet.
- **Nattens kurve:** én SVG-sti med `stroke-dasharray`, der tegner sig, når sektionen kommer i syne.
- **MoveKit:** de bundlede klip vises gennem den eksisterende `DemoLoop`, som allerede sætter `mix-blend-multiply` over `bg-bg-2`. Der er **ingen duotone-tone i dag**; vil vi have en tonet flade, kræver det en lille ændring i `DemoLoop.tsx` (et valgfrit tint-lag), og den ændring hører med i planen. Ingen tegnede figurer.
- **Munks signatur:** den eksisterende SVG.

## 6. Bevægelse, ydelse og tilgængelighed

- **Bevægelse:** kun CSS-overgange plus `IntersectionObserver`. Hvert greb har et statisk slutbillede ved `prefers-reduced-motion`.
- **Ydelse:** ingen nye afhængigheder. Motoren er ren funktion, så et træk i en skyder koster en enkelt render. Hero-fladen må ikke vokse, og LCP-elementet forbliver H1. `DemoLoop` styrer allerede sin egen indlæsning: `preload="metadata"`, som først skifter til `auto`, når klippet er i syne. Den adfærd ændres ikke.
- **Tilgængelighed:** skyderne er `<input type="range">` med `<label>`, tastaturstyring og målflader på mindst 44 px. Det omskrevne pas ligger i en `aria-live="polite"`-region, så en skærmlæser hører ændringen. Kontrasten følger Kalks eksisterende port.
- **Ingen backend:** demoen sender intet. Ingen tal fra en besøgende forlader browseren, og det siges i FAQ'en.

## 7. Åbne beslutninger (Tom)

| # | Spørgsmål | Anbefaling |
|---|---|---|
| E1 | Skal demoen have en "prøv med mine tal"-tilstand, der spørger om rigtige data? | **Nej.** Det er en tilmelding i forklædning og koster tillid. |
| E2 | Skal båndet 52-74 ms stå som eksempel eller som gennemsnit for crewet? | **Eksempel.** Vi har ikke tal at stå inde for, og et påstået gennemsnit er en påstand vi ikke kan bevise. |
| E3 | Skal demoen huske skyderne mellem besøg? | **Nej i v1.** YAGNI. |
| E4 | Skal `DemoLoop` have et tint-lag, så klippene kan vises som duotone? | **Ja, som et valgfrit lag.** Uden det er cellerne rå videoklip på en lys flade. |

## 8. Kvalitetsporte

- **Motor-paritet:** en test viser, at landingen importerer `evaluateAdaptation` fra `@/lib/adaptive/engine`. Grep-porten matcher **hele taltokens** (`\b5\.5\b`, `\b1\.5\b`, `\b1\.0\b`, `\b36\b`) i `engine-demo.ts`. De bare tal 2 og 6 udelades, fordi de optræder inde i demoens egne ms-værdier som 42, 46 og 86 og ville få porten til at fejle på sig selv.
- **Bro-test:** `engine-demo.ts` testes for de tre buckets skyderen kan nå, for at 41 ms og derunder ikke kan vælges, for tærsklen ved 5,5 timers søvn og for at stress 4-5 giver `stressed`.
- **Beslutnings-test:** tre skyder-tilstande giver de tre svar, skyderne kan nå (`top_set_reduction`, `volume_reduction`, `no_change`), og standardtilstanden (5,0 t, 46 ms, stress 4) giver `top_set_reduction`. Eskaleringsskærmen testes separat med et konstrueret `CandidateDecision`. Testen fejler, hvis en ændring i appens motor ændrer et af svarene.
- **Copy:** eksisterende `kalk/copy.test.ts` udvides med de nye nøgler. Ingen tankestreger, da og en i takt.
- **Kontrast og tema:** eksisterende porte.
- **Bevægelse:** test for at hvert nyt greb har en `prefers-reduced-motion`-gren.
- **Browser:** 390 px og 1440 px, nul konsolfejl, protokol i `PLATFORM_OVERVIEW.md` §8.

## 9. Risici

| Risiko | Håndtering |
|---|---|
| Motoren svarer "ingen ændring", når HRV er normal, uanset søvn og stress | Det er motorens rigtige regel og siges i copy (§3.5). Standardtilstanden ligger under båndet, så det første indtryk er en ændring, og beslutnings-testen låser de tre svar. |
| En ændring i appens motor ændrer landingen uden at nogen opdager det | Beslutnings-testen kører i CI og fejler, hvis de tre scenarier skifter svar. |
| Klientbundtet vokser | `engine.ts` og `reason-narratives.ts` er type-only i deres imports, så de trækker intet runtime med. Porten er en statisk import-vandring, der fejler ved en ny runtime-afhængighed i demoens graf. Repoet har ingen bundle-måling i dag, og vi tilføjer ikke et værktøj for det her. |
| Demoen læses som et løfte om præcise tal | Copy siger eksempelbånd, og FAQ'en forklarer, at intet sendes nogen steder. |

## 10. Referencer

- Mockups: https://claude.ai/artifact/UucnFEHaMd7ExMn8b67yGs
- Kalk-spec: `docs/superpowers/specs/2026-09-17-kalk-redesign-design.md`
- Motorens regler: `src/lib/adaptive/engine.ts`, `docs/PLATFORM_OVERVIEW.md`
- Domænefarver: `docs/DOMAIN_COLOR_SYSTEM.md`

---

## 11. Status

**Leveret 2026-09-18** på branchen `claude/kalk-landing-motor`.

- Heroen kører appens rigtige `evaluateAdaptation` i browseren. De tre skyder-tilstande giver `top_set_reduction` (135 kg), `volume_reduction` (to accessory-sæt droppet) og `no_change`, verificeret i browseren.
- E4 er gennemført: `DemoLoop` har fået et valgfrit tint-lag.
- **Afvigelse fra §4:** kun Krop-cellen i bentoen fik et klip. Mad og Sind fik først et, men en planke ved siden af makrofordelingen og en knæløftning ved siden af et mentalt check-in læste som fyld. MoveKit har kun løfteklip, så de to celler står uden.
- **Afvigelse fra §3.4:** "Behold original" står som en rolig linje, ikke som en pille. Den er ikke klikbar på landingen, og et dødt element, der ligner en knap, er værre end en linje.
- Telefonens synlige overskrift er "I dag". `liveRegionPrefix` udtales kun af skærmlæsere.

