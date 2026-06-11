# Native shells — byg, kør og udgiv (Fase 3)

> Runbook for Capacitor-shellsene i `ios/` og `android/`.
> Arkitektur og faseplan: docs/APP_STORE_PLAN.md. Bundle-id: `eu.nowmakeit.app`.

## Princippet

Shellsene renderer den live app fra `https://makeit.tomhedegaard.dk`
(`server.url` i capacitor.config.ts). **Web-deploys opdaterer appsene
øjeblikkeligt** — shells genudgives KUN ved ændringer i:
- capacitor.config.ts (UA-markør, plugins, farver)
- Native permissions (Info.plist / AndroidManifest.xml)
- Plugin-versioner eller nye Capacitor-plugins
- App-ikoner/splash (kør `npm run icons` + `npx @capacitor/assets generate`)

Efter enhver af disse: `npx cap sync` og byg på ny.

## Dev-loop

```bash
npx cap sync            # kopiér config + opdater native plugins
npx cap open ios        # åbner Xcode (kræver Xcode + signing-team valgt)
npx cap open android    # åbner Android Studio (bundler egen JDK)
```

- **iOS**: Capacitor 8 bruger SPM — ingen CocoaPods. Vælg dit team under
  Signing & Capabilities første gang. Kør på simulator eller enhed.
- **Android**: Kræver Android Studio (ikke installeret på dev-Mac'en
  pr. 2026-06-11 — kun det rå SDK ligger i ~/Library/Android/sdk).
  Installér Android Studio (bundler egen JDK), åbn `android/`, lad
  Gradle synce. CLI-builds derefter:
  `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`

## Hvad mangler før store-indsendelse (ejer: Tom)

| # | Opgave | Hvor |
|---|--------|------|
| 1 | **Apple Team ID** indsættes i `public/.well-known/apple-app-site-association` (erstat `TEAMID`) | Apple Developer → Membership |
| 2 | **Push Notifications capability** slås til på App ID + i Xcode (Signing & Capabilities → + Capability) | developer.apple.com + Xcode |
| 3 | **APNs-nøgle (.p8)** oprettes og gemmes som env (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`) — bruges af den kommende server-sender | Apple Developer → Keys |
| 4 | **Firebase-projekt** for `eu.nowmakeit.app` → `google-services.json` lægges i `android/app/` (gitignored? nej — committes) | console.firebase.google.com |
| 5 | **FCM service account-nøgle** som env til server-senderen | Firebase → Project settings → Service accounts |
| 6 | **Play Console signing** → kopier app-signing SHA-256 til `public/.well-known/assetlinks.json` | Play Console → App integrity |
| 7 | **Associated Domains** capability i Xcode: `applinks:makeit.tomhedegaard.dk` + `webcredentials:makeit.tomhedegaard.dk` | Xcode |

## Push-flow (status efter Fase 3)

- Web: VAPID web-push — virker end-to-end ✓
- Native: token-registrering virker (NativePushToggle → `push_subscriptions`
  med platform=ios/android, endpoint `native:<platform>:<token>`).
  **Server-side APNs/FCM-afsendelse er IKKE bygget endnu** — kræver
  nøglerne ovenfor (3+5). Web-push-senderen skipper native rækker
  (endpoint-form-filter i src/lib/push.ts).

## Udgivelse

- **iOS**: Xcode → Product → Archive → Distribute → TestFlight.
  Husk demo-konto til review (MUNK-01-flowet) + privacy labels
  (sundhedsdata!). Apple 4.2-tjekliste i APP_STORE_PLAN §1.
- **Android**: Android Studio → Build → Generate Signed Bundle (AAB)
  → Play Console internal track.
- Versionsregel: MARKETING_VERSION/versionName følger semver;
  web-ændringer kræver ALDRIG ny app-version.
