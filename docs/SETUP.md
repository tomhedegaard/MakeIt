# MakeIt // HQ — bring-up guide

Komplet trin-for-trin opsætning af et nyt MakeIt-miljø. Følg
rækkefølgen — hver fase låser den næste op.

> **Hosting-model:** Single Supabase Cloud-projekt (ingen separat
> staging). Det betyder at hver migration testes mod ægte data så
> snart der er rigtige brugere. Disciplin: kør ALTID en migration
> mod en lokal Postgres først (`supabase db reset`), før den rammer
> prod via `supabase db push`.

---

## Fase 0 — værktøjer

```bash
# Node + npm fra projekt-roden
npm install

# Supabase CLI (kun udviklere der kører migrations behøver det)
brew install supabase/tap/supabase
# eller: npm install -g supabase
```

Klon → `cp .env.example .env.local` → udfyld løbende.

---

## Fase 1 — Supabase Cloud-projekt

1. Gå til https://supabase.com/dashboard → **New project**
2. Region: `eu-central-1` (Frankfurt) — laveste latency for DK-brugere
3. Database password: gem i din password manager (du får brug for det
   ved CLI-link)
4. Vent ~2 min på provisioning

Når projektet er klar:

- **Settings → API** → kopiér til `.env.local`:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
- **Settings → General** → notér `Reference ID` (subdomænet)

### Link CLI'en til cloud-projektet

```bash
supabase login
supabase link --project-ref <reference-id>
# du bliver bedt om DB-passwordet du gemte ovenfor
```

### Kør alle migrationer mod cloud

```bash
npm run db:push
```

CLI'en sender migration 0001-0018 i rækkefølge og tracker dem i
`supabase_migrations.schema_migrations`. Genkør idempotent.

> **Fallback uden CLI:** Åbn Supabase Dashboard → SQL Editor og paste
> indholdet af hver `supabase/migrations/000X_*.sql` i rækkefølge.
> Mere fejlbehæftet — kun til hurtigt setup.

### Kør seed-data

Hurtigste vej (ingen `psql` nødvendig):

1. Åbn Supabase Dashboard → **SQL Editor** → **New query**
2. Åbn `supabase/seed.sql` i din editor, kopiér hele indholdet
3. Paste i SQL Editor → **Run**

Alternativ via psql (kræver `brew install libpq` på macOS):

```bash
psql "postgresql://postgres:<DB-password>@db.<project-ref>.supabase.co:5432/postgres" \
     -f supabase/seed.sql
```

Den indsætter:
- 5 invite-koder (MUNK-01, MAKEIT-CREW, FOUNDERS-2026, STRAPIT-50K, AMAGERBRO-169)
- 11 øvelser i bibliotekets
- 4 program-skabeloner
- 1 challenge

### Promote dig selv til coach (+ admin)

Efter du har signed up første gang (se Fase 4), promoter din konto via
SQL Editor.

**Coach** giver adgang til `/coach/*` undtagen System:
```sql
update public.members
   set is_coach = true
 where email = 'din@email.dk';
```

**Admin** (superset af coach) giver adgang til alt inkl. `/coach/system`
hvor credential-rotation, integration-status og DB-stats vises:
```sql
update public.members
   set is_coach = true, is_admin = true
 where email = 'din@email.dk';
```

Konventionen er `is_admin = true` ⇒ `is_coach = true` (det er ikke en
DB-constraint, men SQL'en ovenfor sætter altid begge). Tilbageskridt
fra admin → almindelig coach: `update ... set is_admin = false` —
`is_coach` rør vi ikke.

---

## Fase 2 — Web Push (VAPID)

```bash
npm run vapid:generate
```

Output indeholder fire env-vars: paste dem i `.env.local`. Dit
`VAPID_SUBJECT` skal være en gyldig `mailto:`-URL eller en URL til din
support-side — push-tjenester (Apple, Google) bruger den til at kontakte
dig hvis dit endpoint misbruges.

> Når `NEXT_PUBLIC_VAPID_PUBLIC_KEY` er sat, dukker push-toggle op i
> `/settings`. Når også `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` er sat,
> begynder serveren faktisk at sende.

---

## Fase 3 — Auth providers

### Magic link (default — virker straks)

Ingen konfiguration nødvendig. Supabase Auth har det aktiveret som
default.

**Email-template** (valgfri tilpasning): Dashboard → Authentication →
Email Templates → Magic Link. Subject overrides ligger i
`supabase/config.toml`.

**Redirect URL**: Dashboard → Authentication → URL Configuration →
Redirect URLs → tilføj:
- `http://localhost:3002/auth/callback`
- `https://nowmakeit.eu/auth/callback`

### Email + password

Dashboard → Authentication → Providers → **Email** → toggle
*"Enable email confirmation"* hvis du vil bekræfte ved signup
(anbefalet for prod).

### Google OAuth

1. https://console.cloud.google.com → vælg/opret projekt
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. Application type: *Web application*
4. Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
5. Kopiér Client ID + Client Secret
6. Supabase Dashboard → Authentication → Providers → **Google** →
   Enable + paste keys → Save

### Apple OAuth

1. https://developer.apple.com/account → **Certificates, Identifiers
   & Profiles**
2. **Identifiers → +** → *Services IDs* — fx `eu.nowmakeit.signin`
3. Edit den nye Service ID → *Sign In with Apple* → Configure:
   - Primary App ID: din eksisterende App ID (eller opret en)
   - Return URLs: `https://<project-ref>.supabase.co/auth/v1/callback`
4. **Keys → +** → *Sign In with Apple* → tilknyt App ID → Continue → Register
5. Download `.p8`-filen. Notér Key ID + Team ID.
6. Supabase Dashboard → Authentication → Providers → **Apple** →
   Enable + paste:
   - **Client ID**: Service ID (fx `eu.nowmakeit.signin`)
   - **Secret Key (for OAuth)**: Indholdet af `.p8`-filen
   - **Apple OAuth Configuration**: Team ID + Key ID

---

## Fase 4 — verifikér end-to-end

Med Supabase + VAPID + mindst én auth provider er rygradsstien klar:

1. `npm run dev`
2. Åbn http://localhost:3002/login
3. Sign up med valgfri provider → bekræft mail hvis nødvendigt
4. Lan på `/onboarding` → udfyld → `/dashboard`
5. Promoter din konto til coach (se Fase 1) → log ud → log ind igen →
   `/coach` skal nu være tilgængelig

Hvis dette virker, er fundamentet solidt. Resten (Stripe, Anthropic,
Resend) kan tilføjes parallelt.

---

## Fase 5 — Anthropic (AI)

`ANTHROPIC_API_KEY` fra https://console.anthropic.com → Keys. Når
sat:
- Onboarding program-generator bruger Claude Sonnet 4.6
- Form-check video review tilkaldes på coach-flowet (når den feature
  hookes ind)
- Nutrition AI-forslag

---

## Fase 6 — Stripe

1. https://dashboard.stripe.com/test/apikeys → kopiér secret +
   publishable
2. **Products** → opret to:
   - **Crew membership** (recurring monthly)
   - **1:1 coaching add-on** (recurring monthly)
   - Kopiér deres `price_...` IDs til `STRIPE_PRICE_CREW` /
     `STRIPE_PRICE_ONE_ON_ONE`
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `customer.subscription.created`,
     `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Kopiér signing secret → `STRIPE_WEBHOOK_SECRET`

For lokal webhook-testning:
```bash
stripe listen --forward-to localhost:3002/api/stripe/webhook
```

---

## Fase 7 — Resend

1. https://resend.com/api-keys → opret nøgle → `RESEND_API_KEY`
2. **Domains → Add domain** → følg DNS-vejledning. Når verified,
   sæt `RESEND_FROM_EMAIL=noreply@<dit-domæne>`
3. `RESEND_REPLY_TO=hello@nowmakeit.eu` (eller hvad du vil bounce til)

> Til hurtig test: brug `RESEND_FROM_EMAIL=onboarding@resend.dev`.
> Den sender kun til den email du har på din Resend-konto.

---

## Migration-disciplin (læs dette)

Med single-projekt-modellen er der intet net under dig. Følg disse
regler:

1. **Aldrig** edit en migrationsfil der allerede er pushet til prod.
   Lav en ny migration der tilføjer/ændrer.
2. **Test altid lokalt først:**
   ```bash
   npm run db:start          # spinner et lokalt Postgres op
   npm run db:reset          # applies alle migrationer + seed
   # …verifikér i Studio på http://localhost:54323
   npm run db:push           # send til prod
   ```
3. **Tag backup før destruktive migrations:** Dashboard →
   Database → Backups → Create new backup.
4. **Genererede typer holder hjemmesidet i sync:**
   ```bash
   npm run db:types
   git add src/lib/supabase/database.types.ts
   ```
   (Når vi begynder at bruge database.types — endnu ikke wired ind.)

---

## Fejlsøgning

| Symptom | Hvor man kigger |
|---|---|
| `/login` viser stadig demo-form | `NEXT_PUBLIC_SUPABASE_URL` ikke sat — check `.env.local` |
| Magic-link mail kommer aldrig | Dashboard → Authentication → Logs |
| OAuth callback fejler | Verificér redirect-URL er på `Redirect URLs` whitelist |
| Push virker ikke | Service worker registreret? Check `/settings` toggle |
| Stripe webhook fejler | `stripe listen` lokalt + check signature secret |
| `db:push` fejler med "schema already exists" | Du har manuelt kørt SQL i Studio — ryd op først |
