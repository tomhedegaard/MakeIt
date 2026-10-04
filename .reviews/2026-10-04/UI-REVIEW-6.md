# Nord-nøgleskærme: UI-review 6 (6 søjler, efter bølge 1 + bølge 2)

**Auditeret:** 2026-10-04, branch `claude/nord-wave2-visuals` (HEAD c5fb6eb, stablet på bølge 1 b0598a4)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `DESIGN.md` og `docs/DOMAIN_COLOR_SYSTEM.md`. Ejerbeslutningerne er uændrede, herunder at HRV får to kolonner fra lg (variant B).
**Forrige review:** `UI-REVIEW-5.md` (17/24)
**Metode:**
- **Live-måling på :3003.** Setup: MUNK-01, system-Chrome via Playwright, `isMobile`/`hasTouch` ved 375. Jeg har kørt 24 ruter ved 375 og 1440 px, altså 48 målinger, med samme logik som `scan-micro.js`. Hver måling registrerer følgende for elementer med egen tekst:
  - beregnet `font-size`/`font-weight`
  - `h1`–`h3`-størrelser
  - `[data-narrative-band]`
  - horisontalt overflow
  - ellipsis-trunkering
- **Skærmbilleder:** `wave2/*.png` er gennemgået. `i-dag-375.png` er fra før c5fb6eb (viser "@Munk"). `01-i-dag-m.png` er den gældende.
- **Tests:** `vitest src/lib/design` giver 9 filer og 3178 tests, alle grønne.

---

## Søjlescorer

| Søjle | UI-REVIEW-5 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | Ny bølge 2-tekst følger briefen. Restlisten står der stadig: "Skip-dage", "100K volumen-club", "drukner under baren" og "0-999". HQ-strimlen mangler sit punktum |
| 2. Visuals | 2 | **3** | Fortællebåndet findes nu på 3 skærme. HRV har 14-nætters graf med bånd, og Reps-heroen står ved titlen. Grafen er kun ca. 90 px høj ved 375, Reps-shoppen har ingen produktfotos, og morgensignalerne på I dag knækker ved 375 |
| 3. Color | 3 | 3 | `SessionClient.tsx:668` `border-l-body` er uændret. Ny afvigelse: kickeren på I dag er mos, men briefen siger domænefarve krop |
| 4. Typography | 3 | **4** | 0 sætninger under 12,5 px på 48 målinger. Skala, overskrifter og vægte holder live |
| 5. Spacing | 3 | 3 | De tre fund er uændrede. Ved 375 er morgensignal-tilerne og uge-stripen trange |
| 6. Experience Design | 3 | 3 | `coach/inbox/loading.tsx` mangler, `confirm()` bruges i 5 filer, og "Del med coach" er udskudt. Ny: ingen `not-found.tsx`, og `/program/*` lander på Nexts engelske standard-404 i demo |

**Samlet: 19/24** (før 17)

---

## Søjle 4: Typography (4/4)

### Det afgørende bevis
1. **Sætninger i micro.** Scannet finder 0 elementer under 12,5 px med mere end 4 ord på alle 24 ruter ved 375 og 1440. Det gælder også `/coach/*`, `/billing`, `/science` og `/buddy`. Fundet fra UI-REVIEW-5 er altså lukket på det renderede resultat og ikke kun i koden. De fire kilder er rettet:
   - `nutrition/page.tsx:512,527`
   - `dashboard/page.tsx:446`. Linjen er fjernet; noten er nu et fortællebånd.
   - `SessionClient.tsx:715`
2. **Overskrifter (48 målinger):**
   - `h1` er 34/500 (46 af 46 app-sider)
   - `h2` er 22/500 (131)
   - `h3` er 17/500 (20)
3. **Størrelser:** Alle ligger på skalaen 12/13/15/17/22/34/64/88. Der er kun dokumenterede undtagelser:
   - tab-label 11 px (5 pr. rute ved 375, DESIGN.md:246 og 311)
   - stepper 24 px (session)
   - mobilfeltets gulv på 16 px (settings)
4. **Vægte:** Kun 400 og 500 er synlige. De 8 forekomster af 700 er `<th>` i grafens `table.sr-only` (`TrendChart.tsx:209`), så de vises ikke.
5. **Nye bølge 2-komponenter følger rollerne:**
   - `NarrativeBand` har kicker i `text-meta`, titel 22 og brød 15 i `--fg-body`.
   - `HrvTodayDetail` har `h2` i `text-section`, tal i `numeric text-card` og enhed i `text-meta`.
   - Kilde-chippen er det eneste nye micro-element, og den er en chip.

### Ikke-blokerende (WARNING)
- **Gaten dækker stadig ikke rollen.** `SENTENCE_AS_MICRO` er fortsat `/<p\b…/` (gate-testen:51). Det er kun den manuelle `scan-micro.js`, der fanger sætnings-`div`/`span`, og den kører ikke i CI. Den sidste typografiregression kom netop ad den vej, så scanningen bør køres ved hver PR, eller `div`/`span` bør have en regel.
- **`/science`:** Kortenes titler er `h2` i 17 px (`text-card`). Visuelt er de rigtige, men semantisk bør de være `h3` under en sektions-`h2`.
- **404-siden:** `/program/STR-12` i demo viser Nexts standard-404 (`h1` 24, `h2` 14/400, engelsk). Det er uden for app-skalaen; se søjle 6.

---

## Søjle 2: Visuals (3/4)

### Lukket (blocker fra UI-REVIEW-5)
- **`NarrativeBand`** (`src/components/ui/NarrativeBand.tsx`) svarer til spec §5: blæk-blok via `data-theme="nat"`, titel 22, brød 15, `p-6` og ingen radius. Den findes live på tre skærme:
  - **I dag:** "Et menneske skriver under / Mikael Munk har besvaret 1 form-check / Se svaret →" (brief §6.1)
  - **HRV:** "HQ's note / Sådan læste HQ natten" (brief §6.3)
  - **Reps:** "Sådan optjenes reps" (brief §6.7)
- **HRV I dag-detaljen** svarer til brief §6.3:
  - 14-nætters graf med bånd og snitlinje
  - kilde-chip, som i demo står ærligt som "Eksempeldata"
  - "Seneste morgener" (4 rækker)
  - HQ's note som fortællebånd og ugeindsigt
  - to kolonner fra lg, som ejeren har valgt
- **Reps-heroen** står direkte under titlen. Balancen, niveauet, progressen og "3.580 til Beast" kommer før niveauskalaen.
- **I dag:** Headeren er nu "Din uge." med briefens kicker og undertitel, og fokuspunktet er klart: titel, uge-strip og dagens session.

### Hvad der stadig blokerer 4 (WARNING)
1. **14-nætters grafen er for lav på telefon.** `TrendChart` har et fast aspektforhold på 640×240 (`TrendChart.tsx:33`). Ved 375 bliver plottet ca. 90 px højt, med 5 y-etiketter på ca. 75 px. Punkterne under båndet er næsten usynlige (`hrv-split-375.png`). Grafen er heroens bevis og bør have en mobilhøjde på mindst ca. 180 px, fx med `aspect-[4/3]` under `md`.
2. **Grafens linje er ikke forklaret.** Linjen er udglattet og går ikke gennem punkterne: den ender ved ca. 47 ms, mens de sidste punkter ligger under 42. Der er ingen legende for "linje = glidende snit". Hero-legenden har den, grafen har den ikke.
3. **Reps-shoppen har ingen produktfotos.** Brief §6.7: "Shop-kort med produktfoto på `#F2F2F0`". Kortene er kun tal og tekst, og der er ingen `img`/`Image` i `reps/page.tsx`. Briefens revision bygger netop på foto, fortællebånd og store tal, men foto mangler stadig helt på nøgleskærmene.
4. **Morgensignalerne på I dag knækker ved 375** (`01-i-dag-m.png`):
   - Fire tiler deler 335 px.
   - "0/2.400 kcal Spist i dag" brydes over 4 linjer, og "Under bånd" over 2.
   - "Krop / Tilpasset" har intet tal, så tilerne har forskellig højde.
   - Briefen viser en række: HRV 43 · Lav, Mind-check 3/5, Kcal 0 af 2.740. Ved 375 er 2×2 bedre end 4×1.
5. **Fortællebåndet ligger ikke "nederst" på telefon.** På 1440 er det sidste blok i venstre kolonne, hvilket er korrekt. På 375 står det midt på siden (top 2164 px), og "Kommende sessioner", nøgletal og "Crew lige nu" følger efter (op til 2819 px). Brief §6.1 siger "Fortællebånd nederst". Rettelsen er en `order-last` på mobil eller at flytte båndet efter højrekolonnen i DOM'en.

---

## Søjle 3: Color (3/4)
- **WARNING:** `SessionClient.tsx:668` `isActive ? "border-l-body …"` er uændret. Det er en orange cue-streg i den monokrome nat-session.
- **WARNING (ny):** Kickeren på I dag ("Træn · coach Mikael Munk · HQ adaptive engine") renderes i mos `rgb(46,74,59)`. Brief §6.1 siger "(domænefarve krop)". `PageTitle.tsx:25` bruger `eyebrow-domain`, men I dag-titlen står ikke i et `data-domain="body"`-scope, så den falder tilbage til mos. HRV-kickeren "Hjerte" er korrekt rød.
- **OK:** Fortællebåndene bruger nat-tokens og har ingen mos på mørkt (DESIGN.md:189). HRV-grafen bruger hjerte som data-blæk, og båndet er en tint. Domænefarven holder sig inden for 10 %-reglen på HRV ved 1440.

## Søjle 1: Copywriting (3/4)
- **Bølge 2-teksten matcher briefen:**
  - "Din uge."
  - "HQ planlægger vægtene. Munk skriver under, når det kræver et menneske."
  - "Sådan læste HQ natten"
  - "Pause og deload beslutter Munk, ikke HQ."
  - "Ugeindsigt · søndag"
  - "Et menneske skriver under" / "Se svaret →"
  - Kilde-chippen siger "Eksempeldata" i demo i stedet for at opfinde en Oura-synk. Det er godt.
- **Står der stadig:**
  - "Skip-dage" (`Nutrition.json:286`, `Coach.json:176`)
  - "100K volumen-club" (`Community.json:12`)
  - "drukner under baren" (`exercise-mocks.ts:71`)
  - "0-999", "1.000-4.999" og "5.000-14.999" med bindestreg (`Reps.json:20,28,37`). Briefen bruger en-dash, og de vises live i Reps-heroen.
- **Ny:**
  - `Adaptive.json:6` "Adaptive Engine tilpasser ugen. Munk er din coach" mangler slutpunktum. Briefen §6.1 har det.
  - Kickeren skriver "HQ adaptive engine", men strimlen skriver "Adaptive Engine". Versaliseringen er inkonsistent på samme kort.
- **Ny, lille:**
  - `/coaching` har også h1 "Din uge.", så der er nu to skærme med samme titel.
  - "Sådan optjenes reps" står med lille r, mens resten af siden skriver "Reps". Briefen gør det samme, så det er acceptabelt, men det bør besluttes.

## Søjle 5: Spacing (3/4)
- **Uændret:**
  - `MindDisclaimer` står centreret på desktop.
  - Mad har en kortstak før planen.
  - "Limited C…" klippes ved 375 i "Mine indløsninger" (`07-reps-m.png`).
- **Ny ved 375:**
  - Uge-stripen trunkerer "Deadlift" til "Dea…" (målt ellipsis).
  - Morgensignal-tilerne er trange; se søjle 2.4.
  - Kickeren på I dag brydes over 2 linjer ved siden af stribe-tallet.
- **OK:** HRV-detaljen bruger `gap-6`/`space-y-6`/`p-5 md:p-6` konsekvent. Højrekolonnen ved 1440 slutter ca. 150 px før den venstre. Det er acceptabelt og en del af ejerens variantvalg.

## Søjle 6: Experience Design (3/4)
- **Åbent:**
  - `src/app/coach/inbox/` har kun `page.tsx` og intet `loading.tsx`.
  - `confirm()` bruges stadig i `reps/RedeemButton.tsx`, `SessionEditor.tsx`, `ProgramBuilder.tsx`, `SendDigestButton.tsx` og `PromoteToLiveButton.tsx`, selvom `ConfirmSheet` findes.
  - **"Del med coach" på HRV** er bevidst udskudt til bølge 4, fordi den kræver en samtykkemigration. Briefen §6.3 har den, så den står som et åbent kontraktpunkt, men den trækker ikke ekstra ned, fordi udskydelsen er besluttet.
- **Ny WARNING:** Der findes ingen `not-found.tsx` i `src/app`. I demo linker `/coaching` til `/program/STR-12`, `DL-06`, `HYP-08` og `PWR-10`. Alle fire kalder `notFound()`, fordi `getMemberProgramByCode` returnerer `null` uden Supabase (`program-detail.ts:102`). Resultatet er Nexts engelske, ustylede "404 / This page could not be found." uden app-shell. I prod rammer kun ugyldige koder siden, men den er stadig off-brand og på engelsk. Lav en Nord-`not-found.tsx` og en demo-fallback for programmer.
- **OK:**
  - HQ's note vises kun, når motoren faktisk har en cue (below/above). Der er ingen opfundet tekst på stabile dage.
  - `belowStreak` beregnes fra den samme serie som heroen.
  - "Under båndet" læses op for skærmlæsere (`sr-only`).
  - Grafen har en tabel-fallback.
  - Der er intet horisontalt overflow på 48 målinger.

---

## Top-prioriterede rettelser (bølge 3)
1. **HRV-grafen på telefon** (Visuals): giv `TrendChart` mobilhøjde, fx aspekt 4:3 under `md`, og en legende for den udglattede linje.
2. **Foto og mobil-layout på I dag/Reps** (Visuals/Spacing):
   - Reps-kort med produktfoto på `#F2F2F0`.
   - Morgensignaler i 2×2 ved 375.
   - Fortællebåndet sidst på mobil.
   - "Dea…" og "Limited C…" skal ikke trunkeres.
3. **Farverester** (Color): `SessionClient.tsx:668` skal være monokrom, og I dag-kickeren skal i `data-domain="body"`.
4. **Copy-restlisten** (Copywriting): "Skip-dage", "volumen-club", "drukner under baren", en-dash i `Reps.json`, punktum i `Adaptive.json:6` og ens "Adaptive Engine".
5. **Tilstande** (Experience): `not-found.tsx` i Nord, demo-programmer, `coach/inbox/loading.tsx` og `ConfirmSheet` i stedet for `confirm()` i 5 filer. "Del med coach" i bølge 4.
6. **Gate** (Typography, forebyggende): kør `scan-micro`-logikken i CI, eller udvid `SENTENCE_AS_MICRO` til `div`/`span`. Lav `/science`-korttitler til `h3`.

## Registry safety
Ikke relevant (ingen UI-SPEC med tredjeparts-registries).

## Auditerede filer
- `src/components/ui/NarrativeBand.tsx`, `src/components/hrv/HrvTodayDetail.tsx`, `src/components/hrv/TrendChart.tsx` og `src/components/ui/PageTitle.tsx`
- `src/app/(app)/{dashboard,hrv,reps,coaching,program/[code]}/page.tsx` og `src/app/(app)/session/[id]/SessionClient.tsx`
- `src/lib/data/program-detail.ts` og `src/lib/design/nord-type-scale-gate.test.ts`
- `messages/da/{Hrv,Dashboard,Reps,Adaptive,Nutrition,Coach,Community}.json`
- `.reviews/2026-10-04/wave2/*.png`, `scan-micro.js` og live-måling på :3003 (24 ruter × 375/1440)
