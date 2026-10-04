# Nord-nøgleskærme: UI-review 7 (6 søjler, efter bølge 1–3)

**Auditeret:** 2026-10-04, branch `claude/nord-wave3-polish` (HEAD d6fcb6d, stablet på bølge 1 og 2)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `DESIGN.md` og `docs/DOMAIN_COLOR_SYSTEM.md`.

Ejerbeslutningerne gælder fortsat:
- Den nummererede nav beholdes.
- Briefens kickers beholdes, uden dubletter.
- Numeriske intervaller skrives med en-dash.
- "+ Nyt opslag" er en bevidst afvigelse.

**Forrige review:** `UI-REVIEW-6.md` (19/24)

**Metode:**
- **Live-måling på :3003.** Setup: MUNK-01 og system-Chrome via Playwright, med `isMobile`/`hasTouch` ved 375. Jeg kørte 25 ruter (de 24 fra `scan-micro.js` plus en ukendt URL) ved 375 og 1440 og målte:
  - micro-sætninger
  - størrelser og vægte
  - h1–h3
  - ellipsis
  - overflow
- **Målrettede tjek:**
  - kickerfarve
  - fortællebåndets placering
  - HRV-grafens størrelse
  - cue-streg
  - 404 på rod og i shell
  - `/coach/inbox`
  - ConfirmSheet ("Send ugentlig digest") med tastatur
- **Skærmbilleder:** `wave3/*.png` er gennemgået.
- **Tests:** `vitest src/lib/design src/lib/i18n` gav 13 filer og 3307 tests, alle grønne.

---

## Søjlescorer

| Søjle | UI-REVIEW-6 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | Restlisten fra måling 6 er stort set lukket, og 404 er dansk. Stadig: "Skip-dage" i coach-panelet, cirka 10 intervaller med bindestreg i synlig tekst (fx "Kreatin monohydrat (3-5 g/dag)"), "refreshe" og "Streak-milepæl" |
| 2. Visuals | 3 | 3 | Morgensignalerne står 2×2, fortællebåndet står nederst, og grafen har fået en legende. Men grafens nattepunkter er ca. 1 px (r=1,45 i 640-viewBox), plottet er 141 px og ikke ~180 px ved 375, og Reps har intet foto |
| 3. Color | 3 | **4** | Kickeren på I dag er Krop `rgb(168,56,11)`, og cue-stregen i sessionen er monokrom `rgb(255,255,255)`. Jeg fandt ingen nye afvigelser |
| 4. Typography | 4 | 4 | 0 micro-sætninger på 50 målinger. Overskrifterne holder (h1 34/500 ×50), og 404 er på skalaen. Kun 400/500 er synlige |
| 5. Spacing | 3 | 3 | Mind er venstrestillet, Mad-kortene er samlet, og "Limited Cuff · Olive" brydes. Stadig: "Dea…" i uge-stripen, og "Resten af ugen" på Mad klipper alle 6 retnavne ved 375 |
| 6. Experience Design | 3 | 3 | 404 er nu Nord og dansk, inbox har skelet, og der er 0 native `confirm()`. Ny WARNING: ConfirmSheet sender fokus til `BODY`, når den lukkes. Demo-`/coaching` linker stadig til 4 programmer, som alle giver 404 |

**Samlet: 20/24** (før 19)

**Hvad ejer-punkterne alene blokerer:**
- **Reps-produktfotos** (brief §6.7) er det eneste, der står mellem Visuals og 4, når kodefundene nedenfor er rettet.
- **"Del med coach"** (bølge 4, kræver samtykkemigration) er et åbent kontraktpunkt. Ligesom i måling 6 trækker den ikke ekstra ned.
- **Loft:** Når alle kode-fund er rettet, er loftet **23/24**, og det eneste, der mangler, er fotoet.

---

## Søjle 1: Copywriting (3/4)

### Lukket siden måling 6 (verificeret live eller i kilden)
- "Fridage fra planen", "Fri" og "Sprunget over" er rettet (`Nutrition.json:233–291`).
- "100K volumenklubben" er rettet.
- "drukner under baren" er fjernet fra `exercise-mocks.ts`.
- Reps-intervallerne vises live som `0–999`, `1.000–4.999` og `5.000–14.999`.
- `Adaptive.json:6` har nu punktum.
- Kickeren skriver "HQ Adaptive Engine", ens med strimlen.
- 404-siden siger "Siden findes ikke." / "Linket er forkert, eller siden er flyttet." / "Til I dag". Det er briefens tone med punktum i titlen.
- Coach-panelet skriver "Baseline aktiv/opbygges" og ikke det tvetydige "Aktiv".
- I coach-prosa er "—" erstattet. Inbox har 0 tankestreger målt live.

### WARNING
1. **`Coach.json:176` siger stadig "Skip-dage".** Fundet stod i måling 6 og er ikke rettet. Nu er det også inkonsistent: medlemmet ser "Fridage fra planen", mens coachen ser "Skip-dage" for det samme begreb.
2. **En-dash-beslutningen er kun ført igennem i Reps.** Synlige intervaller med bindestreg:
   - `src/lib/nutrition/brand.ts:267` "Kreatin monohydrat (3-5 g/dag)" og `:259` "Vitamin D3 (oktober-april)". De vises live på `/nutrition` ved 375.
   - `Mind.json:229` "1-5 minutter pr. session"
   - `Nutrition.json:195` "30-45 min" og `:202` "Tager 5-10 sek"
   - Øvelses-cues "Pause 1-2 sek…" (`exercise-mocks.ts:366,778,1169`, `program-generator.ts:172`)
   - `Legal.json:294` "2-3 ugers"

   Copy-gaten tillader ciffer–ciffer, men håndhæver det ikke. Udvid gaten, så `\d-\d` i `messages/da` fejler.
3. **Anglicismer:**
   - `Nutrition.json:283` "Ingen grund til at refreshe" (mangler også punktum)
   - `Messages.json:26` "prøv at refreshe"
   - `Nutrition.json:294` "Streak-milepæl", mens resten af appen skriver "Stribe"
4. **`HrvAlertCard.tsx:111–114,173`** hardkoder "Baseline aktiv", "Baseline opbygges" og "Send personlig besked" uden om next-intl. `messages/en` findes, så de strenge bliver ikke oversat.
5. **Lille:**
   - Coach-overblikket har kicker "Kræver dig" og titel "Kræver opmærksomhed", altså "Kræver" to gange.
   - HRV har to legender, "Dit snit · 54 ms" (hero) og "7-dages snit" (graf). De er forskellige mål med næsten samme navn.

---

## Søjle 2: Visuals (3/4)

### Lukket
- **Morgensignal:** 2×2 ved 375 med ens højde pr. række (`01-i-dag-m.png`).
- **Fortællebåndet** er sidst på telefon. Live står båndet ved top 2978 af 3168 px main, og 0 sektioner ligger under det. Ved 1440 står det under hovedkolonnen.
- **HRV-grafen** har nu viewBox 640×360. Plottet er **250×141 px** ved 375 (før ca. 90) og 569×320 ved 1440. Legenden "7-dages snit · Nat · Dit bånd" forklarer linjen.
- **Coach-panelet:** dubleret navn/dato er fjernet (`inbox-1440`).

### Hvad der blokerer 4
1. **Kode — nattepunkterne er usynlige.** `chart-craft.ts:25` `pointR: 1.45` i en 640 bred viewBox giver ca. 0,57 px radius ved 375, så hvert punkt er ca. 1 px. Legenden viser "Nat" som en 6 px prik (`TrendChart.tsx` `size-1.5`), altså 5× større end det, den forklarer. De tre nætter under båndet (42–44 ms) er briefens pointe ("under dit bånd"), men de kan næsten ikke ses.

   Rettelse: brug en punktradius i skærm-px (fx `r` skaleret med `640/clientWidth`, eller `vector-effect` plus en HTML-overlay), eller sæt `pointR` til ca. 4 i viewBox.
2. **Kode — en tint er uforklaret.** `meanAreaPath` (fyld under 7-dages-linjen) farver hele plottet under linjen lyserødt. Legenden kender kun "Dit bånd", så man ser to lyserøde flader uden at vide, hvilken der er båndet. Fjern arealet eller skru det helt ned, når båndet vises.
3. **Kode — plottet er 141 px, ikke ~180 px.** Y-aksens etiketter tager ca. 85 af 335 px i bredden, så plottet kun får 250 px. Brug smallere etiketter (kun tal, "ms" én gang) eller `aspect-[4/3]` under `md`.
4. **Kode, lille:**
   - Rod-404'en har hverken brand-mærke eller header (`root404-1440`). Den er korrekt typografisk, men det er en anonym hvid side. Et `MakeIt // HQ`-mærke øverst vil forankre den.
   - Morgensignalerne "Krop / Tilpasset" og "Sind / Tjekket ind" har intet tal, mens briefen har "Mind-check 3/5".
5. **Ejer — Reps-shoppen har ingen produktfotos.** Live er der 0 `img` i main (brief §6.7).

---

## Søjle 3: Color (4/4)
- **Lukket:** `SessionClient.tsx:665` bruger `border-l-fg`. Live er cue-stregen `rgb(255,255,255)` i den mørke session, altså monokrom.
- **Lukket:** I dag-kickeren står i `data-domain="body"` (`dashboard/page.tsx:280`). Live er den `rgb(168,56,11)` (Krop) ved både 375 og 1440. HRV-kickeren er fortsat Hjerte.
- **OK:**
  - Graflegenden bruger `border-domain`/`bg-domain` og ingen hardkodede farver.
  - ConfirmSheet bruger `btn`/`btn-primary` (blæk/papir).
  - Inbox-chips er monokrome med `hairline-strong`.
  - Fortællebåndet er nat-blæk uden mos.
- **Note, ikke fradrag:** Hjerte-rød optræder på I dag i kicker-nabo, i chips og i "I dag"-prikken. Det ligger inden for doseringsreglen ved 375.

## Søjle 4: Typography (4/4)
- **0 elementer under 12,5 px med mere end 4 ord** på 25 ruter × 2 bredder, inklusive 404 og coach.
- **Størrelser:** 12/13/15/17/22/34/64/88 plus de dokumenterede 11 (tab-label), 24 (stepper) og 16 (felt-gulv).
- **Vægte:** kun 400 og 500.
- **Overskrifter:**
  - h1 er 34/500 (50/50), også begge 404-varianter.
  - h2 er 22/500 (131).
  - h3 er 17/500 (20).
- **WARNING, uændret:**
  - `/science`-kortenes titler er stadig `h2` i 17 px (4 forekomster) og bør være `h3`.
  - `SENTENCE_AS_MICRO` dækker stadig kun `<p>`. Den manuelle scanning er den eneste vagt for `div`/`span`.

## Søjle 5: Spacing (3/4)
- **Lukket:**
  - `MindDisclaimer` er venstrestillet (h1 left 20 ved 375, 300 ved 1440, `text-align: start`).
  - Mad samler "I dag" og "Kropsvægt" i ét kort.
  - "Limited Cuff · Olive" brydes over to linjer i stedet for at blive klippet (`07-reps-m.png`).
- **WARNING:**
  1. **"Dea…" i uge-stripen ved 375** er uændret siden måling 6 (`dashboard/page.tsx:645` `block truncate text-micro`). Syv kolonner på 335 px giver ca. 44 px pr. dag. Brug forkortelser (fx "DL") eller tillad brud over 2 linjer.
  2. **`/nutrition` "Resten af ugen" ved 375** klipper alle 6 retnavne til ca. 12 tegn: "Skyr-bowl med …", "Hytteost på rug…" (`nutrition/page.tsx:468`). Det giver 24 ellipsis-træf ved 375, og rækken er ulæselig som plan. Lad titlen bryde, eller flyt kcal under titlen på telefon.
  3. **"Kommende sessioner" på I dag ved 375** klipper "Pause-bench, ringe-ro…" og "Deadlift · opbygning til…" (`dashboard/page.tsx:459`).
  4. **Kickeren på I dag** brydes stadig over 2 linjer ("…HQ Adaptive / Engine") ved siden af stribe-tallet ved 375.
  5. **Mad har stadig en kortstak før planen** ved 375: I dag, makro-grid og 7 dagsfliser. Den er dog én kortflade kortere end før.

## Søjle 6: Experience Design (3/4)
- **Lukket, verificeret live:**
  - `/finnes-ikke-xyz` giver HTTP 404 med dansk Nord-side (h1 34, `btn-primary` → `/dashboard`).
  - `/program/STR-12` viser samme side inde i app-shellen med demo-strimmel og tab-bar.
  - `coach/inbox/loading.tsx` matcher sidens grid.
  - `grep confirm(` finder kun en lokal funktion i `RedeemButton.tsx`, ingen `window.confirm`.
  - ConfirmSheet på `/coach` åbner som bottom sheet med titel via `aria-labelledby`, fokus på "Annullér", 48 px knapper og ingen native dialog. Escape lukker den.
  - Form-check-tråde fra tidligere pas har deres egen kicker ("Form-check fra tidligere pas" / "Filmet i et tidligere pas"), så den falske "Du filmede dette sæt" ved 0/16 er væk.
- **WARNING:**
  1. **ConfirmSheet mister fokus.** Når sheetet lukkes (Escape eller Annullér), lander `document.activeElement` på `BODY`, ved både 375 og 1440. Sheetet åbnes via state og ikke via en Radix-`Trigger`, så Radix har ingen trigger at returnere fokus til. Det gælder alle fire nye flader. Native `confirm()` returnerede fokus, så det er en a11y-regression for tastatur- og skærmlæserbrugere. Gem `document.activeElement` ved åbning, og giv fokus tilbage i `onCloseAutoFocus`.
  2. **Demo-blindgyde.** `/coaching` linker til `/program/STR-12`, `HYP-08`, `PWR-10` og `DL-06`, og alle fire giver nu en pæn 404. Det er bedre end Nexts engelske side, men det er stadig 4 døde links fra en primær skærm i salgsdemoen. Den demo-fallback til `getMemberProgramByCode`, som måling 6 anbefalede, er ikke lavet.
  3. **Selvmodsigende demo-data i coach-panelet.** `coach.ts:163` har `warm_up_active: false`, så panelet viser "Baseline opbygges" ved siden af "Personligt bånd 51–57 ms" og "3 dage lavt". I `alert.ts:249` kan en alert slet ikke udløses uden aktiv baseline, så demoen viser en tilstand, der er umulig i prod. Sæt mock'en til `true`.
  4. **Lille:** `/program/STR-12` svarer HTTP 200 med not-found-indholdet (streaming). Ved 375 viste Next-dev én gang badgen "1 Issue" på ruten. Jeg kunne ikke genskabe den, og der var ingen konsolfejl ved genkørsel.
- **Ejer:** "Del med coach" på HRV mangler (live: ingen forekomst). Den er udskudt til bølge 4.

---

## Prioriterede rettelser (bølge 4)

**(a) Kan rettes i kode nu:**
1. **HRV-grafens punkter og tint** (Visuals, WARNING): punkter på ca. 4 px synlig radius, ingen uforklaret areal-tint, og smallere y-etiketter, så plottet når ca. 180 px ved 375.
2. **Fokus tilbage efter ConfirmSheet** (Experience, WARNING): `onCloseAutoFocus` → trigger. Det gælder alle 4 flader.
3. **Trunkering ved 375** (Spacing): uge-stripen "Dea…", Mad "Resten af ugen" og "Kommende sessioner".
4. **En-dash overalt plus gate** (Copy): `brand.ts`, `Mind.json`, `Nutrition.json`, cues og `Legal.json`. Udvid copy-gaten til at afvise `\d-\d` i `messages/da`.
5. **Copy-rester:** `Coach.json:176` "Skip-dage" → "Fridage", "refreshe" ×2, "Streak-milepæl" → "Stribe-milepæl", og `HrvAlertCard`-strengene i i18n.
6. **Demo:** fallback til program-detalje og `warm_up_active: true` i HRV-mock'en.
7. **Mindre:**
   - brand-mærke på rod-404
   - `/science`-korttitler som `h3`
   - `SENTENCE_AS_MICRO` udvidet til `div`/`span`

**(b) Ejer-afhængigt:**
- Produktfotos på `#F2F2F0` til Reps-shoppen (brief §6.7). Det blokerer Visuals 4.
- "Del med coach" (bølge 4, samtykkemigration).

## Registry safety
Ikke relevant: der er ingen UI-SPEC med tredjeparts-registries.

## Auditerede filer
- `src/app/not-found.tsx` og `src/app/(app)/not-found.tsx`
- `src/app/coach/inbox/loading.tsx`
- `src/components/ui/ConfirmSheet.tsx`
- `src/components/hrv/TrendChart.tsx` og `src/lib/svg/chart-craft.ts`
- `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/nutrition/page.tsx` og `src/app/(app)/session/[id]/SessionClient.tsx`
- `src/components/coach/{HrvAlertCard,SendDigestButton,PromoteToLiveButton}.tsx`, `src/app/coach/programs/[code]/ProgramBuilder.tsx` og `src/app/coach/sessions/[id]/edit/SessionEditor.tsx`
- `src/components/mind/MindDisclaimer.tsx`
- `src/lib/data/coach.ts`, `src/lib/hrv/alert.ts` og `src/lib/nutrition/brand.ts`
- `messages/da/{Adaptive,Common,Community,Dashboard,Hrv,Nutrition,Reps,Session,Coach,Mind,Messages,Legal}.json`
- `.reviews/2026-10-04/wave3/*.png` og live-måling på :3003 (25 ruter × 375/1440 plus målrettede tjek)
