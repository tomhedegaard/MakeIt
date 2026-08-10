# Scanfit-partnerskab — exploration

**Dato:** 2026-08-10 · **Status:** Research færdig, beslutning udestår
**Spørgsmål:** Kan et samarbejde med [Scanfit](https://scanfit.dk) give MakeIt-crewet
bedre data (kropskomposition + madlogning) og samtidig skabe salg for Scanfit —
et reelt win-win?

> Kompileret fra live web-research (aug 2026). Selve scanfit.dk kunne ikke
> hentes direkte fra dette miljø (egress-blokeret), så produktdetaljer er
> krydstjekket via søgeresultater, App Store/Google Play-lister, Trustpilot
> og danske test-sites. Punkter markeret **[verificér]** skal bekræftes
> direkte med Scanfit før beslutning.

---

## TL;DR / anbefaling

**Ja til samarbejdet — men i to faser, og fase 1 er kommerciel, ikke teknisk.**

1. **Fase 1 (nu, lav indsats):** Affiliate-/rabataftale. Scanfit-hardware som
   anbefalet gear til crewet — rabatkode, evt. Reps-reward, coach-blåstempling
   fra Munk. Skaber det salg for Scanfit, som er vores forhandlingskort, uden
   at røre de fire søjler eller kræve en linje kode.
2. **Fase 2 (efter M6, betinget):** Dataintegration — Body Pilot-vejninger
   (vægt, fedt%, muskelmasse) ind i nutrition plan-adjusteren via samme
   OAuth/sync-mønster som WHOOP/Oura/Polar i `src/lib/hrv/wearables/`.
   **Betingelse:** Scanfit skal have (eller ville bygge) et cloud-API.
   Det har de efter alt at dømme **ikke i dag** — og der er indikationer på,
   at brugerdata ligger lokalt på telefonen, ikke i en cloud vi kan hente fra.

Den vigtigste enkeltindsigt: **Scanfit er et meget lille selskab (ApS, stiftet
feb. 2024, 1 registreret ansat).** Det er både muligheden — de er sultne efter
distributionskanaler, og MakeIt kan blive deres første B2B-integrationspartner
— og risikoen: ingen offentlig API, uklar teknisk kapacitet, og partner-risiko
hvis selskabet ikke overlever. Fase 1 er derfor designet til at være værdifuld
alene, selv hvis fase 2 aldrig sker.

---

## 1. Hvem og hvad er Scanfit

### Selskabet

| | |
|---|---|
| Juridisk enhed | Scanfit ApS, CVR 44671336 |
| Stiftet | 27. februar 2024 |
| Adresse | Fruerhøj 28, 2970 Hørsholm |
| Direktør | Hans Regel Landbo |
| Ansatte | 1 (registreret) |
| Branche | Detailhandel med elektriske husholdningsapparater |
| Kontakt | kundeservice@scanfit.dk · 70 80 47 56 |
| Webshop | scanfit.dk (Shopify) + myscanfit.com (international) |
| Trustpilot | **4,7/5 "Fremragende"**, ~700 anmeldelser |

Kilder: [Proff](https://www.proff.dk/firma/scanfit-aps/h%C3%B8rsholm/elektriske-artikler/0QLGMGI00BF),
[virmo.dk](https://virmo.dk/firma/44671336-scanfit-aps),
[Trustpilot](https://www.trustpilot.com/review/scanfit.dk).

### Produkterne

- **Body Pilot** — BIA-bioimpedans kropsscanner (smart-vægt). 14 målinger pr.
  vejning (markedsføres op til "42+ målinger"): vægt, fedt%, skeletmuskelmasse,
  visceralt fedt, "biologisk alder" m.v. Genkender automatisk op til 5 brugere.
  Har vundet "bedst i test" hos flere danske forbrugersites
  ([Forbrugsprisen](https://www.forbrugsprisen.dk/produktanmeldelser/scanfit-body-pilot),
  [Sports-freak](https://sports-freak.dk/scanfit-body-pilot-test/),
  [Tech Vejlederen](https://techvejlederen.dk/test-af-scanfit-body-pilot/)).
- **Madscanner Pro** — AI-madscanning: foto af måltidet → kalorier/makroer,
  parret med en køkkenvægt til gram-præcision. Sælges som tilkøb (~795 kr
  oveni **[verificér priser]**) eller i bundlen "Den komplette sundhedsrejse".
- **ScanFit-appen** ([iOS](https://apps.apple.com/dk/app/scanfit-food-body-analysis/id6736998705),
  [Android](https://play.google.com/store/apps/details?id=com.scanfit)) —
  gratis, "ingen abonnement". Samler mad- og kropsdata: "the only nutrition
  app that links every meal to your real body composition". Har en
  "Scanfit Coach" der læser 16 ugers kontekst. Synker med **Apple Health og
  Garmin** — både ind (skridt, aktive kalorier) og ud (ernærings- og
  kropsdata skrives tilbage til Health).

### Positionering

Deres kerneidé er præcis den samme kobling, vi selv jagter i nutrition-søjlen:
*"Madscanneren måler hvad du spiser, kropsscanneren måler hvordan din krop
reagerer — samlet i én app."* Dansk brand, dansk support, 2 års garanti,
100 dages prøveperiode. Målgruppen er bredere/mere consumer end MakeIt-crewet,
men overlappet (folk der vil se sammenhæng mellem kost og kropskomposition)
er reelt.

---

## 2. Hvorfor det er interessant for MakeIt

Vi har allerede besluttet retningen — Scanfit rammer to eksisterende
backlog-items direkte (`docs/MEAL_PLANNER_BACKLOG.sql`):

- *"Smart-scale integration (Withings / Renpho)"* — auto-log af vægt + body
  composition; "Plan adjuster bliver mere troværdig når scale-data flyder
  kontinuerligt." (prioritet: low)
- *"Foto-baseret off-plan logging via Claude vision"* — Madscanner-data er
  et alternativ/supplement til at bygge det selv.

Konkret produktværdi, hvis data flyder:

1. **Nutrition plan-adjusteren får ground truth.** I dag justerer vi kcal-mål
   på selvrapporteret vægt. Kontinuerlig fedt%/muskelmasse-data gør
   anbefalingerne troværdige og målbare ("+1,2 kg muskel på 8 uger" er et
   stærkere crew-flex end et vægttal).
2. **Coach-dashboardet** (adherence-sektionen) kan vise objektiv fremgang
   pr. medlem uden manuel indtastning.
3. **Reps/challenges** — vejnings-streaks og recomposition-challenges med
   rigtige måledata.
4. **Dansk økosystem-historie.** Dansk hardware + dansk coaching-platform er
   en god fortælling for begge brands — og Scanfits Trustpilot 4,7 gør dem
   trygge at anbefale.

Og for Scanfit: MakeIt-crewet er præcis deres drømmekunde (betalende,
committed, høj LTV), og en coach-anbefaling fra Munk er mere værd end
Google Ads-kliks (deres nuværende primære kanal, jf. tracking-parametrene i
deres URL'er). Det er dét salg, vi bringer til bordet.

---

## 3. Den tekniske virkelighed (vigtigst)

### Der findes ingen offentlig Scanfit-API

Ingen developer-portal, ingen API-dokumentation, ingen omtale af
tredjepartsintegrationer ud over Apple Health og Garmin. **[verificér:
spørg direkte om de har en intern API/backend med brugerdata]**

Værre: Body Pilot markedsføres med at den *"gemmer dine resultater på din
egen telefon eller tablet"*. Hvis det skal tages bogstaveligt, ligger data
**on-device, ikke i en cloud** — og så findes der ikke noget endpoint at
integrere mod, før Scanfit selv bygger cloud-sync. Appen har dog
konto-/abonnementshåndtering og en "Scanfit Coach" med 16 ugers kontekst,
hvilket *tyder på* en backend — billedet er uklart. Dette er
go/no-go-spørgsmålet for fase 2.

### Mulige datapaths, rangeret

| # | Path | Vurdering |
|---|---|---|
| 1 | **Scanfit bygger partner-API/webhook til os** (OAuth + daglig sync, samme mønster som `src/lib/hrv/wearables/sync.ts`) | Den rigtige løsning. Kræver at deres backend har data + at én-mands-firmaet prioriterer det. Realistisk kun hvis den kommercielle relation (fase 1) allerede giver dem omsætning. |
| 2 | **Via Apple Health** — Scanfit skriver allerede til Health | Blokeret for os i dag: MakeIt er en PWA og kan ikke læse HealthKit. Bliver relevant med Apple Watch-companion (M5) / native app (post-M6). Nul afhængighed af Scanfits goodwill — værd at huske som plan B. |
| 3 | **Via Garmin** — Scanfit synker med Garmin | Omvej med datatab; vi har ikke Garmin-integration i dag (kun WHOOP/Oura/Polar). Ikke en primær vej. |
| 4 | **Manuel/CSV-eksport** | Uvist om appen kan eksportere **[verificér]**. Friktion gør det uinteressant som andet end fallback. |

### GDPR

Kropskomposition og madlogning er helbredsdata (GDPR art. 9). Kræver
eksplicit samtykke pr. medlem, databehandleraftale og klart formål — samme
øvelse som wearables-integrationen, intet nyt afskrækkende. Fordel: dansk
modpart, samme jurisdiktion, dansk datatilsyn.

---

## 4. Strategisk fit — og konflikten med stop-doing-listen

`docs/STOP_DOING_LIST_2026-05.md` siger: fire søjler i 6 måneder, alt andet
deferred. Smart-scale-integration står allerede som **prioritet low** i
backloggen. En dataintegration nu ville være et brud på vores egen disciplin
— især én der kræver, at en ekstern én-mands-partner bygger API først.

**Men fase 1 er ikke et feature-build.** En rabatkode + anbefaling i
gear-guiden + evt. en Reps-reward er ren commercial ops: ingen migrations,
ingen nye surfaces, ingen vedligehold. Den kan køre nu uden at koste
søjle-tid, og den modner relationen så fase 2-beslutningen kan tages fra et
informeret sted efter M6.

Risici at have med i beslutningen:

- **Partner-risiko:** 1 ansat, stiftet 2024. Hvis Scanfit ApS lukker, dør
  integrationen — endnu en grund til at data-pathen via Apple Health (vores
  egen native app) er den langsigtede forsikring.
- **Hardware er formentlig white-label** (BIA-vægt med 5-bruger-genkendelse
  er standard ODM-vare) **[verificér]** — værdien ligger i deres app, brand
  og danske support, ikke i unik hardware. Påvirker ikke fase 1, men
  betyder at "eksklusivitet" på hardware ikke er meget værd.
- **Overlap-risiko:** Scanfits app har selv en "Coach" og bevæger sig mod
  kostplaner. I dag er de gear + tracking og vi er coaching + community —
  men aftalen bør ikke give dem indsigt i vores coaching-metode.
- **Anbefalings-risiko:** Anbefaler Munk et produkt, ejer vi skuffelsen hvis
  BIA-målingerne skuffer (BIA svinger med hydrering — kendt begrænsning).
  Mitigering: framing som trend-værktøj, ikke sandhedsmaskine — præcis som
  vi allerede framer HRV ("trends beat absolute values").

---

## 5. Forslag til deal-struktur

### Fase 1 — kommerciel (kan aftales på ét møde)

MakeIt leverer: Scanfit som anbefalet gear i onboarding/gear-guide,
crew-rabatkode (fx `MAKEIT-CREW`), evt. Body Pilot som Reps-reward på
øverste tier, omtale i community.

Scanfit leverer: crew-rabat (de kører allerede 300 kr-rabatkoder, så
15–20 % er realistisk at bede om), affiliate-kommission til MakeIt
**[forhandl: 10–15 % er normalt for fitness-affiliates]**, og en
**skriftlig hensigtserklæring om data-adgang** (fase 2) — den koster dem
intet nu, men giver os options-værdi og tester deres seriøsitet.

### Fase 2 — data (post-M6, betinget af API-afklaring)

OAuth-flow + daglig pull/webhook af vejninger (timestamp, vægt, fedt%,
muskelmasse, visceralt fedt) ind i eksisterende sync-arkitektur. Madscanner-
måltidsdata som mulig udvidelse senere — men vores egen Claude-vision
off-plan-logging (backlog) kan vise sig at gøre det overflødigt; afgør det
når fase 2 forhandles.

### Mødedagsorden med Scanfit (de 5 afklaringsspørgsmål)

1. Ligger brugerdata i jeres cloud eller kun on-device? Har I en intern API?
2. Er I villige til at bygge/åbne et partner-endpoint (OAuth + read-only
   vejningsdata) — og på hvilken tidshorisont?
3. Affiliate-vilkår: kommission, tracking (Shopify-rabatkode rækker), udbetaling.
4. Hardware-roadmap og lager/leveringssikkerhed (kan de levere hvis vi
   sender 100+ ordrer?).
5. Databehandleraftale + samtykkeflow — hvem ejer medlemmets data?

---

## 6. Anbefalet næste skridt

1. **Beslut fase 1-rammen internt** (rabat vs. Reps-reward vs. begge; om
   Munk vil lægge navn til anbefalingen — det er den reelle valuta).
2. **Kontakt Scanfit** (kundeservice@scanfit.dk / 70 80 47 56 — bed om
   Hans Regel Landbo direkte) med et kort pitch: "coaching-community af
   committed styrkeatleter, vi vil anbefale jeres gear, og på sigt
   integrere jeres data". Firmaets størrelse taget i betragtning er det
   sandsynligt at få direktøren i røret første opkald.
3. **Stil de 5 spørgsmål** — især #1/#2, som afgør om fase 2 nogensinde
   bliver mulig.
4. **Rør ikke kodebasen** før M6 + API-afklaring. Hvis fase 2 bliver
   aktuel, er arkitekturen givet på forhånd: nyt modul ved siden af
   `src/lib/hrv/wearables/{whoop,oura,polar}.ts` + en migration i stil
   med `0037_hrv_wearables.sql`.
