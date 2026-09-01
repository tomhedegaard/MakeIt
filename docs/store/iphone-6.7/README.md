# iPhone 6.7" App Store frames

Portrait PNG at **1290×2796**. Captured in demo mode (no Supabase,
`mi_session=MUNK-01`) from the running app. No prices, no Stripe,
no paywall.

## Public set

| # | Fil | Flade |
|---|-----|--------|
| 1 | `01-today.png` | Today / dashboard — BodyMap-figuren med alle fire ankre tændt |
| 2 | `02-body.png` | Træning (`/coaching`) — uge + dagens pas. Prisblokken ligger under folden og kommer **ikke** med |
| 3 | `03-food.png` | Kost (`/nutrition`) — demo-ugeplan |
| 4 | `04-heart.png` | HRV (`/hrv`) — demo uden wearable = connect-state. Svag som enkelt-frame, men det er hjertets hjem; figuren lever på Today |
| 5 | `05-mind.png` | Mind-check + mental graf |

### Login er ikke med

Demo-`/login` kan **ikke** fanges rent. Fladen viser altid:

- test-koder (`MUNK-01 · MAKEIT-CREW · STRAPIT-50K`)
- footer `Demo mode · ingen backend tilkoblet` / `Demo mode · no backend connected`

Det er interne demo-straps, ikke store-copy. Capture-scriptet logger derfor
ind via cookie (`mi_session=MUNK-01`) og udelader login fra sættet.

## Capture

```bash
# Ingen .env.local. Ingen NEXT_PUBLIC_SUPABASE_*.
PORT=3002 npm run dev
# andet terminalvindue:
npm i -D playwright && npx playwright install chromium
node scripts/capture-store-iphone.mjs
```

- **Device:** 430×932 CSS-viewport @ deviceScaleFactor 3 (iPhone 14/15/16 Pro Max-klasse)
- **Sprog:** dansk (`da` default)
- **Frame:** rå in-app frames. Ingen bezel, ingen hype-caption
- **Safe-area:** appens egen tab-bar er med
- **Figuren:** `01-today.png` SKAL vise `svg.makeit-figure` (scriptet fejler ellers)

## Ikke med

- Login (se ovenfor)
- Billing, coach-flader, pricing, waitlist
- 6.1" iPhone og iPad — senere sæt
