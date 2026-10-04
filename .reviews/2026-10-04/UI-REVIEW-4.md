# Nord-nøgleskærme: UI-review 4 (6 søjler, efter typeroller)

**Auditeret:** 2026-10-04, branch `claude/nord-wave1-typography` (HEAD 2ad042f; rettelser i 404e1ab og 1a1d9f9)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `docs/DOMAIN_COLOR_SYSTEM.md`, `DESIGN.md`. Ejerbeslutningerne er uændrede.
**Forrige review:** `UI-REVIEW-3.md` (17/24, typografi 3)
**Metode:**
- Skærmbilleder: `wave1/*.png` (375 og 1440 px).
- Live-måling på :3003 (MUNK-01, system-Chrome via Playwright, `isMobile`/`hasTouch` ved 375). Målt: beregnet `font-size` og `font-weight` på alle tekstbærende elementer i `<main>` på 11 ruter (I dag, session, HRV, Mad, Mind, journal, Crew, Reps, Indstillinger, Coaching, coach-indbakke) ved 375 og 1440 px.
- Kaskadeprøve på formularfelter.
- Statisk rolle-scan af alle `<h1–3|p|a|Link|button|input|textarea|select>` (også fler-linjede tags).
- `vitest src/lib/design`: 9 filer og 3158 tests, alle grønne.

---

## Søjlescorer

| Søjle | UI-REVIEW-3 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | Uændret: "Skip-dage" (`Nutrition.json:286`, `Coach.json:176`), "100K volumen-club", "drukner under baren", "0-999"/"1.000-4.999" med bindestreg (synligt på 07-reps-d) |
| 2. Visuals | 2 | 2 | Mads flade desktop-hierarki er rettet. Stadig ingen `NarrativeBand`, ingen HRV-graf, og Reps-heroen 1.420 står ~880 px fra titlen |
| 3. Color | 3 | 3 | Uændret. `SessionClient.tsx:668` `border-l-body` er stadig den orange cue-streg i den monokrome session |
| 4. Typography | 3 | **3** | Overskrifter, vægte og feltreglen holder nu 100 % målt live. 12 px bruges stadig til sætninger og handlinger i `<div>`/`<span>`/`<a>`/`<button>`, fordi gaten kun ser `<p>` |
| 5. Spacing | 3 | 3 | Uændret (Mind centreret på desktop, kortstak øverst på Mad, "Limited C…" klippes ved 375) |
| 6. Experience Design | 3 | 3 | iOS-zoom-regressionen er lukket. Tilbage: ingen `coach/inbox/loading.tsx`, `confirm()` på 4 coach-flader, ingen "Del med coach" |

**Samlet: 17/24** (uændret; typografien er en stærk 3, men ikke 4)

---

## Søjle 4: Typography (3/4), detaljer

### Lukket siden måling 3 (verificeret)
1. **16 px-feltreglen virker.** Den ligger uden for `@layer` (`globals.css:742–757`) som `max(16px, 100%)`. Kaskadeprøve ved 375 px (mobil):

   | Felt | Beregnet størrelse |
   |---|---|
   | `textarea.text-copy` | 16px |
   | `textarea.field.text-copy` | 16px |
   | `input.input.text-copy` | 16px |
   | `select.text-copy` | 16px |
   | stepper-input i `.stepper-num` | **32px** (også i rigtig session: `input.stepper-input=32` ×2) |
   | `/settings`-felter | 16px |

   Ved 1440 er de samme felter 15 px, som de skal være. DESIGN.md §306 holder nu.
2. **Overskrifter følger rollen på alle målte skærme.** Hver `h1` er 34 px, hver `h2` 22 px og hver `h3` 17 px, alle i vægt 500, ved både 375 og 1440 px. Der er ingen undtagelser på de 11 ruter. Konkret:
   - Reps har 5 rigtige sektioner i 22 px ("Niveauer" … "Mine indløsninger"), hvor der før var 13 px-labels.
   - Mads "Resten af ugen" er 22 px.
   - Måltidsnavne er 17 px på desktop, hvor de før var 34 px. På 04-mad-d står "Brændstof." nu klart over "3 måltider", der står over "Spinatomelet med feta".

   Statisk:
   - 27 `h1:text-title`, 65 `h2:text-section` og 13 `h3:text-card`.
   - 2 `h2:text-card` (ScienceFeed:117, ung/mad:27), som er acceptable.
   - Ingen overskrift har `text-micro`/`text-meta`/`eyebrow`/`text-title` (h2/h3) eller `leading-*` på et overskrifts-token.
   - Ingen overskrift uden for marketing mangler et skalatoken.
3. **Skalaen er overholdt.** Alt i `<main>` er 12/13/15/17/22/34/64/88. De eneste undtagelser er stepperknapperne "−"/"+" i 24 px og tab-labels i 11 px. Begge er dokumenterede komponent-interne størrelser (DESIGN.md:246).
4. **Vægte.** Live findes kun 400 og 500. Der er ingen `font-semibold`/`font-bold` i medlems- eller coachkode.
5. **`md:text-title` på rubrikker** er væk, og `error.tsx`/`loading.tsx` er med i gaten (`ROOT_FILES`).
6. **Tokenfordeling i koden:** micro 441 (før 542), meta 346 (før 234), copy 286, section 147, title 59, card 43, hero 5, hero-lg 5.

### Hvad der stadig blokerer 4
1. **WARNING: 12 px bruges stadig til sætninger og handlinger. Fund 4 fra måling 3 er kun halvt lukket.** Rettelsen og gaten (`SENTENCE_AS_MICRO`) dækker kun `<p>`. De samme roller i `<div>`, `<span>`, `<a>` og `<button>` er uændrede. Live ved 375 og 1440:
   - **`/settings`:** 7 hjælpesætninger på 8–24 ord står i 12 px, fx "Notifikation på telefonen når det er tid til at lo…" (21 ord) og "Når din readiness er lav i dag, ser du en kort not…" (24 ord). Kilder: `SettingsClient.tsx:174` (endda `text-micro … leading-relaxed`), `:369` og `HrvSettingsSection.tsx:153,184`. Måling 3 nævnte netop disse sætninger.
   - **I dag:** "Sig mere om Hjerte/Sind/Mad", "Skjul", "I morgen" og "Læs noter på din profil" er 12 px (`ConnectDotsStream.tsx:162,165,176,183`).
   - **Crew:** "Hep", "Kommentarer" og "Del" er 12 px (`PostCard.tsx:167`, hele handlingsrækken).
   - **Session:** "Sendes til coach Munk, bundet til Back Squat · 2 f…" (12 ord), "Se hele øvelsen →" og "Optag →" er 12 px (`SessionClient.tsx:687,715,719`).
   - **Statisk:** 13 `<Link>`, 10 `<button>` og 1 `<a>` med `text-micro`, fx `HrvSettingsSection.tsx:125,231`, `HrvReadinessNudge.tsx:34`, `AdaptiveConsentCard.tsx:99`, `CounterfactualSliders.tsx:278`, `LifestyleLogCard.tsx:328`, `FirstTimeTour.tsx:57`, `RestTimer.tsx:77`, `CoachShell.tsx:101,117`.

   Spec §4 og DESIGN.md:238 forbeholder 12 px til tabelhoveder, tidsstempler, chips, initialer og akser. Det er det sidste systemiske rollebrud.
   **Rettelse:** Flyt sætnings-`div`/`span` og alle `Link`/`button`/`a` med `text-micro` til `text-meta`. Udvid `SENTENCE_AS_MICRO` til `<(p|div|a|Link|button)\b` og tillad kun `span`/`time` (chips og tidsstempler).
2. **Mindre: vægttallet mister sin størrelse på telefon.** `LogWeightCard.tsx:105`, `SetupWizardClient.tsx:119` og `SessionEditor.tsx:223` har `text-section` (22 px) på selve `<input>`. Feltreglen tvinger det til `max(16px, 100%)`, dvs. 16 px ved 375. Målt: `input.field.text-section` er 16px på mobil og 22px på desktop. Det er ikke en regression, for reglen har altid vundet. Men det er et rollebrud for et indtastet nøgletal.
   **Rettelse:** Lad forælderen bære `text-section`, så `100%` arver 22 px, ligesom stepperen gør.
3. **Mindre: HRV-enheden vokser stadig til titelstørrelse.** `hrv/page.tsx:374,425` er `text-section md:text-title`, så "ms" bliver 34 px ved 88 px-tallet. DESIGN.md:234 siger, at enheden er `text-section`. Gaten fanger det ikke, fordi det er et `<span>`.
4. **Mindre: `.input` er 14 px på desktop.** Uden en `text-*` på feltet giver `globals.css:416` (`font-size: 0.875rem`) 14 px. Målt: `input.input` (bar) er 14px ved 1440. 14 er ikke på skalaen, og DESIGN.md beskriver ikke `.input` med en egen størrelse. Rettelse: brug `0.9375rem`, som `.field` gør.
5. **Mindre: `leading-*` på brødtekst og micro.** Der er 193 forekomster (`leading-relaxed` 114, `leading-snug` 19, `leading-tight` 14, `leading-none` 12, `leading-[1.38]` 12 …). Ingen af dem står på et overskrifts-token, så det er støj og ikke et rollebrud.
6. **Mindre: gaten har huller.**
   - Regexerne er enkeltlinjede. Rolle-scannet fandt dog ingen fler-linjede afvigere.
   - `privacy/page.tsx` (5) og `terms/page.tsx` (4) har stadig rå Tailwind-størrelser og ligger uden for `ROOTS`.

### Dom
Typografi er en 3 uden indvendinger mod skala, overskrifter, vægte og felter. Det kunne være en 4 på de punkter, men et af de fem fund fra måling 3 (12 px til sætninger og handlinger) er stadig synligt live på Indstillinger, I dag, Crew og i sessionen. Ved en streng score holder det søjlen på 3. Det skyldes, at rettelsen fulgte gaten (`<p>`) og ikke rollen.

---

## Øvrige søjler (kort)

### Søjle 1: Copywriting (3/4)
Uændret ift. måling 3:
- `Nutrition.json:286` "Skip-dage" og `Coach.json:176`
- `Community.json:12` "100K volumen-club" (synlig som `h2` på Crew)
- `exercise-mocks.ts:71` "drukner under baren"
- `Reps.json:20,24` "0-999" og "1.000-4.999" (07-reps-d), selvom ejeren har godkendt en-dash i intervaller

### Søjle 2: Visuals (2/4)
- **Forbedret:** Mad på desktop har nu et fokuspunkt (04-mad-d), og Reps har synlige sektionstitler (07-reps-d).
- **BLOCKER-niveau for søjlen:** der er ingen `NarrativeBand` i `src` og ingen 14-nætters HRV-graf. Reps-heroen 1.420 står yderst til højre, adskilt fra titlen "Du arbejder. Du får." (07-reps-d).

### Søjle 3: Color (3/4)
- `SessionClient.tsx:668` `border-l-body` giver en orange cue-streg i den monokrome nat-session.
- Radiusklasser renderer 0 og er kun tokenstøj.

### Søjle 5: Spacing (3/4)
Uændret:
- `MindDisclaimer` står centreret under en venstrestillet header (05-mind-d).
- Mad stabler "Ikke et AI-udkast", "I dag" og "Kropsvægt" før planen (04-mad-d).
- "Limited C…" klippes ved 375.

### Søjle 6: Experience Design (3/4)
- **Lukket:** iOS-fokuszoom på de 11 felter (se søjle 4, punkt 1).
- **Åbent:**
  - `src/app/coach/inbox/` har kun `page.tsx` og ingen loading-tilstand.
  - `confirm()` bruges i `ProgramBuilder.tsx`, `SessionEditor.tsx`, `SendDigestButton.tsx` og `PromoteToLiveButton.tsx`.
  - Der er ingen "Del med coach" på HRV.

---

## Top-prioriterede rettelser
1. **12 px-rollen** (det eneste, der står mellem typografi og 4): Flyt sætninger i `div`/`span` og handlinger i `Link`/`button`/`a` fra `text-micro` til `text-meta`. Start med `SettingsClient.tsx:174,369`, `HrvSettingsSection.tsx:153,184`, `ConnectDotsStream.tsx:162–183`, `PostCard.tsx:167` og `SessionClient.tsx:687,715,719`. Udvid gaten til de tags.
2. **Bølge 2-visuals:** `NarrativeBand`, HRV-graf, Reps-hero ved titlen.
3. **Session-cue monokrom** (`SessionClient.tsx:668`) og copy-restlisten (en-dash i `Reps.json`, "Skip-dage", "volumen-club", "drukner").
4. Coach: `inbox/loading.tsx`, `ConfirmSheet` i stedet for `confirm()`, "Del med coach".
5. Små typografiske rettelser:
   - `text-section` på forælderen til vægtfelterne
   - HRV-enheden uden `md:text-title`
   - `.input` 14 → 15 px
   - privacy/terms ind i gaten

## Registry safety
Ikke relevant (ingen UI-SPEC med tredjeparts-registries).

## Auditerede filer
- `DESIGN.md`, `src/app/globals.css`, `src/lib/design/nord-type-scale-gate.test.ts`, `src/lib/design/nord-shell-gate.test.ts`, commits 404e1ab og 1a1d9f9
- `src/app/(app)/{settings,session/[id],hrv,nutrition,reps,community,dashboard,coaching}/**`, `src/components/{hrv,dashboard,community,nutrition,adaptive,coach,ui}/**`, `src/app/coach/**`
- `messages/da/{Nutrition,Coach,Community,Reps}.json`, `src/lib/data/exercise-mocks.ts`
- Skærmbilleder: `wave1/04-mad-d.png`, `wave1/07-reps-d.png` (samt øvrige `wave1/*`). Live-måling på :3003 ved 375 og 1440 px.
