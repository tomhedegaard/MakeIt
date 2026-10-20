# Spec: HQ-estimat af måltider og I dag som kort

Dato: 27.09.2026 · Status: beslutninger truffet 27.09.2026 (afsnit D), klar til bygning · Retning: Nord (spec 2026-09-26)

Inspiration: 0xCal (foto/tekst → makroer, kort med ét tal hver). Vi tager funktionen og
kortgrammatikken, ikke udtrykket: ingen farvede kortflader, ingen håndskrift, ingen
konfetti, ingen 0–100-score.

---

## 0. Hvorfor og hvad

MakeIt planlægger, hvad du spiser; HQ lægger ugens måltider inden for brand-rammen, og du
logger, om du fulgte dem. Svagheden er alt det, der ikke står i planen. "Spiste noget
andet" findes, men kræver i dag, at medlemmet selv gætter kcal og protein
(`logOffPlanAction`, migration 0039). Det gør ingen præcist, så dagens regnestykke bliver
forkert, og HQ planlægger næste uge på dårlige data.

To leverancer:

- **A. HQ-estimat i "Spiste noget andet":** tag et foto eller skriv måltidet; HQ estimerer
  kcal, protein, kulhydrat og fedt; medlemmet retter og bekræfter.
- **B. I dag som kort:** morgensignalets fire små celler bliver fire kort, der hver svarer på
  ét spørgsmål med ét tal.

---

## A. HQ-estimat i "Spiste noget andet"

### A.1 Flow (tre trin, ét sheet)

1. **Input.** Sheetet åbner med to valg: *Tag foto* og *Skriv det*. Foto bruger kameraet
   (native i appen, filvælger på web); tekst er ét felt ("2 æg, rugbrød og en kaffe med
   mælk"). Et foto må have en kort tekst med ("delt med Sara").
2. **Afklaring (kun når HQ er i tvivl).** Genkender HQ ikke noget på billedet, eller kan
   det være flere ting, spørger HQ, før der estimeres. Billedet vises med en nummereret
   markering om det pågældende, og under det: "Hvad er nr. 1?" med op til tre bud og et
   fritekstfelt ("Brun sauce · Soyasauce · Teriyaki · Noget andet"). Markeringen er
   omtrentlig (modellens eget bud på placeringen); hvis den ikke kan placeres, beskriver
   spørgsmålet stedet i ord ("den brune sauce øverst til venstre"). Ser HQ slet ingen mad,
   siger det netop det og tilbyder *Tag nyt foto* eller *Skriv det*. Højst tre spørgsmål;
   resten estimeres med lav sikkerhed.
3. **Estimat.** HQ viser:
   - én linje om antagelsen: "Estimeret som en standard Cobb salad, ca. 450 g."
   - totaler med **usikkerhed**: "ca. 690 kcal (550–830)" og makroerne som hele gram
   - ingredienslisten, hver med gram og kcal, og en portions-stepper (½ · ¾ · 1 · 1¼ · 1½ ·
     2) der skalerer alt
   - sikkerheden i ord: *Sikkert* / *Omtrentligt* / *Groft gæt*, og hvorfor ("portionen
     er svær at se på billedet")
   - linjen "HQ-estimat · du kan rette alle tal"
4. **Godkend.** Estimatet tæller først, når medlemmet har godkendt det, **også når HQ er
   sikker** (beslutning 1). Godkend-knappen gentager usikkerheden: *Godkend ca. 690 kcal
   (550–830)*. *Ret selv* åbner felterne med HQ's tal udfyldt. *Annullér* gemmer intet.

Fejl eller ingen API-nøgle: sheetet falder tilbage til dagens manuelle felter (kcal +
protein), så flowet aldrig er blokeret.

### A.2 HQ's estimat

- Samme wrapper-mønster som `src/lib/data/nutrition-photo-claude.ts`: frosset,
  cachebart system-prompt, Zod-skema på svaret, `null` ved fejl.
- Model: `claude-sonnet-5` med vision (beslutning 3). Den er god til at genkende retter og
  ingredienser og til at forklare sin antagelse; ingen model kan veje mad på et foto, så
  portioner vil ofte være 20–40 % ved siden af. Derfor interval, afklaring og godkendelse.
- **Evaluering før lancering:** et sæt på 30 egne måltidsfotos med vejet mængde (danske
  hverdagsretter, brand-rammens måltider, restaurantmad). Krav: det vejede tal ligger inden
  for intervallet i mindst 80 % af tilfældene, og ingen fejlgenkendelser, der ikke
  udløser et spørgsmål. Falder den igennem, justeres prompt og interval, før funktionen
  åbnes.
- Svarskema:

  Estimatet kører i to kald, så medlemmet kan svare ind imellem:

  ```ts
  // Kald 1: hvad er på billedet?
  {
    foodVisible: boolean,
    questions: Array<{            // 0–3; tom = alt er genkendt
      id: string,
      prompt: string,             // "Hvad er den brune sauce?"
      options: string[],          // op til 3 bud
      box?: { x: number; y: number; w: number; h: number },  // 0–1, omtrentlig
      where?: string,             // "øverst til venstre", når box mangler
    }>,
  }

  // Kald 2: estimatet, med medlemmets svar
  {
    assumption: string,           // "Standard Cobb salad, ca. 450 g i alt."
    confidence: "high" | "medium" | "low",
    confidenceReason: string,     // "Portionen er svær at se på billedet."
    items: Array<{ name: string; grams: number; kcal: number;
                   proteinG: number; carbsG: number; fatG: number }>,  // 1–15
    kcalRange: { low: number; high: number },
  }
  ```

  Totaler genberegnes på serveren som summen af `items`, så modellen ikke kan give en
  total, der ikke passer til listen. Intervallet skal indeholde totalen; ellers afvises
  svaret. En tekst uden tvivl springer kald 1 over.
- Afrunding i visningen: kcal til nærmeste 10, gram til hele tal.
- Promptet kender brand-rammen (olivenolie og smør, skyr og hytteost) og dansk mad, men
  estimerer det, der er på billedet, ikke det, planen ønskede.
- Grænse: 20 estimater pr. medlem pr. døgn. Derefter manuel indtastning.

### A.3 Data

Migration på `nutrition_logs` (tilføjende, ingen brud):

| Kolonne | Type | Formål |
|---|---|---|
| `carbs_g` | integer, 0–1000 | kulhydrat |
| `fat_g` | integer, 0–500 | fedt |
| `estimate_source` | text: `member` · `hq_photo` · `hq_text` | hvor tallene kom fra |
| `estimate_confidence` | text: `high` · `medium` · `low` | HQ's sikkerhed |
| `estimate_items` | jsonb | ingredienslisten, som den blev bekræftet |
| `estimate_edited` | boolean | om medlemmet rettede HQ's tal |
| `estimate_kcal_low` / `estimate_kcal_high` | integer | intervallet, som det blev godkendt |

`kcal`, `protein_g`, `photo_path` og `notes` genbruges. Fotos ligger i den eksisterende
private `meal-photos`-bucket. `getDailyIntake` udvides med kulhydrat og fedt.

### A.4 Regler

- Ingen dom: estimatet siger hvad, aldrig "godt" eller "dårligt". Ingen score. Alle regler i
  afsnit S gælder.
- Mærkning overalt, hvor tallet står: "HQ-estimat" (spec §7.8: hvor AI har lavet noget,
  står det).
- Coachen ser kilde og om tallet er rettet, så ugesignalerne kan vægte groft gæt lavere.
- Privatliv: måltidsfotos går allerede til Claude i dag (foto-bedømmelsen), så
  databehandlingen er dækket af den nuværende politik. Teksten ændres ikke.

### A.5 Test

- Zod-skema og server-side genberegning af totaler (enhedstest).
- Fallback til manuelle felter når wrapperen returnerer `null`.
- Intet gemmes før bekræftelse; portions-stepperen skalerer alle fire tal.
- Grænsen på 20 pr. døgn.
- Afklaring: `foodVisible: false` giver "ingen mad"-tilstanden; spørgsmål vises med
  markering, og svarene sendes med i kald 2.
- Interval: afvis svar hvor totalen ligger uden for intervallet; godkend-knappen viser det.
- Gates: "HQ-estimat" står ved tallet; ingen 0–100 i UI.

---

## B. I dag som kort

### B.1 Kortgrammatik (én komponent: `SignalCard`)

Alle kort er ens bygget, så de kan læses i ét blik:

1. **Kicker** i domænefarven med domæne-mærket (13 px): "Mad"
2. **Tal** i `text-title` (34 px, tabular): "1.428 kcal tilbage"
3. **Hvorfor**, én linje i `--fg-dim`: "Træningsdag · 96 af 182 g protein"
4. **Data-blæk**: en 4 px bjælke eller en 14-dages sparkline i domænefarven
5. **Hele kortet er et link** til søjlen; skærmlæseren får én hel sætning

Flade: `--bg-2` med 1 px linje, radius 0, 20 px indvendig margin (spec §5). Domænefarve
kun i kicker og data-blæk. Ingen farvede flader.

### B.2 Kortene

| Kort | Tal | Hvorfor-linje | Data-blæk | Kilde (findes) |
|---|---|---|---|---|
| Hjerte | "43 ms" + "Lav" | "Dit normalområde 54–68 · Oura 05:14" | 14 nætter med dit bånd | `getHrvChipData` |
| Mad | "1.312 af 2.740 kcal" | "Træningsdag · 96 af 182 g protein" | bjælke spist/dagens mål | `getDailyIntake` |
| Sind | "3/5" eller "Tjek ind" | "Energi 3 · Stress 2 · Fokus 4" | tre små streger | `hasMindCheckToday` + dagens værdier |
| Kropsvægt (valgfri, se S) | "95,8 kg" (7-dages snit) | "Pejlemærke 91 kg · retning: ned" | 14 dages sparkline af snittet | `getRecentWeights` / `getWeightTrend` + nyt felt |

Mad-kortet har en sekundær handling *+ Spiste noget andet*, der åbner flow A direkte.
Mad-kortet siger "spist af dagens mål", ikke "tilbage": tilbage lægger op til at spare.
Over målet står der blot "2.940 af 2.740 kcal", uden rød farve eller advarsel.

Tomme tilstande er kort, ikke tomme huller: "Forbind din wearable", "Tjek ind på 60
sekunder", "Log din vægt". Samme grammatik, tallet erstattes af en handling.

### B.3 Placering

- Dagens pas bliver det primære kort i fuld bredde øverst (uændret indhold).
- De fire kort afløser `MorningSignal`-rækken på samme plads: 2 × 2 på telefon, 4 på række
  fra `lg`.
- Resten af I dag er uændret: Munks note, HQ-prosa og sammenhænge, kommende pas, nøgletal,
  crew.
- Rækkefølgen er fast i v1. HQ-prioriteret rækkefølge ("det vigtigste i dag øverst") er en
  senere mulighed, ikke en del af denne spec.

### B.4 Test

- `SignalCard`: kicker, tal, hvorfor-linje, sr-sætning, link.
- Hvert kort: udfyldt tilstand og tom tilstand.
- `page.order.test.ts`: pas → kort → prosa → kommende.
- Nord-gates dækker allerede farve, radius og ikoner.

---

## S. Et sundt forhold til mad og krop

MakeIt må ikke bidrage til spiseforstyrrelser eller et unaturligt forhold til mad og
motion. Det er et krav til begge leverancer og vejer tungere end at få flere tal på
skærmen. Reglerne her er ufravigelige og får deres egne tests.

**Pejlemærke i stedet for målvægt (beslutning 2).** Profilen får et valgfrit felt,
*pejlemærke*: en kropsvægt, medlemmet selv sætter som retning. Ordet er valgt, fordi det
peger, men ikke dømmer; vi bruger aldrig "målvægt", "ideal", "tab", "slank" eller
"fedtprocent" i copy.

- **Frivilligt og skjult som standard.** Kropsvægt-kortet vises først på I dag, når
  medlemmet selv har slået det til. Man kan til enhver tid slå tal fra.
- **Snit, ikke dagsvægt.** Kortet viser 7-dages snit. En enkelt vejning svinger 1–2 kg og
  skaber unødig uro; den vises kun i historikken.
- **Ingen nedtælling.** Ingen "19 uger til mål", ingen "kg tilbage", ingen procent-bjælke
  mod pejlemærket. Kortet viser retning ("ned", "op", "stabil"), ikke afstand.
- **Grænser for pejlemærket.** HQ accepterer ikke et pejlemærke, der svarer til BMI under
  18,5, eller et tempo over 0,5 % af kropsvægten pr. uge. Et sådant ønske mødes med en
  venlig forklaring og en henvisning til at tale med Munk.
- **Et kaloriegulv.** HQ foreslår aldrig et dagligt mål under det beregnede hvilestofskifte,
  og aldrig under 1.500 kcal for kvinder eller 1.800 kcal for mænd, uanset pejlemærke.
- **Ingen farver for godt og skidt.** Ingen rød ved overskridelse, ingen grøn ved
  underskud; tallene står i blæk.
- **Neutral sprogbrug.** Aldrig "snyd", "synd", "cheat day", "fortjent", "brænd det af",
  "god/dårlig mad". Motion omtales som træning, ikke som betaling for mad.
- **Tal kan slås fra.** Et valg under *Mig*: "Vis ikke kalorier og vægt". Så viser Mad
  måltider og protein uden kcal, Kropsvægt-kortet forsvinder, og HQ planlægger stadig ud
  fra tallene i baggrunden.

**Tidlige tegn.** HQ holder øje med mønstre, der kan være tegn på et anstrengt forhold til
mad: gentaget indtag under kaloriegulvet flere dage i træk, mange vejninger om dagen,
pejlemærket sænket igen og igen, eller estimater, der rettes systematisk ned. Det udløser
aldrig en advarsel i appen. I stedet får Munk (eller den ansvarlige coach) en diskret
markering i coach-indbakken, og medlemmet får ved næste mind-check et blødt spørgsmål om,
hvordan forholdet til mad og træning føles, med samme sikkerhedslinje som Mind:
"Appen er ikke behandling. Livslinien 70 201 201 · akut 112" og en henvisning til
Landsforeningen mod spiseforstyrrelser og selvskade (LMS).

**Alder.** Vi gemmer ikke alder i dag, og vilkårene nævner ikke en aldersgrænse. Pejlemærke
og kalorietal bør kræve, at medlemmet har bekræftet at være fyldt 18. Det kræver en
beslutning om vilkårene, som vi skal tage, før B lanceres.

**Test.** Pejlemærke-grænserne, kaloriegulvet, "slå tal fra", at Kropsvægt-kortet er
skjult som standard, en copy-gate for de forbudte ord, og at tidlige tegn kun når coachen
og aldrig vises som advarsel til medlemmet.

---

## C. Uden for denne spec (senere)

| Idé | Hvorfor ikke nu |
|---|---|
| Vand og koffein | Nyt kort og ny logning. Passer godt (sen koffein hænger sammen med HRV og søvn) og kan komme som femte kort. |
| Widgets på hjemmeskærmen | Kræver native WidgetKit/Android-kode i skallerne; efter App Store-buildet. |
| Tid til pejlemærke ("~19 uger") | Fravalgt: en nedtælling til en kropsvægt er præcis det, afsnit S skal undgå. |
| Faste | Ikke kerne for et styrkebrand. |
| App-blokering (Screen Time) | Fravalgt: kræver særlig Apple-tilladelse og en formynderisk tone, der ikke passer til brandet. |

---

## D. Beslutninger (Tom, 27.09.2026)

1. **Bekræftelse:** Et HQ-estimat tæller aldrig, før medlemmet har godkendt det, og
   usikkerheden (interval og sikkerhed i ord) står på godkend-knappen.
2. **Pejlemærke:** Ja, men med et neutralt navn og under reglerne i afsnit S. Tilbage at
   afgøre: aldersgrænse i vilkårene (se S · Alder).
3. **Model:** `claude-sonnet-5`, under forudsætning af at den består evalueringen i A.2.
   Når HQ ikke genkender noget, spørger den med billedet og en markering (A.1 trin 2).

---

## E. Leverance i to PR'er

1. **A — HQ-estimat:** migration, de to kald + skemaer, evalueringssættet, server
   actions, sheetet med afklaring og godkendelse, `getDailyIntake` med kulhydrat og fedt,
   tests.
2. **B — I dag som kort + afsnit S:** `SignalCard`, de fire kort, pejlemærke-feltet med
   grænser og kaloriegulv, "Vis ikke kalorier og vægt", tidlige tegn til coachen, copy-gate,
   tests.

A kommer først, fordi Mad-kortet i B bruger A's handling og kulhydrat/fedt-tallene.

---

## F. Byggeplan for del B (06.10.2026)

Del A er i produktion (#124, model skiftet til `claude-sonnet-5-5` i #149, flaget venter på
evalueringen). Planen her afstemmer B med koden efter Nord-redesignet og 18-årsgrænsen (#126).

### F.1 Hvad koden ændrer ved specen

- Voksne har hverken højde, køn eller alder. BMI-grænse og hvilestofskifte kræver dem.
- `kcal-adjustment.ts` har et gulv på 1.400 kcal ved cut. Det bryder afsnit S og rettes i B1.
- `logWeightAction` overskriver dagens vejning og tillader én pr. døgn, så "mange vejninger
  om dagen" måles som afviste forsøg.
- Der er ingen opfølgning efter mind-check; den bygges. `MindSafetyLine` genbruges.
- Der er ikke et særskilt mål for træningsdage. "Træningsdag" / "Hviledag" er kun en mærkat.

### F.2 Beslutninger (Tom, 06.10.2026)

4. **Kropsdata:** højde, fødselsår og køn spørges, når medlemmet sætter pejlemærke eller slår
   vægtkortet til. Ukendt køn giver gulvet 1.800 kcal.
5. **"Vis ikke kalorier og vægt"** gælder overalt: I dag, `/nutrition`, estimat-sheetet og
   vægtloggen.
6. **To PR'er:** B1 og B2, merget tæt efter hinanden.

### F.3 B1 — I dag som kort + kaloriegulv

- `SignalCard` (`src/components/dashboard/`) på `MorningSignal`-cellens markup: `bg-bg-2`,
  hårlinje, `p-5`, kicker `eyebrow-domain`, tal `text-title`, hvorfor `text-fg-dim`,
  data-blæk, link over hele kortet med én sr-sætning. Mad-kortets *+ Spiste noget andet*
  ligger over linket og åbner `OffPlanLogButton`.
- Ren logik bliver i `src/lib/dashboard/morning-signal.ts`, udvidet med `ink`
  (`bar` · `spark` · `ticks`). `MorningSignal` erstattes af `TodaySignals`.
- Data: `getHrvChipData` udvides med normalområde, 14 målinger, kilde og tidspunkt;
  `getDailyIntake` med kulhydrat og fedt; Sind bruger `getTodayMindCheck`;
  `hasMindCheckToday` skifter fra UTC til dansk dato.
- Placering: pas i fuld bredde, derunder kortene 2 × 2 på telefon, 4 på række fra `lg`.
  `page.order.test.ts` opdateres. `YouthToday` er uændret.
- `calorieFloor({ sex, bmr })` = max(BMR, 1.500 kvinde, 1.800 mand/ukendt), BMR via den
  eksisterende `estimateDailyKcal`. Håndhæves i `kcal-adjustment`, planner-skemaet og
  `resolveDailyTargets`.

### F.4 B2 — afsnit S

- Migration 0069 (tilføjende): på `members` `show_weight_card` (false), `hide_numbers`
  (false), `pejlemaerke_kg`, `height_cm`, `birth_year`, `sex`; tabellerne
  `pejlemaerke_changes` og `food_signal_seen`.
- Indstillinger → Krop: pejlemærke med 18+-bekræftelse (ældre konti uden
  `adult_confirmed_at` bekræfter her), kropsdata, BMI-/tempo-grænser med henvisning til Munk.
- Kropsvægt-kortet: 7-dages snit, 14 dages sparkline, retning uden afstand; skjult som standard.
- "Vis ikke kalorier og vægt": switch i Indstillinger; Mad viser måltider og protein.
- Tidlige tegn beregnes, når coach-indbakken læses: under gulvet 3 loggede dage i træk ·
  pejlemærke sænket 3 gange på 30 dage · 3 estimater på 14 dage rettet under intervallet ·
  3 afviste vejninger på 7 dage. Ny inbox-type `food_relationship` under `mental_safety`,
  kan markeres set i 14 dage. Medlemmet får ét blødt spørgsmål ved næste mind-check med
  `MindSafetyLine` og LMS, aldrig en advarsel.
- Copy-gate: `FORBIDDEN_DA/EN` flyttes til en delt gate over Dashboard, Settings og
  Nutrition, udvidet med "målvægt", "ideal", "fedtprocent", "kg tilbage"; kort-kildekoden
  skannes for `text-danger`/`bg-ok`.
