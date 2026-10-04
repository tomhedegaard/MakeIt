# Nord-nøgleskærme: UI-review 9 (6 søjler, efter bølge 1–4 + rettelser fra måling 8)

**Auditeret:** 2026-10-04, branch `claude/nord-wave4-hrv-consent` (HEAD 5819a8e: aa718a0 + 5819a8e oven på d2e7081)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `DESIGN.md` og `docs/DOMAIN_COLOR_SYSTEM.md`. Ejerbeslutningerne er uændrede: nummereret nav, briefens kickers uden dubletter, en-dash i intervaller, "+ Nyt opslag", og HRV-deling er fra som standard med spørgsmål til alle.
**Forrige review:** `UI-REVIEW-8.md` (20/24)

**Metode:**
- **Live på :3003** med MUNK-01, system-Chrome via playwright-core og `isMobile`/`hasTouch` ved 375. Jeg kørte 25 ruter × 375/1440 (de 8 nøgleskærme plus `/settings`, `/science`, `/profile`, `/coach/inbox`, `/coach/system`, rod-404 m.fl.) og målte:
  - micro-sætninger
  - størrelser og vægte
  - h1–h3
  - ellipsis
  - vandret overflow (nu også i `main`, ikke kun `documentElement`)
  - radius over 0
  - ciffer-bindestreg-ciffer
  - anglicismer
  - `img` i main
- **Tastatur:**
  - "Del med coach" på `/hrv` og `/settings`: svar med Enter, Space på kontakten, dobbelt Space under gem, genindlæsning og "Nej tak"
  - cyklus-kontakten
  - ConfirmSheet "Send ugentlig digest" på `/coach`: åbn, Tab-fælde, Escape og bekræft
  - `MentalToggleRow` kunne ikke måles live, fordi `/mind/settings` i demo sender videre til `/mind/onboarding`. Den er vurderet i kilden.
- **Gates:** `nord-type-scale-gate`, `app-copy-gate` og `TrendChart.test` giver 935/935 grønne.
- **Skærmbilleder (5, scratchpad):** `w9-settings-q-m.png`, `w9-hrv-switch-m.png`, `w9-hrv-chart-m.png`, `w9-profile-prs-m.png` og `w9-buddy-m.png`.

---

## Søjlescorer

| Søjle | UI-REVIEW-8 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | "Nej tak" er rettet. Stadig: `share.body` er 39 ord på 6 linjer, og der er ingen `\d-\d`-gate |
| 2. Visuals | 3 | 3 | Settings-kortet er rettet (inline, ingen ramme, knapper på én linje). Grafen er nu 250×172. Men nattepunktet er 2,2 px mod legendens 6 px, der er stadig to kontakt-designs i samme sektion, og **`/profile` er en ny regression** (navne brydes bogstav for bogstav) |
| 3. Color | 4 | 4 | Den nye gate kræver kun tokens: 0 rå paletfarver i medlemsapp og coach. Små radius-rester: checkbox i indkøbslisten og chip på `/coach/system` (4 px) |
| 4. Typography | 4 | 4 | `/science`-titler er nu h3 17 px, og spørgsmålet i settings er h3 17 px under h2 22 px. Kun 400/500 er synlige (700 kun i sr-only `th`) |
| 5. Spacing | 3 | 3 | Settings-rytmen er lukket. Nye målinger: `/buddy` 14 px vandret overflow ved 375 (knappen klippes), `/coaching` 4 px og "Crew lige nu" på I dag klipper 2 rækker. I dag-kickeren står stadig på 2 linjer |
| 6. Experience Design | 3 | 3 | Kontakten beholder fokus under gem (målt), dobbelt-Space ignoreres, og demoen husker svaret. Stadig fokus til `BODY`, når spørgsmålet besvares, og nyt: ConfirmSheet-bekræft giver fokus til `BODY` |

**Samlet: 20/24** (uændret)

Måling 8's kodeliste er rettet på 6 af 9 punkter, og rettelserne holder live. Scoren står stille af to grunde:
- To fund er kun delvist rettet: fokus efter svar og grafpunktet.
- Rettelsen af `/profile` har skabt en værre fejl end den, den fjernede.

Søjlerne er ikke rundet op.

**Hvad fotoet alene blokerer:**
- **Reps-produktfotos** (brief §6.7): live er der 0 `img` i main på `/reps` ved begge bredder. Det er det eneste ejer-afhængige punkt.
- **Loft:** Når kodefundene nedenfor er rettet, er loftet **23/24**. Kun Visuals 4 mangler så, og det venter alene på fotoet.

---

## Søjle 1: Copywriting (3/4)

### Lukket
- **"Ikke nu" er nu "Nej tak"** (`messages/da/Hrv.json` `share.notNow`). Knappen siger nu, hvad den gør: et endeligt nej, der kan ændres med kontakten.

### WARNING
1. **`share.body` er uændret tung.** Det er 39 ord og 6 linjer ved 375 (`w9-settings-q-m.png`), med fire datatyper og en bisætning om alarmer i én sætning plus en anden sætning om Coach School.
   - **Rettelse:** Første sætning skal sige, hvem der ser ("Munk og MakeIts coaches ser din HRV"). Sæt datatyperne på en `text-meta`-linje med `·`.
2. **Ingen `\d-\d`-gate.** `app-copy-gate.test.ts` er ikke ændret. Der er 0 træf live, men intet forhindrer regression. Undtag "a-z, 0-9" i `Settings.json`.

### Lille
- `/buddy`: "@mads_lift's readiness i dag". "readiness" er et gennemgående produktord (Hrv.json ×4, Buddy.json), så der er intet fradrag, men ejeren bør beslutte, om det skal stå på dansk.
- "feedback" på session er accepteret dansk, så det er ikke et fund.
- `/coach/system` har engelske driftsinstrukser (intern flade) og giver intet fradrag.

## Søjle 2: Visuals (3/4)

### Lukket
- **Settings uden kort-i-kort** (`HrvShareConsent inline`). Live: baggrund transparent, ramme 0, padding 0. "Del med coach" (147×48) og "Nej tak" (91×48) står på samme linje (top 508 for begge) ved 375.
- **Plottet er højere:** viewBox `640×440` giver 250×172 ved 375 (var 141). Målet var ca. 180, så det er praktisk talt nået.

### WARNING
1. **NY REGRESSION: `/profile` PR-listen brydes bogstav for bogstav ved 375** (`profile/page.tsx:127`, `flex-1 min-w-0 break-words`).
   - Rækken har fem kolonner: dato `w-20`, navn, vægt×reps, e1RM og en stjerne. Navnekolonnen får 21–33 px bredde, så "Conventional Deadlift" bliver 315 px høj ("C/o/n/v/e…", `w9-profile-prs-m.png`).
   - Det er værre end den ellipsis, det erstattede.
   - **Rettelse:** Byg rækken i to linjer under `sm`, så navnet står på linje 1 og dato · vægt × reps · e1RM på linje 2 i `text-meta`. Alternativt kan datoen forkortes til `w-12` og stjernen skjules under `sm`. Brug ikke `break-words` på smalle flex-kolonner.
2. **Nattepunkterne er stadig mindre end deres legende.** `r=2.8` giver 2,19 px ved 375 (målt `getBoundingClientRect`), mens legendens "Nat" er 6 px. Det er bedre end 1,7 px, men stadig næsten 3× fra legenden (`w9-hrv-chart-m.png`). Kodekommentaren siger "~2.5 px".
   - **Rettelse:** Sæt radius i skærm-px (`r = 3 * 640 / clientWidth`), eller gør legendens prik `size-1`, så de matcher.
3. **To kontakt-designs i samme sektion** (uændret). På `/settings` → "Wearables og recovery" står "Del med coach" (hvidt spor, hvid knop med ramme, `HrvShareConsent.tsx:76–92`) lige over cyklus- og nudge-kontakterne (spor `bg-3`, fyldt `fg-dim`-knop, `HrvSettingsSection.tsx:168–200`). `MentalToggleRow` er en tredje variant. Brug én `Switch`-komponent.
4. **`/buddy` ved 375:** "Hvorfor denne buddy?" klippes i højre kant (`w9-buddy-m.png`, se Spacing 1).

### Lille, uændret
- Rod-404'en har intet `MakeIt // HQ`-mærke. Live-tekst: "Siden findes ikke. / Linket er forkert…".
- Morgensignalerne "Krop. Tilpasset." og "Sind. Tjekket ind." har intet tal (briefen har "Mind-check 3/5").

### Ejer
- Reps har 0 `img` i main (brief §6.7).

## Søjle 3: Color (4/4)
- **Ny gate `RAW_PALETTE`** (`nord-type-scale-gate.test.ts:93`) er grøn med selvtest. Grep på `src/app` og `src/components` (uden marketing og landing) giver 0 `bg|text|border-<palette>-NNN`. Coach School (`LiveDecisionCard`, `SandboxCaseCard`, `LessonForm`) og `/coach/system` er ryddet.
- Samtykket er fortsat monokromt. Fejl bruger `text-danger` med `role="alert"`.
- **Radius-rester (målt live 4 px, intet fradrag):**
  - `ShoppingChecklist.tsx:142` checkbox-`span.rounded` er en medlemsflade og ikke set i måling 8.
  - `/coach/system` chip (`rounded`) og `Backlog.tsx:212` (`rounded`).
  - Klasserne `rounded-xl` og `rounded-2xl` bliver ved med at stå som død kode, fx `HrvSettingsSection.tsx:100` og `ShoppingChecklist.tsx:89,121,178`. De måler 0 px, men vildleder.

## Søjle 4: Typography (4/4)
- **0 micro-sætninger** (under 12,5 px og mere end 4 ord) på 50 målinger.
- **Størrelser:** 11/12/13/15/16/17/22/24/34/64/88, de samme som i måling 8.
- **Vægte:** 400/500 synlige. 700 forekommer kun i `TH` i grafens `sr-only`-tabel på `/hrv` og `/hrv/trends`.
- **Lukket:**
  - `/science`: h1 34 → h3 17 ×2 (`ScienceFeed.tsx:117`).
  - `/settings`: H2 22 "Wearables og recovery" → H3 17 "Del din HRV med coach Munk?". Hierarkiet er rigtigt.
- **Lille, uændret:** `SENTENCE_AS_MICRO` dækker kun `<p>`. `SendDigestButton.tsx:45` viser resultatet som `span text-micro text-fg-faint`. Det er kort, men det er det eneste svar på en masseudsendelse (se Experience 2).

## Søjle 5: Spacing (3/4)

### Lukket
- `/settings`: samtykket står i sektionens rytme uden indryk eller stablede knapper.

### WARNING
1. **NY: `/buddy` ved 375 har 14 px vandret overflow i `main`** (`scrollWidth` 389 mod 375). `a.btn.btn-sm` "Hvorfor denne buddy?" (`buddy/page.tsx:113–118`) står i `flex justify-between` ved siden af readiness-blokken og klippes. Løsning: `flex-wrap`, eller læg linket under blokken ved `<sm`.
2. **NY: `/coaching` ved 375 har 4 px overflow i `main`.** Uge-scrolleren `-mx-6 px-6 overflow-x-auto` rækker 4 px forbi kanten, så hele siden kan skubbes sidelæns. Løsning: `-mx-5 px-5` til containerens faktiske padding, eller `overflow-x-clip` på wrapperen.
3. **NY i måling: "Crew lige nu" på I dag klipper 2 af rækkerne** ved 375 (`dashboard/page.tsx:591`, `text-copy truncate`): "@nina_dl +2,5 kg PR · dødløft 175 kg" og "@kasper_s afsluttet uge 8 af PR-Block". Det er samme mønster, som blev rettet i uge-stripen og Mad. Løsning: tillad 2 linjer (`line-clamp-2`), eller sæt `who` på egen linje.
4. **I dag-kickeren** "Træn · coach Mikael Munk · HQ Adaptive Engine" fylder stadig 2 linjer (35 px ved 17,5 lh). Den er uændret siden måling 6.
5. **`/profile`** (se Visuals 1). Ellipsis-fundet fra måling 8 er "lukket", men layoutet er brudt.

### Note
- `/hrv`: Spørgekortet står stadig ved top 1763 px (375) og 1168 px (1440), efter "Seneste morgener". Det følger briefen, så der er intet fradrag.

## Søjle 6: Experience Design (3/4)

### Lukket, verificeret live ved 375 og 1440
- **Kontakten beholder fokus under gem.** Efter Space er `activeElement` `BUTTON[switch]` efter 40 ms med `aria-disabled="true"` og `:focus-visible`, og efter 1,2 s er den stadig på kontakten. Et ekstra Space under gem ignoreres (guarden `if (pending) return` virker), og slutstatus er korrekt. Det samme gælder på `/settings`.
- **Demo husker svaret:** `mi_demo_hrv_share` sættes. Efter genindlæsning er spørgsmålet væk (0), og kontakten står med den rigtige `aria-checked`.
- **Cyklus-kontakten** (sr-only checkbox) beholder fokus med `:focus-visible`.
- **`MentalToggleRow`** (kilde): `disabled` kun for reel deaktivering, `aria-disabled` under pending og guard i `toggle()`. Live kunne den ikke måles (demo-redirect).
- **ConfirmSheet:**
  - Enter åbner med fokus på "Annullér" inde i dialogen.
  - Tab bliver i dialogen 4/4.
  - Escape giver fokus tilbage til "Send ugentlig digest" med `:focus-visible`.

### WARNING
1. **Fokus går stadig til `BODY`, når spørgsmålet besvares.** Det gælder både "Del med coach" og "Nej tak", ved 375 og 1440, efter 80 ms og efter 1,3 s. Spørgekortet afmonteres, og intet modtager fokus. Måling 8's anden halvdel (`ref` + `useEffect` på `answered`) er ikke lavet. En skærmlæserbruger hører hverken svaret eller den nye kontakt.
   - **Rettelse:** `switchRef.current?.focus()`, når `answered` skifter fra false til true i samme session.
2. **NY: ConfirmSheet-bekræft giver fokus til `BODY`** (`/coach`, "Send ugentlig digest", målt ved 100 ms og 1,6 s ved begge bredder). Sheet giver fokus tilbage til udløseren, men `SendDigestButton.tsx:40` har `disabled={pending}`, så den fokuserede knap bliver deaktiveret og taber fokus. Resultatet (`span text-micro`, linje 45) har ingen `role="status"`/`aria-live`, så udfaldet af en masseudsendelse er tavst for skærmlæsere.
   - Mønstret findes stadig i **96** `disabled={…pending}` i `src`. Rettelsen fra måling 8 blev lagt i to komponenter, ikke i mønstret.
   - **Rettelse:** `aria-disabled` + guard i `SendDigestButton` og `role="status"` på resultatet. Overvej en lint-regel eller en lille `PendingButton`, der gør det samme overalt.
3. **Lille, uændret:** Kontaktens hint er ikke koblet med `aria-describedby` (målt `null`), og den synlige label og `aria-label` er dubletter (`aria-labelledby` er `null`).

### Note
- Migration 0068 og RLS er ikke målbare i demo og er ikke vurderet.

---

## Prioriterede rettelser

**(a) Kan rettes i kode nu:**
1. **`/profile` PR-rækker** (regression, Visuals og Spacing): to-linjers række under `sm` og ingen `break-words` på smal flex-kolonne.
2. **Fokus** (Experience):
   - fokus til kontakten efter svar i `HrvShareConsent`
   - `aria-disabled` + guard og `role="status"` i `SendDigestButton`
   - gerne en fælles løsning for de 96 `disabled={pending}`
3. **Overflow ved 375:** `/buddy` (`flex-wrap` om "Hvorfor denne buddy?") og `/coaching` (`-mx` lig med containerens padding).
4. **Én `Switch`-komponent** til share, cyklus, nudge og Mind.
5. **HRV-punkt i skærm-px**, eller en legende-prik der passer.
6. **Mindre:**
   - "Crew lige nu" uden ellipsis
   - I dag-kickeren på 1 linje
   - kortere `share.body`
   - `\d-\d`-gate
   - `aria-describedby` på kontakten
   - radius-rester og døde `rounded-*`-klasser
   - brand-mærke på 404
   - morgensignaler med tal

**(b) Ejer-afhængigt:**
- Produktfotos på `#F2F2F0` til Reps-shoppen (brief §6.7). Når (a) 1, 4 og 5 er rettet, er det det eneste, der står mellem Visuals 3 og 4.

## Registry safety
Ikke relevant: der er ingen UI-SPEC med tredjeparts-registries.

## Auditerede filer
- `src/components/hrv/{HrvShareConsent,HrvSettingsSection,TrendChart}.tsx` og `TrendChart.test.ts`
- `src/app/(app)/hrv/connect-actions.ts` og `src/lib/data/settings.ts`
- `messages/da/{Hrv,Buddy,Dashboard}.json`
- `src/components/mind/MentalToggleRow.tsx`
- `src/app/(app)/profile/page.tsx`, `src/app/(app)/science/ScienceFeed.tsx`, `src/app/(app)/buddy/page.tsx`, `src/app/(app)/dashboard/page.tsx:585–595` og `src/app/(app)/nutrition/shopping/ShoppingChecklist.tsx`
- `src/components/coach/SendDigestButton.tsx`, `src/app/coach/actions.ts` og `src/app/coach/system/{page,Backlog}.tsx`
- `src/lib/design/nord-type-scale-gate.test.ts` og `src/lib/i18n/app-copy-gate.test.ts`
- Live på :3003: 25 ruter × 375/1440 plus tastaturforløb. Scratchpad: `w9-settings-q-m.png`, `w9-hrv-switch-m.png`, `w9-hrv-chart-m.png`, `w9-profile-prs-m.png` og `w9-buddy-m.png`.
