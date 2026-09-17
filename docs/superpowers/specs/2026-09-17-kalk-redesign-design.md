# Kalk: nyt visuelt sprog for landing og app

**Dato:** 2026-09-17 · **Spec-revision:** 1
**Status:** Retning valgt af Tom (koncept B "Kalk" med udvalgte elementer fra A og C). Åbne beslutninger i §7.
**Branch:** `claude/kalk-redesign` (bygger på `claude/design-phase0-quickfixes` @ `7209696`)
**Forudsætninger:** design review 2026-09-16, koncepterne A, B og C (links i §9)
**Uden for scope:** nowmakeit.eu (webshop), mailskabeloner (`src/lib/email/templates/*`, eget spor), coach-konsollen `/coach/*` (forbliver mørk i v1), ny prisfremstilling

---

## 0. Verificeret i koden (ikke antaget)

| Påstand | Evidens |
|---|---|
| Alle flader farves via tokens `--bg`, `--fg`, `--line*` osv. | `src/app/globals.css:6-45`, `@theme inline` l. 60-113 |
| Fonte kommer ind som tre CSS-variabler, som Tailwind læser inline | `layout.tsx:12-28` (`--font-*-stack`), `globals.css:110-112` |
| Kun 32 filer har hardcodede mørke farver, og 8 af dem er mailskabeloner | `grep` efter `#0A0A0B`, `#F5F2EC`, `rgba(245,242,236`, `bg-black`, `text-white` osv. |
| `.btn` inverterer via tokens, så hover virker i begge temaer | `globals.css` `.btn:hover { background: var(--fg); color: var(--bg) }` |
| `/session/[id]` ligger under `(app)`-layoutet og `AppShell` | `src/app/(app)/session/[id]` |
| `next/font/google` har `Big_Shoulders` (variabel, 100-900), `Geist` og `Geist_Mono` | `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`. Bemærk: familien hedder nu "Big Shoulders", ikke "Big Shoulders Display". |
| Grain-laget bruger `mix-blend-mode: overlay` med lys støj og er tunet til mørk baggrund | `globals.css:204-215` |
| Capacitor-shells er sat til mørk baggrund | `capacitor.config.ts:23,36` (`#0A0A0B`) |
| Motoren har **ingen** funktion til at afvise en ændring. Der er intet "behold oprindelig plan" | `src/lib/adaptive/*` og `src/components/adaptive/*`: ingen decline/revert-sti. `apply.ts` anvender aktive tilpasninger. |
| Der findes allerede en begrundelses-strimmel til motorændringer | `src/components/adaptive/AdaptiveReasonStrip.tsx`, `engine-strip.ts`. A2-chips bygges oven på den, ikke ved siden af. |
| Kalk-koncept B's krop- og mad-farver fejler AA som 11 px tekst på `#E7E9EB` (4,25 og 4,12) | Kontrastberegning. Rettet i §3. |

## 1. Problem

Det nuværende "strength editorial"-sprog er konsekvent, men det er mørkt, redaktionelt og tekstbåret. Reviewet viste, at landingssiden ikke viser produktet, og at appen mangler fælles byggeklodser. Tom har valgt koncept B "Kalk" som ny retning: dagslys i et træningscenter, kold kalk og beton, vægtskive-typografi og én orange signalfarve. Samtidig ønsker han de bedste idéer fra A og C med.

## 2. Beslutning

**Kalk bliver et tema-scope, ikke en ny kodebase.** Tokens beholder deres navne. Et nyt scope `[data-theme="kalk"]` giver dem lyse værdier og skifter fontene. Et andet scope `[data-theme="nat"]` bevarer det mørke sprog til de bevidst mørke zoner. Alle komponenter, der allerede bruger tokens, skifter tema uden ændringer.

- **Kalk (lyst):** landingssiden, login, onboarding og hele medlemsappen.
- **Nat (mørkt):** live-sessionen `/session/[id]` ("session-tilstand er altid mørk") og `/coach/*` i v1.
- Udrulningen sker flade for flade ved at sætte `data-theme="kalk"` på et layout. Intet skifter, før det bliver slået til.

Fravalgt (én linje hver):
- *Fuld omskrivning af alle komponenter:* for dyrt, og tokenlaget gør det overflødigt.
- *`:root` direkte til lyst:* skifter coach og session på én gang og kan ikke fasedeles.
- *Kun at redesigne landingssiden:* så modsiger landing og app hinanden, og B's pointe er netop et samlet sprog.

## 3. Designsproget "Kalk"

### 3.1 Farver

| Token | Kalk | Nat (uændret i dag) | Rolle |
|---|---|---|---|
| `--bg` | `#E7E9EB` | `#0A0A0B` | Side |
| `--bg-2` | `#F4F5F6` | `#111113` | Kort, flader |
| `--bg-3` | `#DCDFE2` | `#18181B` | Indlejrede felter, stepper |
| `--bg-elev` | `#FFFFFF` | `#1F1F23` | Sheets, popovers |
| `--fg` | `#0D0F12` | `#F5F2EC` | Tekst, primærknap |
| `--fg-dim` | `#4A4F57` | `#A8A6A0` | Sekundær tekst (6,8:1) |
| `--fg-faint` | `#5A6069` | `#56554F` | Metadata (5,2:1 på `--bg`, 4,7:1 på `--bg-3`) |
| `--line` / `-strong` / `-bright` | `rgba(13,15,18,.10/.18/.32)` | uændret | Hairlines |
| `--signal` | `#E4570F` | `#F5F2EC` | Kalk-orange. Kun grafik (≥ 3:1 mod `--bg`/`--bg-2`), aldrig tekst, aldrig på `--bg-3` (2,8:1) |
| `--signal-ink` | `#A8380B` | `#F5F2EC` | Orange som tekst (5,3:1) |
| `--body` | `#A8380B` | `#FF9C41` | Krop |
| `--food` | `#116A35` | `#45C487` | Mad |
| `--heart` | `#BE123C` | `#F2545B` | Hjerte |
| `--mind` | `#1D4ED8` | `#5B9DF5` | Sind |
| `--ok` / `--warn` / `--danger` | `#166534` / `#854D0E` / `#B91C1C` | uændret | Status (alle ≥ 5,3:1) |

Doseringsreglen fra `DOMAIN_COLOR_SYSTEM.md` gælder uændret. **Orange er ikke en ny domænefarve.** Orange er Kalks "noget ændrede sig"-signal og må kun bruges til:
- overstregningen når motoren ændrer en værdi,
- aktiv tab-indikator,
- progress,
- fokusring på lyse flader,
- én grafisk markering pr. sektion på landingssiden.

**Interaktion forbliver monokrom.** Primærknapper er blæk-piller (`--fg` på `--bg`). Koncept B's orange "Log sæt"- og ventelisteknapper bliver *ikke* taget med.

### 3.2 Typografi

| Rolle | Kalk | Erstatter |
|---|---|---|
| Display | Big Shoulders 800/900, versaler, tracking `-0.005em`, line-height `.86-.9` | Archivo Black |
| Brød | Geist 400/500/600 | Inter |
| Tal, labels | Geist Mono 400/500, tabular-nums | JetBrains Mono |

Skalaen har seks trin og er identisk med reviewets forslag: Display, Title, Heading, Body, Data og Label.

### 3.3 Form og tekstur
- **Radius:** interaktive elementer er piller, kort 14 px, felter 10 px, telefonrammer 16 %.
- **Grain:** mørk støj med `mix-blend-mode: multiply` og opacity ~.35 på Kalk. Den eksisterende lyse overlay beholdes på Nat.
- **Rack-grid:** en tynd kg-lineal (`.rule`) som strukturelement mellem landingssektioner og i telefonernes skalaer. Den er et Kalk-signaturelement og må kun bruges, hvor den markerer en sektionsgrænse.
- **Mørk blok:** højst én pr. side (Hjerte-cellen i bento eller Adgang-panelet). Den bruger Nat-tokens via `data-theme="nat"` og er aldrig en hardcodet farve.

### 3.4 Øvelsesvisuals: MoveKit, aldrig tegnede figurer

Tom har købt MoveKit, et bibliotek med 206 renderede 3D-øvelsesklip i `MoveKit/`. Klippene er gitignored og fylder 468 MB. 19 af dem er allerede konverteret og ligger i `public/exercise-demos/`, hvor `ExerciseDemo`, `SessionExerciseDemo` og `ExerciseHero` bruger dem via `resolveDemoAssets`.

- **Brugsregel:** Kalk viser aldrig håndtegnede pindefigurer eller SVG-kroppe til øvelser. Alle øvelsesvisuals kommer fra MoveKit-loopet (`demo_asset_url`). Findes der intet klip, bruges den eksisterende fallback `AnatomyFigure`.
- **Farve:** klippenes baggrund er en lys, varm grå (`#DFE2D3` til `#F5F7E9`), altså næsten Kalk. På lyse flader vises de på `--bg-2` med `mix-blend-mode: multiply`, så baggrunden smelter ind. På Nat-flader (`/session`) vises de som et lyst indlagt kort, som i dag. Den røde muskelmarkering er klippets egen anatomi-farve og tæller ikke som domæne- eller signalfarve.
- **Form-check:** medlemmets **egen optagelse** er hovedsagen. MoveKit-loopet vises ved siden af som "Reference" med samme øvelse. Et MoveKit-klip må aldrig fremstå som medlemmets video.
- **Bevægelse:** et loop afspilles kun, når det er i syne (IntersectionObserver). Det holder pause ved reduceret bevægelse og har en synlig pause-knap, når det kører længere end 5 sekunder.
- **Kendte huller:** `front-squat` har intet klip. De 188 øvelsesudkast fra migration 0052 har metadata men ingen hostede videoer endnu, og hosting (`public/` eller Supabase Storage) er stadig en åben beslutning. MoveKit er et lukket katalog uden rig, så nye øvelser kræver en custom-render. Interaktiv 3D er et separat v2-spor (`docs/EXERCISE_3D_RESEARCH.md`).

## 4. Hvad vi tager fra A og C

Hver idé er vurderet på designværdi (fortæller den produktets kerne bedre?) og pris (bryder den Kalks enhed?).

| # | Element | Fra | Hvor i Kalk | Hvorfor |
|---|---|---|---|---|
| A1 | **Morgenrapporten som scroll-fortælling.** En sticky telefon skifter mellem 4 tilstande (søvn → HRV → stress → beslutning), mens rapportlinjerne scroller forbi. | A | Erstatter B's statiske "Planlagt → efter 05:30"-tabel i Motor-sektionen. Tabellen bliver indholdet i tilstand 4. | Det er produktets tese fortalt i den rækkefølge, motoren tænker. Stærkeste idé på tværs af de tre koncepter. |
| A2 | **"Hvorfor"-chips** på enhver motorændring: Søvn 5 t 12 m · HRV 48 ms · Stress 4/5 | A | Landingens beslutningsskærm **og** appens dagens-pas-kort | Gør motoren gennemsigtig og er et app-mønster, ikke kun marketing. |
| A3 | **Stemmer: 1 stort citat + 2 små** | A | Erstatter B's tre ens forskudte kort | Tydeligt hierarki. Et citat kan bære sektionen. |
| A4 | **Munks håndskrevne signatur** (SVG) under form-check-svaret | A | Munk-sektionen og form-check-skærmen i appen | Tillid. Underskriften er det fysiske bevis på "mennesket bag". |
| C1 | **"Behold den oprindelige plan"** som sekundær handling. **Kræver ny motorfunktion (D8).** | C | Appens omskrevne pas og beslutningsskærmen på landingen, men først når funktionen findes | Brugeren bevarer kontrollen, og det dæmper frygten for, at en algoritme bestemmer. |
| C2 | **Nattens tidslinje 23:40 → 05:30 → 06:45** som graf med tre aflæsninger | C | Øverst i Motor-sektionen og erstatter B's tre tekstlinjer | Viser tidsdimensionen, som tabellen mangler. |
| C3 | **Munk-flow med tidsstempler:** +0 t optag · +4 min AI-udkast · +6 t Munk skriver under · maks 24 t | C | Erstatter B's tre generiske trin | Konkrete tal slår adjektiver. |
| C4 | **"Du er her" og "Coach School åbner"** på progressionen | C | Oven på B's vægtskiver i Crew | Skiverne er smukke men stumme. Markørerne giver dem betydning. |
| C5 | **Morgenens signal:** fire domæner i én række med status | C | Appens dashboard (readiness-rækken fra reviewet) | Samler HRV, Sind og Mad over folden uden at stjæle fokus fra dagens pas. |
| C6 | FAQ: "Hvorfor er det invite-only?" nu. "Kan jeg sige nej til et omskrevet pas?" først når D8 er leveret. | C | FAQ | Besvarer de to reelle indvendinger. |

**Fravalgt med vilje:**
- C's pulskurve gennem siden: to strukturelle greb (rack-grid og kurve) konkurrerer.
- C's 3D-telefontrio i hero: B's vægtskive-hero er stærkere og har én idé.
- A's gigantiske 05:30-ur i hero: dobbelt hero-idé.
- Unbounded og Archivo Black: én typografisk stemme.
- A's mørke tema som helhed.
- Drivende grafer (C): bevægelsen fortæller ikke noget.

## 5. Landingens struktur (8 sektioner)

1. **Hero:** H1 "Bygget til dem der løfter.", én sætning, "Få adgang" og tekstlinket "Se hvordan motoren virker". Til højre vægtskive-tallene 150 (overstreget i orange) og 135 kg samt dashboard-telefonen.
2. **Motor:** C2 nattens tidslinje, derefter A1 morgenrapport med sticky telefon og A2 hvorfor-chips i sidste tilstand. C1 behold-plan tilføjes først, når D8 er leveret.
3. **Fire systemer:** B's bento med 4 celler (Hjerte-cellen i Nat), derefter B's swipebare rack med 5 app-skærme.
4. **Munk:** B's MUNK-ordmærke og skive-monogram, C3 tidsstempel-flow, form-check-kort med AI-udkast overstreget og A4 signatur.
5. **Crewet:** B's vægtskiver, C4 markører og reps-måler.
6. **Stemmer:** A3, tre ægte citater (§7 D6).
7. **Adgang:** B's mørke panel (Nat-scope) med ventelisteformular. Knappen er lys pille, ikke orange.
8. **FAQ og footer:** 6 spørgsmål inkl. C6. Footeren har ordmærket og det engelske slogan "Made for those who lift."

Taste-regler gælder på landingen:
- nul tankestreger,
- højst én eyebrow pr. tre sektioner,
- ingen sektionsnumre,
- ingen custom cursor eller spotlight,
- ét motiveret bevægelsesgreb pr. sektion.

Anker-ID'er bevares: `#crew`, `#engine`, `#tiers`, `#waitlist`, `#faq`. Nye ID'er bliver aliaser, fordi links i mails og shells peger på de gamle.

## 6. Appen i Kalk

- **Dashboard "i dag først":**
  - hilsen og stribe,
  - dagens pas som eneste primærkort, med A2-chips (via `AdaptiveReasonStrip`) når motoren har ændret noget, og C1 behold-plan når D8 er leveret,
  - C5 morgenens signal,
  - besked fra Munk,
  - resten.
- **Fem faner:** I dag, Træn, Mad, Sind, Crew. "Mig" flytter til avataren i headeren. HRV nås via morgenens signal, Reps under Crew og Forskning under Mig. Aktiv fane markeres med en orange streg (`--signal`) og ikon i `--fg`.
- **Seks primitiver** fra reviewet: `PageTitle`, `SectionHeader`, `Card`, `EmptyState`, `Stat` og `Field`. De bygges i Kalk og virker i Nat, fordi de kun bruger tokens.
- **Nat-zoner:** `/session/[id]` sættes eksplicit til `data-theme="nat"`. Den sættes ikke bare "ikke kalk", fordi den ligger under et Kalk-layout.
- **Native shells:** statusbar-stil og baggrund følger temaet. Splash og ikon ændres først ved næste butiksudgivelse (§7 D3).

## 7. Åbne beslutninger (Tom)

| # | Spørgsmål | Anbefaling |
|---|---|---|
| D1 | Scope: landing og app, eller kun landing? | **Begge i rækkefølge.** Landingen først, fordi den er uafhængig og viser retningen. |
| D2 | Skal medlemmer selv kunne vælge mørkt tema i appen? | **Ikke i v1.** Nat-tokens findes og bruges i session og coach. Et brugervalg kommer efter lancering, når alle flader er migreret. |
| D3 | Splash, ikon og statusbar i native shells | **Statusbar nu** (kodeændring i bridge). **Splash og ikon** med næste butiksudgivelse. Det kræver din accept før indsendelse. |
| D4 | H1 på dansk ("Bygget til dem der løfter.") og det engelske slogan i footeren | **Ja.** |
| D5 | "412 aktive medlemmer" | **Fjernes.** Kalk-hero har ingen stats-bånd. |
| D6 | Tre ægte citater med fornavn, tier og startmåned | **Tom skaffer dem.** Indtil da vises sektionen ikke i produktion (feature-flag). |
| D9 | Hosting af de 188 MoveKit-klip (`public/` ca. 57 MB eller Supabase Storage) | **Supabase Storage** bag den eksisterende `demo_asset_url`-kontrakt. `public/` beholder de 19 bundlede til offline. |
| D8 | Skal medlemmer kunne afvise motorens ændring (C1)? Det kræver en migration (status `declined`), en server action og en regel for, hvad motoren lærer af et nej. | **Ja, men som eget spor med CTO-agenten.** Kalk-UI'et reserverer pladsen. Landingen lover det ikke, før det er i produktion. |
| D7 | Portræt af Munk | **Book et shoot.** Kalk klarer sig med ordmærke og monogram indtil da. |

## 8. Kvalitetsporte

- Kontrasttest i vitest: alle teksttokens i Kalk ≥ 4,5:1 mod `--bg` og `--bg-2`. Neutral tekst skal også klare `--bg-3`, og `--signal` skal være ≥ 3:1.
- Hver fase skal virke i demo-tilstand, have 0 konsolfejl og være screenshot-verificeret på 390 px og 1440 px (protokol i `PLATFORM_OVERVIEW.md` §8).
- `npm test`, `npm run lint` og `npm run build` skal være grønne. De 7 eksisterende tsc-fejl i testfiler må ikke stige.
- Reduceret bevægelse: alle nye animationer har et statisk slutbillede.
- Ingen hardcodet copy. da og en skal have samme nøgler.

## 9. Referencer

- Review: https://claude.ai/artifact/3zbLod9C8chXGc5s8pJPJq
- Koncept A · Morgenrapport: https://claude.ai/artifact/FNLcnB1XN1E44Q33Yddo4t
- Koncept B · Kalk: https://claude.ai/artifact/RkbAXuKzufPW3UCyDMUAED
- Koncept C · Puls: https://claude.ai/artifact/XbH66bPX3gBBA4HHAFgZRm
- `docs/DOMAIN_COLOR_SYSTEM.md`, `docs/CDO_AGENT.md`
