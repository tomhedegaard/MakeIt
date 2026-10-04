# Nord-nøgleskærme: UI-review 10 (6 søjler, efter 405ff1d + 0d439f3)

**Auditeret:** 2026-10-04, branch `claude/nord-wave4-hrv-consent` (HEAD 0d439f3)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `DESIGN.md` og `docs/DOMAIN_COLOR_SYSTEM.md`. Ejerbeslutningerne er uændrede: nummereret nav, briefens kickers uden dubletter, en-dash i intervaller, "+ Nyt opslag", HRV-deling fra som standard med spørgsmål til alle, og mørk coach-konsol og live-pas (DESIGN.md:170).
**Forrige review:** `UI-REVIEW-9.md` (20/24)

**Metode:**
- **Live på :3003** med MUNK-01, system-Chrome via playwright-core og `isMobile`/`hasTouch` ved 375. Jeg kørte 18 ruter × 375/1440: de 8 nøgleskærme (I dag, session, HRV, Mad, Mind, Crew, Reps, coach-indbakke) plus `/settings`, `/profile`, `/buddy`, `/coaching`, `/science`, `/coach`, `/coach/system`, `/hrv/trends`, `/nutrition/shopping` og rod-404. Jeg målte:
  - vandret overflow (`documentElement` og `main`)
  - ellipsis
  - micro-sætninger
  - størrelser og vægte
  - radius over 0
  - `\d-\d`
  - `img` i main
  - **ny måling:** tekst-elementer under 45 px brede og over 60 px høje (bogstav-stabling)
- **Tastatur:**
  - "Del med coach" og "Nej tak" på `/hrv` med Enter, derefter Space på kontakten
  - cyklus-kontakten på `/settings`
  - "Send ugentlig digest" på `/coach`: åbn, bekræft, fokus efter 100 ms og 1,6 s
  - aria-snapshot af kontakterne på `/settings`
- **Skærmbilleder (5, scratchpad):** `w10-profile-m.png`, `w10-hrv-switch-m.png`, `w10-settings-switch-m.png`, `w10-dash-crew-m.png` og `w10-coach-system-m.png`.

---

## Søjlescorer

| Søjle | UI-REVIEW-9 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | "Lys (Nord)" og danske decimaler er rettet. Stadig: `share.body` er 39 ord, der er ingen `\d-\d`-gate, og `/profile` har en engelsk formel ("weight", "top reps") |
| 2. Visuals | 3 | 3 | `/profile` er rettet, og 4 komponenter bruger nu én `Switch`. Men **`/settings` → Notifikationer har stadig 4 kontakter i det gamle design med rund knop**. Grafpunktet er 2,2 px mod legendens 4 px. Ingen Reps-fotos |
| 3. Color | 4 | 4 | Kun tokens. Coach er monokrom nat som besluttet. Radius-resterne er uændrede (4 px checkbox og 4 px chip) |
| 4. Typography | 4 | 4 | 0 micro-sætninger. Størrelser 11/12/13/15/16/17/22/24/34/64/88, kun vægt 400/500 |
| 5. Spacing | 3 | 3 | 0 px overflow på alle 36 målinger, `/profile` står i to linjer, og Crew-rækkerne har ingen ellipsis. **Nyt fund: `/coach/system` ved 375 presser påmindelserne til en 4 px kolonne med tekst oven i hinanden.** I dag-kickeren står stadig på 2 linjer |
| 6. Experience Design | 3 | 3 | Fokus efter svar og efter digest er rettet og målt. **Nyt fund: de 4 notifikations-checkboxe på `/settings` har intet tilgængeligt navn og ingen synlig fokus.** 95 `disabled={…pending}` er under arbejde |

**Samlet: 20/24** (uændret)

Alle seks punkter fra måling 9, som commits 405ff1d og 0d439f3 sigtede på, holder live. Scoren står alligevel stille, fordi den nye smal-kolonne-måling og aria-snapshottet af `/settings` fandt to fejl, som tidligere målinger ikke fangede:
- **Spacing:** `/coach/system`, se Spacing 1.
- **Visuals og Experience:** `SettingsClient` `Toggle`, se Visuals 1 og Experience 1.

Begge kan rettes i kode. Søjlerne er ikke rundet op.

**Hvad fotoet alene blokerer:**
- **Reps-produktfotos** (brief §6.7): live er der 0 `img` i main på `/reps` ved begge bredder. Det er det eneste ejer-afhængige punkt.
- **Loft:** Når kodefundene nedenfor er rettet, er loftet **23/24**. Kun Visuals 4 mangler så, og det venter alene på fotoet.

---

## Søjle 1: Copywriting (3/4)

### Lukket
- **Tema-værdien** siger "Lys (Nord)" og ikke længere "Mørk (kun)" (`messages/da/Profile.json`).
- **PR-tal med dansk decimalkomma:** "207,5 × 1" og "67,5 × 1" (`formatNumber`, `profile/page.tsx`).
- **Offline-siden:** "Ingen forbindelse." og ingen tankestreg i brødteksten (`public/offline.html`).
- **Digest-resultatet** er klar dansk tekst: "Demo, eller Resend er ikke konfigureret. Intet sendt."

### WARNING
1. **`share.body` er uændret** (`messages/da/Hrv.json`). Det er 39 ord i to sætninger, med fire datatyper og en bisætning om alarmer.
   - **Rettelse:** "Munk og MakeIts coaches ser din HRV." Sæt datatyperne på en `text-meta`-linje med `·`.
2. **Ingen `\d-\d`-gate.** `app-copy-gate.test.ts` er uændret. Der er 0 træf i medlemsappen live. Det eneste træf er `claude-sonnet-4-6` på `/coach/system`, som er et modelnavn og intet fund. Intet forhindrer regression.

### Lille
- **`/profile`-fodnoten** "e1RM beregnet med Epley · weight × (1 + reps / 30) · top reps ≤ 10" (`Profile.json` `formula`) blander engelsk ind i en dansk linje. Brug "vægt × (1 + reps / 30) · højst 10 reps".
- "readiness" står stadig på `/buddy` (ejerens produktord).

## Søjle 2: Visuals (3/4)

### Lukket, målt live
- **`/profile` PR-rækker:** De er bygget som et grid i to linjer, med navn og e1RM på linje 1 og dato · vægt × reps på linje 2. Hver række er 65 px høj ved både 375 og 1440, og der er ingen bogstav-stabling (`w10-profile-m.png`). Stjernen er fjernet.
- **Én `Switch`** (`src/components/ui/Switch.tsx`) bruges nu i `HrvShareConsent`, `HrvSettingsSection` (cyklus og nudge), `LifestyleLogCard` og `MentalToggleRow`.
  - Mål: 48×44 hit-område, kvadratisk knop (radius 0, 22 px) og 2 px fokusring.
  - Slået til: blæk-spor med papir-knop (`w10-hrv-switch-m.png`, `w10-settings-switch-m.png`).
- **Legende-prikken** er nu `size-1` (4 px).

### WARNING
1. **`/settings` har stadig to kontakt-designs.** "Notifikationer" (`SettingsClient.tsx:354–394`, `Toggle`) viser 4 kontakter med:
   - `bg-3`-spor, når de er slået fra
   - **rund** knop (`rounded-full`, målt `border-radius` 33554432 px)
   - knop på 24 px mod Switch' 22 px
   
   De står på samme side som de nye kontakter under "Wearables og recovery". Det er præcis det, "én fælles kontakt" skulle fjerne, og den runde knop bryder radius 0.
   - **Rettelse:** Erstat `Toggle`s `<label><input sr-only>…` med `<Switch checked onCheckedChange labelledBy={id} />` (samme mønster som `LifestyleLogCard`).
2. **Nattepunktet er stadig mindre end legenden ved 375:** punktet måler 2,19 px og legenden 4 px. Ved 1440 er punktet 4,98 px mod 4 px. Det er tættere end i måling 9 (2,2 mod 6), men punktet skalerer stadig med viewBox, og legenden gør ikke.
   - **Rettelse:** Sæt radius i skærm-px (`r = 2 * 640 / clientWidth`), eller brug `vector-effect`/en fast CSS-størrelse på punktet.

### Lille, uændret
- Rod-404'en har intet `MakeIt // HQ`-mærke. Den bruger kun 15 og 34 px.
- Morgensignalerne har intet tal ("Mind-check 3/5" i briefen).

### Ejer
- Reps har 0 `img` i main (brief §6.7).

## Søjle 3: Color (4/4)
- **Medlemsfladerne er lyse** (`body` #FFFFFF). `/coach*` er #111 nat, som DESIGN.md:170 og 210 kræver. Coach-konsollen er monokrom.
- **Offline-siden** er Nord lys: #FFFFFF og #111, mos-kicker #2E4A3B, radius 0 og en `focus-visible`-ring. Hex-værdier er inlinet, fordi service workeren serverer siden uden app-CSS. Det er begrundet i en kommentar og intet fund.
- **Radius-rester, uændrede og uden fradrag her:**
  - `ShoppingChecklist`-checkbox (4 px)
  - `/coach/system`-chip (4 px)
  - 127 døde `rounded-xl`/`rounded-2xl` i `(app)`, `coach` og `components/hrv`
  
  Den runde notifikations-knop er talt under Visuals 1.

## Søjle 4: Typography (4/4)
- **0 micro-sætninger** på 36 målinger.
- **Størrelser:** 11/12/13/15/16/17/22/24/34/64/88, de samme som i måling 9.
- **Vægte:** kun 400/500 synlige.
- **Lukket:** digest-resultatet er løftet fra `text-micro` til `text-meta` (13 px).
- **Lille:** `/coach/system` blander stadig engelske runbook-sætninger i `text-meta`. Det er en intern flade og giver intet fradrag.

## Søjle 5: Spacing (3/4)

### Lukket, målt live
- **0 px vandret overflow** i både `documentElement` og `main` på alle 18 ruter ved 375 og 1440.
  - `/buddy`: `flex-wrap` om readiness og "Hvorfor denne buddy?"
  - `/coaching`: `-mx-5 px-5`
- **I dag "Crew lige nu":** 0 ellipsis. "@nina_dl +2,5 kg PR · dødløft 175 kg" og "@kasper_s afsluttet uge 8 af PR-Block" bryder til 2 linjer (45 px) ved 375. Øvelsesnavnene i dagens pas er heller ikke længere `truncate`.
- **Ellipsis:** 0 klippede elementer på alle målinger.

### WARNING
1. **NYT: `/coach/system` → Påmindelser ved 375** (`coach/system/page.tsx:107–150`, `w10-coach-system-m.png`).
   - Venstre kolonne er `min-w-0 flex-1` (basis 0), så `flex-wrap` udløses aldrig. Højre kolonne er `shrink-0` og indeholder hele sætningen "Roteres årligt, og når et teammedlem stopper".
   - Resultat: titlen "Stripe webhook signing secret (prod)" er 4 px bred og 106 px høj, og runbooken er 351 px høj. Højresætningen ligger oven i "INFO"-chippen.
   - **Rettelse:** Giv venstre kolonne `basis-full sm:basis-0`, eller fjern `shrink-0` og giv højre kolonne `max-w-[40%]`/`sm:text-right`, så den falder ned under titlen på mobil.
2. **I dag-kickeren** "Træn · coach Mikael Munk · HQ Adaptive Engine" fylder stadig 2 linjer ved 375 (35 px ved 17,55 lh) og 1 linje ved 1440. Den er uændret siden måling 6.

### Note
- Spørgekortet på `/hrv` står efter "Seneste morgener" og følger briefen, så der er intet fradrag.

## Søjle 6: Experience Design (3/4)

### Lukket, verificeret live ved 375 og 1440
- **Svar på spørgsmålet giver fokus til kontakten.** Både "Del med coach" og "Nej tak" fører til `BUTTON[switch] "Del med coach"` med `:focus-visible` og 2 px ring efter 80 ms og efter 1,3 s. `aria-checked` er korrekt (true/false).
- **Space på kontakten:** fokus bliver på kontakten, `aria-disabled="true"` under gem og `null` bagefter, og slutstatus er korrekt.
- **Cyklus-kontakten** beholder fokus med `:focus-visible` gennem gem.
- **Digest:**
  - Enter åbner sheet med fokus på "Annullér".
  - Bekræft giver fokus tilbage til "Send ugentlig digest" med `:focus-visible` efter 100 ms og 1,6 s (`aria-disabled`, ikke `disabled`).
  - Resultatet står i `role="status" aria-live="polite"`.

### WARNING
1. **NYT: Notifikations-kontakterne på `/settings` er utilgængelige** (`SettingsClient.tsx:354–394`):
   - **Intet navn:** aria-snapshot giver `checkbox [checked]` ×4. `<label>` indeholder kun input og et `aria-hidden`-spor, og teksten står i en søskende-`div`. En skærmlæser hører "afkrydsningsfelt, markeret" uden at vide hvilket (WCAG 4.1.2).
   - **Ingen synlig fokus:** sporet har `outline: none` og ingen `peer-focus-visible`-klasser (2.4.7).
   - **Rettelse:** Samme som Visuals 1. `Switch` med `labelledBy` løser navn, fokus og form på én gang.
2. **`disabled={…pending}`:** 95 forekomster tilbage i `src`. En separat session konverterer dem, så de vurderes som igangværende og giver intet ekstra fradrag. Rettelsen er lagt i `SendDigestButton` og i `Switch`.
3. **Lille, uændret:** Kontaktens hint er ikke koblet med `aria-describedby` (målt `null` på alle 6 kontakter).

---

## Prioriterede rettelser

**(a) Kan rettes i kode nu:**
1. **`SettingsClient` `Toggle` til `Switch`** (Visuals 1 og Experience 1). Det fjerner det andet kontakt-design, den runde knop, de navnløse checkboxe og den manglende fokus. Det er cirka 30 linjer slettet.
2. **`/coach/system`-påmindelser ved 375** (Spacing 1): `basis-full sm:basis-0` på venstre kolonne.
3. **Nattepunktet i skærm-px**, så det matcher legendens 4 px (Visuals 2).
4. **Mindre:**
   - I dag-kickeren på 1 linje
   - kortere `share.body`
   - `\d-\d`-gate
   - dansk Epley-fodnote
   - `aria-describedby` på `Switch`
   - radius-rester og døde `rounded-*`
   - brand-mærke på 404
   - morgensignaler med tal
5. **Igangværende:** de 95 `disabled={pending}`.

**(b) Ejer-afhængigt:**
- Produktfotos på `#F2F2F0` til Reps-shoppen (brief §6.7). Når (a) 1 og 3 er rettet, er det det eneste, der står mellem Visuals 3 og 4.

## Registry safety
Ikke relevant: der er ingen UI-SPEC med tredjeparts-registries.

## Auditerede filer
- `src/components/ui/Switch.tsx` og `src/components/hrv/{HrvShareConsent,HrvSettingsSection,LifestyleLogCard,TrendChart}.tsx`
- `src/components/mind/MentalToggleRow.tsx` og `src/components/coach/SendDigestButton.tsx`
- `src/app/(app)/{profile,buddy,coaching,dashboard}/page.tsx` og `src/app/(app)/settings/SettingsClient.tsx`
- `src/app/coach/system/page.tsx`
- `messages/da/{Profile,Hrv}.json` og `public/offline.html`
- `DESIGN.md` (nat-regel, typeskala)
- Live på :3003: 18 ruter × 375/1440 plus tastaturforløb. Scratchpad: `w10-profile-m.png`, `w10-hrv-switch-m.png`, `w10-settings-switch-m.png`, `w10-dash-crew-m.png` og `w10-coach-system-m.png`.
