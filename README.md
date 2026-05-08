# MakeIt // HQ

Det interne univers for MakeIt-crewet. Lukket beta. Bygget separat fra
webshoppen [nowmakeit.eu](https://www.nowmakeit.eu) — webshoppen røres ikke.

> Coaching · Community · Events · Reps loyalty program — samlet ét sted.

---

## Quick start (lokalt på din Mac)

Du skal have **Node.js 20+** installeret. Tjek med `node --version`.
Hvis du ikke har det: `brew install node` eller hent fra [nodejs.org](https://nodejs.org).

```bash
# 1) Klon repoet og skift til feature-branchen
git clone https://github.com/tomhedegaard/MakeIt.git
cd MakeIt
git checkout claude/makeit-online-platform-XF2UE

# 2) Installer dependencies
npm install

# 3) Start dev-serveren
npm run dev -- -p 3002
```

Åbn så [http://localhost:3002](http://localhost:3002) i Chrome.

> **Demo mode (default).** Uden Supabase env-vars kører appen med
> mock-data og cookie-baseret invite-kode login. Perfekt til at klikke
> rundt og demonstrere flow uden backend.

### Test-koder til login (demo mode)

På `/login` bruger du én af disse invite-koder under beta:

```
MUNK-01
MAKEIT-CREW
STRAPIT-50K
FOUNDERS-2026
AMAGERBRO-169
```

Mock-auth sætter en cookie (`mi_session`) i 30 dage. Log ud via sidebar
nederst til venstre.

---

## Connected mode — kobl rigtig Supabase backend på (5 min)

Når du vil have rigtig auth, persistens og data, sæt et Supabase-projekt
op (gratis tier rækker langt). Appen skifter automatisk til magic-link
login + database, så snart env-variablerne er sat.

### 1. Opret Supabase-projekt

1. Gå til [supabase.com](https://supabase.com), log ind, klik **New project**
2. Vælg fx `makeit-hq` som navn, en region tæt på (Frankfurt), og et
   stærkt database-password (gem det)
3. Vent ~1 minut på projektet bliver klar

### 2. Kør migrations

I Supabase dashboard → **SQL Editor**:

1. Kopier indholdet af `supabase/migrations/0001_init.sql` ind, kør det
2. Kopier indholdet af `supabase/migrations/0002_session_actions.sql` ind, kør det
3. Kopier indholdet af `supabase/migrations/0003_member_profile.sql` ind, kør det
4. Kopier indholdet af `supabase/migrations/0004_coach.sql` ind, kør det
5. Kopier indholdet af `supabase/migrations/0005_subscriptions.sql` ind, kør det
6. Kopier indholdet af `supabase/migrations/0006_form_check_storage.sql` ind, kør det
7. Kopier indholdet af `supabase/migrations/0007_rewards.sql` ind, kør det
8. Kopier indholdet af `supabase/migrations/0008_tier_promotion.sql` ind, kør det
9. Kopier indholdet af `supabase/migrations/0009_tier_events.sql` ind, kør det
10. Kopier indholdet af `supabase/migrations/0010_realtime.sql` ind, kør det
11. Kopier indholdet af `supabase/migrations/0011_coach_write.sql` ind, kør det
12. Kopier indholdet af `supabase/seed.sql` ind, kør det

Det opretter alle tabeller (members, programs, sessions, posts, Reps,
challenges, form-checks m.v.) med RLS-policies, triggers, RPC-funktioner
og demo-data.

> **Tip**: Migrationerne er idempotente — du kan køre dem igen uden
> bekymring. Hvis du allerede har kørt tidligere versioner, behøver du
> kun at køre de nye numre.

> **Coach-rolle**: 0004 promoverer automatisk en bruger med handle
> `Munk` (case-insensitive) eller email `munk@nowmakeit.eu` til coach.
> Andre coaches kan flippes manuelt med `update public.members set
> is_coach = true where handle = 'X';` i SQL Editor.

### 3. Sæt env-vars op

```bash
cp .env.example .env.local
```

I Supabase dashboard → **Settings → API**, kopier:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Indsæt dem i `.env.local`.

### 4. Konfigurer email

I Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3002`
- **Redirect URLs**: tilføj `http://localhost:3002/auth/callback`

Magic-link mailen kommer fra Supabase's dev-mail-server som standard
(forsinket op til 60 sek). Til produktion: tilkobl Resend, Postmark eller
SendGrid via SMTP.

### 5. Genstart dev-serveren

```bash
npm run dev -- -p 3002
```

Login-siden viser nu et **email + invite-kode**-form i stedet for det
gamle cookie-form. Du modtager et login-link på mail; klik det → du er
inde med en rigtig Supabase-session og en rigtig `members`-row i DB'en.

---

## Stripe-billing (valgfrit — for rigtige betalinger)

Når du er klar til at tage betaling, sæt Stripe op. Uden disse env-vars
står `/billing`-siden i "demo mode" og knapperne viser bare et banner.

### 1. Opret Stripe-projekt

1. Log ind på [dashboard.stripe.com](https://dashboard.stripe.com), brug **test mode** (toggle øverst til højre)
2. **Products** → opret to produkter:
   - **MakeIt HQ Crew** → recurring price, fx 199 DKK/måned
   - **MakeIt HQ 1:1 Coaching** → recurring price, fx 1.500 DKK/måned
3. Notér de to **Price IDs** (starter med `price_...`)

### 2. Konfigurer webhook (lokalt med Stripe CLI)

I et tredje terminal-vindue:

```bash
brew install stripe/stripe-cli/stripe   # første gang
stripe login
stripe listen --forward-to localhost:3002/api/stripe/webhook
```

Output viser et **webhook signing secret** (`whsec_...`) — kopier det.

### 3. Tilføj env-vars til `.env.local`

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhb...   # Settings → API → service_role
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CREW=price_...
STRIPE_PRICE_ONE_ON_ONE=price_...
```

### 4. Aktivér Customer Portal

Stripe → **Settings → Billing → Customer portal** → aktivér og gem standardindstillingerne.

### 5. Test flowet

1. Genstart dev-serveren
2. Log ind, gå til `/billing`
3. Tap "Aktivér Crew-medlemskab →"
4. Brug Stripe test-kort: `4242 4242 4242 4242`, CVC `123`, expire en hvilken som helst fremtidig dato
5. Du redirectes tilbage med `?success=1`, webhooket har skrevet en `subscriptions`-row, og statussen er nu "Aktiv"

> Webhook'et bruger service-role nøglen så det kan skrive `subscriptions`
> uden om RLS. Behold den hemmelig.

---

## AI program-generation (valgfrit)

Onboarding-flowet bruger som standard en rule-based generator (skaleret
af brugerens 1RM, mål og niveau). Du kan opgradere til **Claude
(Sonnet 4.6)** for mere personlige programmer ved at sætte én env-var:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Når nøglen er sat:
- Onboarding kalder Claude med medlemmets profil og en cached system-prompt
- Sonnet 4.6 returnerer struktureret JSON via tool-use (Zod-valideret)
- Vægte rundes til 2.5 kg og programmet skrives til DB som normalt
- **Fallback**: hvis Claude fejler eller timer ud, bruges rule-based
  uden at brugeren mærker noget

**Cost-overvejelser**: System-prompten er ~3K tokens og caches mellem
requests (5 min TTL). Andet kald koster ~0.1× af første. Med caching
ligger en typisk onboarding på under 1 cent.

Få en API-nøgle på [console.anthropic.com](https://console.anthropic.com)
(starter med `$5` gratis kredit).

### Form-check (vision)

Samme `ANTHROPIC_API_KEY` aktiverer også **rigtig form-check**: når
medlemmet uploader en video, ekstraherer browseren 3 keyframes via
canvas, sender dem til server-action der kalder Claude Sonnet 4.6
med vision. Claude returnerer struktureret verdict (score, headline,
positive observationer, ting at stramme op, coach-tip), som persisteres
i `form_checks`-tabellen og dukker op i coach-køen til verifikation.

**Cost pr. form-check**: ~3 frames @ 1024px ≈ 4.5K image-tokens +
~1.5K cached system + ~500 output ≈ 2 cents. Demoknappen ("Demo med
eksempelvideo") bruger stadig canned mock så designet kan vises uden
at brænde tokens.

**Uden API-nøgle**: alle paths bruger mock-svar — designet er identisk,
kun beslutningen er ikke ægte.

### Email notifikationer (Resend)

Når Mikael Munk gennemgår en form-check og skriver coach-noter,
sendes en email til medlemmet med noten inline plus link tilbage
til platformen. Sættes op med [Resend](https://resend.com) (gratis
op til 3.000 mails/md).

**Env-vars** (alle valgfri — uden dem skipper review-action stille
email-delen og fortsætter normalt):

```env
RESEND_API_KEY=re_...                                   # API-nøgle
RESEND_FROM_EMAIL=MakeIt // HQ <hq@nowmakeit.eu>        # verificeret domæne
RESEND_REPLY_TO=munk@nowmakeit.eu                       # default: Mikael
```

**Setup**:
1. Sign up på [resend.com](https://resend.com)
2. **Domains → Add Domain** → `nowmakeit.eu` → tilføj DNS-records (SPF, DKIM, DMARC)
3. Vent 5-10 min på verifikation
4. Hent API-nøgle fra **API Keys**
5. Sæt env-vars i `.env.local`

**Til test uden domæne**: brug `RESEND_FROM_EMAIL=onboarding@resend.dev`
— Resend's sandbox accepterer mail til den email der er knyttet til
din Resend-konto.

Email-design er **dark on-brand**: sort baggrund, off-white tekst,
Archivo-style display, coach-noter i en venstre-stribet callout med
"Mikael Munk · @Munk" attribution. Inline CSS only (de fleste klienter
stripper `<style>`-tags).

### Video upload til Supabase Storage

Når en bruger laver en form-check, uploader browseren videoen direkte
til Supabase Storage (bucket: `form-check-videos`) i parallel med
keyframe-ekstraktionen. Storage er **privat**:

- Medlemmer uploader kun til deres egen mappe (RLS: path prefix = auth.uid)
- Coaches kan læse alt via `is_current_user_coach()` policy
- Afspilning sker via **signed URLs** (1 times udløb), genereret server-side

**Begrænsninger**: 100 MB pr. fil, kun video-MIME-typer. Migration
0006 opretter bucket + policies idempotent — sikkert at gentage.

I `/coach/queue` og `/coach/members/[id]` viser CoachReview-sheet'en
nu en `<video controls>`-afspiller med den signerede URL — coachen
kan se den faktiske video sammen med AI-vurderingen før godkendelse.

---

## Ruter

| Rute         | Beskyttet | Beskrivelse                                             |
| ------------ | :-------: | ------------------------------------------------------- |
| `/`          |     —     | Marketing-landing for inviterede                        |
| `/login`     |     —     | Invite-kode adgang                                      |
| `/dashboard` |     ✓     | Overview, KPI, aktivt program, crew-aktivitet           |
| `/coaching`  |     ✓     | 12-ugers programmer + 1:1                               |
| `/community` |     ✓     | Live feed, challenges, leaderboard, IRL-meets           |
| `/reps`      |     ✓     | Loyalty: 4 tiers, earn-mekanik, reward shop             |
| `/profile`   |     ✓     | Lifts på record, indstillinger                          |

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + custom design tokens (CSS-variabler)
- **Framer Motion** — hero-stagger, transitions
- **Lenis** — smooth scroll
- **Radix UI Dialog** — bottom sheets, modaler
- **Supabase** — auth (magic-link), Postgres, RLS, Storage *(connected mode)*
- **JetBrains Mono · Inter · Archivo Black** via `next/font/google`

### Designsprog
Monokromt, strength-editorial. Sort `#0A0A0B`, off-white `#F5F2EC`, fire grader linjer, ingen farve-accent. Bold display-typografi, tight tracking, store tal.

---

## Scripts

```bash
npm run dev       # dev server (Turbopack)
npm run build     # produktion build + typecheck
npm run start     # serve production build
npm run lint      # ESLint
```

---

## Mappestruktur

```
src/
├─ app/
│  ├─ (app)/                # Beskyttede ruter (sidebar/tab-bar layout)
│  │  ├─ dashboard/         # Today
│  │  ├─ coaching/          # Træn
│  │  ├─ community/         # Crew
│  │  ├─ reps/              # Reps loyalty
│  │  ├─ profile/           # Mig
│  │  ├─ session/[id]/      # Aktiv workout-flow (immersiv)
│  │  ├─ layout.tsx
│  │  └─ actions.ts         # logout server action
│  ├─ auth/callback/        # Supabase magic-link callback
│  ├─ login/                # Login (dual mode)
│  ├─ layout.tsx            # Root: fonts + smooth-scroll + observers
│  ├─ page.tsx              # Marketing-landing
│  └─ globals.css           # Design tokens + utilities
├─ components/
│  ├─ marketing/            # Hero, Crew, Pillars, Value, Origin, Footer, Nav
│  ├─ app/                  # AppShell (sidebar + mobile tab-bar), PageHeader
│  ├─ community/            # PostComposer
│  ├─ ui/                   # Sheet, Stepper, RpeSelect, RestTimer, FormCheckSheet
│  └─ ...                   # Logo, Container, Marquee, SmoothScroll
├─ lib/
│  ├─ auth.ts               # Auth (dual mode: Supabase or mock)
│  ├─ pricing.ts            # Centralized price placeholders
│  ├─ workout.ts            # Workout types + mock data
│  ├─ utils.ts              # cn(), formatNumber()
│  └─ supabase/             # Server / browser / middleware clients + env gate
└─ middleware.ts            # Beskytter /dashboard, /coaching, /session, ...

supabase/
├─ migrations/0001_init.sql  # Schema + RLS + triggers
└─ seed.sql                  # Invite codes, exercises, programs, challenges
```

---

## Næste skridt

- [x] Database + auth (Supabase, dual-mode kører)
- [ ] Migrer alle sider til at læse fra DB (start med `/dashboard`)
- [ ] Persistér aktiv session: gem logged sets, pause/genoptag
- [ ] Onboarding-flow (mål, equipment, 1RM)
- [ ] AI-program-generation v1 (LLM bygger programmet ud fra profil)
- [ ] AI form-check pipeline (video → pose → LLM-feedback → coach review)
- [ ] Coach-dashboard (program-builder, review-kø, medlemsoversigt)
- [ ] Stripe abonnement + 1:1 add-on
- [ ] Shopify Storefront-bro (vis produkter, brug Reps som rabat)
- [ ] Resend / SMTP for production magic-link mails
- [ ] Realtime feed med Supabase channels
- [ ] Custom domain — `hq.nowmakeit.eu`
