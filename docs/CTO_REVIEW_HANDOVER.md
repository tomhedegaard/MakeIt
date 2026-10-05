# MakeIt // HQ — overlevering til teknisk review

**Udarbejdet:** 2026-08-30 · **Mod:** `main` @ `2bfc8d1` · **Produktion:** `makeit.tomhedegaard.dk`

Dette dokument overleverer MakeIt // HQ til en ekstern agent, der skal levere et
**uafhængigt teknisk review**. Det er skrevet af den agent, der har arbejdet i
kodebasen — læs det derfor som en interesseret parts fremstilling, ikke som en
neutral kilde. Alt i §3–§7 er målt mod repoet og den kørende produktion på
ovenstående dato, og §12 viser hvordan du selv efterprøver hvert enkelt tal.

---

## 1. Hvad vi beder om

Et **kritisk** review. Vi kan selv skrive listen over ting der virker; den er ikke
interessant. Vi vil vide, hvor konstruktionen brister — nu eller om seks måneder.

Prioriteret rækkefølge:

1. **Risiko for brugerne.** Persondata, sikkerhed, sundhedsfaglig forsvarlighed.
   Dette er en app med mental sundhed og biometri; fejl her er ikke tekniske fejl.
2. **Risiko for driften.** Hvad går i stykker uden at nogen opdager det?
3. **Risiko for tempoet.** Hvad gør kodebasen langsom at ændre om et halvt år?
4. **Arkitektoniske valg vi burde omgøre, mens det stadig er billigt.**

## 2. Sådan vil vi have det leveret

- **Fund før anbefalinger.** Hvert fund: hvad, hvor (fil:linje eller kommando),
  hvorfor det betyder noget, hvor sikker du er.
- **Skeln mellem "jeg har verificeret" og "jeg formoder".** Du får ikke minuspoint
  for usikkerhed — kun for at skjule den. Vi har allerede fanget ét falsk fund
  under forberedelsen af dette dokument (§7.1), og det kostede tillid, ikke tid.
- **Ingen udfyldning.** Ti reelle fund slår halvtreds observationer.
- **Sig det, hvis en præmis i dette dokument er forkert.** Det er den mest
  værdifulde ting du kan finde.
- Vi forventer **ikke** kode. Vi vurderer reviewet og beslutter selv, hvad vi handler på.

---

## 3. Produktet

**MakeIt // HQ** er en lukket-beta coaching-platform for et dansk styrketrænings-
brand (hovedcoach Mikael Munk). Den er bygget separat fra webshoppen
`nowmakeit.eu` (Shopify) og deler intet kodegrundlag med den.

Produkttesen: *"AI gør det generiske. Mennesker gør det vigtige."* Programopbygning,
form-tjek og progression automatiseres; mennesker bruges på 1:1, milepæle og
fællesskab.

**Seks medlemsdomæner:** Træning · Kost · Crew · HRV · Mental sundhed · Reps
(loyalitetsvaluta med fire tiers: Lifter → Athlete → Beast → Legend).

**Coach-univers** på `/coach/*` med 12 flader, fem kun for admin.

**Forretningsmodellen kører ikke endnu.** Priserne er stadig placeholders
(`[XX]`, `[YY]`, `[ZZ]` i `src/lib/pricing.ts`). Platformen kan i dag ikke tage
imod en eneste betaling. En modul-abonnementsmodel (gratis gulv + tilkøbsmoduler)
har fået leveret sit fundament, men Fase B–D udestår.

---

## 4. Arkitektur

| Lag | Valg |
|---|---|
| Framework | Next.js **16.2.4** App Router, React **19.2.4**, TypeScript 5 |
| Styling | Tailwind **v4** (CSS-first `@theme inline`), egne design-tokens |
| i18n | next-intl 4, cookie-baseret (`mi_locale`), **ingen locale i URL** |
| Backend | Supabase — Postgres, Auth (magic link + Google/Apple OAuth), RLS, Storage |
| Betaling | Stripe 22 (Checkout + Customer Portal + webhook) |
| AI | `@anthropic-ai/sdk` — Sonnet 4.6 til generering, Haiku 4.5 til moderation/science |
| Øvrigt | Resend (mail), web-push/VAPID, Zod 4, framer-motion, three/r3f |
| Test | Vitest 3 + jsdom |
| Hosting | Vercel (`main` → production, automatisk) |

### 4.1 Dual mode — kodebasens vigtigste enkeltmønster

Alt kører i to tilstande, styret af én boolean:

```ts
// src/lib/supabase/env.ts
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

Uden Supabase-nøgler kører appen på mock-data med cookie-session og invite-koder.
Hver data-funktion har en demo-gren. Det er ikke en udviklerbekvemmelighed — det
er den flade produktet demoes på.

**Værd at udfordre:** hver ny funktion skal implementeres to gange, og de to
grene kan drive fra hinanden uden at nogen test fanger det.

### 4.2 Adgangskontrol

- Profiltabellen er `public.members` (`is_coach`, `is_admin`, `tier`).
- `src/middleware.ts` beskytter en **eksplicit liste** af stier. Matcheren springer
  `api/` over — cron- og webhook-ruter auther sig selv via bearer/signatur.
- I databasen håndhæves adgang af RLS + SQL-helpers: `is_current_user_coach()`,
  `is_current_user_admin()`, `is_current_user_munk()`, `mind_check_visible_to()`.
- **Tre Supabase-klienter:** `server.ts` (RLS som brugeren), `client.ts` (browser),
  `service.ts` (**service-role, bypasser RLS** — kun crons, webhooks, OAuth-callbacks
  og cross-medlem-aggregeringer).

**Værd at udfordre:** en positivliste i middleware betyder, at en ny beskyttet rute
er ubeskyttet indtil nogen husker at tilføje den. Der er ingen test, der fanger det.

### 4.3 Datalag

`src/lib/data/*` (53 moduler) er eneste sted der taler med databasen; sider og
server actions kalder ind her. Cross-medlem-aggregering hentes i ét round-trip med
in-memory `Map`-gruppering — kohorten er under 50 personer.

`src/lib/data/mind.ts` indeholder `mindDb()`, en **utypet wrapper** fra før
`database.types.ts` blev regenereret. Typerne er regenereret; wrapperen er teknisk
gæld der aldrig blev ryddet op.

### 4.4 AI-laget

Alle Claude-kald ligger i wrappers (`src/lib/**/*-claude.ts`, 14 stk.) med samme kontrakt:

1. `import "server-only"`
2. Model-id i eksporteret konstant
3. Struktureret output via `zodOutputFormat`
4. Cached system-prompt (5 min TTL)
5. **Returnér `null` ved enhver fejl** — kalderen har altid en deterministisk fallback
6. Ren logik isoleret i test-dækkede pure moduler; wrapperen er kun glue

Brugeren ser aldrig en AI-fejl. Enhedsøkonomi: onboarding-programgenerering <1 øre,
én form-check ≈ 2 cent.

### 4.5 Baggrundsjobs

16 Vercel-crons. Samme skabelon: `runtime="nodejs"`, `dynamic="force-dynamic"`,
`maxDuration=60`, bearer-auth mod `CRON_SECRET`, JSON-svar der kan læses i logs.
Idempotens håndhæves i skemaet (fx `UNIQUE (member_id, for_date)`), ikke i koden.

**Værd at udfordre:** ingen af de 16 crons har en test. Ingen alarmering hvis en
fejler stille.

### 4.6 Designsprog

Monokrom base (`--bg #0A0A0B`, `--fg #F5F2EC`) med fire domænefarver ovenpå:
Heart `#F2545B` · Food `#45C487` · Body `#FF9C41` · Mind `#5B9DF5`.
Princippet er **"farve er retning, ikke dekoration"** — domænefarver må aldrig på
knapper, CTA'er, brødtekst eller store flader. Scoping sker via `data-domain` på
tynde layouts. Fuld spec i `docs/DOMAIN_COLOR_SYSTEM.md`.

---

## 5. Målt omfang (2026-08-30)

| | |
|---|---|
| TypeScript-filer i `src/` | 486 |
| Linjer i `src/` | 82.298 |
| React-komponenter | 123 |
| Data-moduler | 53 |
| Filer med server actions | 36 |
| Migrationer | **55 filer**, `0001`–`0056` (nummer `0031` er sprunget over) |
| SQL i migrationer | 5.755 linjer |
| Tabeller i `public` | 65 |
| Vercel-crons | 16 |
| i18n-nøgler pr. locale | 2.226 (da + en) |

---

## 6. Kvalitetsposition — ærligt

Dette afsnit er dér, hvor vi forventer flest fund.

| | |
|---|---|
| Testfiler | 48 |
| Tests | 597 passerende + 3 skipped |
| Kørselstid | ~2,8 s |
| **CI** | **Ingen.** Der findes ingen `.github/workflows`. |
| Lint-fejl i `src/` | 5 |
| E2E-tests | 0 |

**De tre huller vi selv kan se:**

1. **Ingen CI overhovedet.** Testene kører kun, når et menneske husker det.
   PR-checks er udelukkende Vercels build-deploy. En PR der brækker 597 tests
   ville blive merget med grønne flueben.
2. **Testene sidder skævt.** 2 af 51 data-moduler har test. 1 komponent-test ud af
   123 komponenter. 0 tests på 16 crons. Dækningen er koncentreret om ren logik
   (HRV-beregninger, adaptive engine, streaks, moderation) — som er godt testet —
   mens alt der rører databasen, auth eller UI er utestet.
3. **`npm run lint` er ubrugelig som port.** Den rapporterer 707 fejl, men **698 af
   dem kommer fra `.worktrees/`**, som er gitignoreret men ikke eslint-ignoreret.
   Reelt: 5 fejl i `src/`, 4 i `docs/`. Konsekvensen er, at ingen læser
   lint-outputtet, og de 5 rigtige fejl har stået der i månedsvis.

**Ingen staging.** Ét enkelt Supabase Cloud-projekt. Hver migration rammer ægte
data. Disciplinen er "kør altid mod lokal Postgres først", håndhævet af intet.

---

## 7. Sikkerhed og persondata

Dette er den dimension vi er mest utrygge ved, og hvor vi helst ser dig bruge tiden.

### 7.1 RLS — verificeret, ikke antaget

RLS er slået til på tværs af skemaet (67 `enable row level security`-sætninger).
Vi har verificeret det mod **den kørende produktionsdatabase**: en forespørgsel med
anon-nøglen returnerer 0 rækker på `journal_entries`, `mind_check_logs`, `members`,
`messages`, `hrv_readings`, `form_checks` og `posts`.

> **Metodenote til dig som reviewer:** under udarbejdelsen af dette dokument
> producerede en naiv grep "42 tabeller uden RLS". Det var en fejl i regex'en
> (kolonne-justeret whitespace i migrationerne), ikke i koden. Vi nævner det, fordi
> du sandsynligvis vil lave den samme søgning. **Spørg databasen, ikke migrationerne.**

### 7.2 Særlige kategorier af personoplysninger

Platformen behandler data, der falder under GDPR art. 9:

- **Mental sundhed:** daglige mind-checks, fri-tekst journal, AI-genererede
  refleksioner, delte indlæg i "cirkler"
- **Biometri:** HRV/RMSSD, hvilepuls, søvn, livsstils-logs fra WHOOP/Oura/Polar
- **Video:** form-check-optagelser i privat Supabase Storage med signerede URL'er

Relevante mekanismer der findes: GDPR art. 20-eksport (`/api/settings/export`),
privatlivspolitik (190 linjer), betingelser (143 linjer), tier-gated deling
(Lifter privat → Athlete buddy → Beast cirkler), og `mind_check_visible_to()` i DB.

**Det vi gerne vil have vurderet:**

- **Journal-tekst sendes til Anthropic.** Fri-tekst fra journalen sendes til Claude
  Haiku for moderation (`src/lib/mind/moderation-claude.ts`) og indgår i konteksten
  til den daglige AI-coach. Er behandlingsgrundlaget, oplysningspligten og
  databehandleraftalen i orden? Fremgår det tydeligt nok for brugeren?
- **Krise-pipelinen.** Et regex-forfilter (`crisis-keywords.ts`) efterfulgt af
  Claude-moderation kan eskalere til coachen. Konservativ efter design — falske
  positiver viser en ressource-modal. Men: er en styrketræningscoach den rigtige
  modtager af et selvmordssignal? Er ansvarsfordelingen og henvisningen forsvarlig?
  Hvad sker der, hvis begge lag fejler (`null` = "ingen ekstra info")?
- **Service-role-nøglen ligger i `.env.local`** på udviklermaskinen og i Vercels
  miljø. Den bypasser al RLS. Er brugsfladen for stor?
- **Ingen staging** betyder, at migrationer testes mod ægte brugerdata.

### 7.3 Hvad der ikke er konfigureret

`WHOOP_*`, `OURA_*`, `POLAR_*` og `HRV_TOKEN_ENC_KEY` er **ikke sat i Vercel
production**. Cronen `hrv-wearable-sync` kører hver morgen kl. 05:00 uden at kunne
hente noget. Wearable-integrationen er altså bygget, testet og udeployeret — men
inaktiv i produktion. `HRV_TOKEN_ENC_KEY` er den AES-nøgle, der krypterer
wearable-OAuth-tokens; uden den kan integrationen ikke tændes forsvarligt.

---

## 8. Bevidste valg — udfordr dem gerne, men vid at de er valgt

Disse er ikke forglemmelser. Hvis du mener de er forkerte, så sig det — men
argumentér mod begrundelsen, ikke mod fraværet af en.

| Valg | Begrundelse |
|---|---|
| Dual mode (demo/connected) | Demo-fladen er den, produktet sælges på |
| Ét Supabase-projekt, ingen staging | Omkostning og tempo i en lukket beta |
| HTTP-polling frem for Supabase Realtime | Realtime giver UX-gloss, ikke produktværdi, ved <50 brugere |
| Capacitor-shells med `server.url` mod live site | Web-deploy opdaterer begge apps øjeblikkeligt. Capacitors egen advarsel mod dette i produktion er læst og fravalgt |
| Monokrom base + fire domænefarver | Farve som navigation, ikke dekoration |
| Ordet "tier" er reserveret til Reps | Må aldrig bruges i billing-kode |
| AI fejler altid til en deterministisk fallback | Brugeren må aldrig se en AI-fejl |
| En lang "stop-doing"-liste | `docs/STOP_DOING_LIST_2026-05.md` — bl.a. Shopify-bro, realtime, kalender-booking, fuld native app |

---

## 9. Spørgsmål vi særligt gerne vil have udfordret

1. **Er dual mode en aktiv risiko?** Hver funktion findes i to versioner, og kun
   den ene er nogensinde testet mod en rigtig database.
2. **Holder AI-fallback-doktrinen?** "Returnér `null` ved fejl" betyder også, at en
   permanent nedbrudt Claude-integration ville se ud som normal drift. Ingen
   alarmering. Er det acceptabelt for moderation af krisetekst?
3. **Er 16 utestede crons uden alarmering forsvarligt** for en platform, hvis
   værdiløfte er daglig, automatisk tilpasning?
4. **Hvad koster det manglende CI os**, målt mod prisen på at indføre det?
5. **Er middleware-positivlisten den rigtige model** for adgangskontrol, eller bør
   default være "beskyttet, medmindre andet er angivet"?
6. **Er den sundhedsfaglige ansvarsfordeling forsvarlig** i mental-sundhedssøjlen?
7. **Skalerer datalagets "ét round-trip + Map-gruppering"** ud over de ~50 brugere,
   det er designet til — og hvad brækker først?
8. **Er 82.000 linjer for meget** for det leverede produkt, og hvor sidder fedtet?

---

## 10. Uden for scope

- Design- og copy-smag (medmindre det rammer tilgængelighed eller forståelighed)
- Forretningsmodellen og prissætningen som forretning — vi ved, den ikke er lukket
- Fravalgene i `docs/STOP_DOING_LIST_2026-05.md`, medmindre fravalget selv er risikoen
- Genopfindelse af designsystemet

---

## 11. Hvor tingene ligger

| Emne | Sted |
|---|---|
| Kodebase-regler for agenter | `AGENTS.md` / `CLAUDE.md` |
| Fuldt teknisk overblik | `docs/PLATFORM_OVERVIEW.md` |
| Bring-up fra nul | `docs/SETUP.md` |
| Miljøvariabler (kommenteret) | `.env.example` |
| Domænefarvesystem | `docs/DOMAIN_COLOR_SYSTEM.md` |
| App Store-plan + runbook | `docs/APP_STORE_PLAN.md`, `docs/NATIVE_SHELLS.md` |
| Prissætning (ubesluttet) | `docs/PRICING_DECISION_2026-05.md` |
| Fravalg | `docs/STOP_DOING_LIST_2026-05.md` |
| Specs og planer | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
| Mental sundhed — spec + eval | `docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md` (+ `-eval`) |

---

## 12. Efterprøv os selv

```bash
npm install
npm test                      # 597 passerende + 3 skipped, ~3 s
npm run build                 # exit 0
npx eslint src                # 5 fejl — IKKE npm run lint, se §6.3
npm run dev                   # :3002, demo mode uden .env.local
```

Uden `.env.local` starter appen i demo mode. Log ind på `/login` med invite-koden
`MUNK-01` — den giver coach- og admin-rettigheder på mock-data, så hele
coach-universet kan inspiceres uden backend.

Tælleværdierne i §5 kan genskabes med:

```bash
find src -name '*.ts' -o -name '*.tsx' | wc -l
find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | tail -1
ls supabase/migrations | wc -l
ls .github/workflows 2>/dev/null || echo "ingen CI"
```
