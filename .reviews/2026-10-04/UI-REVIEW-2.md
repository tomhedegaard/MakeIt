# Nord-nøgleskærme: UI-review 2 (6 søjler, genkørsel)

**Auditeret:** 2026-10-04, branch `claude/nord-polish-keyscreens` (HEAD 0c8c7d6, efter ad58c37 + d19f7c0 + 0c8c7d6)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md` + `docs/DOMAIN_COLOR_SYSTEM.md`
**Forrige review:** `UI-REVIEW.md` (14/24) og `taste-audit.md`
**Skærmbilleder:** nye `after/*.png` (375 og 1440 px) og `after/01-i-dag-stats-m.png` (efter stats-fixet). `after/08-coach-inbox-formcheck-d.png` er **ikke** taget igen. Den viser stadig den gamle tilstand, så form-check-panelet er kun verificeret i koden. `after/05-mind-*.png` viser disclaimer-gaten, ikke grafen, så Mind-grafen er også kun verificeret i koden.
**Ejerbeslutninger respekteret:** nummereret navigation bevares, briefens kickers bevares (kun dubletter fjernes), og en-dash i talintervaller er i orden.

---

## Søjlescorer

| Søjle | Før | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 2 | 3 | Niveau, engelsk i coach, tal og datoer er rettet. Crew viser stadig @Munk som "Legend", og Mind-intro og disclaimer har grammatikfejl og "tier"-sprog |
| 2. Visuals | 2 | 2 | Coach-panelet er fyldt, og "Behold original" har ramme. Fortællebåndet mangler stadig på alle tre skærme, HRV er tynd, og Reps-heroen står adskilt til højre |
| 3. Color | 3 | 3 | Coach er nu monokrom (§8.1 overholdt). Orange cue-streg i den monokrome session er uændret |
| 4. Typography | 2 | 2 | RPE "6,5" og danske tal er rettet. Typeskalaen er uændret, og en ny systemfejl er fundet: `cn()` sletter Nord-størrelsestokens |
| 5. Spacing | 3 | 3 | Rækkerne i Reps, Crew og Mad samt I dag-stats passer nu på 375 px. Mind er stadig centreret på desktop, og undernavigationen klippes på mobil |
| 6. Experience Design | 2 | 3 | Alle tre blockers er løst, og `confirm()` er væk fra medlemsappen. Coach mangler stadig loading, HRV mangler "Del med coach", og coach-flader bruger fortsat `confirm()` |

**Samlet: 16/24** (før 14/24)

---

## Status på tidligere fund

### Rettet (verificeret)
| Fund | Bevis |
|---|---|
| Niveau Legend vs Athlete (shell, I dag, Reps) | `auth.ts` demo-tier følger saldoen. Shell, I dag-stats og Reps viser alle "Athlete" (01-i-dag-d, 07-reps-d) |
| "84 / 100" i form-check | `CoachReview.tsx:102`: scoren er fjernet, kun kommentar tilbage (kun verificeret i koden, billedet er gammelt) |
| Tom standardsag i indbakken | 08-coach-inbox-d: HRV-sagen viser 43 ms mod båndet 51–57 ms, handlinger og "Send besked" |
| Domænefarve i coach-chips | `PriorityInboxList.tsx:13-24`: neutral outline og danger kun ved safety. Billedet bekræfter |
| Dobbelt pil og "← Overview" i indbakken | Rækkerne har ingen pil, og railen hedder "Overblik", "Medlemmer" og "Analyse" |
| RPE "6 . 5", "137.5kg", "2400", "1103", "65m" | 02-session: "6,5", "137,5 kg". 04-mad: "2.400", "1.103". I dag: "65 min", "PR'er 3" |
| "Sæt i dette øvelse" | Retter til "Sæt i denne øvelse" (02-session) |
| Mind-grafen overskyder 1–5 og har arealfyld | `MentalGraph.tsx` bruger `linePath` og ingen arealfyld (kun i koden, billedet viser gaten) |
| Native `confirm()` i Mad | `ConfirmSheet` bruges i MealCard, DailyCheckInCard og ShoppingChecklist |
| "Behold original" som ghost | `KeepOriginal.tsx:81` `btn btn-sm`, med outline på 01-i-dag-d |
| Dobbelt CTA "Åbn dagens pas" | Kun "Start pas →" står tilbage |
| Dobbelt "Hjerte"-kicker på HRV | Fjernet (03-hrv-d) |
| Reps-historik 4 kolonner på 375 px | Stablet titel, kategori og tid (07-reps-m) |
| "Hep 122 heppere" knækker | Står på én linje (06-crew-m) |
| Mad-ugestrimlen skærer "Fre" | 4+3-grid (04-mad-m) |
| "Mangler 580 Reps" ligner en knap | Er nu ren tekst (07-reps-*) |
| Forældede datoer (Maj) | "Oktober-udfordring · 27 dage tilbage", "Lørdag 31/10" |
| "Top atleter" | Rettet til "Topatleter" |
| Stats-rækken på I dag 375 px | Volumen står på egen række (01-i-dag-stats-m) |

### Stadig åbne
- **Crew-niveau:** `src/app/(app)/community/page.tsx:47` (`who: "@Munk", tier: "Legend"`) og `src/lib/data/community.ts:123`. Den indloggede demobruger er @Munk/Athlete, men Crew-feedet viser "@Munk · Legend" (06-crew-m). Det er den samme tillidsfejl som blocker 1, nu på én flade.
- **Fortællebåndet** (§5/§6) mangler på I dag, HRV og Reps. Ingen `NarrativeBand` findes. "Mikael Munk har besvaret 1 form-check" er stadig et gråt kort, og "Sådan tjener du" er en liste.
- **HRV:** ingen 14-nætters graf på I dag-fanen, ingen kildechip og ingen "Del med coach" (0 forekomster i `messages/da/Hrv.json` og `src/components/hrv`). Desktop slutter ved ~790 px.
- **Reps desktop:** hero-tallet 1.420 står yderst til højre, adskilt fra titlen.
- **Session:** orange cue-streg `SessionClient.tsx:668` `border-l-body`. "0 / 16 sæt" og "Du filmede dette sæt" for sæt 3 og 4. "drukner under baren" (`src/lib/data/exercise-mocks.ts:71`).
- **I dag:** "HQ · Adaptive Engine" plus glossen "Adaptive Engine tilpasser ugen. Munk er din coach" står stadig i pas-kortet. Titlen er "@Munk", ikke "Din uge."
- **Typeskala:** ca. 388 `text-sm`, 244 `text-xs`, 84 `text-2xl` og 65 `text-3xl` (git grep, `(app)`, `coach` og `components`). Tallene er stort set identiske med 6ecb0d1. `RouteOpening.tsx:22` `md:text-[2.75rem]`.
- **Mind desktop:** `MindDisclaimer.tsx:21` `Container size="narrow"` giver en centreret kolonne (x≈506) under en venstrestillet header (x=300). Undernavigationen klippes "Din uge C…" på 375 px uden fade.
- **Coach:** ingen `src/app/coach/inbox/loading.tsx`.
- **Crew:** "+ Del" (opret) vs "Del" (del opslag). "100K volumen-club".
- **Reps:** "Limited C…" klippes stadig i "Mine indløsninger" på 375 px.
- **Mad:** "Ikke et AI-udkast"-kortet og tre 1-linjes kort står stadig stablet før indholdet. "Skip-dage", "Skip" og "Skippet" (`Nutrition.json:247,253,286,290`).

---

## Nye fund

1. **WARNING (systemisk): `cn()` sletter Nord-størrelsestokens.** `src/lib/utils.ts:5` kører `twMerge` uden `extendTailwindMerge`. Derfor tolkes `text-micro`, `text-meta`, `text-copy` osv. som farveklasser, og den sidste `text-fg-*` vinder. Det er verificeret med `twMerge("… text-micro hairline-strong text-fg-dim")` → `"… hairline-strong text-fg-dim"`. Konsekvensen er synlig. Årsags-chippen i indbakken (`PriorityInboxList.tsx:18-22`) er skrevet som 12 px, men renderer i arvet ~15 px (08-coach-inbox-d: "Back Squat", "Conventional Deadlift"). Den gamle chip-fund er altså "rettet" i koden, men ikke på skærmen. Ca. 15 `cn()`-steder kombinerer et Nord-token med en tekstfarve. **Rettelse:** `extendTailwindMerge({ extend: { classGroups: { "font-size": [{ text: ["micro","meta","copy","card","section","title","hero","hero-lg"] }] } } })` i `utils.ts`.
2. **WARNING: Mind-copy (synlig på 05-mind-*, uændret i d19f7c0).**
   - `Mind.json:16`: "dit private journal" skal være "din private journal". "/mind er …" eksponerer en URL-sti som produktnavn.
   - `Mind.json:18`: "MakeIt's" er engelsk genitiv. På dansk er det "MakeIts".
   - `Mind.json:27`: "Når du rykker tier" og "privat som default" er engelsk. "den daglige mental-coach hos Anthropic" modsiger "Anthropic er processor, ikke en coach" to linjer længere nede. Det er et tillidsproblem på en sikkerhedsflade.
3. **WARNING: Inkonsekvente intervaller.** Reps-niveauerne bruger bindestreg ("0-999", "1.000-4.999", `Reps.json:20-28`), mens HRV og coach bruger en-dash ("51–57 ms"). Ejeren har godkendt en-dash, så Reps bør følge med.
4. **Mindre: dubleret identitet i coach-panelet.** Panelets header viser "@nina_dl · HRV · 4. okt., 11.24", og det indlejrede HRV-kort gentager "@nina_dl / 4. okt., 11.24" (08-coach-inbox-d). Chippen "Aktiv" står gråtonet ved siden af to aktive chips og læses som deaktiveret.
5. **Mindre: `confirm()` lever videre i coach.** `SessionEditor.tsx:94`, `ProgramBuilder.tsx:557`, `SendDigestButton.tsx:13` og `PromoteToLiveButton.tsx:45`. Det var uden for de tidligere skærme, men `ConfirmSheet` findes nu og kan genbruges.

---

## Top-prioriterede rettelser

1. **`cn()`/twMerge-konfiguration** (nyt fund 1). Én ændring i `src/lib/utils.ts` gør, at alle Nord-tokens i `cn()` overlever, og coach-chips bliver 12 px.
2. **Crew-feedets @Munk = "Legend".** Sæt `tier` til `Athlete` i `community/page.tsx:47` og `community.ts:123`, eller udled det fra samme kilde som shell.
3. **Mind-copy:** "din private journal", "MakeIts", fjern "/mind", erstat "rykker tier" og "default", og fjern "mental-coach hos Anthropic".
4. **Fortællebåndet:** én `NarrativeBand` (blæk `#111111`), brugt på I dag (form-check-svaret), HRV (HQ's note) og Reps (Sådan tjener du).
5. **Session-cue** `border-l-body` → `border-l-fg` (`SessionClient.tsx:668`).
6. **HRV:** 14-nætters graf og "Del med coach"-toggle på I dag-fanen.
7. **Mind desktop:** venstrestil disclaimer-containeren. Tilføj fade eller rulleindikator på undernavigationen.
8. **Coach:** tilføj `src/app/coach/inbox/loading.tsx`.

---

## Detaljerede fund

### Søjle 1: Copywriting (3/4)
Den store tillidsfejl er rettet i shell, I dag og Reps, coach-teksterne er danske og uden tankestreger, og tal, datoer og grammatikfejlen i sessionen er rettet. Der er stadig en enkelt niveaukonflikt (Crew), Mind-introen har tre fejl på en sikkerhedsflade, og der er engelske rester ("Skip-dage", "volumen-club", "tier", "default", "drukner under baren"). Det er nok til at holde scoren på 3, ikke 4.

### Søjle 2: Visuals (2/4)
Forbedret: coach-panelet har nu et fokuspunkt (43 ms mod båndet 51–57 ms), "Behold original" har en tydelig sekundær outline, og I dag har kun én primær CTA. Briefens to signaturelementer mangler dog stadig, nemlig fortællebåndet (§5) og HRV-skærmen med graf (§6.3). Reps-heroen er stadig adskilt fra titlen på desktop. Kontrakten er kun delvist opfyldt, så scoren forbliver 2.

### Søjle 3: Color (3/4)
Coach er nu 100 % monokrom med danger kun ved safety, i overensstemmelse med §8.1. Mind-grafen har ikke længere arealfyld (kun verificeret i koden). Der er stadig en orange cue-streg i den monokrome session (02-session-m/d). Domæne-badges i "Sammenhængene" og ugestrimlen følger doseringsreglerne.

### Søjle 4: Typography (2/4)
Tal: RPE, kg, kcal og PR'er er korrekte, og `.pill` har ikke længere `tabular-nums`. `.stepper-num` (`globals.css:548`) har dog stadig `tabular-nums`. Det er harmløst ved heltal som "80" og "5", men værd at fjerne for konsistensens skyld. Skalaen er uændret (fordelingen ovenfor, ~10 Tailwind-standardstørrelser uden for §4). Twmerge-fejlen gør, at selv korrekt tokeniserede steder kan rendere forkert.

### Søjle 5: Spacing (3/4)
Alle fire mobilbrud fra forrige review er rettet (Reps-rækker, Crew-hep, Mad-strimmel, I dag-stats). Tilbage står Mind desktop (centreret kolonne), Minds klippede undernavigation, "Limited C…" og Mads stak af 1-linjes kort før indholdet.

### Søjle 6: Experience Design (3/4)
Alle tre blockers er løst (0–100-score, tom sag, niveaukonflikt i kernefladerne). Medlemsappen har ingen native `confirm()`, og Mind-grafen er ærlig. Mangler: coach-loading, HRV-samtykket "Del med coach", forvirrende "0 / 16 sæt" vs filmede sæt 3 og 4 i sessionen, og `confirm()` på fire coach-flader.

---

## Registry safety
Ikke relevant (ingen UI-SPEC med tredjeparts-registries).

## Auditerede filer
- `src/lib/utils.ts`, `src/lib/auth.ts`, `src/app/globals.css`, `src/components/app/RouteOpening.tsx`
- `src/components/coach/{PriorityInboxList,InboxCasePanel,CoachReview}.tsx`, `src/app/coach/inbox/`, `src/app/coach/{sessions,programs}/**`, `src/components/coach/{SendDigestButton,PromoteToLiveButton}.tsx`
- `src/app/(app)/session/[id]/SessionClient.tsx`, `src/lib/data/exercise-mocks.ts`
- `src/components/mind/{MentalGraph,MindDisclaimer}.tsx`, `src/lib/svg/smooth-path.ts`
- `src/app/(app)/community/page.tsx`, `src/lib/data/community.ts`
- `src/components/dashboard/KeepOriginal.tsx`, `src/app/(app)/hrv/`, `src/components/hrv/`
- `messages/da/{Mind,Nutrition,Reps,Coach,Hrv,Nav}.json`
- Skærmbilleder: `.reviews/2026-10-04/after/01–08*.png`, `01-i-dag-stats-m.png`
