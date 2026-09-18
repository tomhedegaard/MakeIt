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
| Motoren læser **ikke** rå HRV-millisekunder. Den læser `readinessBucket` (en bucket) plus livsstil | `engine.ts`, `types.ts:119-124` |
| Lav søvn er en tærskel i motoren: gennemsnit under 5,5 timer over to dage | `engine.ts:38` (`LOW_SLEEP_THRESHOLD_HOURS`) |
| Stress og træthed kommer ind som `feelingLast3d` i mængden `{tired, stressed}` | `engine.ts:53` (`LOW_FEELING_STATES`) |
| Motorens grænser: den må sænke topsæt, gøre accessory valgfri, foreslå en lettere variant og afkorte. Pause, deload og eskalering kræver Munk | spec 2026-09-17 §4 C1, `hrv/learn/adaptive` |
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
| HRV | 28-86 ms, trin 1 | `latestReading.readinessBucket` via båndet i §3.3 |
| Stress | 1-5 | `lifestyle.feelingLast3d`: 4-5 → `stressed`, 3 → `null`, 1-2 → `null` |

Resten af inputtet er faste, ærlige demo-værdier: `adaptiveProgramEnabled: true`, frisk måling (`now` minus 1 time), `warmUpState: "active"`, `isSick: false`, `veryLowDaysLast5: 0`, `rpeDriftLast14d: null`, ingen manglende sessioner, ingen form-check-bekymring, og én kommende session "Back squat" med et topsæt på 150 kg.

**Hvorfor faste værdier:** de felter beskriver historik, som en besøgende ikke har. De sættes til det neutrale, så det, den besøgende trækker i, er det eneste, der flytter beslutningen.

### 3.3 Det ene sted landingen oversætter

Motoren læser buckets, ikke millisekunder. Landingen viser millisekunder, fordi det er det tal, folk kender fra deres ur. Oversættelsen er landingens eget ansvar og skal testes:

| HRV på skyderen | `readinessBucket` |
|---|---|
| under 42 ms | `very_low` |
| 42-51 ms | `low` |
| 52-74 ms | `normal` |
| over 74 ms | `high` |

Båndet 52-74 ms vises som tekst under skyderen, så tallet aldrig står uforklaret. Det er et **eksempelbånd**, ikke et løfte: copy siger "dit bånd bliver dit eget, når appen har lært dig at kende".

### 3.4 Fra beslutning til skærm

`CandidateDecision` giver `action`, `confidence`, reason-koder og en dansk forklaring. Telefonen viser:
- topsættet, med 150 overstreget i orange når motoren har ændret det,
- de berørte øvelser, hvor valgfri accessory tones ned,
- forklaringen fra motoren,
- "Behold original" som sekundær handling (ikke funktionel på landingen, men synlig, fordi den findes i appen),
- to hvorfor-chips med de tal, den besøgende selv satte.

Reason-koder oversættes med de eksisterende hjælpere i `reason-narratives.ts`, ikke med ny copy.

## 4. Sektionerne

| # | Sektion | Hvad der sker |
|---|---|---|
| 1 | **Hero** | H1 og sætning uændret. Højre side bliver riggen: tre skydere, telefonen, båndet. Vægtskive-tallene 150/135 flytter ind i telefonen som det, motoren ændrer. |
| 2 | **Motor** | Beviset udfoldes: nattens tidslinje 23:40 → 05:30 → 06:45 som en SVG-kurve, der tegner sig i syne, og de fire grænser for hvad motoren må. "Behold original" forklares her. |
| 3 | **Fire systemer** | Bento beholdes. De fire celler får MoveKit-klip som duotone-flader i stedet for tomme kort. Hjerte-cellen forbliver den ene mørke blok. |
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
- **MoveKit:** de bundlede klip bruges som duotone-flader gennem den eksisterende `DemoLoop`. På lyse flader vises de med `mix-blend-mode: multiply`, som §3.4 i Kalk-specen kræver. Ingen tegnede figurer.
- **Munks signatur:** den eksisterende SVG.

## 6. Bevægelse, ydelse og tilgængelighed

- **Bevægelse:** kun CSS-overgange plus `IntersectionObserver`. Hvert greb har et statisk slutbillede ved `prefers-reduced-motion`.
- **Ydelse:** ingen nye afhængigheder. Motoren er ren funktion, så et træk i en skyder koster en enkelt render. Hero-fladen må ikke vokse: LCP-elementet forbliver H1, og videoer i syne er `preload="none"` med poster.
- **Tilgængelighed:** skyderne er `<input type="range">` med `<label>`, tastaturstyring og målflader på mindst 44 px. Det omskrevne pas ligger i en `aria-live="polite"`-region, så en skærmlæser hører ændringen. Kontrasten følger Kalks eksisterende port.
- **Ingen backend:** demoen sender intet. Ingen tal fra en besøgende forlader browseren, og det siges i FAQ'en.

## 7. Åbne beslutninger (Tom)

| # | Spørgsmål | Anbefaling |
|---|---|---|
| E1 | Skal demoen have en "prøv med mine tal"-tilstand, der spørger om rigtige data? | **Nej.** Det er en tilmelding i forklædning og koster tillid. |
| E2 | Skal båndet 52-74 ms stå som eksempel eller som gennemsnit for crewet? | **Eksempel.** Vi har ikke tal at stå inde for, og et påstået gennemsnit er en påstand vi ikke kan bevise. |
| E3 | Skal demoen huske skyderne mellem besøg? | **Nej i v1.** YAGNI. |

## 8. Kvalitetsporte

- **Motor-paritet:** en test viser, at landingen importerer `evaluateAdaptation` fra `@/lib/adaptive/engine` og ikke definerer egne tærskler. Grep-porten fejler, hvis der dukker et tal op i demo-modulet, som også findes i motoren.
- **Bro-test:** `engine-demo.ts` testes for alle fire buckets, for tærsklen ved 5,5 timers søvn og for at stress 4-5 giver `stressed`.
- **Beslutnings-test:** tre kendte scenarier (dårlig nat, normal nat, stærk nat) giver henholdsvis en sænkning, ingen ændring og ingen sænkning.
- **Copy:** eksisterende `kalk/copy.test.ts` udvides med de nye nøgler. Ingen tankestreger, da og en i takt.
- **Kontrast og tema:** eksisterende porte.
- **Bevægelse:** test for at hvert nyt greb har en `prefers-reduced-motion`-gren.
- **Browser:** 390 px og 1440 px, nul konsolfejl, protokol i `PLATFORM_OVERVIEW.md` §8.

## 9. Risici

| Risiko | Håndtering |
|---|---|
| Motoren svarer "ingen ændring" for de fleste skyder-kombinationer, så demoen virker død | Standardtilstanden sættes til en nat under båndet, så det første indtryk er en ændring. Bro-testen låser, at mindst tre kombinationer giver tre forskellige svar. |
| En ændring i appens motor ændrer landingen uden at nogen opdager det | Beslutnings-testen kører i CI og fejler, hvis de tre scenarier skifter svar. |
| Klientbundtet vokser, fordi `engine.ts` trækker typer og hjælpere med | Kun `evaluateAdaptation` og `reason-narratives` importeres. En bundle-test holder demoen under 8 KB gzip. |
| Demoen læses som et løfte om præcise tal | Copy siger eksempelbånd, og FAQ'en forklarer, at intet sendes nogen steder. |

## 10. Referencer

- Mockups: https://claude.ai/artifact/UucnFEHaMd7ExMn8b67yGs
- Kalk-spec: `docs/superpowers/specs/2026-09-17-kalk-redesign-design.md`
- Motorens regler: `src/lib/adaptive/engine.ts`, `docs/PLATFORM_OVERVIEW.md`
- Domænefarver: `docs/DOMAIN_COLOR_SYSTEM.md`
