# Nord-nøgleskærme: UI-review 5 (6 søjler, efter måling 4-rettelser)

**Auditeret:** 2026-10-04, branch `claude/nord-wave1-typography` (HEAD 38d0c9b)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `docs/DOMAIN_COLOR_SYSTEM.md` og `DESIGN.md`. Ejerbeslutningerne er uændrede.
**Forrige review:** `UI-REVIEW-4.md` (17/24, typografi 3)
**Metode:**
- Live-måling på :3003 (MUNK-01, system-Chrome via Playwright, `isMobile`/`hasTouch` ved 375). Jeg har målt beregnet `font-size`/`font-weight` på alle elementer med egen tekst og alle felter i `<main>`. Det dækker 9 ruter: I dag, session, HRV, Mad, Mind, Crew, Reps, coach-indbakke og Indstillinger, ved 375 og 1440 px.
- Kaskadeprøve på felter.
- Statisk scan.
- `vitest src/lib/design`: 9 filer og 3162 tests, alle grønne.
- Der er ikke taget nye skærmbilleder. Målingen er beregnede værdier.

---

## Søjlescorer

| Søjle | UI-REVIEW-4 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | Uændret: "Skip-dage" (`Nutrition.json:286`, `Coach.json:176`), "100K volumen-club", "drukner under baren", "0-999" med bindestreg (`Reps.json:20`) |
| 2. Visuals | 2 | 2 | Uændret: ingen `NarrativeBand`, ingen HRV-graf, og Reps-heroen står langt fra titlen |
| 3. Color | 3 | 3 | Uændret: `SessionClient.tsx:668` `border-l-body` giver en orange cue-streg i den monokrome session |
| 4. Typography | 3 | **3** | Alle fem mindre fund og handlingsdelen af 12 px-fundet er lukket. Hjælpesætninger i `<div>`/`<span>` står stadig i 12 px live på Mad og I dag, og gaten dækker stadig ikke `<div>` |
| 5. Spacing | 3 | 3 | Uændret |
| 6. Experience Design | 3 | 3 | Uændret: ingen `coach/inbox/loading.tsx`, og `confirm()` bruges stadig i 5 filer |

**Samlet: 17/24** (uændret)

---

## Søjle 4: Typography (3/4), detaljer

### Lukket siden måling 4 (verificeret live)
1. **Handlinger i 12 px på `<a>`/`<button>`/`<Link>`.** Ingen sådanne tags har `text-micro` længere, og `ACTION_AS_MICRO` fanger nu også fler-linjede tags.
   - **I dag:** "Sig mere om …", "Skjul" og "I morgen" er `text-meta` (`ConnectDotsStream.tsx:157–182`).
   - **Crew:** Der er ingen 12 px-handlinger. Det eneste 12 px på Crew er tier, chips og tidsstempler (`PostCard.tsx:145–211`).
2. **Indstillinger:** Der er 1 element i 12 px ved både 375 og 1440 px. Det er statusbeskeden `StatusLabel` ("✓ gemt"), som er acceptabel. De 7 hjælpesætninger fra måling 4 er nu 13 px.
3. **Vægtfeltet:** Kaskadeprøven giver `input.field.text-section` = **22px** ved 375 (før 16px). `globals.css:753` undtager felter med skalastørrelse over 16 px fra gulvet.
4. **Feltgulvet holder stadig ved 375 og 1440:**

   | Felt | 375 | 1440 |
   |---|---|---|
   | `.input` (bar) | 16px | 15px (før 14px) |
   | `.field` | 16px | 15px |
   | `textarea.field.text-copy` | 16px | 15px |
   | `.field.text-card` | 17px | 17px |
   | stepper | 32px | 32px |

   På `/settings` er felterne 16px på mobil og 15px på desktop.
5. **HRV-enheden:** Der er nøjagtig ét 22 px-element ved siden af 88 px-tallet ved 1440. Klassen `md:text-title` er væk.
6. **`leading-*`:**
   - Der er 67 tilbage (før 193). `TOKEN_LEADING` sikrer, at ingen af dem står på samme klassestreng som et skalatoken.
   - Resten er `leading-relaxed` 24, `leading-[1.38]` 12, `leading-none` 7 og andre. De står på elementer uden token og er støj, ikke rollebrud.
7. **Privacy og terms** har 0 rå Tailwind-størrelser og ligger nu i `ROOTS` (gate-testen linje 13).
8. **Overskrifter, skala og vægte holder 100 % live på de 9 ruter ved 375 og 1440 px.**
   - Hver `h1` er 34, hver `h2` 22 og hver `h3` 17. Der er ingen afvigere.
   - Alle størrelser ligger på skalaen 12/13/15/17/22/34/64/88. De eneste undtagelser er den dokumenterede stepper (24/32) og mobilfelternes gulv på 16.
   - Der bruges kun vægt 400 og 500.

### Hvad der stadig blokerer 4
1. **WARNING: 12 px bruges stadig til sætninger i `<div>`/`<span>`.** Fund 1 fra måling 4 er kun lukket for handlings-tags. Live ved både 375 og 1440 px:
   - **Mad:** Kosttilskuddenes begrundelser er hele sætninger i 12 px. Et eksempel er "Sundhedsstyrelsen anbefaler D3 i vinterhalvåret. Solen klarer det fra maj til september." (12 ord, `nutrition/page.tsx:512`, `<div className="text-micro">{s.why}`). Det andet eksempel er "Bedst dokumenterede styrke-tilskud … " (8+ ord).
   - **Mad:** Fodnoten "Regelbaseret plan (skaleret til dit mål)" er 12 px (`nutrition/page.tsx:527`).
   - **I dag:** Undertitlen på et link, "Læs noter på din profil", er 12 px (`dashboard/page.tsx:446`). Den var nævnt i måling 4 under `ConnectDotsStream` og er ikke rettet på denne kilde.
   - **Session:** CTA-teksten "Optag →" er 12 px i et `<span>` inde i formcheck-knappen (`SessionClient.tsx:715`). Gaten ser den ikke, fordi `text-micro` står på `span` og ikke på `button`.
   - **Statisk:** Der er stadig 142 `<div … text-micro>` i `src`, og ingen gate-regel dækker `<div>`. `SENTENCE_AS_MICRO` er fortsat `<p\b` (gate-testen linje 51), så nye sætnings-`div`'er kan glide ind uden at blive fanget.

   Spec §4 og DESIGN.md:238 forbeholder 12 px til tabelhoveder, tidsstempler, chips, initialer og akser. En 12-ords sundhedsbegrundelse på en nøgleskærm er ingen af delene. Omfanget er nu lille (4 kilder, 2 ruter). Men rollereglen er stadig brudt live, og det er det samme fund, ikke et nyt. Derfor kan søjlen ikke få 4 ved en streng score.

   **Rettelse:**
   - `nutrition/page.tsx:512` og `:527`, `dashboard/page.tsx:446` og `SessionClient.tsx:715` skal bruge `text-meta`.
   - Udvid gaten med en regel for `<div[^>]*text-micro` med en tekst-child, eller kræv en `data-role="chip|stamp|axis"`-markør på `div`/`span` i micro.

### Dom
Typografien er en meget stærk 3. Skala, overskrifter, vægte, felter, linjehøjde og gatens dækning af handlinger er i orden og kunne være en 4. Den sidste rest af det systemiske 12 px-rollebrud er stadig synlig live på Mad (hele sætninger) og I dag/session. Det skyldes igen, at rettelsen fulgte gaten (nu `button`/`a`/`Link`) og ikke rollen (`div`/`span` med sætninger). Med de fire linjer ovenfor og en `div`-regel i gaten bliver søjlen en 4.

---

## Øvrige søjler (kort, uændret ift. måling 4)

### Søjle 1: Copywriting (3/4)
Disse tekster står der stadig:
- "Skip-dage" i `Nutrition.json:286` og `Coach.json:176`
- "100K volumen-club" i `Community.json:12`
- "drukner under baren" i `exercise-mocks.ts:71`
- "0-999" i `Reps.json:20` (bindestreg, ikke en-dash)

### Søjle 2: Visuals (2/4)
- **BLOCKER for søjlen:** Der er ingen `NarrativeBand` i `src` og ingen 14-nætters HRV-graf.
- Reps-heroen står adskilt fra titlen.

### Søjle 3: Color (3/4)
`SessionClient.tsx:668` `border-l-body` er stadig den orange cue-streg i nat-sessionen.

### Søjle 5: Spacing (3/4)
Uændret:
- `MindDisclaimer` står centreret på desktop.
- Mad har en kortstak før planen.
- "Limited C…" klippes ved 375.

### Søjle 6: Experience Design (3/4)
- **Lukket:** iOS-zoom er stadig lukket, og vægtfeltet beholder nu 22 px på telefon.
- **Åbent:**
  - `src/app/coach/inbox/` har kun `page.tsx`.
  - `confirm()` bruges i `ProgramBuilder.tsx`, `SessionEditor.tsx`, `SendDigestButton.tsx`, `PromoteToLiveButton.tsx` og `reps/RedeemButton.tsx`. `ConfirmSheet` findes, men bruges ikke der.
  - Der er ingen "Del med coach" på HRV.

---

## Top-prioriterede rettelser
1. **12 px-sætninger i `div`/`span`.** Det er det eneste, der står mellem typografien og 4. Ret `nutrition/page.tsx:512,527`, `dashboard/page.tsx:446` og `SessionClient.tsx:715` til `text-meta`, og udvid `SENTENCE_AS_MICRO` til `<div`.
2. **Bølge 2-visuals:** `NarrativeBand`, HRV-graf og Reps-heroen ved titlen.
3. **Session-cuen skal være monokrom** (`SessionClient.tsx:668`), og copy-restlisten skal rettes.
4. **Coach:** `inbox/loading.tsx`, `ConfirmSheet` i stedet for `confirm()` (5 filer) og "Del med coach".

## Registry safety
Ikke relevant (ingen UI-SPEC med tredjeparts-registries).

## Auditerede filer
- `src/app/globals.css` (diff i 38d0c9b) og `src/lib/design/nord-type-scale-gate.test.ts`
- `src/components/dashboard/ConnectDotsStream.tsx`, `src/components/community/PostCard.tsx` og `src/components/hrv/HrvSettingsSection.tsx`
- `src/app/(app)/{settings/SettingsClient.tsx,session/[id]/SessionClient.tsx,nutrition/page.tsx,dashboard/page.tsx}`
- `messages/da/{Nutrition,Coach,Community,Reps,Session,Dashboard}.json`, `src/lib/nutrition/brand.ts` og `src/lib/data/exercise-mocks.ts`
- Live-måling på :3003, 9 ruter × 375/1440 px
