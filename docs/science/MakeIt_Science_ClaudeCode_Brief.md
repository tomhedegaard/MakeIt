# Brief til Claude Code: byg Science-sektionen i MakeIt

Kopiér mappen `science-prototype/` og filen `MakeIt_Science_Sektion_Teknisk_Spec.md` ind i repoet (fx under `docs/science/`) så du kan læse dem, og giv så Claude Code denne besked.

---

## Opgave

Byg en `/science`-sektion i denne app: et dagligt opdateret feed med nyeste troværdige forskning om **kost (Mad)**, **motion (Krop)** og **mentalt velvære (Sind)** — korte danske resuméer med evidens-badge og link til primærkilden (DOI). Fuldautomatisk daglig opdatering. Til de "nørdede" brugere der vil være up to date.

Der findes en **kørende prototype** i `docs/science/science-prototype/` (ren Node) og en **teknisk spec** i `docs/science/MakeIt_Science_Sektion_Teknisk_Spec.md`. Brug dem som kilde til al filtrerings- og scoringslogik — den er testet og må ikke udvandes. Din opgave er at **integrere den idiomatisk i denne stack** (Next.js App Router i `src/app`, Supabase, i18n), ikke at genopfinde den.

## Stack-fakta (verificeret)

- Next.js App Router under `src/app`. Libs i `src/lib`. i18n i `src/i18n` + `messages/`. Scripts i `scripts/`.
- Supabase er allerede i brug (`supabase/`). **Brug en Supabase-tabel som datastore — ikke en committet JSON-fil.**
- Produktion deployer fra `main` via Vercel. `vercel.json` findes.
- TypeScript. Dansk/engelsk via i18n.

## Arkitektur der skal bygges

```
Daglig job (scripts/science-feed.ts, kørt af GitHub Action eller Vercel Cron)
  → fetch Europe PMC → gate → score → LLM-resumé m. tal-verifikation
  → upsert i Supabase-tabel `science_items`
Frontend (src/app/science) læser fra Supabase (server component) — ingen API-kald i request-path
RSS/JSON-feeds (src/app/science/feed.xml, feed.json) læser fra samme tabel
```

### 1. Supabase-tabel

Lav en migration i `supabase/` for tabellen `science_items`:

| kolonne | type | note |
|---|---|---|
| `id` | uuid pk default gen_random_uuid() | |
| `doi` | text unique | dedup-nøgle |
| `title` | text | |
| `domain` | text check in ('mad','krop','sind') | |
| `evidence_level` | text | meta_analysis / systematic_review / rct / guideline |
| `evidence_badge` | text | dansk badge |
| `journal` | text | |
| `published_date` | date | |
| `indexed_date` | date | |
| `source_url` | text | DOI-link |
| `tldr_da` | text | LLM-resumé |
| `effect_da` | text null | verbatim effekt |
| `caveat_da` | text null | |
| `source_conclusion` | text | verbatim fra abstract |
| `score` | numeric | |
| `status` | text | 'published' / 'rejected' (audit) |
| `reject_reason` | text null | |
| `created_at` | timestamptz default now() | |

RLS: `published`-rækker er læsbare for `anon` (read-only). Skrivning kun via service-role (job'et).

### 2. Pipeline → `scripts/science-feed.ts`

Port logikken fra `science-prototype/`:

- `fetch.mjs` → Europe PMC-fetch (query pr. domæne + `PUB_TYPE`-filter). Behold "polite pool"-User-Agent.
- `pipeline.mjs` → normalize, dedupe, **gate** (whitelist + studietype + retraction), **score** (relevans + evidens + recency + kilde), med `config.mjs`' whitelist/vokabular/vægte/tærskler.
- `summarize-llm.mjs` → Claude (Haiku) skriver dansk resumé. **Bevar `verifyNumbers()`-guardrailen uændret**: ethvert tal i resuméet skal genfindes i kildens abstract, ellers retry → ellers sikker template-fallback.
- Skriv både `published` og `rejected` til tabellen (audit/"open brain"). Vis kun `published` i UI.
- Idempotent: upsert på `doi`.

Læg `config.mjs`-indholdet (whitelist, domæne-vokabular, vægte, tærskler) i `src/lib/science/config.ts` så det er typet og ét sted.

### 3. Frontend → `src/app/science/page.tsx`

- Server component der henter `published`-rækker fra Supabase, sorteret efter score/dato.
- Brug `docs/science/science-prototype/deploy/app/science/page.tsx` + `science.css` som UI-udgangspunkt (MakeIt's sort/hvide stil, farve som domæne-signal: Mad grøn / Krop orange / Sind blå).
- **i18n:** Læg al UI-tekst i `messages/` (da + en). Selve resuméerne er danske data fra tabellen.
- Domæne-filtre (Mad/Krop/Sind) + evidens-filter.
- Tom-tilstand: vis "Ingen nye studier passerede tærsklen i dag" frem for at fylde med støj.
- Disclaimer i bunden: "Forskningsresumeer — ikke individuel sundheds- eller kostrådgivning."
- Tilføj `Science` i hovednavigationen (samme sted som Crew/Coaching).

### 4. Feeds → `src/app/science/feed.xml/route.ts` + `feed.json/route.ts`

Brug skabelonerne i `docs/science/science-prototype/deploy/app/science/`. Læs fra Supabase i stedet for fil. Tilføj `<link rel="alternate" type="application/rss+xml">` i `/science`-metadata.

### 5. Daglig kørsel

Vælg én:
- **GitHub Action** (`.github/workflows/science-daily.yml`, skabelon findes i prototypens `deploy/`): cron `30 5 * * *`, kør `scripts/science-feed.ts`, skriv til Supabase. Ingen commit nødvendig når data ligger i Supabase.
- **Vercel Cron** i `vercel.json` der kalder en intern route — kun hvis kørslen holdes under function-timeout (ellers brug GitHub Action eller en durable worker).

## Ufravigelige krav (troværdighedens kerne — må ikke skæres væk)

1. Kilde-whitelist (gate, ikke præference) + objektiv kvalitetsregel som fallback.
2. Studietype-gate: kun meta-analyser, systematic reviews, RCT'er, guidelines.
3. Retraction-tjek (drop tilbagetrukne).
4. Hård nedre relevans-grænse + hård recency-grænse ("nyeste viden").
5. **Tal-verifikation på hvert resumé** — opdigtede tal må aldrig udgives.
6. Konservative tærskler: hellere 2-5 stærke studier/dag end volumen.
7. Dry-run-fase: kør et par uger hvor `rejected`-loggen inspiceres, før tærskler løsnes.

## Env / secrets

- `ANTHROPIC_API_KEY` — til resuméerne (Vercel env + GitHub Actions secret). Uden den: template-fallback, pipelinen kører stadig.
- Supabase service-role key til job'et (Vercel env / GitHub secret). Brug aldrig service-role i frontend.

## Foreslået rækkefølge

1. Supabase-migration for `science_items`.
2. Port pipeline til `scripts/science-feed.ts` + `src/lib/science/`. Kør i dry-run, log til tabellen.
3. Frontend `/science` + feeds, læser fra tabellen.
4. i18n-tekster.
5. GitHub Action / cron.
6. Kør én gang manuelt, verificér `/science` + `/science/feed.xml`, kalibrér tærskler.
