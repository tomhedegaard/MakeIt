# Landing-site UX-audit — hele rejsen, som brugeren ser den

**Dato:** 2026-08-11 · **Status:** Audit færdigt · **P1 (A1–A5), C (C1–C6) og
P2 (A4, A6, A7, B6 + B1-light) er implementeret** — se opgaveskemaet
**Metode:** Screenshot-walkthrough af hele scroll-forløbet på desktop (1440×900,
27 stop) og mobil (390×844, 38 stop) mod lokal build af produktionskoden, plus
gennemgang af alle marketing-komponenter og copy. Perspektiv: førstegangs-
besøgende uden invite-kode.

---

## Hovedkonklusion

Designsproget er stærkt og genkendeligt — den mørke editorial-typografi skiller
sig ud fra alt andet i fitness-kategorien. Men rejsen igennem sitet afslører
**tre deciderede fejl (én kritisk), en side på ~20.000 px / 27 skærmes scroll
uden ét eneste foto, og kun ét interaktivt element** — placeret seks skærme
nede. Dertil blander straps/udstyrs-indholdet budskabet fem steder uden for
loyalty-konteksten. Fejlene kan fixes på en dag; grafik- og
interaktivitetsløftet er den reelle designopgave.

---

## A. Fejl fundet under gennemgangen

**A1 · Prisen viser bogstaveligt talt "[XX] kr/md" — KRITISK.**
Priskortet i value-sektionen viser placeholder-tokens ("[XX] kr/md", overstreget
"~[YY] kr/md") i produktion. Det er sidens vigtigste konverteringspunkt, og
det ser ud som en glemt udfyldning. Enten sættes en reel (evt. "fra")-pris, en
"beta-pris annonceres ved launch"-formulering — eller kortet skjules til
prisen er låst. (`src/lib/pricing.ts` + `ValueSection`.)

**A2 · Mobil-navigationen er klippet ud af skærmen — KRITISK.**
Ved 390 px overflower headeren: "Log ind"-knappen er halvt klippet, og
hamburger-triggeren (som ligger efter den i DOM'en) er helt ude af viewporten.
Mobilbrugere kan reelt ikke åbne menuen. Sprogvælgeren (Dansk/English som to
fulde knapper) stjæler pladsen — kollaps den til ét ikon på mobil.
(`MarketingNav`.)
*Fix-fund:* Under implementeringen viste bug'en sig dybere: headerens
`backdrop-blur` gør den til containing block for det fixed-positionerede
menu-sheet, så `top-14 bottom-0` kollapsede sheetet til højde 0 — menuen var
usynlig i produktion selv hvor hamburgeren kunne rammes. Løst med eksplicit
højde (`h-[calc(100dvh-3.5rem)]`); sprogvælgeren er flyttet ned i sheetet.

**A3 · Cookie-banneret dækker kritisk indhold.**
På mobil dækker banneret ~45 % af viewporten — inkl. hero-CTA'erne — på hele
første besøg. På desktop ligger det præcis oven på venteliste-formularens
submit-knap. Gør det til en lav én-linjes bar i bunden, eller auto-kollaps
efter første scroll. (`CookieBanner`.)

**A4 · Hero-sublinens reveal ligner en fejl.**
Clip-reveal'et viser afklippede ord midt i scroll ("1:1-coa", "HRV-st") i
sekunder ad gangen. En opacity/maske-reveal pr. ord i stedet for hård clip
ville fjerne "broken text"-øjeblikket. (`Hero`.)

**A5 · "Tre fra crewet" — men der vises fire citater.**
Copy-fejl i testimonials-introen (fjerde citat blev tilføjet senere).

**A6 · Headline kolliderer med tekst i Mind-sektionen.**
Ved 1440 px løber "REGNESTYKKET." ind i højre kolonnes afsnit. Clamp-værdien
er for aggressiv for de lange danske ord. (`PillarsSection`, mind-pillar.)

**A8 · Hero-CTA'erne var usynlige — altid. KRITISK (fundet under P2).**
`Få adgang`, ventelistelinket og trust-linjen sad i en `motion.div` hvis
opacity blev drevet af scroll-progress. Den motion-value opdaterede aldrig:
inline-stilen stod på `opacity: 0` ved *enhver* scroll-position, mens
transform-værdierne på samme element opdaterede korrekt. Sidens primære
konverteringsknap har altså aldrig været synlig i produktion — det forklarer
også, hvorfor CTA'erne manglede i alle screenshots i den oprindelige
gennemgang. Løst ved at afkoble indholdets synlighed fra scroll helt:
subline og CTA-blok animeres nu ind ved mount (`initial`/`animate`), samme
mønster som eyebrow og headline, der beviseligt virkede. Pin'et beholder
sit parallax/dissolve-udtryk via glød og exit-fade.

**A9 · Hero-stats lå uden for skærmen bag exit-dissolven (fundet under P2).**
Stats-rækken lå inde i det 100vh-høje sticky-lag med `overflow-hidden`.
Hero-indholdet er højere end 900 px, så rækken lå under fold'en og nåede
først ind i viewporten, efter exit-dissolven havde tonet hero ned til 15 %
opacity. Løst ved at flytte rækken ud af pin'et som selvstændigt bånd
(`StatsBand`) plus et lavere clamp-loft på headline, så resten af
hero-indholdet faktisk kan være på én skærm.

**A7 · Pinned hero holder samme billede i 2-3 skærmes scroll.**
Headline står alene i næsten hele pin-forløbet; subline, CTA'er og stats
kommer først sent. En utålmodig besøgende scroller forbi uden at have set
value prop eller én knap. Kortere pin (260vh → ~160vh) og tidligere reveal.

---

## B. UX & konvertering — den nysgerrige besøgendes rejse

**B1 · Siden er for lang: 27 skærme på desktop.**
Pillars-sektionerne (6 stk. i samme layout: headline venstre, bullets højre)
og AppShowcase fortæller delvist samme historie. Anbefaling: skær 30-40 % —
slå pillars sammen til 3-4, vis 8 FAQ-punkter med "se alle", og stram de
sektionsafstande der i dag giver hele, tomme sorte skærme mellem sektioner.

**B2 · Der findes ikke ét foto eller én video på hele sitet.**
Alt er typografi. Det er konsekvent — men for en *fitness*-platform mangler
beviset: mennesker der løfter. Ét visuelt lag ville løfte hele sitet uden at
bryde designsproget: monokrome/duotone crew-fotos fra Amagerbro-loftet, et
10-sekunders form-check-klip (før/efter-overlay), en rigtig HRV-trendgraf.
Kræver asset-produktion (foto/video-session) — det kan ikke kodes frem.

**B3 · Kun ét interaktivt element — og det ligger seks skærme nede.**
Motor-playgrounden (sliderne) er sitets bedste idé og eneste "grib mig"-
element. Forslag til flere: (a) mini-HRV-graf hvor man kan trække i
søvn/alkohol og se readiness flytte sig, (b) tier-simulator ("hvor mange Reps
giver din uge?"), (c) form-check-demo med eksempelvideo og AI-verdict,
(d) hover-mikrointeraktioner på phone-mockups (de er statiske i dag).
Prioritér (a) eller (c) — de demonstrerer produktværdi, ikke gimmick.

**B4 · Tomme flader.**
Tier-kortenes højre kolonne er helt tom på desktop (halvdelen af sektionens
bredde), og phone-mockups har store tomme områder i midten. Det er de oplagte
pladser til B2-grafikken.

**B5 · Social proof uden ansigter.**
Testimonials bruger initial-cirkler og pseudonyme handles — det læses som
udfyldningsindhold. Rigtige fornavne + fotos (eller video-citater) ville
fordoble troværdigheden; alternativt drop kort-formatet og brug ét stærkt
citat pr. sektion.

**B6 · Konsistens i sprog.**
Engelsk hero ("MADE FOR THOSE WHO LIFT.") + dansk alt andet er et bevidst
brandvalg — men hold CTA'er og labels konsekvent danske ("START DIN JOURNEY"
er halvt/halvt).

---

## C. Straps & udstyr ud af landingssitet

Princip (bekræftet af ejer): udstyr hører kun hjemme hvor det er *belønning*
(Reps/tiers). Inventar over alle forekomster:

| # | Sted | I dag | Handling |
|---|---|---|---|
| C1 | Hero-stat | "Solgte straps 50.142 + stigende" | Erstat med resultat-stat (PR'er sat i beta / aktive medlemmer beholdes) |
| C2 | Hero-subline | "MakeIt er ikke bare straps og cuffs." | Omskriv app-first — sælg platformen uden at definere den via shoppen |
| C3 | Marquee | STRAPIT · HOOKIT · 50.000+ LIFTS | Erstat med platform-budskaber: HRV-AWARE · AI + COACH · CREW · KØBENHAVN |
| C4 | Crew-kort | "Fri af shoppen" (webshop-forklaring) | Erstat kortet — fx "Åben motor" eller buddy-systemet |
| C5 | OriginSection | Hele sektionen er StrapIt-fabrikshistorie (est. 2018, syet på Amagerbro, "sælges hos PureGym, SDU…", 100 dages retur) | Fjern fra landing eller kondensér til én linje i footeren; fabrikshistorien hører til på webshoppen |
| C6 | Footer-blurb | "Webshoppen nowmakeit.eu kører som altid…" | Nedton til diskret link uden forklaring |

**Beholdes bevidst:** Tiers-unlocks ("custom-strap-farve", "limited drops"),
Reps-pillarens reward-shop og testimonial-sætningen om at spare op til en
brodéret strap — dér er udstyret belønning, hvilket er præcis den kobling
loyalty-programmet skal eje.

---

## D. Opgaveskema

Prioritet: **P1** = fejl, fix nu · **P2** = copy/struktur, denne uge · **P3** =
design/produktion, kræver beslutning eller assets. Estimat: S < ½ dag ·
M = 1-2 dage · L = uge+.

| ID | Opgave | Fil/sektion | Prio | Est. |
|---|---|---|---|---|
| A1 | Reel pris eller "annonceres ved launch" i priskortet | `pricing.ts`, `ValueSection` | P1 | S |
| A2 | Fix mobil-header-overflow; sprogvælger → ikon på mobil | `MarketingNav` | P1 | S |
| A3 | Cookie-banner → lav bar / auto-kollaps efter scroll | `CookieBanner` | P1 | S |
| A5 | "Tre" → "Fire fra crewet" (da+en) | `Marketing.json` | P1 | S |
| C1-C6 | Straps-dekobling jf. afsnit C (copy + fjern Origin) | Hero, Marquee, Crew, Origin, Footer + i18n | P2 | M |
| A4 | Blødere subline-reveal (ord-for-ord i stedet for clip) | `Hero` | P2 | S |
| A6 | Mind-headline clamp/ombrydning ved 1440px | `PillarsSection` | P2 | S |
| A7 | Kortere hero-pin, tidligere CTA-reveal | `Hero` | P2 | S |
| B1 | Skær sidelængde (FAQ-fold til 8 + "vis alle", strammere sektionsrytme, Origin fjernet) — **delvist: 19.954 → 16.708 px desktop (−16 %)** | `FaqList`, sektions-padding | P2 | M |
| B1b | **Rest af B1: slå de 6 pillars sammen til 3-4** — sletter indhold, kræver redaktionel beslutning (hvilke lægges sammen?) | `PillarsSection` + i18n | P2 | M |
| B6 | Konsekvent dansk i CTA'er | i18n | P2 | S |
| B3 | 1-2 nye interaktive demoer (HRV-graf eller form-check-demo) | nye komponenter | P3 | M-L |
| B2/B4 | Foto/video-lag: crew-fotos, form-check-klip → tier-kort + phones | asset-produktion + komponenter | P3 | L |
| B5 | Rigtige ansigter i testimonials | assets + `Testimonials` | P3 | M |

**Status:** P1, C og P2 er kørt i den rækkefølge. Tilbage står **B1b**
(pillar-sammenlægning — redaktionel beslutning) og **P3** (B2/B3/B5), der
kræver foto-/video-assets. Det er den investering der flytter sitet fra
"flot typografi" til "grib den nysgerrige besøgende".

**Læring på tværs af blokkene:** tre af de alvorligste fejl (mobilmenuen med
højde 0, CTA'er med opacity 0, stats bag dissolven) var alle *usynlige i
koden* og fandtes kun ved at køre siden og måle den faktiske DOM i en
browser. Kør den slags måling som fast led, når hero/nav-laget røres.
