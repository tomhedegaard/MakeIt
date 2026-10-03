# Spec: MoveKit 577 — hele pakken ind i øvelsesbiblioteket

Dato: 03.10.2026 · Status: design godkendt af Tom 02.10.2026 (afsnit 2) · Relateret:
docs/EXERCISE_3D_RESEARCH.md (MoveKit v1), migration 0051–0053 (første import, 188 øvelser),
PR #115 (portræt-loops)

---

## 0. Hvad og hvorfor

MoveKit-pakken i `MoveKit/` er udskiftet med en opdateret version: 577 klip i 1936×1072 mod
206 klip før. Appen bruger i dag 204 af dem. Opgaven er at få resten ind i biblioteket,
bruge de nye klip til at lukke hullerne i de 20 kerneøvelser, og gøre biblioteket brugbart
med op mod 580 øvelser.

Leverancen er ét sammenhængende forløb: taksonomi, manifest, metadata, video, migrationer,
UI. Intet går live for medlemmer uden coach-review, og databasen røres først når Tom kører
`supabase db push`.

---

## 1. Udgangspunkt (målt 02.10.2026)

| Fakta | Værdi |
|---|---|
| Klip i pakken | 577 (`MoveKit/` og `movekit/` er samme mappe; macOS er case-insensitiv) |
| Format | H.264, 1936×1072, 30 fps, 3–13 sek, ingen lyd |
| Øvelser i live DB | 209: 207 publiceret, 207 med video |
| Klip brugt i dag | 204: 188 biblioteksøvelser + 16 klip der kun er kilde til kerneøvelser. Yderligere 2 kernekilder er også biblioteksøvelser |
| Ubrugte klip | 373 |
| Klip uden rød muskelmarkering | 48, de samme som før. Af de ubrugte: `cable-bar-pushdown`, `kettlebell-calf-raise` |
| Storage-bucket `exercise-demos` | 1182 objekter, 119 MB |
| Seneste migration | 0065 |

De 373 ubrugte fordeler sig groft: styrke ~276, mobilitet ~38, kondition ~35, plyometri ~13,
olympisk vægtløftning ~11.

Rød markering måles som antal pixels med r>120, r−g>45, r−b>45 over 16 frames i 480 px
bredde. Klip med markering har mindst 309 sådanne pixels, klip uden har 0.

---

## 2. Toms beslutninger

1. **Alt skal med**, også kondition, mobilitet og plyometri, med nye kategorier.
2. **Metadata genereres med multi-agent workflow** som ved de 188.
3. **Alle nye importeres som kladder** og godkendes af Munk i review-køen.
4. **Biblioteket får søgning og redskabsfilter.** Intet større redesign.
5. **Pipelinen styres af et manifest**, så næste pakke er en diff.
6. **Implementering i ét stræk** på en feature-branch. Stop før `db push` og før merge.

---

## 3. Taksonomi

### 3.1 Én kilde

Ny fil `src/lib/data/exercise-taxonomy.json`. Rækkefølgen i hvert array er
visningsrækkefølgen.

```json
{
  "categories": ["lower-body", "upper-body-push", "upper-body-pull", "shoulders", "arms",
                 "core", "full-body", "power", "mobility", "cardio"],
  "patterns": ["squat", "hinge", "lunge", "push-horizontal", "push-vertical",
               "pull-horizontal", "pull-vertical", "core", "isolation", "carry",
               "jump", "olympic", "mobility", "conditioning"],
  "equipment": ["barbell", "dumbbell", "kettlebell", "cable", "machine", "band",
                "bodyweight", "trap-bar", "sled", "suspension", "cardio-machine", "accessory"],
  "difficulty": ["beginner", "intermediate", "advanced"]
}
```

`src/lib/data/exercise-taxonomy.ts` eksporterer JSON'en typet samt `orderByTaxonomy(group,
values)`, der sorterer en mængde værdier i taksonomiens rækkefølge og lægger ukendte
værdier sidst i alfabetisk orden.

Læses af: coach-editoren (`ExerciseEditor.tsx`, i dag egne lister der mangler kettlebell,
band, isolation og carry), bibliotekets filtre, review-køens filter, `exercise-meta.test.ts`,
`scripts/build-wf-exercises.mjs` og `scripts/gen-exercise-seed.mjs`.

Databasen har ingen check-constraints på `category`, `pattern` eller `equipment`. Ingen
skema-migration.

### 3.2 Nye værdier og labels

| Gruppe | Nøgle | da | en |
|---|---|---|---|
| categories | `power` | Power | Power |
| categories | `mobility` | Mobilitet | Mobility |
| categories | `cardio` | Kondition | Cardio |
| equipment | `trap-bar` | Trap bar | Trap bar |
| equipment | `sled` | Slæde | Sled |
| equipment | `suspension` | Slynge | Suspension |
| equipment | `cardio-machine` | Kardiomaskine | Cardio machine |
| equipment | `accessory` | Småudstyr | Accessories |

Labels tilføjes i `messages/da/Train.json` og `messages/en/Train.json`. Mønstre vises ikke
for medlemmer og får ingen labels.

### 3.3 Tildelingsregler (gives til agenterne)

- `mobility`: stræk, rotationer, ledcirkler, balance, nakke- og holdningsdrills.
  Mønster `mobility`.
- `cardio`: løb, gang, cykling, roning, svømning, kardiomaskiner, sjippetov, battle ropes,
  skyggeboksning. Mønster `conditioning`.
- `power`: plyometri (hop, bounds, kast) med mønster `jump`, og olympisk vægtløftning
  (clean, jerk, snatch og deres træk-varianter) med mønster `olympic`.
- Alt andet følger de eksisterende 7 kategorier og 10 mønstre.
- Redskab: smith machine og andre faste maskiner er `machine`. EZ-bar og landmine er
  `barbell`. Håndklæde, rygsæk, kosteskaft og foam roller er `bodyweight`. Bold,
  vægtskive, sjippetov, battle ropes, slider og wrist roller er `accessory`. Løbebånd,
  cykel, romaskine, ski-erg, crosstrainer, trappemaskine og lignende er `cardio-machine`.
  Løb, gang og svømning uden maskine er `bodyweight`.

### 3.4 Flyt af eksisterende øvelser til de nye kategorier

I migration 0067 (afsnit 6.2). Kun rækker der stadig har den kategori, de har i dag, så en
coach-rettelse ikke overskrives:

| Slug | Fra | Til |
|---|---|---|
| barbell-snatch, barbell-power-snatch, barbell-muscle-snatch, barbell-clean-and-press, dumbbell-single-arm-clean-and-press | full-body | power / olympic |
| box-jump | full-body | power / jump |
| jump-squats | lower-body | power / jump |
| abdominals-stretch-variation-one, -two, -three, -four | core | mobility / mobility |

`jump-squats` og de fire mavestræk var ikke nævnt i gennemgangen med Tom. De flyttes af
samme grund som de øvrige: ellers ligger samme slags øvelse i to kategorier. Burpee,
thruster og kettlebell-swing bliver hvor de er.

---

## 4. Manifest

### 4.1 Fil og form

`scripts/movekit-manifest.json`, committet. Ét objekt pr. klip, sorteret på `clip`:

```json
{
  "_doc": "Ledger over MoveKit-pakken. Genereres og vedligeholdes af scripts/movekit-audit.mjs.",
  "auditedAt": "2026-10-03",
  "clips": [
    {
      "clip": "barbell-romanian-deadlift",
      "width": 1936, "height": 1072, "duration": 4.0,
      "redPixels": 21092, "highlight": true,
      "core": ["rdl"],
      "library": null,
      "skipped": null
    },
    {
      "clip": "arnold-press",
      "width": 1936, "height": 1072, "duration": 4.0,
      "redPixels": 13816, "highlight": true,
      "core": [],
      "library": "2026-10",
      "skipped": null
    }
  ]
}
```

- `core`: de kerneøvelses-slugs klippet er kilde til (fra `scripts/movekit-map.json`).
  Loops ligger i `public/exercise-demos/` under kerneøvelsens slug.
- `library`: batch-label (`"2026-06"` eller `"2026-10"`) når klippet er en biblioteksøvelse
  med samme slug som klippet og loops i Storage. Ellers `null`.
- `skipped`: begrundelse når klippet bevidst ikke bruges. Ellers `null`.
- Et klip uden `core`, `library` og `skipped` er **utildelt**.
- `core` og `library` kan begge være sat. Efter denne import gælder det kun `cable-rope-pushdown`.
- `skipped` udelukker de to andre.

### 4.2 `scripts/movekit-audit.mjs`

```
node scripts/movekit-audit.mjs                    måler alle klip, fletter med manifestet, rapporterer
node scripts/movekit-audit.mjs --assign=2026-10   som ovenfor, og giver utildelte klip library="2026-10"
```

- Måler bredde, højde og varighed med ffprobe og rød markering med ffmpeg (16 frames,
  480 px, rawvideo rgb24), 6 klip parallelt.
- Bevarer `core`, `library` og `skipped` fra det eksisterende manifest. `core` genberegnes
  altid fra `movekit-map.json`.
- Første kørsel uden manifest: `library="2026-06"` for de slugs, der står i migration 0052.
- Klip i manifestet, som ikke længere findes i mappen, beholdes med `"missing": true` og
  nævnes i rapporten. Scriptet fejler ikke på det.
- Rapporten skriver antal pr. tilstand, utildelte klip og klip uden markering.
- `--assign` rører ikke klip med `core` eller `skipped`.

### 4.3 Tildelinger i denne import

Sættes i manifestet før `--assign=2026-10`:

| Klip | Tildeling | Begrundelse |
|---|---|---|
| `front-squat` | `core: ["front-squat"]` | lukker gap'et |
| `barbell-romanian-deadlift` | `core: ["rdl"]` | erstatter stiff-leg-proxy |
| `barbell-hip-thrust` | `core: ["hip-thrust"]` | erstatter kettlebell-proxy |
| `standing-calf-raise-machine` | `core: ["standing-calf-raise"]` | erstatter håndvægt-proxy; kerneøvelsen er en maskinøvelse |
| `wide-push-ups` | `skipped` | dublet af `wide-push-up` |
| `open-book-rotations` | `skipped` | dublet af `open-book-rotation` |

De fire `core`-tildelinger kommer fra den opdaterede `movekit-map.json` (afsnit 8). De to
frigjorte proxy-klip, `barbell-stiff-leg-deadlifts` og `kettlebell-hip-thrust`, står derefter
utildelt og får `library="2026-10"` sammen med resten.

**Regnestykke:** 373 ubrugte − 4 kernekilder − 2 dubletter + 2 frigjorte proxies = **369 nye
biblioteksøvelser**. Efter importen er ingen klip utildelt: 577 = 18 klip der kun er
kernekilder + 188 (batch `2026-06`) + 369 (batch `2026-10`) + 2 sprungne. `cable-rope-pushdown`
er både kernekilde og biblioteksøvelse og tælles under de 188. Audit-rapporten skal vise
0 utildelte.

Munks kladde `overhead-triceps-cable-extensions` (oprettet 19.09.2026, uden kategori og
video) røres ikke. Klippet `cable-rope-overhead-tricep-extension` bliver sin egen øvelse.

---

## 5. Metadata

### 5.1 Workflow

`scripts/build-wf-exercises.mjs` skriver `scripts/wf-exercises.mjs` ud fra manifestet:

```
node scripts/build-wf-exercises.mjs --batch=2026-10 [--only=slugs.txt]
```

- `ITEMS` = klip med `library` lig batchen: `{ slug, name, equipmentHint }`. `name` er
  slug'en i Title Case. `equipmentHint` udledes af nøgleord i slug'en efter reglerne i 3.3
  og er `null` når intet nøgleord rammer.
- Enum-listerne i output-skemaet indsættes fra taxonomy-JSON'en.
- `--only` begrænser til en liste af slugs. Bruges til at genkøre fejlede batches.

Workflowet er uændret i form: batches à 10, én agent pr. batch, struktureret output mod
samme skema som sidst (slug, name, category, pattern, equipment, difficulty, primary_muscle,
tre muskel-arrays, cue, 4–6 cues, 2–3 mistakes, why_matters, setup, progression, regression).
369 øvelser giver 37 batches.

Prompten udvides med:

- tildelingsreglerne fra 3.3,
- at `equipmentHint` bruges når den passer til øvelsen, ellers vælger agenten,
- særregler for `cardio` og `mobility`: cues handler om tempo, åndedræt, kadence,
  holdning og intensitet, `mistakes` om de typiske fejl i netop den aktivitet, `progression`
  og `regression` om varighed, intensitet eller bevægeudslag. Muskel-arrays udfyldes stadig
  fra de 18 muskler,
- et ekstra eksempel på en mobilitetsøvelse ved siden af back-squat-eksemplet.

`phases` genereres ikke. Tomt array giver statisk muskelmarkering som for de 188.

Resultatet gemmes som JSON uden for repoet. Den genererede SQL er den varige artefakt.

### 5.2 Validering og SQL

`scripts/gen-exercise-seed.mjs` udvides:

```
node scripts/gen-exercise-seed.mjs <json> [<json> …] --batch=2026-10 > 0066….sql
```

Flere JSON-filer flettes på slug, og en senere fil vinder over en tidligere. Sådan lægges
en genkørt batch oven på første kørsel.

Fejler med liste og exit 1 når:

- en muskel, kategori, et mønster, redskab eller en sværhedsgrad ikke findes i taksonomien,
- en slug ikke hører til batchen i manifestet, eller forekommer to gange i samme fil,
- en slug fra batchen mangler i JSON'en,
- et tekstfelt er tomt, `cues` har færre end 4 eller `mistakes` færre end 2.

Uden `--batch` opfører scriptet sig som i dag (`display_order` 1000 + i × 10), bortset fra
taksonomi-valideringen. Rækkerne sorteres på slug, så outputtet er deterministisk.

**`display_order` med `--batch`:** de nye rækker flettes alfabetisk ind mellem de
eksisterende biblioteksøvelser uden at røre dem. De 188 har `1000 + 10 × j`, hvor `j` er
deres plads i slug-orden. En ny øvelse får værdien for den nærmeste foregående gamle slug
plus 5, eller 995 hvis ingen går forud. Flere nye øvelser mellem to gamle deler værdi og
ordnes af listens sekundære sortering på navn (9.1). Sådan viser "Alle" kerneøvelserne
først og derefter ét alfabetisk forløb, og en coach-rettet `display_order` overskrives ikke.

---

## 6. Migrationer

Begge er idempotente og ændrer ikke skemaet. `db:types` er ikke nødvendig.

### 6.1 `0066_exercise_library_expansion_2.sql`

Ren generator-output: 369 rækker, `is_published=false`, `display_order` flettet ind som
beskrevet i 5.2, `on conflict (slug) do update` på metadatafelterne som i 0052. `is_published` og
`demo_asset_url` røres ikke ved konflikt.

### 6.2 `0067_expansion_2_wiring.sql`

Indeholder:

1. `demo_asset_url` for de 369 til
   `https://wtxhsbrtzoukkhhtsqnu.supabase.co/storage/v1/object/public/exercise-demos/<slug>.webm`,
   som i 0053, med eksplicit slug-liste. Blokken skrives af
   `scripts/gen-demo-urls.mjs --batch=2026-10` ud fra manifestet.
2. `demo_asset_url = '/exercise-demos/front-squat.webm'` for `front-squat`, kun hvor feltet
   er `null` eller allerede peger på `/exercise-demos/`, så en coach-upload ikke overskrives.
3. Flyttene fra 3.4, hver med `and category = '<nuværende>'`.

Punkt 2 og 3 er engangsændringer og håndskrives i filen.

rdl, hip-thrust og standing-calf-raise beholder deres URL. Filerne i `public/` udskiftes
under samme navn. `public/` serveres med `must-revalidate`, service workeren cacher kun
offline-siden, og hvert deploy har sine egne filer, så et `?v=`-suffiks er unødvendigt. Det
afviger fra gennemgangen med Tom, hvor `?v=2` blev nævnt.

### 6.3 Rækkefølge ved udrulning

1. Storage-upload (afsnit 7.2). Kan ske når som helst; intet peger på filerne endnu.
2. Merge og deploy. Koden tåler både gammel og ny data.
3. `supabase db push` (Tom). Skal ske efter deploy: 0067 peger front-squat på en fil, der
   først findes i det nye deploy, og Power-labelen findes først dér.

---

## 7. Video

### 7.1 Biblioteksklip til staging

Nyt `scripts/ingest-manifest.mjs`:

```
node scripts/ingest-manifest.mjs --batch=2026-10 --out=<dir> [--jobs=3] [--only=slug]
```

For hvert klip i batchen: landskabstrio via `ingest-exercise-demo.mjs` og portrættrio via
`make-portrait-demo.mjs`, begge med `MI_DEMO_OUT=<dir>`. Seks filer pr. klip:
`{slug}.webm`, `.mp4`, `-poster.jpg`, `-portrait.webm`, `-portrait.mp4`,
`-portrait-poster.jpg`.

- Genoptageligt: et klip springes over når alle seks filer findes og er større end 0 bytes.
- `--jobs` klip parallelt som børneprocesser.
- Fejl samles pr. klip. Scriptet kører listen færdig, skriver fejlede klip til sidst og
  slutter med exit 1 hvis der var nogen.
- Slutrapport: antal klip, antal filer, samlet størrelse, og alle filer over 5 MB (bucketens
  grænse).

369 klip giver 2214 filer.

### 7.2 Upload

`scripts/upload-demos-to-storage.mjs` får sikker standardopførsel: scriptet lister bucketen
først (pagineret) og springer filer over, der allerede findes. `--overwrite` genindfører
upsert. `--dry` viser hvad der ville ske.

Fire klip i batchen fandtes i den gamle pakke uden at være biblioteksøvelser: de to
frigjorte proxies samt `cable-bar-pushdown` og `kettlebell-calf-raise`, som tidligere var
kernekilder. Deres portrætfiler (12 i alt) ligger allerede i bucketen fra PR #115 og
springes derfor over. Det er samme bevægelse fra samme kilde i lavere opløsning.

Uploaden skriver til produktions-bucketen med service-role-nøglen fra `.env.local`. Den er
additiv, og ingen række peger på filerne før 0067 er kørt.

### 7.3 Ikke re-encoding af eksisterende

De 204 klip, der allerede er i brug, re-encodes ikke fra de nye 1936-kilder. Output er
begrænset til 720 px på længste led, så gevinsten er ubetydelig.

---

## 8. Kerneøvelserne

`scripts/movekit-map.json` opdateres:

| Slug | movekit | confidence |
|---|---|---|
| front-squat | `front-squat` | match |
| rdl | `barbell-romanian-deadlift` | match |
| hip-thrust | `barbell-hip-thrust` | match |
| standing-calf-raise | `standing-calf-raise-machine` | match |

push-press forbliver proxy på `kettlebell-push-press`: pakken har ingen barbell push press.
tricep-pushdown forbliver på `cable-rope-pushdown`: `cable-bar-pushdown` har ingen markering.
`_doc`-teksten i filen opdateres, så den ikke længere taler om 206 klip og et gap.

De fire re-ingestes til `public/exercise-demos/` i landskab og portræt (24 filer, heraf 6 nye
for front-squat). `ingest-movekit-batch.mjs` og `make-portrait-demo.mjs` læser i forvejen
kortet; de køres med `--only` og pr. klip, så de øvrige 16 kerneøvelser ikke re-encodes.

Følgeændringer, som eksisterende tests kræver:

- `src/lib/data/bundled-demo-assets.ts`: `front-squat` ind i `BUNDLED_DEMO_SLUGS`. Mocks
  får dermed `demoAssetUrl` af sig selv, da `exercise-mocks.ts` slår op med
  `bundledDemoAssetUrl(slug)`.
- `supabase/seed-exercises.sql` og `supabase/seed.sql`: front-squat ind i UPDATE-listen,
  kommentaren om at front-squat mangler klip fjernes.
- `src/lib/data/demo-assets.test.ts`: testen "front-squat stays null" erstattes af en test
  af, at alle 20 kerneøvelser har bundlet loop.
- `src/lib/data/session-demo-assets.test.ts`: null-tilfældene bruger en slug uden filer.
  Hydrerings-testen, der forventer at front-squat ikke får loop, vendes til at forvente
  loopet, da ingen mock længere mangler et.
- Forældede kommentarer og dokumentation om front-squat som undtagelse rettes:
  `bundled-demo-assets.ts`, `exercise-mocks.ts`, `session-demo-assets.ts`, `exercises.ts`,
  `SessionClient.tsx`, `docs/PLATFORM_OVERVIEW.md`, `docs/EXERCISE_VISUAL_BRIEF.md`.

---

## 9. UI

Før der skrives Next.js-kode læses den relevante guide i `node_modules/next/dist/docs/`
(AGENTS.md).

### 9.1 Datalaget (`src/lib/data/exercises.ts`)

- `ExerciseFilters` får `q?: string`. Søgning er `ilike` på `name` med `%` og `_` escapet,
  trimmet og højst 80 tegn. Tom streng betyder intet filter. Demo-mode filtrerer mocks med
  samme regel (case-insensitiv delstreng).
- Ny `listPublishedExerciseFacets(): Promise<{ categories: string[]; equipment: string[] }>`
  henter kun `category, equipment` for publicerede øvelser og returnerer de forekommende
  værdier i taksonomiens rækkefølge. Erstatter sidens andet kald til
  `listPublishedExercises()`, som i dag henter alle kolonner for alle rækker blot for at
  finde kategorierne.
- Sortering: `display_order`, derefter `name`.

### 9.2 Biblioteket (`/train/exercises`)

- `searchParams`: `q`, `category`, `equipment`. `category` og `equipment` ignoreres hvis
  værdien ikke forekommer blandt de publicerede øvelser (facetterne fra 9.1). En værdi, der
  findes i databasen men ikke i taksonomien, får altså både pille og virkende filter.
- Ny ren hjælper `libraryHref({ q, category, equipment })` i
  `src/lib/data/exercise-library-url.ts` bygger URL'en og udelader tomme parametre.
- Øverst en GET-formular: søgefelt (`type="search"`, `name="q"`, label "Søg øvelse"),
  redskabsvælger (`<select name="equipment">` med "Alle redskaber" først), skjult
  `category`, og en submit-knap. Virker uden JavaScript.
- Lille klientkomponent `LibraryFilterForm` omkring formularen: submitter ved ændring af
  redskabsvælgeren. Ingen debounce-søgning; Enter eller knappen søger.
- Kategori-piller som i dag, i taksonomiens rækkefølge, med `q` og `equipment` bevaret i
  linket. Kun kategorier og redskaber, der findes blandt publicerede øvelser, vises.
- Resultattal over grid'et ("42 øvelser"). Tomt resultat med aktive filtre viser en besked
  og et link, der nulstiller filtrene.
- Søgningen rammer de engelske øvelsesnavne. Dansk søgning er ikke med.
- Nye tekster i `Train.index` på dansk og engelsk: `searchLabel`, `searchPlaceholder`,
  `equipmentLabel`, `allEquipment`, `submit`, `count`, `emptyFiltered`, `reset`.

"Alle"-visningen kan komme op på 580 kort med anatomifigur. Der indføres ikke paginering.
HTML-vægten måles i verifikationen og rapporteres til Tom.

### 9.3 Review-køen (`/coach/exercises/review`)

- `searchParams.category`. Siden filtrerer kladderne, før de gives til
  `ExerciseReviewQueue`. Komponenten fryser sin liste ved mount, så siden giver den
  `key={category ?? "all"}`, og køen starter forfra når filteret skiftes. Komponenten selv
  er uændret.
- Pille-række over køen: "Alle (n)" og én pille pr. kategori med kladder, med antal, i
  taksonomiens rækkefølge. Labels fra `Train.categories`; "Alle (n)" er ny nøgle
  `CoachStudio.exercises.review.filterAll` på dansk og engelsk.
- Ren hjælper `draftCategoryCounts(drafts)` i `src/lib/coach/review-queue.ts`.

### 9.4 Coach-editoren

`ExerciseEditor.tsx` læser kategorier, mønstre, redskaber og sværhedsgrader fra
taksonomien. Det retter, at editoren i dag ikke kan vise kettlebell, band, isolation og carry.

### 9.5 Program-byggeren

`/coach/programs/[code]` giver i dag alle publicerede øvelser til én flad `<select>` pr.
øvelseslinje. Med op mod 580 valg grupperes listen: siden sender `category` med i den
minimale form, og `ProgramBuilder.tsx` viser `<optgroup>` pr. kategori i taksonomiens
rækkefølge med labels fra `Train.categories`, øvelserne alfabetisk i hver gruppe. Alle
kategorier er med, også kondition og mobilitet, så en coach kan lægge opvarmning i et
program. Ren hjælper `groupByCategory(library)` i `src/lib/data/exercise-taxonomy.ts`.

---

## 10. Fejl og kanttilfælde

| Situation | Håndtering |
|---|---|
| En workflow-batch fejler eller returnerer færre øvelser | `gen-exercise-seed` lister manglende slugs; `build-wf-exercises --only` genkører dem; `gen-exercise-seed` får begge JSON-filer og fletter på slug |
| En agent ændrer en slug eller opfinder en enum-værdi | Skemaet har enums; valideringen fanger resten og fejler |
| ffmpeg fejler på et klip | Klippet rapporteres, resten kører færdigt, genkørsel tager kun de manglende |
| En fil overstiger bucketens 5 MB | Rapporteres af `ingest-manifest`; klippet re-encodes med højere CRF før upload |
| Upload afbrydes | Genkørsel springer eksisterende over |
| 0067 køres før upload eller før deploy | Kladder er usynlige for medlemmer; front-squat ville mangle video indtil deploy. Rækkefølgen i 6.3 står i PR-beskrivelsen |
| `category`/`equipment` i URL, som ingen publiceret øvelse har | Ignoreres |
| Ukendt værdi i DB uden label | `exerciseMetaLabels` falder tilbage til råværdien som i dag; `orderByTaxonomy` lægger den sidst |
| Klip uden rød markering (3 i batchen: `cable-bar-pushdown`, `kettlebell-calf-raise`, `barbell-stiff-leg-deadlifts`) | Importeres; `highlight: false` i manifestet; Munk afgør i review |

---

## 11. Test og verifikation

**Enhedstests (vitest):**

- Taksonomi: hver kategori, hvert redskab og hver sværhedsgrad har label på dansk og
  engelsk (erstatter den håndskrevne `CATALOGUE` i `exercise-meta.test.ts`). Testen af
  fallback til råværdi bruger i dag `sled`, som nu får label; den skifter til en værdi
  uden for taksonomien. `orderByTaxonomy` sorterer og lægger ukendte sidst.
  `groupByCategory` grupperer og sorterer.
- `libraryHref`: udelader tomme parametre, bevarer de øvrige, URL-encoder `q`.
- Søgefilter i demo-mode: delstreng, case-insensitivt, kombineret med kategori og redskab.
  Escape af `%` og `_`.
- `draftCategoryCounts`: tæller pr. kategori, i taksonomiens rækkefølge.
- `gen-exercise-seed`: flettet `display_order` for en ny slug før, mellem og efter de gamle.
- Manifest-integritet: hvert klip unikt; `skipped` udelukker `core` og `library`; hver
  `core`-slug findes i `movekit-map.json` og omvendt; ingen utildelte klip; 369 klip i batch
  `2026-10`; batchens slugs er præcis dem i migration 0066 og i 0067's slug-liste.
- Bundlede loops: alle 20 kerneøvelser har seks filer i `public/exercise-demos/`.
- Eksisterende tests forbliver grønne, herunder "landing loops er unikke".

**Scripts:** `movekit-audit` rapporterer 0 utildelte. `gen-exercise-seed` afviser en JSON
med en manglende slug og en med en ukendt kategori (prøves manuelt med to små fixturer).

**Kørsler:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

**Browser:** biblioteket i demo-mode (20 mocks) på mobil og desktop: søgning, redskabsvalg,
kategori-pille, kombination, tomt resultat, nulstil. Review-køens filter dækkes af
enhedstest, da siden kræver coach-login mod live.

**Data:** stikprøve af 12 nye slugs i Storage: `.webm`, `.mp4`, `-poster.jpg` og de tre
portrætfiler svarer 200. Antal objekter i bucketen efter upload er 1182 + 2214 − 12 = 3384.

**Vægt:** HTML-størrelsen af "Alle"-visningen estimeres ved at rendere 580 kort (mock-data
gentaget) og rapporteres.

---

## 12. Ude af scope

- Dansk søgning og danske øvelsesnavne.
- Paginering, gruppering efter muskel og andet større biblioteks-redesign.
- `phases` for de nye øvelser.
- Re-encoding af de 204 eksisterende klip.
- Markerede udgaver af de 48 klip uden rød markering (afventer MoveKit).
- Brug af kondition og mobilitet i programmer, sessioner eller Adaptive Engine. Denne
  leverance gør dem til biblioteksindhold.
- Oprydning i Munks kladde `overhead-triceps-cable-extensions`.

---

## 13. Stop-punkter

- **`supabase db push`** køres af Tom efter merge og deploy.
- **Merge** af PR'en til `main` er Toms.

Alt andet, herunder Storage-uploaden, sker i implementeringen.
