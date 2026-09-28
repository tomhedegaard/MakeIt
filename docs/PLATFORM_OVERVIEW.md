# MakeIt // HQ — teknisk platformoverblik

**Sidst verificeret:** 2026-08-29 mod arbejdstræet på `claude/makeit-online-platform-XF2UE`
(commit `9320aeb`) samt `origin/main` (`b068a50`) og `claude/module-subscription-model`.

Dette dokument er sandhedskilden for en agent der skal træffe tekniske beslutninger
på platformen. Alle tal er målt, ikke gættet. Hvor noget er usikkert står det eksplicit.

---

## 1. Hvad produktet er

**MakeIt // HQ** er en lukket-beta coaching-platform for MakeIt-crewet (dansk
styrketræningsbrand, hovedcoach Mikael Munk / `@Munk`). Den er bygget **separat fra
webshoppen `nowmakeit.eu`** (Shopify, straps) — de to systemer deler intet kodegrundlag.

**Produkttesen** (`src/lib/pricing.ts` → `positioning`):
> "AI gør det generiske. Mennesker gør det vigtige."
> Programopbygning, form-tjek og progression automatiseres; mennesker bruges på 1:1,
> milepæle og fællesskab.

**Sprog:** dansk-først, engelsk sekundært. Al medlemsvendt copy skrives på dansk.

**Seks medlemsdomæner** (nav-numre er en del af designsproget):

| Nr | Rute | Domæne | Kerne |
|---|---|---|---|
| 01 | `/dashboard` | Today | KPI, dagens session, crew-aktivitet |
| 02 | `/coaching` | Træn | 12-ugers programmer, adaptive engine, 1:1 |
| 03 | `/nutrition` | Mad | måltidsplaner, indkøb, adherence |
| 04 | `/community` | Crew | feed, challenges, leaderboard, buddy |
| 05 | `/hrv` | HRV | wearables, baseline, alerts, insights |
| 06 | `/mind` | Mental | mind-check, journal, sessioner, cirkler |
| 07 | `/reps` | Reps | loyalitetsvaluta, 4 tiers, reward shop |
| 08 | `/profile` | Mig | lifts, indstillinger |
| 09 | `/messages` | DM | 1:1-tråde, signed media |

**Coach-univers** (`/coach/*`, gated på `is_coach`) — 12 nav-punkter, fem `adminOnly`:
01 Overview · 02 Members · 03 Programs · 04 Exercises · 05 Queue · 06 Redemptions ·
07 Analytics · 08 Co-coaches* · 09 Cirkler* · 10 Safety* · 11 Patterns · 12 System*.

---

## 2. Stack (målt i `package.json`)

| Lag | Valg | Version |
|---|---|---|
| Framework | Next.js App Router | `16.2.4` |
| UI | React / React DOM | `19.2.4` |
| Sprog | TypeScript | `^5` |
| Styling | Tailwind CSS v4 (CSS-first `@theme inline`) | `^4` |
| i18n | next-intl (cookie-baseret, ingen locale i URL) | `^4.12` |
| Backend | Supabase (`@supabase/ssr` + `supabase-js`) | `0.10.2` / `2.105.3` |
| Betaling | Stripe | `^22.1` |
| Email | Resend | `^6.12` |
| Push | web-push (VAPID) | `^3.6` |
| AI | `@anthropic-ai/sdk` | `^0.95` |
| Validering | Zod | `^4.4` |
| Motion | framer-motion `^12.38`, lenis `^1.3` | |
| 3D | three `0.184`, @react-three/fiber `9.6.1`, drei `10.7.7` | |
| Test | Vitest `^3.2` + jsdom | |

> **AGENTS.md-reglen gælder:** dette er ikke den Next.js din træning kender.
> Læs `node_modules/next/dist/docs/` før du skriver framework-nær kode.

**Målt størrelse (arbejdstræ):** 453 `.ts`/`.tsx`-filer, ~79.500 linjer i `src/`.
**Testsuite:** 46 filer, **583 passerende + 3 skipped**, kørselstid ~2,8 s (`npm test`, 2026-08-29).
**Migrationer:** 56 filer, `0001` → `0056` (nummer `0031` er sprunget over — ikke en fejl).

---

## 3. Kørselsarkitektur

### 3.1 Dual mode — det vigtigste enkeltmønster i kodebasen

Hele platformen kører i to tilstande, styret af én boolean:

```ts
// src/lib/supabase/env.ts
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

* **Connected mode** — rigtig Supabase-auth, Postgres, RLS, Storage.
* **Demo mode** — ingen backend. Cookie-session (`mi_session`, 30 dage), invite-koder
  (`MUNK-01`, `MAKEIT-CREW`, `STRAPIT-50K`, `FOUNDERS-2026`, `AMAGERBRO-169`),
  mock-data i samme shape som DB-svarene. `MUNK-01` er coach **og** admin.

**Regel:** *hver* ny data-funktion skal have en demo-gren. Demo mode er ikke en
udviklerbekvemmelighed — det er den flade Munk demoer produktet på.
Alle øvrige integrationer (Stripe, Resend, Anthropic, Unsplash, wearables) falder
individuelt tilbage til no-op/rule-based når deres nøgler mangler.

### 3.2 Auth og adgangskontrol

* Supabase Auth: magic link + Google/Apple OAuth (providers konfigureres i Supabase-
  dashboardet, ikke i env). Callback: `src/app/auth/callback`.
* Profiltabellen er `public.members` (`is_coach`, `is_admin`, `tier`, `handle`, …).
  `handle = 'Munk'` / `munk@nowmakeit.eu` promoveres automatisk til coach i `0004`.
* `src/middleware.ts` er default-deny: en public allowlist (`/`, `/login`,
  `/privacy`, `/terms`, waitlist på landingen, `/science/feed.*`, `/auth/callback`,
  PWA/AASA) — alt andet i matcheren kræver session. Matcheren springer `api/`,
  `_next/static`, `_next/image` og billeder over — **cron- og webhook-ruter auther
  sig selv**. `/api` er bevidst *ikke* public. Demo mode bruger stadig `mi_session`.
* I DB håndhæves adgang af RLS + SQL-helpers: `is_current_user_coach()`,
  `is_current_user_admin()`, `is_current_user_munk()`, `mind_check_visible_to()`.

### 3.3 Tre Supabase-klienter — brug den rigtige

| Fil | Rolle | Hvornår |
|---|---|---|
| `src/lib/supabase/server.ts` | RLS som den loggede bruger | Server Components, server actions |
| `src/lib/supabase/client.ts` | Browser, anon | Client Components |
| `src/lib/supabase/service.ts` | **service-role, bypasser RLS** | crons, Stripe-webhook, OAuth-callbacks, cross-member aggregeringer |

`createServiceClient()` **throws** hvis env mangler. Det er bevidst (aldrig en halvt
konfigureret klient), men betyder at service-role-kode ikke må ligge i en kodesti der
også skal virke i demo mode.

### 3.4 Datalag

`src/lib/data/*` (≈55 moduler) er det eneste sted der taler med DB'en. Sidefiler og
server actions kalder ind her — de laver ikke selv `supabase.from(...)`.

Mønstre der går igen:
* Cross-medlem-aggregering hentes i **ét round-trip + in-memory `Map`-gruppering**
  (kohorten er <50 personer; ingen window-funktions-akrobatik).
* `mindDb()` i `src/lib/data/mind.ts` er en **midlertidig untyped wrapper** fra før
  `database.types.ts` blev regenereret. Typerne ER regenereret (`4d2db3c`) — wrapperen
  kan og bør fjernes.
* Server actions ligger i `actions.ts` ved siden af deres side (36 filer med `"use server"`).

### 3.5 AI-laget

Alle Claude-kald ligger i dedikerede wrappers: `src/lib/**/[navn]-claude.ts`
(program-generator, form-check vision, nutrition-planner + foto, adaptive reasoning,
coach draft-reply, coach-school practice-eval + moderation, mental coach + sessioner +
moderation, HRV insights, science-summarize).

**Wrapper-kontrakten — afvig ikke fra den:**
1. `import "server-only"` øverst.
2. Model-id i en eksporteret konstant (`claude-sonnet-4-6`; science bruger Haiku).
3. Struktureret output via `zodOutputFormat` fra `@anthropic-ai/sdk/helpers/zod`.
4. Cached system-prompt (5 min TTL) — andet kald koster ~0,1×.
5. **Returnér `null` ved enhver fejl.** Kalderen har altid en deterministisk fallback
   (`*-fallback.ts` / rule-based generator). Brugeren må aldrig se en AI-fejl.
6. Ren logik (tærskler, beslutninger, narrativer) isoleres i test-dækkede pure moduler;
   wrapperen er kun glue.

Kendte enhedsøkonomi-tal: onboarding-programgenerering <1 øre; én form-check ≈ 2 cent.

### 3.6 Baggrundsjobs

15 Vercel-crons på produktionsbranchen (16 på `main` — science-feed er den ekstra).
Alle følger samme skabelon:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Bearer-auth mod process.env.CRON_SECRET → 401 ellers
// service-role-klient → JSON-svar {ok, totals, by_<entity>} så `vercel logs` er læsbar
```

Idempotens sikres i skemaet (fx `UNIQUE (member_id, for_date)` på
`mental_coach_outputs`), ikke i koden.

| Cron | Schedule (UTC) |
|---|---|
| `adapt-program-daily` | 03:30 dagligt |
| `draft-form-check-replies` | 04:00 dagligt |
| `mental-coach-daily` | 04:30 dagligt |
| `hrv-wearable-sync` | 05:00 dagligt |
| `coach-morning-report` | 05:00 dagligt |
| `science-feed` *(kun main)* | 05:30 dagligt |
| `hrv-alert-detect` | 06:00 dagligt |
| `coach-digest` · `coach-quality-score` | 06:00 mandag |
| `buddy-streak-weekly` · `buddy-mental-weekly-checkin` | 07:00 mandag |
| `streak-milestone-nudge` | 15:00 dagligt |
| `mind-check-nudge` | 18:00 dagligt |
| `hrv-weekly-insights` · `mental-weekly-insights` | 18:00 søndag |
| `buddy-rematch-weekly` | 19:00 søndag |

### 3.7 i18n

`next-intl` uden locale i URL'en. Locale ligger i cookien `mi_locale` (1 år),
default `da`, understøttede: `da`, `en` (`src/i18n/config.ts`).
28 namespaces pr. locale i `messages/{da,en}/` (~3.000 linjer på dansk).
**Enhver ny flade tilføjer nøgler i begge sprog** — ingen hardcodet copy i komponenter.

### 3.8 Designsprog

Monokrom "strength editorial": `--bg #0A0A0B`, `--fg #F5F2EC`, fire linjegrader,
Archivo Black display / Inter / JetBrains Mono, store tal, tight tracking.

Ovenpå ligger **domænefarvesystemet** (`docs/DOMAIN_COLOR_SYSTEM.md`, kun på `main`):
Heart `#F2545B` (HRV) · Food `#45C487` (Nutrition) · Body `#FF9C41` (Træn) ·
Mind `#5B9DF5`. Princip: **farve er retning, ikke dekoration**.
Scoping sker via `data-domain` på tynde layouts; utilities `text-domain`,
`bg-domain-tint`, `border-domain-line` resolver kontekstuelt.
Domænefarver må **aldrig** på knapper, CTA'er, brødtekst eller store flader.
Status bruger `--ok/--warn/--danger` (der findes bevidst ingen `--info`).
`/session` og `/coach/*` er bevidst monokrome i v1.

---

## 4. Datamodellen

66 tabeller i `public`. Grupperet:

* **Identitet/adgang:** `members`, `invite_codes`, `subscriptions`, `member_module_trials`, `waitlist_signups`
* **Træning:** `exercises`, `exercise_variant_map`, `programs`, `program_days`,
  `program_day_exercises`, `program_assignments`, `sessions`, `session_exercises`,
  `session_sets`, `weight_logs`, `form_checks`, `coach_reviews`
* **Ernæring:** `nutrition_profiles`, `nutrition_plans`, `nutrition_meals`,
  `nutrition_logs`, `nutrition_skip_days`, `meal_image_cache`
* **HRV:** `hrv_readings`, `hrv_settings`, `hrv_baseline`-logik, `hrv_alerts`,
  `hrv_lifestyle_logs`, `hrv_wearable_connections`, `hrv_session_modifiers`,
  `hrv_streak_events`, `hrv_weekly_insights`
* **Mental (Søjle 5):** `mental_settings`, `mental_settings_log`, `mind_check_logs`,
  `journal_entries`, `mental_sessions`, `mental_session_completions`,
  `mental_coach_outputs`, `mental_cirkler`, `mental_cirkel_members`,
  `mental_cirkel_posts`, `mental_cirkel_post_reactions`
* **Crew/coaching-pyramide:** `buddy_pairs`, `buddy_interactions`, `co_coach_assignments`,
  `coaching_lessons`, `lesson_progress`, `coach_quality_scores`, `coach_morning_reports`,
  `coach_voice_samples`
* **Community:** `posts`, `post_comments`, `post_reactions`, `challenges`,
  `challenge_participants`, `conversations`, `messages`
* **Loyalitet:** `reps_transactions`, `tier_events`, `rewards`, `reward_redemptions`
* **Drift:** `push_subscriptions`, `member_action_logs`, `backlog_items`, `science_items`

**Nøgle-RPC'er:** `award_session_reps`, `award_nutrition_log_reps`,
`award_hrv_sync_streak_reps`, `redeem_reward`, `tier_for_balance`,
`bump_tier_after_reps_change` (trigger — tier udledes af Reps-saldo, ikke af abonnement),
`handle_new_user`, `is_invite_valid`.

**Sprogregel:** ordet **"tier"** er reserveret til Reps-gamification
(Lifter → Athlete → Beast → Legend). Brug det aldrig i billing-/entitlement-kode —
der hedder det `module` / `product_kind` / `entitlement`.

---

## 5. Betaling og entitlements

**I dag (produktion):** Stripe Checkout + Customer Portal, to produkter —
`crew` og `one_on_one`. Webhook `/api/stripe/webhook` skriver `subscriptions` med
service-role. **Priserne er stadig placeholders** (`[XX]`, `[YY]`, `[ZZ]` i
`src/lib/pricing.ts`) — se `docs/PRICING_DECISION_2026-05.md`, hvor anbefalingen er
arketype C: Crew Founders 299 kr/md (første 50, lifetime-låst) → Crew Standard
399 kr/md → 1:1 add-on 1.499 kr/md (8 pladser). **Beslutningen er Munks og er ikke truffet.**

**På vej (branch `claude/module-subscription-model`, Fase A leveret):**
modul-abonnementsmodel — permanent gratis gulv + à la carte-moduler
(`train`, `nutrition`, `hrv`, `mind`) med 7 dages trial pr. modul, plus `crew`-bundle.
Spec: `docs/superpowers/specs/2026-07-21-modul-abonnementsmodel-design.md`.
Leveret: `lib/modules.ts` (katalog), udvidet `ProductKind`, ren `deriveEntitlements`
+ memoiseret `getEntitlements` (React `cache()`) + `requireModuleOrRedirect`,
migration `0055`. **Fase B–D udestår** (gratis-gulv-UI + upsell + guards → Stripe-priser,
trials og webhook-hærdning → reps-gating + analytics).

To fælder der allerede er fanget i review og skal respekteres:
1. Demo-gaten skal spejle `STRIPE_ENABLED` — ikke `SUPABASE_ENABLED`. Ellers floorer
   Fase B produktionen når den lander.
2. Håndhævelse sker **i siden**, ikke i middleware: rod-sider forgrener
   (gratis-visning vs. modul-visning), kun dybe premium-ruter bruger guarden.
   Guard på en rod-side = redirect-loop.

---

## 6. Klienter ud over web

* **PWA (Fase 1, live på `main`):** `manifest.ts`, ikon-suite, `sw.js` v2 med
  offline-fallback, global `SWRegister`, `InstallHint`.
* **Platform-bro (Fase 2):** `src/lib/platform.ts` + `platform-server.ts` detekterer
  UA-markøren `MakeItApp`; `push_subscriptions.platform` (migration `0050`);
  billing er **server-side gated** væk i native-shells (Apple 3.1.1).
* **Native shells (Fase 3):** `ios/` + `android/` (Capacitor 8.4, SPM).
  Bundle-id **`eu.nowmakeit.app`**. Strategi: **server-drevet hybrid** — shellen
  renderer den live app via `server.url` mod `makeit.tomhedegaard.dk`, så et web-deploy
  opdaterer begge apps øjeblikkeligt. Capacitors officielle advarsel mod `server.url`
  i produktion er et **bevidst valg**. iOS bygger (`xcodebuild` ✓); Android er aldrig
  bygget (ingen Android Studio/JDK på maskinen).
* **Udestår (Fase 4–7):** HealthKit/Health Connect, haptics, server-side APNs/FCM-sender,
  compliance, Fastlane/CI, TestFlight. Plus 7 punkter der kræver Toms Apple/Firebase-
  adgang (Team ID i AASA, push-capability, APNs `.p8`, Firebase-projekt +
  `google-services.json`, FCM service account, Play signing SHA-256, Associated Domains) —
  tabellen i `docs/NATIVE_SHELLS.md`.

---

## 7. Deploy-topologi — læs denne sektion før du rører git

**Vercel:** projekt `make-it`, team `tomhedegaards-projects`.
Produktionsdomæne **`makeit.tomhedegaard.dk`** (+ alias `make-it-alpha.vercel.app`).
Rå `*.vercel.app`-URL'er ligger bag Deployment Protection (401).
`nowmakeit.eu` er **ikke** platformen — det er Shopify-shoppen.

**Deploy-flowet (siden 2026-08-29):** production-branch er `main`, og GitHubs
default branch er `main`. Merge til `main` udløser automatisk et production-deploy.
Der er ikke længere behov for manuel `vercel promote`.

> **Historisk kvirk — nu væk.** Indtil 2026-08-29 var production-branch
> `claude/makeit-online-platform-XF2UE`, og GitHubs default branch pegede samme
> sted. Merge til `main` gav derfor kun et *preview*-deploy, og produktion krævede
> `vercel promote <preview-url> --yes`. Det var mekanikken bag den branch-divergens
> §7.1 beskriver: nye PR'er fik automatisk den gamle branch som base. Støder du på
> ældre noter eller commit-beskeder der beskriver promote-flowet, er de forældede.

### 7.1 Branch-konsolideringen (afsluttet 2026-08-29)

Divergensen er lukket. `main` indeholder nu både sider, produktionen kører fra
`main`, og de tre indstillinger der holdt sporene adskilt er rettet.

Udgangspunktet var en tre-vejs-divergens:

| Branch | Head | Forhold før konsolidering |
|---|---|---|
| `origin/main` | `b068a50` | 30 commits foran produktionsbranchen |
| `origin/claude/makeit-online-platform-XF2UE` | `3537533` | Vercel-produktionsbranch — 11 foran main, 30 bagud |
| `claude/module-subscription-model` (kun lokal) | `c4da56b` | 17 foran main |

Produktionen manglede domænefarver (PR #22), science (PR #27), øvelsesudvidelsen
(PR #26) og hele PWA/bro/native-shell-arbejdet (PR #23–25). `main` manglede
omvendt landing-waitlist, Scanfit-research og landing-konverteringsarbejdet.

**Konflikter og hvordan de blev løst** (PR #29 — 4 filer, alle på landingssiden,
fordi begge sider havde bygget om på den samme flade):

| Fil | Konflikt | Løsning |
|---|---|---|
| `PillarsSection.tsx` | main: 5 søjler med domænefarver · XF2UE: 3 søjler (UX-audit B1b) + `HrvTrendVisual` | XF2UE's 3-søjle-struktur (nyere produktbeslutning) med main's domænebehandling lagt tilbage ovenpå: `t.rich` + `domainTags`, `data-domain="mind"`, `eyebrow-domain` |
| `Hero.tsx` | main: `t.rich(subline2, domainTags)` · XF2UE: ny typografi + waitlist-link + trust-linje | XF2UE's struktur, `t.rich` genindsat begge steder |
| `messages/{da,en}/Marketing.json` | main's copy havde `<heart>/<mind>/<body>`-tags; XF2UE's nyere copy havde ikke | XF2UE's copy, domænetags genanvendt på de samme ord (HRV / søvn / RPE / mind-check) |

**Fælde værd at huske:** `git checkout --theirs <fil>` erstatter *hele* filen,
ikke kun konfliktblokkene. Det tabte 87 nøgler fra main i `Marketing.json` —
hvoraf 22 (`domainIndex.*`, "Farvekoden"-sektionen) er live og blev genindsat på
main's plads mellem `tiers` og `app`. De øvrige 65 var døde legacy-nøgler
(`origin.*` fra den slettede `OriginSection`, de gamle
`pillars.coaching/community/reps/restitution/openBrain/crewPyramid`) —
verificeret uden referencer i `src/`.

**Tre indstillinger rettet — det var dem der genskabte divergensen:**

1. Vercel production-branch: `claude/makeit-online-platform-XF2UE` → **`main`**
   (Settings → Environments → Production → Branch Tracking)
2. GitHub default branch: samme gamle branch → **`main`**. Dette var
   grundårsagen: hver ny PR fik automatisk den gamle branch som base.
3. `claude/module-subscription-model` rebaset på ny `main` (16 commits, nul
   konflikter — `0055` blev sprunget over som allerede anvendt, fordi filen lå
   identisk på begge sider).

**Verificeret i produktion** (deploy `b0f86fa0` fra `main`, readyState READY):
landingssiden HTTP 200 med 6 domænefarvede spans, 3 søjler, Farvekoden og
waitlist-sektionen · `/science/feed.json` + `/science/feed.xml` HTTP 200 ·
`/.well-known/apple-app-site-association` serveret som `application/json`
(AASA-headeren fra `vercel.json`) · `/manifest.webmanifest` HTTP 200.
Lokalt: 597 tests på `main`, 614 på modul-branchen, build exit 0 begge steder,
migrationer `0001`–`0056` uden nummerdubletter.

**Udestår:** modul-branchen er rebaset lokalt men aldrig pushet. Og det er
uafklaret om `0054`–`0056` er kørt mod live DB — science-feedet svarer korrekt,
men med `items: []`, hvilket både kan betyde "tabellen mangler" og "cron har ikke
kørt endnu". Verificér før modul-arbejdet genoptages.

> **Bemærk:** `0055_module_entitlements.sql` ligger i main-linjen uden den kode
> der bruger den (`lib/modules.ts` m.v. lever kun på modul-branchen). Arvet fra
> XF2UE's `chore(db): sync`-commits og harmløst — migrationen udvider en
> CHECK-constraint og tilføjer en ubrugt tabel. Fjern den ikke; modul-branchens
> nummerering afhænger af den.

### 7.2 Migrationsdisciplin

Ét enkelt Supabase Cloud-projekt, **ingen staging** (`docs/SETUP.md`).
Derfor: kør altid migrationen mod lokal Postgres (`npm run db:reset`) før
`npm run db:push`, og kør `npm run db:types` bagefter så
`src/lib/supabase/database.types.ts` følger med.

---

## 8. Kvalitetsporte

```bash
npm test          # vitest — 583 passerende + 3 skipped (2026-08-29)
npm run lint      # eslint 9
npm run build     # next build (typecheck indgår)
```

**Browser-verifikation i demo mode** (protokollen Munk-fladerne er verificeret med):
1. `lsof -ti:3002 | xargs kill -9`
2. `mv .env.local .env.local.bak` — Next læser `.env.local` fra disk uanset proces-env.
   Verificér at opstartsloggen **ikke** siger `Environments: .env.local`.
3. Start detached: `nohup env PORT=3002 npm run dev &`
4. `/login` → invite-kode `MUNK-01` → `/dashboard` → naviger til fladen
5. Snapshot + screenshot + `console errors === 0`
6. `mv .env.local.bak .env.local`

**Cron-verifikation:** start dev med `CRON_SECRET=local-xx` og test tre cases —
ingen bearer (401), forkert bearer (401), korrekt bearer (happy path).

---

## 9. Åbne loose ends og risici

| # | Item | Type | Note |
|---|---|---|---|
| 1 | ~~Tre-vejs branch-divergens~~ | **Løst** | Merget via PR #29; produktionen kører fra `main` (§7.1) |
| 2 | ~~Vercel production-branch ≠ `main`~~ | **Løst** | Både Vercel production-branch og GitHub default branch er nu `main`; ingen manuel promote |
| 3 | Priser er placeholders | Forretning | Blokerer alle betalinger; venter på Munk |
| 4 | Uafklaret om `0054`–`0056` er kørt mod live DB | Drift | Verificér før modul-arbejde og før science-feedet forventes at fylde |
| 5 | ~~`MoveKit/` ikke i `.gitignore`~~ | **Løst** | `main` havde allerede `/MoveKit/`; hullet fandtes kun på produktionsbranchen og lukkes af konsolideringen |
| 6 | `mindDb()` untyped wrapper | Gæld | Typer er regenereret; wrapperen kan fjernes |
| 7 | Adaptive engine ↔ mental-wiring ikke aktiveret | Produkt | Pure helpers + 23 tests findes i `src/lib/mind/snapshot-contribution.ts`; `buildEngineInput` kalder dem ikke. Afventer ~2 ugers live mind-check-data |
| 8 | Voice-retning for mentale sessioner | Produkt | `audio_url`-kolonne + `AudioPlayer` klar; ingen lydfiler. Munk-optagelser vs. ElevenLabs |
| 9 | `front-squat` mangler demovideo | Indhold | Eneste hul i 20 kerneøvelser; MoveKit er et lukket katalog |
| 10 | 188 nye øvelser er `is_published=false` | Indhold | Venter på Munk-review |
| 11 | Android-shell aldrig bygget | Native | Ingen Android Studio/JDK på maskinen |
| 12 | Modul-model Fase B–D | Produkt | Se §5. Fase A er rebaset på ny `main`, men branchen er aldrig pushet |
| 13 | `SUPABASE_DB_PASSWORD` har været eksporteret i shell | Sikkerhed | Overvej rotation |

---

## 10. Bevidst fravalgt (stop-doing-listen)

`docs/STOP_DOING_LIST_2026-05.md` — rør ikke uden en eksplicit beslutning:
Shopify Storefront-bro · custom domæne `hq.nowmakeit.eu` · Supabase Realtime-kanaler
(HTTP-polling er nok) · udvidet `member_action_logs` · generel "engagement push" ·
multi-coach som eksterne operatører · fuld native app · kalender-booking/live-classes ·
group challenges v2.

Testen før enhver ny opgave:
> Bidrager dette direkte til Adaptive Engine, Open Brain UI, Munk Multiplier eller
> Crew Coaching Pyramid — eller til den besluttede modul-forretningsmodel?
> Hvis nej: skriv det i backloggen og gå videre.

---

## 11. Hvor tingene står skrevet

| Emne | Fil |
|---|---|
| Kodebase-regler | `AGENTS.md` / `CLAUDE.md` |
| Bring-up fra nul | `docs/SETUP.md` |
| Miljøvariabler (kommenteret) | `.env.example` |
| Pricing-beslutning | `docs/PRICING_DECISION_2026-05.md` |
| Fokus/fravalg | `docs/STOP_DOING_LIST_2026-05.md` |
| Domænefarver | `docs/DOMAIN_COLOR_SYSTEM.md` *(main)* |
| App Store-plan + runbook | `docs/APP_STORE_PLAN.md`, `docs/NATIVE_SHELLS.md` *(main)* |
| Øvelses-3D-research | `docs/EXERCISE_3D_RESEARCH.md` *(main)* |
| HRV-research | `docs/research/HRV_*.md` |
| Scanfit-partnerskab | `docs/research/SCANFIT_*.md` |
| Migrations-runbook | `docs/migrations/2026-06-mental-health-runbook.md` |
| Specs + planer | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
