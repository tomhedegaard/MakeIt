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

### Test-koder til login

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
│  ├─ (app)/                # Beskyttede ruter (sidebar layout)
│  │  ├─ dashboard/
│  │  ├─ coaching/
│  │  ├─ community/
│  │  ├─ reps/
│  │  ├─ profile/
│  │  ├─ layout.tsx         # AppShell + auth guard
│  │  └─ actions.ts         # logout server action
│  ├─ login/                # Invite-kode form (server action)
│  ├─ layout.tsx            # Root: fonts + smooth-scroll + observers
│  ├─ page.tsx              # Marketing-landing
│  └─ globals.css           # Design tokens + utilities
├─ components/
│  ├─ marketing/            # Hero, Crew, Pillars, Origin, Footer, Nav
│  ├─ app/                  # AppShell, PageHeader
│  └─ ...                   # Logo, Container, Marquee, SmoothScroll
├─ lib/
│  ├─ auth.ts               # Mock invite-codes + session
│  └─ utils.ts              # cn(), formatNumber()
└─ middleware.ts            # Beskytter /dashboard, /coaching, ...
```

---

## Næste skridt (når intern beta er klar til mere)

- [ ] Skift mock-auth ud med rigtig (Clerk eller Supabase Auth)
- [ ] Database (Supabase Postgres) til crew-feed, PR-log, Reps-balance
- [ ] Realtime feed med Supabase channels
- [ ] CMS til coaching-programmer (Sanity eller Payload)
- [ ] Email-notifikationer ved PR og challenge-vinder (Resend)
- [ ] Custom domain — fx `members.nowmakeit.eu` eller `crew.nowmakeit.eu`
