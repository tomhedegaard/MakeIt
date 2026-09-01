# Store screenshots

Første App Store-sæt. Fase 5 i `docs/APP_STORE_PLAN.md`. Native shells
er server-drevne; billing er gated ude (Apple 3.1.1). Disse frames viser
**aldrig** pris, købs-CTA, Stripe eller paywall.

## iPhone 6.7" (dette sæt)

Katalog: `docs/store/iphone-6.7/`

| # | Fil | Flade |
|---|-----|--------|
| 1 | `01-login.png` | Invite-kode (`MUNK-01` i feltet, ingen fejl-alert) |
| 2 | `02-today.png` | Today / dashboard — ugens session |
| 3 | `03-body.png` | Træning (`/coaching`) med krop-kicker |
| 4 | `04-food.png` | Kost — demo-ugeplan (måltidsfotos er `null` i demo; ikke opdigtet) |
| 5 | `05-heart.png` | HRV (`/hrv`) — demo uden wearable = connect-state |
| 6 | `06-mind.png` | Mind-check + mental graf |

- **Størrelse:** 1290×2796 PNG, portrait
- **Device:** 430×932 CSS-viewport @ deviceScaleFactor 3 (iPhone 14/15/16 Pro Max-klasse)
- **Safe-area:** appens egen tab-bar er med på alle app-flader (ikke login)
- **Sprog:** dansk (`da` default)
- **Frame:** rå in-app frames. Ingen bezel, ingen hype-caption — ærlig UI slår en pæn løgn
- **Regenerér:** demo-mode på `:3002`, `npm i -D playwright && npx playwright install chromium`, derefter `node scripts/capture-store-iphone.mjs`

### Demo-protokol

1. Ingen `.env.local`. Ingen `NEXT_PUBLIC_SUPABASE_*`.
2. `PORT=3002 npm run dev` (eller `next start -p 3002` efter build).
3. Log-linjen må **ikke** sige at `.env.local` blev loaded.
4. Åbn `/login`, submit invite `MUNK-01`, land i appen.
5. Skip `/billing`, `/coach/*`, pricing, waitlist.

## Ikke med endnu

- 6.1" iPhone
- iPad / 13" iPad

Ikoner og splash (`assets/icon-*.png`, native splash) røres ikke her.
