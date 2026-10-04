# Baseline-audit · Nord nøgleskærme + app-shell · 2026-10-04

Metode: `impeccable audit` (5 dimensioner) kørt af tre parallelle kode-audits, `impeccable detect`, og
helsides skærmbilleder i demo-tilstand (375 × fuld, 1440 × fuld) i `before/`. Scope: I dag, Session,
HRV, Mad, Mind, Crew, Reps, Coach-indbakke og app-shell (briefens §6; den svenske variant er den
samme skærm, designsystem-arket er ikke en skærm).

## Score

| # | Dimension | Shell+I dag+Session | HRV+Mad+Mind | Crew+Reps+Coach | Samlet |
|---|---|---|---|---|---|
| 1 | Tilgængelighed | 2 | 2 | 2 | **2** |
| 2 | Performance | 3 | 3 | 3 | **3** |
| 3 | Responsivt | 2 | 2 | 2 | **2** |
| 4 | Theming | 3 | 3 | 3 | **3** |
| 5 | Implementeringsintegritet | 2 | 2 | 2 | **2** |
| | **Total** | | | | **12/20 · Acceptabel** |

Detektoren fandt 1 fund (`border-l-2` i sidebar-nav), og det er en falsk positiv: det er den aktive
domænemarkør, ikke et kort. Tokens, kontrast og Nord-renhed holder bredt. Det, der trækker ned, er
systemiske huller (bevægelse, progress-semantik, touch-mål) og drift fra briefen.

## Systemiske mønstre (rettes én gang, virker overalt)

1. **Tal med punktum får luft.** `.numeric` (globals.css:348) sætter `tabular-nums`, og i Schibsted
   Grotesk giver det også punktum og komma cifferbredde. Resultatet er "1 . 420", "84 . 2K",
   "68 . 4 / 100K" og "4. okt., 09.35" på alle skærme. Det er den mest synlige kvalitetsfejl.
2. **`lg:minh-dvh` er ikke en klasse, og `.h-dvh` slår `lg:h-auto`** (globals.css:488-489, (app)/layout.tsx:38,57).
   På desktop sidder shellen fast i én skærmhøjde. Den sticky sidebar scroller væk på lange sider.
3. **Reduceret bevægelse dækker kun `pulse-dot`.** `.lift` (380 ms), `animate-pulse`, framer-motion-fejringer
   og autoplay-demovideoen i sessionen har ingen reduceret variant.
4. **Glød, blur og gradient har sneget sig ind**, og gates fanger dem ikke:
   - `pulse-dot` med `box-shadow`-ring.
   - `backdrop-blur` i 8+ filer.
   - `conic-gradient` på story-ringen, gradient i MindCelebration og `shadow` i MentalToggleRow.
   - `nord-surface-gate` tjekker kun uppercase, mono og tracking.
5. **Ingen fælles primitiver for Progress og Avatar.** Fem progress-barer mangler alle `role="progressbar"`.
   Initial-avataren er håndbygget fire steder, og skærmlæsere læser initialerne op.
6. **Touch-mål under 44 px:** `.btn-sm` på 40 px (bruges bredt), HrvSubNav på cirka 16 px,
   coach-nav på cirka 28 px, TierBanner-luk på 32 px og RestTimer "spring over" på 36 px.
7. **Aktiv navigation er kun visuel.** Tab-bar, sidebar og coach-rail mangler `aria-current="page"`.
8. **Grå plader overalt.** Næsten hvert kort er `surface-2` (`bg-3`-fyld). Det giver kasse-i-kasse, og
   valgt- og hover-tilstande på `bg-3` forsvinder. Briefen siger hvid flade med 1 px linjer.
   Desktop er én strakt kolonne på 1100 px (I dag, HRV, Mad og indbakken).
9. **`-mx-6 px-6` mod en `Container` med `px-5`** giver 4 px vandret overflow på Crew-stories og Mad-ugestrip.

## Fund efter alvor

### P0
- **Mind har ingen fast sikkerhedslinje.** `mind/page.tsx:70-100`. Briefen §6.5 kræver
  "Appen er ikke behandling. Livslinien 70 201 201 · akut 112" nederst. Linjen findes kun i
  førstegangs-disclaimeren og i krisemodalen.

### P1
- `RestTimer` starter forfra ved hver re-render, fordi `onDone` er inline i effektens deps (`RestTimer.tsx:39`, `SessionClient.tsx:424`).
- Desktop-shellens højde (mønster 2).
- `MentalResourcesModal` kan ikke scrolle, har ingen Escape og ingen fokusfælde (`MentalResourcesModal.tsx:89`).
- HRV-toggles har intet synligt fokus (`LifestyleLogCard.tsx:119`, `HrvSettingsSection.tsx:157,187`).
- Grafernes aksetekst er 3–5 px på mobil (`MentalGraph.tsx:152`, `TrendChart.tsx:175`). MentalGraph skelner serier kun med farve.
- HRV-normalområdet står aldrig som tal ("54–68 ms") (`HrvBandHero.tsx:94`).
- Mind-undersider (journal, sessioner, cirkler, indsigt) kan ikke nås inde fra Mind, fordi der ikke er nogen sub-nav.
- Indbakke-rækken har et `aria-label`, der skjuler årsag og tid (`PriorityInboxList.tsx:61`).
- Progress uden semantik (mønster 5). Tekstfelter i Crew uden label (`PostComposer.tsx:72`, `PostCard.tsx:211`).
- "Del" og demo-knapper i Crew gør ingenting (`PostCard.tsx:169`, `community/page.tsx:172,176,276,279`).

### P2 (udvalg)
- **Konkurrerende primærknapper.** På I dag står "Start pas" sammen med tre sorte CTA'er i indsigtskort. I sessionen er form-check-CTA'en en hvid blok ved siden af "Log sæt".
- **Opfundet Reps-tal.** `repsAwarded = 250` vises før serversvar (`SessionClient.tsx:105`), og det bryder §7.6.
- **Overskrifter.**
  - Sessionen: `h2` før `h1`, og ingen `<main>`.
  - Crew: sektionerne er `div`'er.
  - MindCelebration: hopper fra h1 til h3.
- **Coach-indbakke.** Der er intet højre panel med AI-udkast og "Send som Munk" (§6.8). Rækkerne er 1.100 px brede, med handle og tid i hver sin ende.
- **Copy-drift fra briefen.**
  - "Reps" i stedet for "Hep" i Crew.
  - "Reps Program" i title case.
  - "Bruge dem" skal være "Brug dem".
  - Mind-kicker og -knap afviger.
  - "IKKE" og "OG" i versaler i Mind-disclaimeren.
  - Touren siger "Fire skærme", men har fem trin.
- **Dialoger og fejl.**
  - Hjemmebyggede dialoger uden Escape og fokusfælde (`LogMealButton.tsx`).
  - Sheets hedder "Bottom sheet" på engelsk.
  - Hviletimeren annoncerer ikke, når den er færdig.
- **Mad.**
  - To ugestrips lige efter hinanden (skip-dage og måltider pr. dag).
  - Den svævende "+ Spiste noget andet" dækker footer-teksten på desktop.
  - Start-bjælken i SessionPreview mangler safe-area.
- **Valgfrie sæt.** `opacity-55` giver 2,4:1 på nat.
- **Hydrering.** Mismatch i demo-sessionen, fordi `data-form-thread-item` bruger `Date.now()`.

### P3
- `tel:`-links på krisenumre.
- `danger` brugt til skip-dage.
- Rå `<img>` i MealCard.
- Tre toggle-implementeringer.
- `PageTitle` springes over i indbakken og på Mad.
- Hardcodede strenge i SessionClient og SessionPreview.
- Død `borderColor` i Reps.
- "Kalk"-kommentarer.

## Det der virker
- Ingen hardcodede farver. Alt går gennem tokens, og `data-domain` sættes pr. layout.
- Kontrasten holder AA på alle lyse flader og på nat. Laveste værdier: 4,51 for fare-chip i coach og 4,54 for `fg-faint` på `bg-3`.
- Nat er stramt afgrænset til `/session` og `/coach`, uden lyst blink.
- `TrendChart` og `MorningSignal` har sr-only tekstalternativer. Skyderne er native `range` på 44 px.
- Tab-baren måler selv sin højde. Safe-area er gennemført i shellen. Mad-copy følger briefen ord for ord.

---

# Efter rettelser · samme dag

Branch `claude/nord-polish-keyscreens`. Efter-billederne ligger i `after/`, og
`08-coach-inbox-formcheck-d.png` viser split view med en form-check.

| # | Dimension | Før | Efter | Hvad flyttede den |
|---|---|---|---|---|
| 1 | Tilgængelighed | 2 | 3 | <ul><li>Sikkerhedslinjen i Mind</li><li>`aria-current` overalt</li><li>Progress-semantik</li><li>Labels</li><li>Fokus på toggles</li><li>Graf-tabeller</li><li>Overskriftsorden</li><li>Modal med fokusfælde</li><li>Timer-annoncering</li></ul> |
| 2 | Performance | 3 | 3 | <ul><li>`FormCheckSheet` lazy-loades</li><li>Progress bruger `scaleX`</li><li>Demovideo uden autoplay ved reduceret bevægelse</li></ul> |
| 3 | Responsivt | 2 | 3 | <ul><li>Desktop-shellen er rettet</li><li>Ingen 4 px overflow</li><li>Touch-mål på 44 px</li><li>Safe-area på Start-bjælken</li><li>To kolonner på I dag</li><li>Split view i indbakken</li></ul> |
| 4 | Theming | 3 | 4 | <ul><li>Ingen glød, blur eller gradient, og en gate holder det sådan</li><li>Hvide kort</li><li>Domæne-blæk på chips</li><li>Modal i `--bg-elev`</li></ul> |
| 5 | Integritet | 2 | 3 | <ul><li>Tal uden luft</li><li>Ingen opfundne tal</li><li>Én primærknap</li><li>Copy følger briefen</li><li>Delte Progress og Avatar</li><li>Ingen døde knapper</li></ul> |
| | **Total** | **12** | **16/20 · God** | |

Detektor: kun den kendte falske positiv (aktiv domænemarkør i sidebaren).
tsc, eslint og vitest er grønne: 4332 tests.

## Kendte rester (ikke i denne runde)
- **Komponentklasser uden for `@layer`.** `.btn`, `.surface`, `.hairline` og `.hairline-strong` ligger uden for `@layer components`. Derfor slår de Tailwind-utilities: `hidden` og `lg:hidden` virker ikke på en `.btn`, og ringfarven kan ikke overstyres. Det er rettet lokalt i `OffPlanLogButton`. At flytte klasserne ind i et lag er rigtigt, men det ændrer kaskaden i hele appen og skal derfor have sin egen gennemgang.
- **Grå flader står tilbage.** Sessionskortet, morgensignalet og nøgletallene på I dag er stadig `surface` (`bg-2`), mens indsigtskortene er hvide. Det er bevidst i dag, fordi grå markerer det primære, men det bør afgøres.
- **Indbakken i demo.** HRV- og HQ-mocks matcher ikke køens id'er, så panelet viser en henvisning. Med live-data vises de rigtige kort.
- **Tre toggle-implementeringer** er ikke samlet.
- **Mind-grafen.** Den udglattede kurve skyder lidt over 5 i MentalGraph.
- **Svensk.** Der er ingen `messages/sv`. Den svenske variant i briefen §6.9 findes ikke i koden endnu.
- **App-koncepter.** Koncepter i native-kvalitet via imagegen-frontend-mobile kræver et billedgenereringsværktøj, som ikke er tilgængeligt i denne session.
