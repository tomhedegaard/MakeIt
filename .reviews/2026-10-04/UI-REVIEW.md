# Nord-nøgleskærme: UI-review (6 søjler)

**Auditeret:** 2026-10-04, branch `claude/nord-polish-keyscreens` (HEAD 6ecb0d1)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md` (§2–7, §10–11) + `docs/DOMAIN_COLOR_SYSTEM.md` + tokens i `src/app/globals.css`
**Skærmbilleder:** eksisterende `.reviews/2026-10-04/after/*.png` (375 og 1440 px), taget 12:13, altså **før** 6ecb0d1 (12:30). Fund om tal i Crew-ranglisten og Reps-optjeningen er tjekket mod koden efter den commit. Der er ikke taget nye billeder.
**Uafhængighed:** `.reviews/2026-10-04/audit.md` er ikke brugt til scorerne.

---

## Søjlescorer

| Søjle | Score | Hovedfund |
|---|---|---|
| 1. Copywriting | 2/4 | Niveauet modsiger sig selv (Legend i shell, Athlete på Reps), engelske rester, grammatikfejl, Mad/Kost og Sind/Mental bruges i flæng |
| 2. Visuals | 2/4 | Flot Nord-udtryk, men fortællebåndet mangler på alle syv skærme. HRV mangler 14-nætters graf, og coach-panelet er tomt ved første visning |
| 3. Color | 3/4 | Mos bruges korrekt. Domænefarve i coach-indbakken bryder lukket beslutning §8.1, og Krop-orange optræder i den monokrome session |
| 4. Typography | 2/4 | Nord-skalaen bruges ~40 gange mod ~470 Tailwind-standardstørrelser. Tabulære tal giver stadig "6 . 5" i RPE |
| 5. Spacing | 3/4 | Kun 14 arbitrære værdier, og 20/16-griddet holder. Rækker knækker på 375 px, og Mind på desktop flugter ikke |
| 6. Experience Design | 2/4 | Form-check viser "84 / 100" (bryder regel 5), indbakkens standardsag er en blindgyde, native `confirm()`, Mind-grafen overskyder skalaen |

**Samlet: 14/24**

---

## Top-prioriterede rettelser

1. **BLOCKER: Niveauet modsiger sig selv.** Shell-kortet siger "Niveau: Legend" (`src/components/app/AppShell.tsx:175-176`, data fra `src/lib/auth.ts:39` `tier: "Legend"`), mens Reps-siden siger "1.420 · Niveau: Athlete · 3.580 til Beast" (07-reps-d.png). Crew-feedet viser @Munk som "Legend". Medlemmet kan ikke stole på loyalitetssystemets kernetal. **Rettelse:** udled niveauet ét sted fra saldoen (samme funktion som Reps-siden bruger), og lad shell og Crew læse den. Ret også demo-fixturen, så den stemmer med 1.420.
2. **BLOCKER: 0–100-score i coach-form-check.** "84 / 100" (`src/components/coach/CoachReview.tsx:109`, 08-coach-inbox-formcheck-d.png) bryder regel 5 ("Ingen 0–100-scores nogen steder"). **Rettelse:** fjern tallet, eller erstat det med konkrete fund (antal reps med valgus, dybde ramt x/3).
3. **BLOCKER: Indbakkens forvalgte sag er en blindgyde.** Første række (@nina_dl · HRV) er valgt som standard, men panelet viser kun "Detaljerne står på sagens egen side." (`src/components/coach/InboxCasePanel.tsx:90-97`, fordi `getOpenHrvAlerts` ikke finder sagen). Coachen åbner split view og ser et tomt panel. **Rettelse:** forvælg den første sag, der kan renderes, eller vis altid et minimum inline (grund, seneste værdi, bånd) med "Åbn hele sagen".
4. **WARNING: Domænefarver i coach-konsollen.** `PriorityInboxList.tsx:13-29` farver HRV-chips røde og øvelses-chips orange. DOMAIN_COLOR_SYSTEM §4 og §8.1 siger "Coach-flader 100 % monokrome … beslutning, ikke et hul". Kommentaren i filen henviser til §5, som handler om status, ikke coach. **Rettelse:** fjern `data-domain` og `border-domain-line text-domain` fra chips i `/coach`. Behold rød kun til ægte safety-status.
5. **WARNING: Typografi uden for skalaen.** `text-sm` (14 px) ×171, `text-2xl` ×42, `text-3xl` ×33, `text-lg` ×23, `text-xl` ×21 og `text-4xl` ×7 i scope. Ingen af dem er i §4-skalaen (12/13/15/17/22/34/64). **Rettelse:** codemod `text-sm`→`text-meta`/`text-copy`, `text-xs`→`text-micro`, `text-2xl/3xl`→`text-section`/`text-title` pr. rolle, og en lint-gate på standardstørrelser i `(app)`.
6. **WARNING: Fortællebåndet findes ikke.** §5 og §6 kræver blækblokken `#111111` på I dag ("Mikael Munk har besvaret 1 form-check"), HRV ("HQ's note") og Reps ("Sådan optjenes reps"). Alle tre er bygget som grå `--bg-2`-kort eller lister. **Rettelse:** én `NarrativeBand`-komponent, brugt de tre steder.
7. **WARNING: Danske tal og decimaler.** "137.5kg", "6.5" (session), "412.5"/"68.4 / 100K" (Crew), "0/2400", "2400 kcal", "1103" (I dag, Mad). `SessionClient.tsx:384-385` bygger strengene rå, og `.pill` i `globals.css:634` har `tabular-nums`, som giver "6 . 5" i RPE. **Rettelse:** `Intl.NumberFormat("da-DK")` til vægt, kcal og score, og `.numeric` i stedet for tabular på `.pill`.

---

## Detaljerede fund

### Søjle 1: Copywriting (2/4)

Det holder: sentence case er gennemført (0 `uppercase`-klasser i scope), sidetitler slutter med punktum ("HRV.", "Brændstof.", "Crew-feed.", "Indbakke."), sikkerhedslinjen på Mind står præcis som i briefen, "Behold original" findes, og briefens tone ("Du arbejder. Du får.", "Grebet holder") er ramt.

- **BLOCKER:** niveau Legend vs Athlete, se fix 1.
- **WARNING:** tallene modsiger hinanden på Mind. Chippen siger "+150 Reps", brødteksten "+100 Reps + milestone-bonus" (05-mind-m.png).
- **WARNING:** engelsk i den danske flade: "Supplerings-nudge", "personlige macros", "Lav-kulhydrat · Anker" (Mad), "Sessions" (`messages/da/Mind.json:7`), "Coach console" (`Coach.json:29`), "Top atleter", "100K Volumen Club", "sneak peek" (`Community.json:12,31,35`), "drops", "pumped", "Build Phase", "Bardepth", "bar-path", "spread the floor". Railens "Overview/Members/Analytics" står i briefen (§6.8) og tæller derfor ikke.
- **WARNING:** grammatik og ordvalg. "Sæt i dette øvelse" (`messages/da/Session.json:21`, skal være "denne"). "Bryst op og spændt mave før du drukner under baren" afviger fra briefens cue "Bryst op og spænd, mave fat". "Ro (omvendt stress)" i grafens forklaring, men skyderen hedder "Stress".
- **WARNING:** domænenavne veksler. Tile "Mad" vs chip "Kost" (I dag), "Sind" vs "Mental" (Reps-historik). Briefen bruger Mad/Sind.
- **WARNING:** "m" betyder minutter ("65m", "55m", "12m"). Det kan forveksles med meter. Brug "min".
- **WARNING:** "Del" bruges både til at oprette et opslag ("+ Del") og til at dele et opslag ("Del" i hvert opslag) på Crew.
- **WARNING:** HQ-glossen "Adaptive Engine tilpasser ugen. Munk er din coach" står 2 gange i Adaptive.json og vises 1 gang på I dag. Overskriften "HQ · Adaptive Engine" vises 4 gange, så kortene ikke kan skelnes.
- Mindre: "Det går stærkt!" (`messages/da/Reps.json:132`) er det eneste udråbstegn i scope (briefen siger ingen). "Enig. … Hilsen Munk" er fint.

### Søjle 2: Visuals (2/4)

Det holder: hvid flade, 1 px linjer, radius 0, tydeligt fokuspunkt på I dag (Dag A · Squat og sort "Start pas →"), et stort hero-tal på HRV og Reps, en mørk session og en mørk coach-flade som foreskrevet.

- **WARNING:** fortællebåndet er fraværende på alle syv skærme (se fix 6).
- **WARNING:** HRV-skærmen er tynd i forhold til §6.3. Den mangler 14-nætters graf med bånd (der er kun én prik på en lineal), kildechippen "Oura · synket", "Seneste morgener", HQ's note, Ugeindsigt og "Del med coach". På desktop ender siden ved ~850 px med tomt lærred (03-hrv-d.png). Kortet har en "Hjerte"-kicker, der gentager sidens egen kicker.
- **WARNING:** coach-panelet er tomt ved første visning (fix 3). Svarknappen "Send som Munk" ligger under folden på 1440×900 (08-coach-inbox-formcheck-d.png).
- **WARNING:** Reps på desktop. Hero-tallet 1.420 står yderst til højre, adskilt fra titlen, og læses som et sidepanel (07-reps-d.png). Belønningskortene har ingen produktfotos på `#F2F2F0` (§6.7).
- **WARNING:** I dag-titlen er "@Munk" under kickeren "God morgen", ikke "Din uge." (§6.1). Hilsenen bærer ingen information.
- Mindre: Next.js' dev-indikator "N" dækker tab-baren, "Hvil" og "← Overview" på alle mobilbilleder. Den er et dev-artefakt, men skjuler reelle tap-mål i review-billederne.

### Søjle 3: Color (3/4)

Det holder: tokens matcher briefen (dim og faint er bevidst mørkere for AA, §10.1). Der er ingen hex-koder i TSX i scope ud over `themeColor`, ingen mos-fyldte knapper, primærknapperne er blæk, og domænefarver bruges som kicker, dot og badge-tint på I dag og som aktiv rail i sidebar.

- **WARNING:** domænefarve i coach (fix 4). Synlig på 08-coach-inbox-*.png: røde "HRV"-chips og orange "Back Squat"/"Paused Bench"/"Conventional Deadlift".
- **WARNING:** sessionen er ikke 100 % monokrom. Den aktive cue har `border-l-body` (`src/app/(app)/session/[id]/SessionClient.tsx:663-664`), en orange streg (02-session-*.png). Muskelfiguren er undtaget (§11), cue-stregen er ikke. Brug `border-l-fg`.
- **WARNING:** Mind-grafen har tre overlappende arealfyld (`MentalGraph.tsx:193-197`, fillOpacity 0.06 hver) plus en lilla bundflade. På desktop dækker den farvede flade langt over 10 % af kortet (05-mind-d.png).
- Mindre: mos bruges som kicker-farve næsten overalt ("Kropsvægt", "I dag", "Belønninger", "Crew-feed", "Seneste Reps", dagsnavne i Mads ugeliste). Det er tilladt (§3.1), men mos som eneste accent mister signalværdi, når hver sektionsetiket er mos.

### Søjle 4: Typography (2/4)

Fordeling i scope (104 TSX-filer):

| Klasse | Antal | I Nord-skalaen? |
|---|---|---|
| text-sm (14) | 171 | nej |
| text-micro (12) | 121 | ja |
| text-xs (12) | 91 | størrelse ja, token nej |
| text-base (16) | 52 | nej |
| text-2xl (24) | 42 | nej |
| text-3xl (30) | 33 | nej |
| text-lg (18) | 23 | nej |
| text-xl (20) | 21 | nej |
| text-meta (13) | 15 | ja |
| text-4xl (36) | 7 | nej |
| text-section / copy / hero-lg / hero / title / card | 6 / 6 / 5 / 4 / 2 / 1 | ja |

Vægte: `font-medium` ×12 og `font-semibold` ×1 (falder til 500 pga. `font-synthesis: none`). Det er fint.

- **WARNING:** ca. 11 forskellige størrelser er i brug mod skalaens 8. Brødtekst står i 14 (text-sm), ikke 15, på kort i Mad, Crew og coach. Det er synligt som tæt grå tekst i Mad-kortene.
- **WARNING:** `tabular-nums` på `.pill` (`globals.css:634`) og `.stepper-num` (`:548`) giver "6 . 5", "7 . 5", "8 . 5" i RPE-vælgeren (02-session-*.png). Netop det problem nævner §4 (justeret 2026-10-04). Crew og Reps er rettet i 6ecb0d1, sessionen er ikke.
- **WARNING:** coach-chips er sat i ~15 px med 6×10+ padding. Briefen siger chips i 12 px (08-coach-inbox-d.png).
- **WARNING:** `RouteOpening.tsx:22` bruger `md:text-[2.75rem]` (44 px), en arbitrær størrelse. §10.5 tillader 44 til faner, men den bør være et token.
- Mindre: "PR'er 03" er nulpolstret på I dag. Det giver falsk præcision.

### Søjle 5: Spacing (3/4)

Det holder: kun 14 arbitrære px/rem-værdier i scope, de fleste begrundede (sidebar 260 px, min-højder til tekstfelter). Mobilmargin er 20 px, mellemrum mellem kort ~16 px og venstrestilling er gennemført.

- **WARNING:** Reps på 375 px. Historikrækkerne knækker til 2-3 linjer ("Session / gennemført", "Mind- / check / stribe"), fordi kategori, titel, tid og point deler én række (07-reps-m.png). Stak kategori og tid under titlen på mobil.
- **WARNING:** Crew på 375 px. "Hep 122 heppere" knækker på to linjer (06-crew-m.png).
- **WARNING:** Minds undernavigation klippes af på 375 px ("Din uge", "C…") uden fade eller rullemarkør (05-mind-m.png). Den står også over sidetitlen, mens HRV har sine faner under. Placeringen er inkonsistent mellem domæner.
- **WARNING:** Mind på desktop. Indholdet er en centreret ~560 px kolonne under en venstrestillet header (05-mind-d.png). Det bryder "Alt er venstrestillet".
- Mindre: I dag-ugestrimlen afkorter "Dea…" på mobil, og "Mine indløsninger" afkorter "Limited C…". Mad har ujævn sektionsrytme: flere 1-linjes kort ("Ikke et AI-udkast", "Kropsvægt", "I dag 0 kcal") stablet før indholdet.

### Søjle 6: Experience Design (2/4)

Det holder: `(app)/loading.tsx` og `(app)/error.tsx` dækker gruppen, og `nutrition`, `mind` og `session/[id]` har egne loaders. `coach/error.tsx` findes. Der er 43 `disabled=` og 58 `aria-label`. "Behold original" har pending-, fejl- og kvitteringstilstand (`KeepOriginal.tsx:70-90`). AI-fallbacken på Mad siger ærligt "Ikke et AI-udkast", og safety-linjen er til stede.

- **BLOCKER:** "84 / 100" (fix 2).
- **BLOCKER:** tom standardsag i indbakken (fix 3).
- **BLOCKER:** modstridende niveau (fix 1). Det handler om tillid, ikke kun om tekst.
- **WARNING:** Mind-grafen bruger Catmull-Rom (`src/lib/svg/smooth-path.ts`) på en diskret 1–5-skala. Kurverne går over 5 og under 1 og viser værdier, der aldrig er målt (05-mind-*.png). Det er i modstrid med §11 "Data … ærlig". Brug lineær eller monotone-X, og klem til [1,5].
- **WARNING:** native `window.confirm()` til byt måltid, skip-dag og nulstil indkøb (`MealCard.tsx:39`, `DailyCheckInCard.tsx:43`, `ShoppingChecklist.tsx:71`). Det er en browser-dialog uden for Nord, på dansk med browserens egne knapper. Brug det eksisterende sheet-mønster.
- **WARNING:** coach-indbakken har ingen `loading.tsx`. Panelet henter sagsdata server-side pr. valg uden skelet.
- **WARNING:** "Behold original" er `btn-ghost` (mos-tekst, ingen ramme; `KeepOriginal.tsx:81`). Briefen §5 kræver sekundær outline. Medlemmets vigtigste modvalg mod AI ser ud som et sekundært link.
- **WARNING:** HRV mangler toggle'en "Del med coach" (§6.3). Det er et samtykkevalg, der ikke findes på skærmen.
- Mindre: session-headeren viser "0 / 16 sæt", mens to form-check-kort siger "Du filmede dette sæt" for sæt 3 og 4. Det er demodata, men forvirrer. Der er ingen synlig hviletimer på 375 px.

---

## Registry safety

`components.json` er ikke relevant for denne audit (ingen UI-SPEC med tredjeparts-registries). Springet over.

## Bemærkninger om processen

- `.planning/ui-reviews/.gitignore` blev oprettet af gitignore-gaten (ubrugt; review-billederne ligger i `.reviews/`, og `after/*.png` er allerede tracket i git). Mappen `.planning/` kan slettes.

## Auditerede filer

- `src/app/globals.css`, `messages/da/{Dashboard,Session,Mind,Community,Reps,Coach,Adaptive}.json`
- `src/components/app/AppShell.tsx`, `RouteOpening.tsx`, `src/lib/auth.ts`
- `src/components/dashboard/KeepOriginal.tsx`, `MorningSignal.tsx`, `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/session/[id]/SessionClient.tsx`
- `src/app/(app)/hrv/page.tsx`, `src/components/hrv/HrvBandHero.tsx`
- `src/app/(app)/nutrition/{page,MealCard,OffPlanLogButton}.tsx`, `nutrition/shopping/ShoppingChecklist.tsx`, `src/components/nutrition/{DailyCheckInCard,LogWeightCard}.tsx`
- `src/app/(app)/mind/layout.tsx`, `src/components/mind/MentalGraph.tsx`, `src/lib/svg/smooth-path.ts`
- `src/app/(app)/community/page.tsx`, `src/components/community/*`
- `src/app/(app)/reps/{page,RedeemButton}.tsx`
- `src/app/coach/inbox/page.tsx`, `src/components/coach/{PriorityInboxList,InboxCasePanel,CoachReview}.tsx`
- Skærmbilleder: `.reviews/2026-10-04/after/01–08*.png`
