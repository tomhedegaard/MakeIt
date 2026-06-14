# MakeIt // Science — kørende prototype

Proof of concept for det selvopdaterende videnskabsfeed beskrevet i `../MakeIt_Science_Sektion_Teknisk_Spec.md`. Henter ægte studier fra Europe PMC, filtrerer hårdt på troværdighed + relevans + recency, scorer, skriver et dansk resumé med tal-verifikation, og udgiver et feed (JSON + RSS) + en demo-side.

## Kør

```bash
cd science-prototype
node run.mjs            # LIVE mod Europe PMC (kræver netadgang)
node run.mjs --fixture  # offline, på de vedlagte ægte data
```

Ingen dependencies — ren Node (v18+, bruger global `fetch`).

## Hvad du ser

Pipelinen logger hvert trin og — i tråd med "open brain" — *hvorfor* hvert afvist studie ikke kom med:

```
✓ UDGIVET: 5
✗ AFVIST:  2
  · uden for recency-vindue (>220 dage gammelt)  —  [2020-studie]
  · under relevans-grænse (0.05 < 0.3)           —  [fraktur/smerte-studie]
```

De to afviste demonstrerer gates der virker: et gammelt studie falder på **recency**, og et fraktur-studie (som teknisk matchede søgningen "exercise depression") falder på **relevans**, fordi dets MeSH-emner ikke hører til kost/motion/sind.

## Output (`output/`)

- `science-demo.html` — feed-siden i MakeIt's sort/hvide stil. Åbn i browser. Domæne-filtre virker.
- `feed.xml` — RSS til feedlæsere (det "nørderne" abonnerer på).
- `feed.json` — JSON Feed til frontend.

## Filer

| Fil | Ansvar |
|---|---|
| `config.mjs` | Whitelist, domæne-vokabular, vægte, tærskler — al kuratering ét sted |
| `src/fetch.mjs` | Europe PMC-fetch (live + fixture-fallback) |
| `src/pipeline.mjs` | normalize → dedupe → gate → score → summarize + tal-verifikation |
| `src/feed.mjs` | Skriver JSON + RSS + demo-HTML |
| `run.mjs` | Orkestrator — præcis det et dagligt cron-job kører |
| `fixtures/` | Ægte Europe PMC-records (juni 2026) til offline-kørsel |

## Tal-verifikation (kernen i troværdigheden)

`verifyNumbers()` kræver at ethvert tal i resuméet genfindes i kildens abstract. Negativ test:

```
Ægte (0.37 findes):      { ok: true,  missing: [] }
Opdigtet (0.55 findes ikke): { ok: false, missing: ['0.55'] }   ← blokeres fra udgivelse
```

## Fra prototype til produktion

1. **LLM-resumé:** Erstat den template-baserede `summarize()` med et LLM-kald (2–4 danske sætninger). Behold tal-verifikationen ovenpå uændret.
2. **Datastore:** Skriv `published[]` til Postgres i stedet for JSON-fil.
3. **Kilder:** Tilføj OpenAlex (citations, `is_retracted`, tidsskrift-metrics) til `fetch.mjs` og berig `sourceScore`.
4. **Cron:** Kør `run.mjs` dagligt via GitHub Actions eller Vercel Cron (se spec §9).
5. **Frontend:** Erstat demo-HTML med en Next.js-rute `/science` der læser fra datastore.
