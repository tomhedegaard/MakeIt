# Spec: HQ-estimat af måltider og I dag som kort

Dato: 27.09.2026 · Status: udkast til Toms godkendelse · Retning: Nord (spec 2026-09-26)

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
2. **Estimat.** HQ svarer på få sekunder med:
   - én linje om antagelsen: "Estimeret som en standard Cobb salad, ca. 450 g."
   - totaler: kcal · protein · kulhydrat · fedt
   - ingredienslisten, hver med gram og kcal, og en portions-stepper (½ · ¾ · 1 · 1¼ · 1½ ·
     2) der skalerer alt
   - sikkerhed i ord, ikke tal: *Sikkert* / *Omtrentligt* / *Groft gæt*
   - linjen "HQ-estimat · du kan rette alle tal"
3. **Bekræft.** *Log måltidet* (primær) gemmer. *Ret selv* åbner felterne med HQ's tal
   udfyldt. *Annullér* gemmer intet. Intet tæller mod dagen før medlemmet har bekræftet.

Fejl eller ingen API-nøgle: sheetet falder tilbage til dagens manuelle felter (kcal +
protein), så flowet aldrig er blokeret.

### A.2 HQ's estimat

- Samme wrapper-mønster som `src/lib/data/nutrition-photo-claude.ts`: frosset,
  cachebart system-prompt, Zod-skema på svaret, `null` ved fejl.
- Model: Claude med vision. Den eksisterende foto-bedømmelse kører
  `claude-sonnet-4-6`; estimatet bør køre på den nyeste Sonnet (`claude-sonnet-5`).
  Afgøres ved implementeringen, se åbent spørgsmål 3.
- Svarskema:

  ```ts
  {
    assumption: string,            // "Standard Cobb salad, ca. 450 g i alt."
    confidence: "high" | "medium" | "low",
    items: Array<{ name: string; grams: number; kcal: number;
                   proteinG: number; carbsG: number; fatG: number }>,  // 1–15
    totals: { kcal: number; proteinG: number; carbsG: number; fatG: number },
  }
  ```

  Totaler genberegnes på serveren som summen af `items`, så modellen ikke kan give en
  total, der ikke passer til listen.
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

`kcal`, `protein_g`, `photo_path` og `notes` genbruges. Fotos ligger i den eksisterende
private `meal-photos`-bucket. `getDailyIntake` udvides med kulhydrat og fedt.

### A.4 Regler

- Ingen dom: estimatet siger hvad, aldrig "godt" eller "dårligt". Ingen score.
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
| Mad | "1.428 kcal tilbage" | "Træningsdag · 96 af 182 g protein" | bjælke forbrugt/mål | `getDailyIntake` |
| Sind | "3/5" eller "Tjek ind" | "Energi 3 · Stress 2 · Fokus 4" | tre små streger | `hasMindCheckToday` + dagens værdier |
| Vægt | "95,8 kg" | "−0,5 kg på 7 dage · mål: cut" | 14 dages sparkline | `getRecentWeights` / `getWeightTrend` |

Mad-kortet har en sekundær handling *+ Spiste noget andet*, der åbner flow A direkte.

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

## C. Uden for denne spec (senere)

| Idé | Hvorfor ikke nu |
|---|---|
| Vand og koffein | Nyt kort og ny logning. Passer godt (sen koffein hænger sammen med HRV og søvn) og kan komme som femte kort. |
| Widgets på hjemmeskærmen | Kræver native WidgetKit/Android-kode i skallerne; efter App Store-buildet. |
| Målvægt og tempo ("~19 uger til mål") | `nutrition_profiles` har kun `goal` (cut/recomp/mass/maintain), ikke en målvægt. Kræver et nyt felt og en beslutning om, hvem der sætter målet. |
| Faste | Ikke kerne for et styrkebrand. |
| App-blokering (Screen Time) | Fravalgt: kræver særlig Apple-tilladelse og en formynderisk tone, der ikke passer til brandet. |

---

## D. Åbne spørgsmål til Tom

1. **Bekræftelse:** Skal et HQ-estimat altid bekræftes, før det tæller (anbefalet), eller må
   *Sikkert*-estimater logges med ét tryk?
2. **Målvægt:** Skal vægtkortet have et mål nu (nyt felt i profilen), eller er trend og
   målretning (cut/mass) nok i v1?
3. **Model:** Er det i orden at estimatet kører på den nyeste Sonnet (samme klasse som
   foto-bedømmelsen i dag)?

---

## E. Leverance i to PR'er

1. **A — HQ-estimat:** migration, wrapper + skema, server action, sheet med de tre trin,
   `getDailyIntake` med kulhydrat og fedt, tests.
2. **B — I dag som kort:** `SignalCard`, de fire kort, dashboard-placering, tests.

A kommer først, fordi Mad-kortet i B bruger A's handling og kulhydrat/fedt-tallene.
