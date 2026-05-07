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
ANTON-01
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
5. Kopier indholdet af `supabase/seed.sql` ind, kør det

Det opretter alle tabeller (members, programs, sessions, posts, Reps,
challenges, form-checks m.v.) med RLS-policies, triggers, RPC-funktioner
og demo-data.

> **Tip**: Migrationerne er idempotente — du kan køre dem igen uden
> bekymring. Hvis du allerede har kørt tidligere versioner, behøver du
> kun at køre de nye numre.

> **Coach-rolle**: 0004 promoverer automatisk en bruger med handle
> `anton` eller email `anton@nowmakeit.eu` til coach. Andre coaches
> kan flippes manuelt med `update public.members set is_coach = true
> where handle = 'X';` i SQL Editor.

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
