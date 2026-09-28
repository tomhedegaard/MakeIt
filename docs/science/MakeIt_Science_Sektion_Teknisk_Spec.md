# MakeIt // HQ — Science-sektion

### Teknisk spec & arkitektur for et selvopdaterende, troværdighedsfiltreret videnskabsfeed

*Domæner: Kost (Mad) · Motion (Krop) · Mentalt velvære (Sind)*
*Udgivelsesmodel: fuldautomatisk, daglig*
*Version 1.0 — juni 2026*

---

## 1. Formål og produktidé

Science-sektionen er et dagligt opdateret feed med den nyeste, troværdige forskning inden for kost, motion og mentalt velvære. Hvert opslag er et kort dansk resumé (2–4 sætninger), et evidens-badge, et domæne-tag og et direkte link til den eksterne primærkilde (DOI). Sektionen er bygget til crewets "nørdede" segment, der vil holde sig opdateret uden selv at læse tidsskrifter.

Sektionen spejler appens eksisterende farveverdener: **Mad (grøn)**, **Krop (orange)** og **Sind (blå)**. Den fjerde verden, **Hjerte (rød / HRV)**, indgår som tværgående tag, fordi restitution og HRV-forskning rører alle tre domæner.

Designprincipperne arver fra resten af MakeIt: ingen black box, ærlige tal, ingen opfundne påstande. Et videnskabsfeed der lyver med tal ville bryde præcis den tillid, resten af produktet er bygget på. Derfor er hele arkitekturen optimeret mod ét mål: **at intet usandt eller utroværdigt slipper igennem til feedet.**

Tre krav driver designet:

1. **Kun troværdige kilder.** En hård gate, ikke en blød præference.
2. **En nedre relevans-grænse.** Feedet skal være tæt og signalrigt, ikke et dump af alt nyt.
3. **Fuldautomatisk, daglig opdatering.** Ingen manuel redaktør i loopet.

Konsekvensen af krav 3 er, at gates og scoring skal være konservative. Når der ikke er et menneske til at fange fejl inden udgivelse, skal tærsklerne sættes så et tvivlstilfælde holdes ude frem for inde. "Hellere gå glip af et godt studie end udgive et dårligt."

---

## 2. Overordnet arkitektur

Pipelinen er en lineær daglig batch med syv trin. Den kører som ét planlagt job, ikke i appens request-path — så frontend forbliver hurtig og uafhængig af eksterne API'er.

```
  [1 FETCH]      Hent nye poster fra videnskabs-API'er (sidste N dage)
      │
  [2 NORMALIZE]  Map alt til ét kanonisk record-format
      │
  [3 DEDUPE]     Slå dubletter sammen på DOI / normaliseret titel
      │
  [4 GATE]       Hård filtrering: kilde-whitelist, retraction, studietype
      │
  [5 SCORE]      Relevans + recency + evidensvægt → samlet score
      │            (under tærskel = droppes, logges men udgives ikke)
      │
  [6 SUMMARIZE]  LLM skriver dansk resumé med strenge guardrails
      │
  [7 PUBLISH]    Skriv til DB → generér feed-JSON + RSS/Atom → live
```

Adskillelse af ansvar:

- **Pipeline-worker** (kører dagligt, uden for Next.js' serverless-timeout) — gør alt arbejdet.
- **Datastore** (Postgres) — eneste sandhedskilde for udgivne opslag.
- **Next.js-frontend** — læser kun fra datastore/feed-JSON, kalder aldrig videnskabs-API'er direkte.
- **RSS/Atom-endpoint** — så de virkelig nørdede kan abonnere i deres egen feedlæser.

---

## 3. Kilder

### 3.1 Aggregator-API'er (primær motor)

Disse fire dækker tilsammen stort set al biomedicinsk og sportsvidenskabelig litteratur og er gratis. Brug dem som hovedmotor frem for at integrere mod hvert enkelt tidsskrift.

| API | Hvad det giver | Rate limit | Hvorfor det er valgt |
|---|---|---|---|
| **OpenAlex** | Metadata, studietype, citationstal, tidsskrift-metrics (h-index, 2-årig mean-citedness ≈ impact factor), `is_retracted`-flag, åben licens (CC0) | 100.000 kald/dag + 10 req/s i "polite pool" (kræver blot `mailto`-parameter) | Bedste til **filtrering på troværdighed**: kan filtrere direkte på tidsskrift, studietype og citationer. CC0-licens = ingen juridiske bånd på metadata. |
| **Europe PMC** | Abstracts, fuld query-syntaks med `PUB_TYPE`-filter (fx systematic review, meta-analysis), MeSH-termer | Fair-use, ingen nøgle nødvendig | Bedste til **abstracts + publikationstype-filter**. Dækker også preprints med kildeangivelse. |
| **PubMed E-utilities** (NCBI) | Den autoritative biomedicinske indeksering; `esearch` → `efetch`-flow, MeSH | 3 req/s uden nøgle, **10 req/s med gratis API-nøgle** | Guldstandard for biomedicin. Brug som krydstjek/berigelse, ikke nødvendigvis primær fetch. |
| **Crossref** | DOI-metadata, `update-to`-relationer (fanger retractions/errata) | Fair-use; "polite pool" med `mailto` | Til **retraction-/errata-tjek** og DOI-normalisering. |

> **Anbefaling:** Kør OpenAlex som primær fetch (rigest filtrering), berig med Europe PMC for abstract-tekst, og brug Crossref + OpenAlex' `is_retracted` til retraction-gaten. PubMed som sekundær kilde for emner der er stærkt biomedicinske (fx kost/metabolisme).

### 3.2 Preprint-servere (valgfrit, skal badges)

- **medRxiv / bioRxiv** har et gratis API. Preprints er **ikke peer-reviewed** og hører i en fuldautomatisk model strengt taget ikke hjemme i et "troværdigt" feed uden et menneskeligt led.
- **Anbefaling for fuldautomatisk drift:** Hold preprints **ude** af standardfeedet, eller læg dem i et separat, tydeligt mærket "Preprint / endnu ikke fagfællebedømt"-spor som den nørdede bruger aktivt kan slå til. Standard = fra.

### 3.3 Kurateret tidsskrift-whitelist (troværdighedens rygrad)

Whitelisten er det vigtigste enkeltelement i hele specen. Den er en eksplicit, versionsstyret liste over tidsskrifter og udgivere, der må optræde i feedet, identificeret via deres OpenAlex `source.id` (stabil identifier). Et studie der ikke er udgivet i et whitelistet tidsskrift, når aldrig frem til scoring.

Eksempler på tidsskrifter pr. domæne (ikke udtømmende — udvid ved opsætning):

- **Motion / Krop:** *Sports Medicine*, *Medicine & Science in Sports & Exercise*, *British Journal of Sports Medicine*, *Journal of Strength & Conditioning Research*, *Scandinavian Journal of Medicine & Science in Sports*, *European Journal of Applied Physiology*.
- **Kost / Mad:** *American Journal of Clinical Nutrition*, *The Lancet*, *Advances in Nutrition*, *Nutrients*, *British Journal of Nutrition*, *Journal of the International Society of Sports Nutrition*.
- **Mentalt velvære / Sind:** *The Lancet Psychiatry*, *JAMA Psychiatry*, *Psychological Medicine*, *Sleep*, *Journal of Affective Disorders*.
- **Tværgående / metode:** *Cochrane Database of Systematic Reviews*, *BMJ*, *Nature Medicine*, *JAMA*.

Vedligehold: whitelisten ligger som data (tabel eller JSON), ikke i kode. Tilføj/fjern uden deploy. Suppler med en objektiv kvalitetsregel som fallback (se 4.1).

---

## 4. Troværdigheds-gate (trin 4)

Gaten er **binær**: et studie er enten kvalificeret eller droppet. Ingen blød vægtning her — den kommer i scoringen bagefter. Et studie skal passere **alle** følgende for at gå videre.

### 4.1 Kilde-kvalitet

Studiet skal opfylde **mindst én** af:

- Udgivet i et tidsskrift på **whitelisten** (3.3), **eller**
- Udgivet i et tidsskrift der opfylder en **objektiv kvalitetsregel**: indekseret i DOAJ (for OA) eller PubMed, **og** har en OpenAlex 2-årig mean-citedness over en konfigurerbar tærskel (fx ≥ 3,0), **og** er ikke på en predatory-blokliste.

Whitelist tager forrang; kvalitetsreglen fanger nye, gode tidsskrifter som whitelisten endnu ikke kender.

### 4.2 Retraction & integritet

- Drop hvis OpenAlex `is_retracted = true`.
- Drop hvis Crossref `update-to` indeholder en retraction.
- Drop hvis titel/abstract matcher retraction-/expression-of-concern-mønstre.

### 4.3 Studietype-gate

Kun disse publikationstyper passerer (fanges via Europe PMC `PUB_TYPE` / OpenAlex `type`):

- Systematic review, meta-analysis, Cochrane review
- Randomized controlled trial (RCT)
- Større prospektive kohortestudier (med tærskel for deltagerantal)
- Konsensus-/guideline-dokumenter fra anerkendte selskaber

**Droppes** som standard: enkeltstående cellestudier, dyrestudier, case reports, narrative reviews uden metode, leder-/kommentar-artikler, konferenceabstracts. Disse er den hyppigste kilde til "junk science"-overskrifter og holdes ude.

### 4.4 Sprog & fuldstændighed

- Skal have et engelsk (eller dansk) abstract af tilstrækkelig længde til at kunne resumeres troværdigt. Tom/for kort abstract = drop (kan ikke resumeres uden at finde på indhold).

---

## 5. Relevans- og kvalitetsscoring (trin 5)

Alt der passerer gaten får en samlet score `0–100`. Kun poster over **`PUBLISH_THRESHOLD`** (start fx ved 70) udgives. Resten logges (så man kan kalibrere tærsklen) men vises ikke.

```
score =  w_rel  * relevance      // emne-match mod de tre domæner
       + w_evi  * evidence_level // studietype-styrke
       + w_rec  * recency        // hvor nyt
       + w_imp  * source_quality // tidsskrift-metric, normaliseret
       + w_cons * consensus      // bekræftes af flere kilder/reviews
```

Foreslåede startvægte: `relevance 0,35 · evidence 0,30 · recency 0,15 · source 0,15 · consensus 0,05`. Alle vægte og tærskler i én config-fil — kalibrér over de første uger ud fra loggen.

**Relevans (den nedre grænse).** To-trins:

1. **Grovfilter:** MeSH-/nøgleord-match mod kuraterede term-lister pr. domæne (fx for Krop: *resistance training, hypertrophy, VO2max, periodization …*).
2. **Finfilter:** embeddings-baseret cosine-lighed mellem abstract og en domæne-"seed"-beskrivelse. Under en cosine-tærskel (fx 0,35) droppes posten uanset andre faktorer. Det er den hårde nedre relevans-grænse.

**Evidens-niveau** mapper studietype til en ordinal styrke: meta-analyse/systematic review (højest) > RCT > kohorte > guideline. Bruges både i scoren og som synligt badge i UI.

**Consensus-bonus:** hvis et fund bekræftes af et nyligt review eller optræder konsistent på tværs af kilder, løftes scoren let. Modsat: enkeltstående, opsigtsvækkende fund uden bekræftelse scorer lavere — en indbygget dæmper mod sensationelle one-offs.

---

## 6. Resumé-generering (trin 6)

Hvert kvalificeret studie får et kort dansk resumé skrevet af en LLM. Dette er det mest følsomme trin i en fuldautomatisk model, fordi sproggenerering kan finde på tal. Guardrails er derfor strikse:

**Hård regel: modellen må kun bruge information fra abstract + struktureret metadata.** Ingen ekstern viden, ingen ekstrapolation, ingen opfundne effektstørrelser. Hvis abstractet ikke angiver et tal, må resuméet ikke angive et tal — præcis samme princip som "vi viser ikke en HRV-score fra 0–100" på landingpagen.

Resumé-skabelon (output som struktureret JSON, ikke fri tekst):

- `tldr` — 2–4 sætninger på dansk: hvad blev undersøgt, hvad fandt man, hvor sikkert.
- `domain` — `mad` | `krop` | `sind` (+ valgfrit `hjerte`-tag).
- `evidence_badge` — fx "Meta-analyse", "RCT", "Kohorte".
- `participants` — kun hvis angivet i abstract; ellers `null`.
- `effect` — den faktiske rapporterede effekt hvis angivet, ordret-tro; ellers `null`.
- `caveat` — én sætning om forbehold (fx "lille stikprøve", "kun mænd", "industrifinansieret" hvis oplyst).
- `source_url` — DOI-link til primærkilden.

Efterbehandling (deterministisk kode, ikke LLM):

- **Tal-verifikation:** ethvert tal i `tldr`/`effect` skal genfindes i abstractet (regex/streng-match). Mismatch → posten holdes tilbage og logges som fejl, udgives ikke.
- **Forbudt-sprog-tjek:** ingen diagnoser, ingen behandlingsanbefalinger, ingen "du bør"-formuleringer. Feedet refererer forskning; det giver ikke råd.
- **Længde-clamp** og afsluttende kildehenvisning påkrævet.

To-modellers tilgang anbefales: en billig model til at udkaste, en streng valideringsprompt (eller regelmotor) til at afvise. Det matcher husfilosofien "AI drafter" — her er valideringen bare også automatiseret i stedet for Munk.

---

## 7. Datamodel

Ét kanonisk record. Skitse (Postgres / Prisma-agtig):

```
ScienceItem
  id              uuid (pk)
  doi             text  (unik, nullable for preprints)
  title           text
  domain          enum  [mad, krop, sind]
  hjerte_tag      bool
  evidence_level  enum  [meta_analysis, systematic_review, rct, cohort, guideline]
  journal         text
  journal_src_id  text          // OpenAlex source.id (til whitelist-match)
  published_date  date
  indexed_date    date
  source_url      text          // DOI / ekstern primærkilde
  tldr_da         text
  effect_da       text  null
  participants    int   null
  caveat_da       text  null
  score           numeric
  status          enum  [published, held, rejected]   // audit-spor
  reject_reason   text  null     // hvorfor det ikke kom i feedet
  raw_meta        jsonb          // rå kilde-respons (revisionsspor)
  created_at      timestamptz
```

`status` + `reject_reason` giver et komplet revisionsspor — i tråd med "open brain": man kan altid se *hvorfor* et studie ikke kom med. Det er også sådan man kalibrerer tærskler.

Indekser: `(domain, published_date desc)`, `(status)`, unik `(doi)`.

---

## 8. Frontend — feed-UI

Ny rute, fx `/science` (og evt. `/science/[domain]`). Læser kun fra datastore. Designet arver MakeIt's sort/hvide base med farve som domæne-signal.

**Feed-liste (RSS-agtig):** kronologisk, hvert kort viser:

- Domæne-farvebånd (grøn/orange/blå) + evidens-badge.
- Titel + 2–4 sætningers dansk resumé.
- Tidsskrift · publiceringsdato · effekt (hvis angivet).
- "Læs kilden →" som direkte DOI-link (åbner eksternt).

**Filtre:** domæne (Mad/Krop/Sind), evidens-niveau (kun meta-analyser, kun RCT'er …), tidsperiode. Matcher den nørdede brugers ønske om at zoome ind.

**Maskinlæsbart abonnement:** `/science/feed.xml` (Atom/RSS) og `/science/feed.json` (JSON Feed), genereret i samme publish-trin. Det er kernen i "RSS-feed"-ønsket: nørderne kan følge med i deres egen reader. Tilføj `<link rel="alternate" type="application/rss+xml">` i `<head>` så feedlæsere auto-opdager den.

**Tom-tilstand & ærlighed:** Hvis en dag ikke producerer kvalificerede studier, vis "Ingen nye studier passerede tærsklen i dag" frem for at fylde med svagt indhold. Det understøtter troværdigheden — feedet hellere tomt end fyldt med støj.

---

## 9. Automatisering — daglig kørsel

Pipelinen er for tung (mange API-kald + LLM-resuméer) til at køre inden for en almindelig serverless-timeout. To realistiske mønstre:

### Mønster A — GitHub Actions (anbefalet)

En `schedule`-workflow (cron, fx `0 5 * * *` UTC) kører pipeline-scriptet på en GitHub-runner, skriver resultatet til Postgres (fx Supabase/Neon) og/eller committer feed-JSON til repoet. Next.js (på Vercel) re-validerer og viser.

- Fordele: ingen timeout-grænse, gratis minutter rigeligt til ét dagligt job, fuld kontrol over runtime, nem logning.
- Velegnet fordi arbejdet er en ren batch uden behov for at leve i appen.

### Mønster B — Vercel Cron → durable worker

Vercel Cron understøtter **daglig** kørsel på alle planer (Hobby: min. én gang/dag — præcis nok her). Cron-endpointet bør dog ikke selv lave det tunge arbejde pga. timeout; lad det i stedet trigge en durable/baggrunds-kørsel (fx Inngest eller Trigger.dev), der håndterer retries og lange kørsler.

```jsonc
// vercel.json
{ "crons": [ { "path": "/api/science/run", "schedule": "0 5 * * *" } ] }
```

> **Anbefaling:** Start med **Mønster A** (GitHub Actions) — enklest, billigst, ingen timeout-bekymringer for en daglig batch. Skift til Mønster B hvis I vil have alt samlet i Vercel-stакken.

Drift uanset mønster: idempotent kørsel (gentag uden dubletter via DOI-unik), struktureret logning af hvert trin, og en simpel "kørte den i dag?"-alarm (fx Slack-/mail-besked hvis jobbet fejler eller producerer 0 poster flere dage i træk).

---

## 10. Juridik, etik og API-skik

- **Ophavsret:** Gem og vis kun titel, metadata, et **selvskrevet dansk resumé** og et link til kilden. Republicér ikke abstracts ordret i fuld længde — paraphrase i resuméet og link til originalen. OpenAlex-metadata er CC0 (fri brug); Europe PMC-/PubMed-data er til brug under deres vilkår med kildeangivelse.
- **API-skik:** Brug "polite pool" (send `mailto`/`User-Agent` med kontakt), hold rate limits, hent kun deltaet (sidste N dage) — ikke fuld re-scan dagligt. Skaf en gratis NCBI API-nøgle (hæver PubMed til 10 req/s).
- **Ingen sundhedsrådgivning:** Feedet refererer forskning, det ordinerer ikke. Synlig disclaimer: "Forskningsresumeer — ikke individuel sundheds- eller kostrådgivning." Det matcher tonen i jeres HRV-FAQ ("aldrig diagnoser").
- **Ingen persondata** behandles i pipelinen → GDPR-let. (Hvis I senere tilføjer "gem til senere" pr. bruger, gælder almindelig samtykke-/datahåndtering.)
- **Attribution:** Vis altid tidsskrift + forfattere + år ved kilden.

---

## 11. Faldgruber ved fuldautomatisk drift (og modtræk)

Fordi der ikke er et menneske inden udgivelse, er disse de reelle risici:

| Risiko | Modtræk indbygget i specen |
|---|---|
| LLM finder på tal | Deterministisk tal-verifikation mod abstract (§6); mismatch = udgives ikke |
| Sensationelt one-off-studie rammer feedet | Studietype-gate + consensus-dæmper i score (§4.3, §5) |
| Predatory-tidsskrift slipper ind | Whitelist-forrang + DOAJ/PubMed-krav + blokliste (§4.1) |
| Tilbagetrukket studie vises | Retraction-gate via OpenAlex + Crossref (§4.2) |
| Feedet bliver tyndt eller spammy | Nedre relevans-grænse (cosine-tærskel) + "tom er ok"-UI (§5, §8) |
| Off-topic clickbait | To-trins relevansfilter med hård cosine-bund (§5) |
| Stille pipeline-nedbrud | Idempotens + fejl-/0-poster-alarm (§9) |

Den overordnede sikring: **konservative tærskler**. I en fuldautomatisk model er det bedre at sætte `PUBLISH_THRESHOLD` højt og kun udgive 2–5 stærke studier om dagen end at jagte volumen.

---

## 12. Anbefalet byggerækkefølge

1. **Datamodel + datastore** (§7) og en config-fil med whitelist, term-lister, vægte og tærskler.
2. **Fetch + normalize + dedupe** mod OpenAlex (+ Europe PMC for abstracts). Verificér på rå data uden scoring.
3. **Gate + scoring** (§4–5). Kør i "dry run": log hvad der *ville* blive udgivet, men publicér intet. Kalibrér tærskler på et par ugers data.
4. **Resumé + validering** (§6). Test tal-verifikationen aggressivt mod kendte abstracts.
5. **Publish + feed-JSON + RSS/Atom** (§8).
6. **Frontend-feed** under `/science` i MakeIt-designet.
7. **Cron** (§9) — start med GitHub Actions.
8. **Overvågning** — fejl-alarm + ugentligt blik på reject-loggen for at finjustere.

Trin 3's dry-run er nøglen: man ser feedet køre i skyggen i et par uger og justerer tærskler, *før* noget bliver synligt for crewet.

---

## 13. Kort sagt

Ja — det kan bygges, og det passer naturligt ind i MakeIt's eksisterende tre-domæne-struktur. Den tekniske kerne er ikke at *hente* forskning (det er gratis og veldokumenteret via OpenAlex/Europe PMC/PubMed), men at **filtrere hårdt nok** til at feedet kun indeholder troværdig, relevant viden uden et menneske i loopet. Det opnås gennem en kurateret tidsskrift-whitelist, en binær troværdigheds-gate, en to-trins relevans-grænse, og en resumé-generator med deterministisk tal-verifikation. Konservative tærskler og et ærligt "tom er ok"-feed beskytter den tillid, resten af produktet bygger på.
