# Nord-nøgleskærme: UI-review 8 (6 søjler, efter bølge 1–4)

**Auditeret:** 2026-10-04, branch `claude/nord-wave4-hrv-consent` (HEAD d2e7081, stablet på bølge 1–3 og 822c526)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `DESIGN.md` og `docs/DOMAIN_COLOR_SYSTEM.md`.

Ejerbeslutningerne gælder fortsat:
- Den nummererede nav beholdes.
- Briefens kickers beholdes, uden dubletter.
- Numeriske intervaller skrives med en-dash.
- "+ Nyt opslag" er en bevidst afvigelse.
- Nyt (Tom 2026-10-04): HRV-deling er fra som standard, alle bliver spurgt, og tilbagekald skjuler også gamle data. Spørgekortet før kontakten er derfor en ejerbeslutning og ikke en afvigelse fra briefens "Toggle 'Del med coach'".

**Forrige review:** `UI-REVIEW-7.md` (20/24)

**Metode:**
- **Live på :3003.** Setup: MUNK-01 og system-Chrome via Playwright, med `isMobile`/`hasTouch` ved 375. Jeg kørte 25 ruter ved 375 og 1440 og målte:
  - micro-sætninger
  - størrelser og vægte
  - h1–h3
  - ellipsis
  - vandret overflow
  - radius over 0
  - ciffer-bindestreg-ciffer
  - anglicismer
- **Målrettede tjek:**
  - "Del med coach" på `/hrv` og `/settings`: placering, knapmål, tastatur, fokus og genindlæsning
  - ConfirmSheet ("Send ugentlig digest") med tastatur, både Escape og Annullér
  - HRV-grafens punkter og plot
  - `/coaching` → programlinks
  - `/coach/inbox`
- **Skærmbilleder:** 3 elementbilleder i scratchpad (spørgekort, kontakt og settings ved 375). Disken var fuld under målingen, så der blev ikke taget helsidebilleder.

---

## Søjlescorer

| Søjle | UI-REVIEW-7 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | Restlisten fra måling 7 er lukket: "Skip-dage", "refreshe", "Streak", `HrvAlertCard`-i18n og bindestreg-intervaller (0 træf live i medlemsfladen). Nyt: "Ikke nu" gemmer et endeligt nej (`decided_at` sættes, og der bliver aldrig spurgt igen), så knappen lover noget, den ikke gør |
| 2. Visuals | 3 | 3 | Den uforklarede areal-tint er væk. Men nattepunkterne er stadig ca. 1,7 px ved 375 (r=2,2 i 640-viewBox på 250 px), og plottet er uændret 141 px. På `/settings` står samtykket som kort-i-kort med knapper, der brydes lodret. Der er to forskellige kontakt-designs i samme kort. Reps har intet foto |
| 3. Color | 4 | 4 | Ingen nye afvigelser. Kontakten er monokrom (blæk/papir), og fejltekst bruger `text-danger` |
| 4. Typography | 4 | 4 | 0 micro-sætninger på 50 målinger og kun 400/500 synligt (700 findes kun i den sr-only `th` i grafens datatabel). Uændret: `/science` har `h2` i 17 px ×4. Nyt, lille: spørgsmålet er en `h2` på 22 px inde i sektionen "Wearables og recovery" (også `h2`, 22 px) |
| 5. Spacing | 3 | 3 | 0 ellipsis på I dag, Mad og "Kommende sessioner" ved 375 (lukket). Stadig: I dag-kickeren brydes over 2 linjer. Nyt fund: `/profile` klipper 8 øvelsesnavne ved 375. På `/settings` står samtykket indlejret med knapper stablet på 251 px |
| 6. Experience Design | 3 | 3 | ConfirmSheet giver nu fokus tilbage til udløseren, både ved Escape og Annullér og ved både 375 og 1440 (lukket). Demo-links til `/program/STR-12` giver 200, og demo-baseline passer. Ny WARNING: samtykket taber fokus til `BODY`, både når man svarer, og ved hvert tryk på kontakten |

**Samlet: 20/24** (uændret fra måling 7)

Måling 7's kodeliste er reelt lukket på 6 af 7 punkter. Scoren står stille, fordi bølge 4 bringer nye fund ind i de samme søjler (fokus, copy og settings-layout), og fordi grafpunkterne kun er halvt rettet.

**Hvad fotoet alene blokerer:**
- **Reps-produktfotos** (brief §6.7, live 0 `img` i main) er det eneste ejer-afhængige punkt, der står mellem Visuals og 4. Kodefundene i Visuals skal dog rettes først.
- **Loft:** Når alle kodefund nedenfor er rettet, er loftet **23/24**. Det eneste, der mangler, er fotoet.

---

## Søjle 1: Copywriting (3/4)

### Lukket siden måling 7 (live eller i kilden)
- "Fridage fra planen" i coach.
- "opdatere" i stedet for "refreshe", og "Stribe" i stedet for "Streak". Anglicisme-scanningen giver 0 træf på medlemsruter.
- `HrvAlertCard` bruger i18n. Inbox viser "Baseline aktiv" og 0 tankestreger.
- Scanningen for ciffer-bindestreg-ciffer giver 0 træf i synlig medlemstekst ved 375 og 1440. Det eneste træf er `/coach/system` "claude-sonnet-4-6", som er et modelnavn og derfor OK.

### WARNING
1. **"Ikke nu" er et endeligt nej.** Knappen findes i `HrvShareConsent.tsx:51` og `Hrv.json` `share.notNow`. `save(false)` sætter `share_to_coach_decided_at`, og spørgekortet vises aldrig igen. Teksten "Ikke nu" lover, at appen spørger senere. I et samtykkeflow skal knappen sige, hvad der sker.
   - **Rettelse:** brug "Nej tak" og lad hint-teksten under kontakten bære "du kan slå det til når som helst". Alternativt kan "Ikke nu" få en reel genspørgsel, fx efter 30 dage.
2. **Brødteksten i spørgekortet er tung.** `share.body` er ét afsnit på 2 sætninger og 46 ord, som fylder 6 linjer ved 375 (`w8-hrv-q-m.png`). Den første sætning opregner 4 datatyper og en bisætning om alarmer.
   - **Forslag:** skriv modtagerne ("Munk og MakeIts coaches") i én kort sætning, og sæt de fire datatyper som en kort liste eller en `·`-linje i `text-meta`.
3. **Gaten for en-dash er ikke udvidet.** `app-copy-gate.test.ts:36` fanger kun forkert brug af en- og em-dash. `\d-\d` i `messages/da` fejler stadig ikke. Lige nu er der 0 forekomster, men det er kun rengjort, ikke beskyttet. "a-z, 0-9" i `Settings.json:8` er tegnintervaller og skal undtages.
4. **Lille, uændret fra måling 7 (ikke genmålt):** "Kræver dig" / "Kræver opmærksomhed" og de to næsten ens HRV-legender.

## Søjle 2: Visuals (3/4)

### Lukket
- `meanAreaPath`-fladen under snitlinjen er fjernet. Kun "Dit bånd" er tonet.
- `/coaching` peger kun på programmer med indhold.

### Hvad der blokerer 4 (kode)
1. **Nattepunkterne er stadig for små på telefon.** `TrendChart.tsx:173` har `r={2.2}`. SVG'en er 250 px bred ved 375 med viewBox 640, så radius er 0,86 px og punktet ca. 1,7 px i diameter. Kommentaren i koden siger "~2 px". Legendens "Nat" er en 6 px prik (`size-1.5`), altså 3,5× større end det, den forklarer. Ved 1440 er punktet ca. 3,9 px, og der er det fint.
   - **Rettelse:** skalér radius med bredden, `r = 3 * 640 / svgClientWidth`, eller tegn punkterne i et HTML-overlay i skærm-px.
2. **Plottet er stadig 141 px højt ved 375** (`250x141`, viewBox `0 0 640 360`). Anbefalingen fra måling 7 (smallere y-etiketter eller `aspect-[4/3]` under `md`) er ikke gennemført.
3. **NY: settings viser samtykket som kort-i-kort** (`HrvSettingsSection.tsx:105`). `HrvShareConsent` bruger `surface-2 p-5` inde i en `surface-2 p-5` sektion: hvid i hvid, to rammer og 42 px indryk ved 375 (`w8-settings-m.png`). På 251 px indre bredde brydes "Del med coach" og "Ikke nu" over hver sin linje med ulige bredder (147 og 94 px).
   - **Rettelse:** giv komponenten en `bare`/`inline`-variant uden `surface-2` og padding, når den står i settings. Alternativt kan knapperne sættes som `grid grid-cols-2` ligesom ConfirmSheet.
4. **NY: to kontakt-designs i samme kort.** Kontakten for cyklus-sporing (`HrvSettingsSection.tsx:168–181`) har slukket spor `bg-3` og en fyldt `fg-dim`-knop. "Del med coach" (`HrvShareConsent.tsx:72–80`) har hvidt spor og en hvid knop med ramme. `MentalToggleRow.tsx` er en tredje variant. Brug én `Switch`-komponent.
5. **Lille, uændret:**
   - Rod-404'en har intet `MakeIt // HQ`-mærke (`not-found.tsx`).
   - Morgensignalerne "Krop. Tilpasset." og "Sind. Tjekket ind." har intet tal, mens briefen har "Mind-check 3/5".

### Ejer
- Reps-shoppen har 0 `img` i main (brief §6.7).

## Søjle 3: Color (4/4)
- Kontakten bruger kun `bg-fg`/`bg-bg`/`border-line-strong`. Spørgekortet bruger `btn-primary` (blæk) og `btn`. Fejl bruger `text-danger` med `role="alert"`.
- Fra måling 7 er der stadig 0 radius > 0 i medlemsfladen. Kun `/science` `code.rounded` (4 px) og `/coach/system`-chips (`rounded`, `bg-yellow-400/15`) bryder radius 0. Det er en intern coach-flade og en kodechip, så der er ingen fradrag. Ret det, når filerne alligevel åbnes.
- `rounded-2xl` på `HrvSettingsSection` slår ikke igennem (målt `0px`), men klassen er død kode, der kan vildlede.

## Søjle 4: Typography (4/4)
- **0 elementer under 12,5 px med mere end 4 ord** på 25 ruter × 2 bredder.
- **Størrelser:** 11/12/13/15/16/17/22/24/34/64/88. Det er de samme som i måling 7.
- **Vægte:** 400 og 500 er synlige. 700 forekommer kun i `TrendChart.tsx:224–225` (`<table className="sr-only">`, browserens standard for `th`), så det er usynligt.
- **Overskrifter:** h1 34/500 ×50, h2 22/500 ×137, h3 17/500 ×24.
- **WARNING:**
  - `/science` har stadig `h2` i 17 px ×4 (`ScienceFeed.tsx:117`). Det er uændret over to målinger.
  - `SENTENCE_AS_MICRO` (`nord-type-scale-gate.test.ts:51`) dækker stadig kun `<p>`.
  - **NY:** På `/settings` er overskriftsrækken `H2 Wearables og recovery` → `H2 Del din HRV med coach Munk?`. Spørgsmålet er visuelt lige så stort som sektionstitlen og står i samme niveau. Det skal være en `h3`/`text-card`, når det står i settings, eller få niveauet som prop.

## Søjle 5: Spacing (3/4)
- **Lukket, målt live:** 0 ellipsis-træf på `/dashboard` og `/nutrition` ved 375. Uge-stripen, "Kommende sessioner" og Mads "Resten af ugen" brydes nu i stedet for at blive klippet. Der er 0 vandret overflow på 50 målinger.
- **WARNING:**
  1. **I dag-kickeren** "Træn · coach Mikael Munk · HQ Adaptive Engine" fylder stadig 2 linjer ved 375. Fundet står uændret siden måling 6.
  2. **NY i scanningen: `/profile` ved 375** klipper 8 øvelsesnavne ("Conventional Deadlift", "Paused Bench" m.fl.) med ellipsis. Det er ikke en nøgleskærm, men samme mønster, som blev rettet på I dag og Mad.
  3. **`/settings` ved 375:** Samtykkekortet står indlejret (se Visuals 3). Knapperne stables med 12 px luft, mens resten af settings bruger rækker med `divide-y`. Rytmen brydes.
  4. **`/hrv` ved 375:** Spørgekortet står sidst, ved top 1732 af 2088 px main, efter "Seneste morgener". Det følger briefens rækkefølge, og der er intet fradrag. Men et samtykkespørgsmål, der kun ses af dem, der scroller til bunden, bliver sjældent besvaret. Overvej at sætte det over "Seneste morgener", indtil der er svaret.

## Søjle 6: Experience Design (3/4)
- **Lukket, verificeret live:**
  - **ConfirmSheet:** Tastatur Enter på "Send ugentlig digest" åbner sheetet med fokus på "Annullér" inde i dialogen. Både Escape og Annullér giver fokus tilbage til `BUTTON Send ugentlig digest` med synlig `:focus-visible`-ring. Det gælder ved 375 og 1440 (`Sheet.tsx:36–44`) og dermed alle ConfirmSheets.
  - **Demo:** `/coaching` linker kun til `/program/STR-12`, som giver 200 med h1 "PR-Block.". Inbox viser "Baseline aktiv".
  - **Samtykket:** Knapperne er 48 px høje, og kontakten er 48×28 med `role="switch"` og `aria-checked`. Fejl rulles tilbage optimistisk og vises med `role="alert"`. Kontakten har synlig fokusring (3 px solid blæk).
- **WARNING:**
  1. **Samtykket taber tastaturfokus to gange.**
     - Når man svarer "Del med coach" eller "Ikke nu", afmonteres spørgekortet, og `document.activeElement` bliver `BODY` (målt ved 375 og 1440).
     - Ved Space på kontakten bliver `activeElement` også `BODY`. Årsagen er `disabled={pending}` (`HrvShareConsent.tsx:50,53,75`): en fokuseret knap, der bliver `disabled`, mister fokus. Skærmlæserbrugere hører hverken den nye tilstand eller hvor de er.
     - Det er den samme fejlklasse, som trak ned i måling 7, nu på en helbredsdata-kontrol. `MentalToggleRow.tsx:69` har det samme mønster (`disabled={disabled || pending}`), så rettelsen skal ligge i mønstret.
     - **Rettelse:** brug `aria-disabled` og ignorér klik under `pending` i stedet for `disabled`. Flyt fokus til kontakten, når spørgekortet bliver til kontakten (fx `ref` + `useEffect` på `answered`).
  2. **"Ikke nu" spørger aldrig igen** (se Copy 1). Det er en oplevelsesfejl i et samtykkeflow, ikke kun et ordvalg.
  3. **Demo:** Svaret bliver ikke husket. `setHrvShareToCoach` returnerer `ok` uden at skrive, når `!SUPABASE_ENABLED`, så spørgekortet kommer igen efter genindlæsning (målt). I en salgsdemo virker det som en fejl. Gem svaret i en cookie eller localStorage i demotilstand.
  4. **Lille:**
     - Kontaktens hint ("Munk og dine coaches ser …" / "Din HRV er kun din …") er ikke koblet med `aria-describedby`.
     - Den synlige label og `aria-label` er dubletter, så brug `aria-labelledby`.
- **Kun note:** Migration 0068 er ikke pushet. Prod-adfærden (RLS på `hrv_alerts`/`hrv_streak_events`) er ikke målbar i demo og er ikke vurderet her.

---

## Prioriterede rettelser

**(a) Kan rettes i kode nu:**
1. **Fokus i samtykket** (Experience, WARNING): `aria-disabled` i stedet for `disabled` under `pending`, både i `HrvShareConsent` og `MentalToggleRow`, og fokus til kontakten efter svar.
2. **"Ikke nu" → "Nej tak"** eller reel genspørgsel, plus kortere `share.body` (Copy og Experience).
3. **Samtykket i settings:** variant uden kort-i-kort, `h3`, knapper i to kolonner og én fælles `Switch`-komponent for share, cyklus og Mind (Visuals, Spacing og Typography).
4. **HRV-graf ved 375:** punktradius i skærm-px (ca. 3 px) og plot på ca. 180 px (Visuals).
5. **Demo:** husk samtykkesvaret i demotilstand.
6. **Mindre:**
   - I dag-kickeren på 1 linje ved 375
   - `/profile` øvelsesnavne uden ellipsis
   - `/science` titler som `h3`
   - `SENTENCE_AS_MICRO` udvidet til `div`/`span`
   - `\d-\d`-gate
   - brand-mærke på rod-404
   - morgensignaler med tal

**(b) Ejer-afhængigt:**
- Produktfotos på `#F2F2F0` til Reps-shoppen (brief §6.7). Det er det eneste, der blokerer Visuals 4, når punkt (a) 3–4 er rettet.

## Registry safety
Ikke relevant: der er ingen UI-SPEC med tredjeparts-registries.

## Auditerede filer
- `src/components/hrv/HrvShareConsent.tsx`, `src/components/hrv/HrvSettingsSection.tsx`, `src/components/hrv/HrvTodayDetail.tsx` og `src/app/(app)/hrv/{page,connect-actions}.ts(x)`
- `src/lib/data/settings.ts` og `messages/da/Hrv.json` (`share.*`)
- `src/components/ui/{Sheet,ConfirmSheet}.tsx`
- `src/components/hrv/TrendChart.tsx` og `src/lib/svg/chart-craft.ts`
- `src/components/mind/MentalToggleRow.tsx`
- `src/app/(app)/science/ScienceFeed.tsx`
- `src/lib/design/nord-type-scale-gate.test.ts` og `src/lib/i18n/app-copy-gate.test.ts`
- Live-måling på :3003: 25 ruter × 375/1440 plus målrettede tjek. Scratchpad-billederne er `w8-hrv-q-m.png`, `w8-hrv-switch-m.png` og `w8-settings-m.png`.
