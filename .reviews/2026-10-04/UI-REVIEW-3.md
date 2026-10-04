# Nord-nøgleskærme: UI-review 3 (6 søjler, efter bølge 1: typografi)

**Auditeret:** 2026-10-04, branch `claude/nord-wave1-typography` (HEAD 6bd7dbd, typografi i 10d1a4a)
**Grundlag:** `docs/superpowers/specs/2026-09-26-nord-redesign-design.md`, `docs/DOMAIN_COLOR_SYSTEM.md`, `DESIGN.md` (afledt af den shippede kode)
**Forrige review:** `UI-REVIEW-2.md` (16/24)
**Skærmbilleder:** `wave1/*.png` (375 og 1440 px) sammenholdt med `after/*.png`. Derudover målt live på dev-demo (:3003, MUNK-01, system-Chrome via Playwright): beregnet `font-size` på alle tekstbærende elementer i `<main>` på I dag, Mad, Crew, HRV, Mind, Reps og Indstillinger, og en kaskadeprøve på formularfelter ved 375 og 1440 px.
**Ejerbeslutninger respekteret:** nummereret navigation bevares, briefens kickers bevares (kun dubletter fjernes), og en-dash bruges kun i talintervaller.
**Rettet før bølgen og verificeret:** `cn()` kender skalaen (coach-chips renderer nu 12 px på 08-coach-inbox-d), @Munk er "Athlete" i Crew (`community/page.tsx:18,47`), og Mind-copy er rettet ("din private journal", "MakeIts", "rykker et niveau op", "databehandler, ikke en coach").

---

## Søjlescorer

| Søjle | UI-REVIEW-2 | Nu | Hovedfund |
|---|---|---|---|
| 1. Copywriting | 3 | 3 | Mind og Crew er rettet. Tilbage står "Skip-dage", "volumen-club", "drukner under baren", "0-999" med bindestreg, "+ Del" mod "Del" og "0 / 16 sæt" |
| 2. Visuals | 2 | 2 | Fortællebånd, HRV-graf og Reps-hero er uændrede (bølge 2). Ny regression: mellemrubrikker vokser til sidetitelstørrelse på desktop |
| 3. Color | 3 | 3 | Uændret. Den orange cue-streg i den monokrome session står der stadig (`SessionClient.tsx:668`) |
| 4. Typography | 2 | **3** | Skalaen er overholdt 100 % målt live. Rollerne er ikke. Mellemrubrikker = sidetitel på desktop, 24 `h2`/`h3` i 13 px, 12 px brugt til sætninger og handlinger, og 16 px-feltreglen virker ikke længere |
| 5. Spacing | 3 | 3 | Uændret. Mind er centreret på desktop, Mad har en stak af kort øverst, og Reps klipper "Limited C…" |
| 6. Experience Design | 3 | 3 | Uændret plus en regression: 11 felter zoomer på iOS igen. Coach mangler loading, `confirm()` findes på 4 coach-flader, og "Del med coach" mangler |

**Samlet: 17/24** (før 16/24)

---

## Søjle 4: Typography (3/4), detaljer

### Hvad bølgen flyttede (verificeret)
- **Gaten holder.** `nord-type-scale-gate.test.ts` består (282 filer). `git grep` finder ingen rå `text-xs…9xl` eller `text-[…px/rem]` i `(app)`, `coach`, `onboarding`, `login` eller `components` (marketing er undtaget).
- **Live-måling, kun skalastørrelser.** Ved 375 px renderer alle tekstelementer i `<main>` i 12, 13, 15, 17, 22, 34 eller 64 px. Den eneste undtagelse er en 16 px textarea (bio) på `/settings`, og den er tilsigtet. Fordelingen: I dag `12:67 13:24 15:44 22:11 34:3`, Mad `12:76 13:98 15:42 22:20 34:1`, Reps `12:35 13:26 15:34 17:10 22:0 34:5 64:1`, HRV `64:1`. Før bølgen var der ca. 10 Tailwind-standardstørrelser i brug.
- **Tokenfordeling i koden:** micro 542, copy 278, meta 234, section 130, title 69, card 31, hero 5, hero-lg 5. Der er ingen inline `fontSize`.
- **Resten fra planen er gjort:**
  - `RouteOpening.tsx:22` er nu `text-title`, og 44 px-titlen er væk.
  - `.stepper-num` har ikke længere `tabular-nums`.
  - Komponentklasserne ligger i `@layer components` (`globals.css:314–747`).
  - `twMerge` bevarer tokens.
- **Vægte:** kun 3 afvigere tilbage: `font-semibold` i `ScienceFeed.tsx:105` og `ConnectionStatus.tsx:82`, og `font-bold` i `HrvAlertCard.tsx:220`. De renderer som 500 pga. `font-synthesis: none`, men er støj mod "400/500".

### Hvorfor det ikke er 4
1. **WARNING (regression, systemisk): 16 px-feltreglen taber nu til utilities.** Reglen `@media (pointer: coarse), (max-width: 40rem) { .input, .field, input…, textarea, select { font-size: 16px } }` (`globals.css:467–473`) blev flyttet ind i `@layer components`. Derfor vinder enhver `text-*`-utility på feltet. Kaskadeprøve ved 375 px:
   - `textarea.field` giver 16px
   - `textarea.field.text-copy` giver **15px**
   - `.input.text-copy` giver **15px**

   Før bølgen lå reglen uden for lag og vandt. Ramt (`text-copy` på selve feltet, 11 stk.):
   - Medlem: `components/community/PostCard.tsx:229`, `components/mind/JournalForm.tsx:64`, `components/mind/MindCheckForm.tsx:101`, `components/mind/CirkelPostForm.tsx:43`, `components/mind/MentalResourcesModal.tsx:158`, `components/adaptive/CounterfactualSliders.tsx:260` (select). `app/(app)/settings/SettingsClient.tsx:297` gik fra `text-base` (16) til `text-copy` (15).
   - Coach: `coach/cirkler/CreateCirkelForm.tsx:37,54`, `coach-school/{SandboxCaseCard:196,LiveDecisionCard:154,LessonForm:178}`.

   Effekten er, at iOS zoomer ind ved fokus i journal, mind-check, kommentarer og krise-modalen. DESIGN.md siger: "Én global regel; komponenter skal ikke selv vælge en størrelse". Den regel holder ikke i koden. **Rettelse:** flyt media-blokken ud af `@layer components`, enten uden lag eller i `@layer utilities` som det sidste i filen. Alternativt kan `text-copy` fjernes fra de 11 felter og forbydes i gaten for `<input|textarea|select>`.
2. **WARNING: Hierarkiet kollapser på desktop.** 12 mellemrubrikker har `text-section md:text-title`. Fra `md` får en `h3` derfor samme 34 px som sidetitlen. Det ses på 04-mad-d: "Spinatomelet med feta" og "Stegt oksemørbrad …" er lige så store som "Brændstof.", mens sektionen "3 måltider" over dem kun er 22 px. Steder:
   - `nutrition/MealCard.tsx:160`
   - `coaching/page.tsx:237,298,372`
   - `program/[code]/page.tsx:160`
   - `mind/sessions/page.tsx:64`
   - `hrv/learn/page.tsx:34`
   - `nutrition/setup/SetupWizardClient.tsx:201`
   - `hrv/page.tsx:374,425,428`. Enheden "ms" bliver 34 px, men DESIGN.md siger, at enheden ved hero-tallet skal være `text-section`.

   Derudover er der `h2` i `text-title` på `dashboard/page.tsx:332` og `community/page.tsx:153`, altså på samme niveau som `h1`. DESIGN.md: "der findes ingen titelstørrelse mellem `text-title` og `text-hero`", og `text-title` er sidetitlen. **Rettelse:** kortrubrikker skal være `text-card` (eller `text-section` uden `md:`-vækst).
3. **WARNING: Rubrikker i kicker-størrelse.** 24 `h2`/`h3` renderer som `eyebrow`/`text-meta`/`text-micro` (13 eller 12 px). Reps står for 5 af dem (`reps/page.tsx:186,237,292,308,349`: "Niveauer", "Seneste Reps", "Sådan tjener du", "Belønninger", "Mine indløsninger"). Resten ligger i `nutrition/page.tsx:450` ("Resten af ugen"), `hrv/learn/adaptive` (3), `ReasoningDetailPanel` (3) m.fl. På I dag er sektionerne 22 px ("Sammenhængene"). Samme rolle får altså to størrelser på tværs af faner. DESIGN.md: "`SectionHeader` … `h2` i `text-section`. Håndbyggede kicker-plus-`h2` er forbudt." Det ses på 07-reps-d: siden har ingen sektionstitler, kun 13 px-labels.
4. **WARNING: `text-micro` er overbelastet.** Spec §4 og DESIGN.md: 12 px er til "tabelhoveder, tidsstempler, chips, avatar-initialer, akselabels". Live bruges 12 px til:
   - hele hjælpesætninger på `/settings` ("Notifikation på telefonen når det er tid …", "Når din readiness er lav i dag, ser du …")
   - handlinger på Crew ("Hep", "Kommentarer", "Del") og I dag ("Sig mere om Hjerte", "Læs noter på din profil", "Skjul", "I morgen")
   - status ("Under bånd", "Tjekket ind")

   Micro er den mest brugte størrelse i koden (542, mod 234 meta). Codemodden kortlagde `text-xs` og `text-[10–11px]` 1:1 til micro uden rollegennemgang. **Rettelse:** sætninger og links/knapper flyttes til `text-meta`, og micro bevares til tidsstempler, chips og akser.
5. **Mindre: linjehøjde overskrives.** 176 `leading-*` står oven på tokens, der selv bærer linjehøjde (`leading-relaxed` 104, `leading-[1]` 10, `leading-[1.05]` 5 …). Fx `text-micro leading-relaxed` i `SettingsClient`. Det udhuler "hver størrelse bærer sin rolle".
6. **Mindre: gaten dækker ikke alle flader.** `src/app/error.tsx` (3), `privacy/page.tsx` (6) og `terms/page.tsx` (5) har stadig rå størrelser og ligger uden for `ROOTS`. Regexen fanger heller ikke `text-[clamp(…)]` eller `text-[var(…)]`. `error.tsx` er en medlemsvendt fejlside.

---

## Øvrige søjler (kort, uændret ift. UI-REVIEW-2 medmindre nævnt)

### Søjle 1: Copywriting (3/4)
Rettet: Crew-niveauet og alle tre Mind-fejl (05-mind-d viser "din private journal", "MakeIts", "databehandler, ikke en coach"). Åbent:
- `Nutrition.json:247,253,286,290` ("Skippet", "Skip-dage", "Skip") og `Coach.json:176`
- `Community.json:12` "100K volumen-club"
- `exercise-mocks.ts:71` "drukner under baren", synlig på 02-session-m
- `Reps.json:20,24` "0-999" og "1.000-4.999" med bindestreg (07-reps-d), selvom ejeren har godkendt en-dash
- "0 / 16 sæt" i sessionsheaderen mod "Du filmede dette sæt" for sæt 3 og 4
- "+ Del" mod "Del"

### Søjle 2: Visuals (2/4)
- Ingen `NarrativeBand` i `src`.
- HRV har ingen 14-nætters graf.
- Reps-heroen 1.420 står stadig yderst til højre, ~880 px fra titlen (07-reps-d).
- "HQ · Adaptive Engine" og glossen står stadig i pas-kortet (01-i-dag-m).
- **Nyt:** desktop-hierarkiet på Mad er fladt. Måltidsnavne i 34 px konkurrerer med sidetitlen, så siden mangler et fokuspunkt (se søjle 4, fund 2).

### Søjle 3: Color (3/4)
- `SessionClient.tsx:668` `border-l-body` giver en orange cue-streg i nat (02-session-m, cue 01).
- Coach er fortsat monokrom med danger kun ved safety.
- Radiusklasser (`rounded-2xl` 127, `rounded-lg` 71, `rounded-xl` 61 …) renderer 0, fordi `--radius-*` er 0 (`globals.css:229–236`). Det er ikke et visuelt fund, kun tokenstøj.

### Søjle 5: Spacing (3/4)
- `MindDisclaimer` giver en centreret kolonne (x≈506) under en venstrestillet header (x=300) (05-mind-d).
- Minds undernavigation har ingen fade på 375 px.
- Mad har stadig "Ikke et AI-udkast", "I dag" og "Kropsvægt" stablet før planen (04-mad-d).
- "Limited C…" klippes på 375 px.

### Søjle 6: Experience Design (3/4)
- Ingen `src/app/coach/inbox/loading.tsx` (kun `page.tsx`).
- `confirm()` findes stadig i `ProgramBuilder.tsx:557`, `SessionEditor.tsx:94`, `SendDigestButton.tsx:13` og `PromoteToLiveButton.tsx:45`.
- Ingen "Del med coach" på HRV.
- **Ny regression:** iOS-fokuszoom på 11 felter, heraf journal, mind-check og krise-modalen (se søjle 4, fund 1). Det holder scoren på 3. Fejlen forhindrer ingen opgave, men rammer de mest følsomme skriveflader.

---

## Top-prioriterede rettelser

1. **16 px-feltreglen ud af `@layer components`** (`globals.css:467–473`). Det er én flytning, og den lukker regressionen på 11 felter. Udvid gaten, så `<input|textarea|select>` ikke må bære `text-*`.
2. **Fjern `md:text-title` fra rubrikker** (12 steder) og `text-title` fra `h2` (`dashboard:332`, `community:153`). Kortrubrikker skal være `text-card`, og HRV-enheden skal være `text-section`.
3. **Reps- og Mad-sektioner via `SectionHeader`** (24 `h2`/`h3` i 13/12 px), så sektionstitler er 22 px på alle faner.
4. **Rollegennemgang af `text-micro`:** sætninger og handlinger flyttes til `text-meta`. Start med `/settings`, Crew-handlinger og I dag-indsigtskort.
5. **Udvid gaten** til `src/app/error.tsx` (og evt. privacy/terms) og til `text-[clamp|var…]`. Fjern de 3 `font-semibold`/`font-bold`.
6. Bølge 2–4 som planlagt: `NarrativeBand`, HRV-graf, Reps-hero, monokrom session-cue, coach-loading, `ConfirmSheet` i coach, "Del med coach".

## Registry safety
Ikke relevant (ingen UI-SPEC med tredjeparts-registries).

## Auditerede filer
- `DESIGN.md`, `src/app/globals.css`, `src/lib/design/nord-type-scale-gate.test.ts`, `scripts/nord-type-codemod.py`, commit 10d1a4a (185 filer)
- `src/app/(app)/{reps,nutrition,dashboard,community,coaching,hrv,settings,session/[id]}/**`, `src/components/{mind,community,adaptive,coach-school,coach,hrv,app}/**`, `src/app/coach/**`
- `messages/da/{Mind,Nutrition,Reps,Community,Coach}.json`, `src/lib/data/exercise-mocks.ts`
- Skærmbilleder: `wave1/01–08-{m,d}.png` mod `after/*.png`. Live-måling på :3003 (375 og 1440 px).
