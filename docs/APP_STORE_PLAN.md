# App Store & Google Play — samlet plan

> Status: UDKAST til beslutning (2026-06-10). Mål: MakeIt på App Store og Google Play
> med ÉT kodebase, hvor enhver web-deploy slår igennem på alle platforme øjeblikkeligt.

## 0. Hvor står vi i dag? (gap-analyse)

**I dag er MakeIt 100 % webapp.** Ingen native apps, ingen Capacitor/Expo/React Native,
ingen ios/- eller android/-mapper. Men fundamentet er stærkt:

| Dimension | Status | Gap til stores |
|-----------|--------|----------------|
| Mobil-UI | ✅ Komplet | Tab-bar, safe-area, dvh, immersivt session-mode — intet at gøre |
| Web push | ✅ Virker | web-push + VAPID + `push_subscriptions`-tabel + sw.js. Mangler iOS-native vej |
| PWA | 🟡 ~40 % | Service worker findes (push-only). **Mangler: manifest, ikoner, offline-fallback, install-UX** |
| Auth | ✅ Komplet | Magic link, password, Google/Apple OAuth, invite-gate, **account deletion** (Apple-krav ✓), GDPR-export ✓ |
| Billing | ⚠️ Konflikt | Stripe web-checkout. Digitale abonnementer i native app = Apple IAP/DMA-regler (se §5) |
| Wearables | ✅ Server-side | WHOOP/Oura/Polar via server-OAuth — virker uændret i apps. **Ingen HealthKit/Health Connect** |
| Device-API'er | 🟡 Web-baseret | getUserMedia (kamera/mic til form-check + chat) — kræver permissions-opsætning i native shells |
| Deep links | 🟡 Klar struktur | Auth-callbacks er klar; mangler AASA/assetlinks-filer |
| Rendering | ⚠️ Bindende | ALT er SSR/dynamic (ƒ) — statisk export er umulig. Shells SKAL loade den deployede app |
| Native tooling | ❌ Intet | Fra nul |

**Samlet: ~6,5/10 på wrapper-parathed.** Det meste af afstanden er pakke- og
compliance-arbejde, ikke produktarbejde.

## 1. Strategivalg: Server-drevet hybrid (anbefalet)

**Princip: Webappen på Vercel ER appen.** Native iOS/Android-apps er tynde
Capacitor-shells, der renderer den live app fra makeit.tomhedegaard.dk og kun
indeholder det, web ikke kan: native push, HealthKit/Health Connect, splash,
offline-skærm, haptics og deep-link-registrering.

**Hvorfor dette og ikke alternativerne:**
- **React Native/Expo-genbyg**: To kodebaser → ændringer slår IKKE igennem
  automatisk. Måneders arbejde. Afvist.
- **Ren PWA uden stores**: Gratis og øjeblikkelig, men ingen App Store-synlighed,
  ingen HealthKit, og PWA-vilkår på iOS i EU er politisk ustabile. Utilstrækkelig alene.
- **TWA (kun Android)**: Lettere end Capacitor, men giver ikke plugin-paritet med
  iOS-shellen. Fravalgt for symmetri (kan genbesøges).

**Sådan opfyldes kravet "ændringer slår igennem overalt":**
1. Feature-ændringer = web-deploy → live på web, PWA, iOS-app og Android-app i samme sekund.
2. App-releases sker KUN når selve broen ændres (nye permissions, plugins, ikoner) — forventeligt 3-6 gange om året.
3. Ét capability-lag i webappen (`src/lib/platform.ts`) afgør runtime: web push vs. native push, vis/skjul billing, osv.

**Kendt risiko — Apple guideline 4.2 ("minimum functionality"):** Tynde
website-wrappers afvises. Mitigering: shells skibes IKKE tynde — native push,
HealthKit-sync, splash, offline-state og haptics er med fra v1 (Fase 3+4 er
derfor IKKE valgfrie for iOS). Restrisiko: medium → fallback er mere native UI.

## 2. Faseplan

### Fase 1 — PWA-fundament (≈1 uge) — *giver værdi fra dag ét*
- `src/app/manifest.ts` (Next metadata API): navn, farver (#0A0A0B), display standalone, ikoner
- Ikon-suite: 192/512 + maskable + apple-touch-icon (genereres fra logo)
- Offline-fallback-side + minimal asset-caching i sw.js (app-skal, ikke data)
- Install-UX: diskret "Føj til hjemmeskærm"-hint (især iOS Safari-flow)
- **Quick win: iOS-brugere med hjemmeskærms-PWA kan modtage web push allerede nu (iOS 16.4+)** — før native apps overhovedet findes

### Fase 2 — Capability-bridge i webappen (≈1 uge)
- `src/lib/platform.ts`: `isNativeApp()`, `getPlatform()` (Capacitor-detektion)
- Push-abstraktion: `push_subscriptions` udvides med `platform`-felt (web/ios/android);
  native token-registrering genbruger samme actions — crons sender via web-push ELLER APNs/FCM
- `/billing` skjules i native shells (se §5); nav/tab-bar uændret
- Auth-callbacks verificeres mod universal links (samme URL'er virker)

### Fase 3 — Capacitor-shells (1-2 uger)
- `npm i @capacitor/core @capacitor/ios @capacitor/android` + `ios/`, `android/` i repoet
- `capacitor.config.ts`: `server.url = https://makeit.tomhedegaard.dk` (remote, server-drevet)
- Splash + app-ikoner + statusbar (mørk, #0A0A0B) + offline-skærm i shell
- Native push: `@capacitor/push-notifications` → APNs (iOS) / FCM (Android) → token til Fase 2-abstraktionen
- Permissions: Info.plist (kamera/mic til form-check, health-usage-strings) + AndroidManifest
- Deep links: `public/.well-known/apple-app-site-association` + `assetlinks.json` (serveres af Next), associated domains i shells
- Lokal verifikation på simulatorer + 2 fysiske enheder

### Fase 4 — Native værdi (2-3 uger) — *4.2-forsikring OG produktgevinst*
- **HealthKit (iOS)**: HRV (SDNN), hvilepuls, søvn fra Apple Watch → ind i eksisterende
  `hrv_readings`-pipeline som 4. wearable-provider. **Indfrier marketing-løftet
  "Apple Watch-support kommer med MakeIt-appen" og fjerner WHOOP/Oura-abonnement som adgangskrav**
- **Health Connect (Android)**: samme data fra Samsung/Garmin/Pixel-økosystemet
- Haptics i live-session (sæt-kvittering, rest-timer) via `@capacitor/haptics`
- Biometrisk app-lås (Face ID/fingeraftryk) — sundhedsdata fortjener det
- Disse fire er Apples "ikke bare en hjemmeside"-bevis

### Fase 5 — Store-compliance (parallel med Fase 3-4)
- **Billing v1: køb fjernes helt fra native apps.** Abonnement købes på web;
  appen viser indhold man har adgang til (Netflix-modellen). Ingen eksterne købs-links
  i appen i v1 = ingen IAP-krav, ingen CTC-bøvl. Senere: vurdér EU External Purchase
  Link Entitlement (Apples nye samlede EU-model med CTC gælder fra 2026, deadline for
  accept af vilkår 17. marts 2026) eller ægte IAP
- Konti: Apple Developer Program (99 USD/år, kræver evt. D-U-N-S for firma) + Google Play Console (25 USD engangsbeløb)
- Privacy: App Privacy labels (Apple) + Data Safety form (Google) — **sundhedsdata er
  sensitiv kategori**; privacy policy-URL findes ✓; account deletion ✓; GDPR-export ✓
- Review-adgang: dedikeret demo-konto til reviewers (genbrug MUNK-01/demo-mode-flowet)
- Aldersmærkning, skærmbilleder (6.7"/6.1" iPhone, tablets), app-beskrivelser da/en

### Fase 6 — CI/CD & releasedisciplin (≈1 uge)
- Web: uændret Vercel-flow. **OBS: production-branch er pt. ikke `main`** (kræver manuel
  `vercel promote`) — bør rettes i Vercel-settings som del af denne fase, ellers er
  "én deploy → alle platforme" ikke reel
- Shells: GitHub Actions + Fastlane → TestFlight (iOS) + Play internal track (Android)
- Versionsregel: shells følger semver; web-deploys kræver ALDRIG app-release;
  bridge-ændringer udløser shell-release med changelog
- QA-matrix: Playwright (web, eksisterende protokol) + fysisk enhedstest af shells
  (min. iPhone + 1 Android) pr. shell-release
- Minimum-version-gate: shell viser "opdatér appen"-skærm hvis web'en kræver nyere bridge (lille versions-handshake)

### Fase 7 — Beta & lancering
- TestFlight-beta til crewet (closed beta-modellen er perfekt til dette)
- Play internal → closed testing
- Indsendelse med 4.2-tjekliste; forvent 1-2 review-runder på iOS

## 3. Tidslinje & indsats

| Fase | Kalendertid | Kan paralleliseres |
|------|------------|--------------------|
| 1. PWA | 1 uge | — |
| 2. Bridge | 1 uge | med Fase 1 |
| 3. Shells | 1-2 uger | — |
| 4. Native værdi | 2-3 uger | HealthKit er kritisk vej |
| 5. Compliance | 1 uges arbejde | parallel; reviews tager uger |
| 6. CI/CD | 1 uge | parallel |
| 7. Beta/launch | 2-4 ugers review-tid | — |

**Realistisk: 4-7 uger til første indsendelse; 6-10 uger til live i begge stores.**

## 4. Risici

1. **Apple 4.2-afvisning** (medium): mitigeret af Fase 4; fallback = mere native UI i shell
2. **Billing-regler i bevægelse** (lav m. v1-strategien): køb-fri app er immun; genbesøg ved IAP-behov
3. **Remote-URL-afhængighed**: app er død uden net → offline-skærm + cached skal er minimumskravet (Fase 3)
4. **HealthKit-review**: sundheds-apps får ekstra scrutiny; usage-strings og privacy labels skal være vandtætte
5. **EU/PWA-politik**: ustabil — endnu en grund til native apps frem for ren PWA

## 5. Beslutninger der skal træffes (åbne)

1. Billing v1: køb-fri native apps (anbefalet) vs. IAP fra start?
2. HealthKit i v1 (anbefalet — det er 4.2-forsikringen) eller v1.1?
3. App-navn/bundle-id: `eu.nowmakeit.app`? Kræver firma-konto eller personlig?
4. Skal production-branch i Vercel rettes til `main` nu? (anbefalet: ja, Fase 6 forudsætter det)
