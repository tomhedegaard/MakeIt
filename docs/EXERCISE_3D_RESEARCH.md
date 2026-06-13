# Øvelses-3D: research & beslutningsoplæg

> Status: UDKAST til beslutning (2026-06-11). Hvordan kobler vi bevægende
> illustrationer på de 20 øvelser? Bygger oven på docs/EXERCISE_VISUAL_BRIEF.md
> og det eksisterende fundament.

## 0. Hvad vi ALLEREDE har (vigtigt — vi starter ikke fra nul)

- **`demoAssetUrl`-slot** på hver øvelse + `resolveDemoAssets()` (webm/mp4/poster-trio)
- **Phase-timing-kontrakt**: `phases[]` med `duration_ms` pr. øvelse — den autoritative
  rytme et demo SKAL ramme. `useVideoPhaseSync.ts` mapper allerede `video.currentTime`
  → fase-indeks med rAF
- **Storage + coach-upload**: `exercise-demos`-bucket + `DemoAssetUploader` (3 slots)
- **3D-runtime allerede installeret**: `three` 0.184, `@react-three/fiber` 9.6,
  `@react-three/drei` 10.7 — bruges i dag KUN af `AnatomyFigure3D` (muskel-highlight
  "paper doll", ikke bevægelse)
- **Færdig brief** (EXERCISE_VISUAL_BRIEF.md): committer allerede til video-loops
  (WebM+MP4, 720×1280, transparent, brand-palette, fase-synket, <400 KB)
- **Skala: 20 øvelser** i v1 — lille nok til en pr.-øvelse-tilgang uanset vej

**Konklusion:** Pipelinen er bygget og venter på INDHOLD. Spørgsmålet er ikke "kan vi
vise demos" — det er "hvor kommer lifter-indholdet fra, og skal det være video eller
ægte interaktiv 3D".

## 1. Filteret der rydder feltet: offline + native shells

Vi shippede netop offline-PWA (Fase 1) og Capacitor-shells (Fase 3). Det betyder:
**alt indhold skal kunne self-hostes/caches.** Det diskvalificerer API-/streaming-only:

| Udbyder | Hvorfor ude |
|---------|-------------|
| **MuscleWiki API** | Licensen FORBYDER eksplicit at downloade/cache/CDN-lagre deres video/thumbnails. Kun transient caching. Brækker offline + native |
| **Hyperhuman** | HLS-streaming via SaaS, API-only, enterprise-pris |

Begge er gode produkter, men uforenelige med vores arkitektur. Vi skal eje filerne.

## 2. Tre reelle veje

### Vej A — Køb færdig-renderede klip (hurtigst, off-brand)
Drop-in i `demoAssetUrl`. Nul ny kode. MEN: udbydernes mannequin-stil matcher IKKE
vores charcoal/cream/amber-brand.

| Udbyder | Format | Antal | Pris | Self-host | Noter |
|---------|--------|-------|------|-----------|-------|
| **MoveKit** | MP4 (H.264) 720p, loopable + poster | 200+ | $4.99/klip · **$99 hele biblioteket** | ✅ | Konsistent 3D-mannequin, muskel-highlight-varianter, commercial license. Tættest på vores brief |
| **Gym-Animations** | MP4 1080p | 7.000+ | $199–599 bundle | ✅ | Mand/kvinde-varianter |
| **ExerciseAnimatic** | MP4 4K/HD | 2.300+ | $1/klip · ~$329 bundle | ✅ | Stil-inkonsistens på tværs |
| **GymVisual** | 2D GIF/PNG/MP4 | 8.000+ | $3–10/asset | ✅ | Mest 2D-illustrationer |

**Bedst i klassen: MoveKit** — format, self-host, pris og konsistens passer vores
pipeline næsten 1:1. Eneste hage: deres look ≠ vores brand.

### Vej B — Custom-renderede klip (brief'ens nuværende plan, on-brand)
Blender/C4D → præcis vores palette, transparent, fase-matchet. Det er det,
EXERCISE_VISUAL_BRIEF.md allerede har bestilt.
- **Pro:** Perfekt brand-match, fuld kontrol, source-filer til varianter
- **Con:** Kræver 3D-artist + ~20 renders; tid + omkostning pr. øvelse
- **Asset-startpunkter:** CC0-riggede modeller (Meshy CC0, Sketchfab CC0, Poly Haven),
  riggede betalmodeller (TurboSquid/CGTrader), animation via Mixamo (rigging + base,
  INGEN vægtløftningssæt) eller Mesh2Motion (browser-rigging, open source)

### Vej C — Ægte interaktiv real-time 3D (mest "wauw", størst build)
glTF-riggede lifters i `@react-three/fiber` (som vi ALLEREDE har). Brugeren kan
rotere/zoome; animation phase-synkes via `AnimationMixer` mod `phases[]`.
- **Pro:** Roter/zoom, genbruger eksisterende 3D-stack, ét rig kan vinkles frit,
  fremtidssikret (muskel-highlight PÅ modellen, vinkel-skift)
- **Con:** Største arbejde — source+rig én lifter, animér 20 specifikke stangløft
  (Mixamo dækker det ikke → custom/Mesh2Motion), barbell-IK (hænder skal følge
  stangen), perf-budget i mobil-WebView + native shells. En god real-time lifter
  pr. 20 løft er en produktion, ikke en eftermiddag
- **Hvor:** Kun på øvelses-detaljesiden (`/train/exercises/[slug]`) hvor rotation
  har værdi — IKKE i live-session (`/session`), hvor fokus + perf taler imod

## 3. Besluttet (2026-06-11)

1. **v1-indhold = MoveKit nu + custom-renders senere.** Køb MoveKit-biblioteket
   ($99) for at få de 20 løft i luften straks (off-brand accepteret midlertidigt),
   og erstat øvelse-for-øvelse med on-brand custom-renders pr. EXERCISE_VISUAL_BRIEF.md.
   Samme `demoAssetUrl`-slot tager begge — ingen kodeændring ved udskiftning.
2. **v2 = ja, byg interaktiv real-time 3D** på detaljesiden (se §6).

## 4. v1-ingestion (MoveKit → pipelinen)

MoveKit leverer MP4 + poster; pipelinen afleder en `.webm`-søskende fra
`demo_asset_url`, så en MP4-only-kilde ville lade webm-`<source>` 404'e pr. load.
Løst med `scripts/ingest-exercise-demo.mjs` — normaliserer ÉT kildeklip til
trio'en `{slug}.webm` (VP9) + `{slug}.mp4` (H.264) + `{slug}-poster.jpg` ved
brief-spec (720×1280, 30 fps), nul app-kodeændring.

```bash
node scripts/ingest-exercise-demo.mjs movekit/bench.mp4 bench-press
node scripts/ingest-exercise-demo.mjs renders/squat.mov back-squat --alpha
```

`--alpha` bevarer transparens (VP9 yuva420p) for custom-renders med alfa.
Output → `public/exercise-demos/`, klar til upload til Supabase-bucket'en
`exercise-demos` (eller via coach-uploaderen). Sæt derefter `demo_asset_url`
til den offentlige `.webm`-URL pr. slug — MP4/poster resolver automatisk.

**Næste konkrete skridt for v1:** (1) køb + download MoveKit-klip, (2) kør scriptet
pr. de 20 slugs i `seed-exercises.sql`, (3) upload + sæt `demo_asset_url`.
`useVideoPhaseSync` rammer allerede `phases[]` — tjek at MoveKit-loopets rytme
passer hver øvelses faser; ellers fintune `duration_ms` i seed.

## 5. Teknisk udvidelse til v2 (video + 3D side om side)

```ts
demoAssetType?: "video" | "3d-model" | "phase-animator" | null;
model3dUrl?: string | null;   // glTF/GLB hvis 3d-model
```

`ExerciseDemo.tsx`s resolution-hierarki (video → phase-animator → statisk figur)
får én gren mere: `3d-model` → `<ModelDemo>`. Storage: separat
`exercise-models`-bucket (GLB ~2–5 MB > nuværende 5 MB video-grænse).

## 6. v2-plan: interaktiv real-time 3D (besluttet — byg)

**Mål:** På `/train/exercises/[slug]` kan brugeren rotere/zoome en riggede lifter,
der udfører øvelsen fase-synket mod `phases[]`. IKKE i `/session` (perf + fokus).

### Faser

| Fase | Indhold | Risiko |
|------|---------|--------|
| **3D-1 · Spike** | Én øvelse (back-squat) end-to-end: source+rig én lifter, animér ét løft, render i react-three-fiber, phase-sync mod `duration_ms`. Bevis at det føles godt + måler perf på mobil/native-WebView | Afgør om hele Vej C er værd at fortsætte |
| **3D-2 · Pipeline** | `demoAssetType`/`model3dUrl`-felter, `<ModelDemo>`-gren i ExerciseDemo, `useModelPhaseSync()` (AnimationMixer-tid → fase-indeks, parallelt med useVideoPhaseSync), `exercise-models`-bucket + coach-upload-slot, lazy-load (dynamisk import af r3f-canvas, så detaljesiden ikke betaler 3D-bundlen før nødvendigt) | Bundle-størrelse, SSR-grænser |
| **3D-3 · Indhold** | Animér de resterende 19 løft. Barbell-IK (hænder følger stangen), stance/grip-bredde + ROM pr. anatomical-accuracy-checklist i brief'en | Største post — 20 specifikke stangløft; Mixamo dækker dem ikke |
| **3D-4 · Polish** | Muskel-highlight PÅ modellen synket med `phases[]` (afløser separat AnatomyFigure-lag på detaljesiden), kamera-presets, reduced-motion-fallback til statisk poster | — |

### Tekniske valg (research-grundlag)
- **Runtime:** Eksisterende `three` 0.184 + `@react-three/fiber` 9.6 + `@react-three/drei`
  10.7 (`useGLTF`, `useAnimations`). Intet nyt afhængighed for kernen.
- **Rig-kilde:** Én neutral lifter. CC0-start (Meshy CC0 / Sketchfab CC0 / Poly Haven)
  eller betalt rig (TurboSquid/CGTrader). Rigging via Mixamo eller Mesh2Motion
  (browser, open source) hvis kilden er u-rigget.
- **Animation:** Custom pr. løft — Mixamo har INTET vægtløftningssæt. Enten håndanimering
  i Blender (eksport glTF) eller Mesh2Motion. Barbell som separat mesh parented til en
  IK-constrained hånd-bone.
- **Perf-budget (kritisk for native shells):** GLB draco-komprimeret, ét delt rig +
  per-øvelse-animationsklip (ikke 20 hele modeller), `<Canvas frameloop="demand">`
  når pauset, target <60 MB GPU + stabil 30 fps på 3 år gammel iPhone i WKWebView.
- **Fallback:** reduced-motion / lav-ende-enhed / offline → statisk poster (samme
  `{slug}-poster.jpg`), så 3D aldrig blokerer kerneoplevelsen.

### Hvorfor video stadig er v1
Video pr. KB ser bedre ud end real-time 3D på mobil, pipelinen findes, og 3D-1 skal
bevise perf før vi forpligter os til 3D-3 (de 19 resterende animationer). 3D er
opgraderingen, ikke adgangsbilletten.
