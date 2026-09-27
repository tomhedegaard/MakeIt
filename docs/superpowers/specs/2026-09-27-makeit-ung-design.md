# Spec: MakeIt Ung — styrketræning for 15–17-årige med forældresamtykke

Dato: 27.09.2026 · Status: udkast til Toms godkendelse · Relateret: 18-årsgrænsen (PR #126),
spec 2026-09-27 afsnit S (sundt forhold til mad og krop)

> Juridiske henvisninger er slået op i gældende lov (lovguiden) 27.09.2026. Specen er ikke
> juridisk rådgivning; vilkår, samtykketekster og protokol bør gennemgås juridisk og klinisk
> før lancering.

---

## 0. Hvad og hvorfor

MakeIt // HQ er for voksne (fyldt 18). Unge, der vil træne styrke, er en reel målgruppe, men
de skal have et andet produkt, ikke den voksne app med et flueben:

- **Forælderen indgår aftalen og giver samtykke.** Den unge har sit eget login.
- **Alt, der kan skubbe til et anstrengt forhold til mad og krop, er slået fra**, ikke bare
  overvåget: ingen kalorier, makroer, vægt eller pejlemærke.
- **Tegn på et usundt forhold til træning eller mad går til et menneske**, der følger en fast
  protokol og inddrager forælderen. Ikke en automatisk besked fra systemet til forælderen.

---

## 1. Juridisk ramme

| Regel | Hvad den betyder her |
|---|---|
| Databeskyttelsesloven § 6, stk. 2–3 | Samtykke fra barnet selv gælder ved onlinetjenester fra 15 år. Under 15 skal forældremyndighedens indehaver give eller godkende samtykket. |
| Databeskyttelsesforordningen art. 9 | Træning, søvn, HRV og mental sundhed er helbredsoplysninger og kræver udtrykkeligt samtykke. |
| Værgemålsloven § 42, stk. 2 | En mindreårig kan ikke påtage sig gældsforpligtelser. **Forælderen indgår og betaler abonnementet.** |
| Børneattestloven § 2 | Børneattest for personer med direkte kontakt med børn under 15 i fast tilknytning, efter de nærmere regler. |

**Beslutninger, specen bygger på (anbefalet):**

- **Alder 15–17 i første version.** Under 15 kræver alt forældresamtykke også efter § 6 og
  bringer børneattestloven i spil fuldt ud. Det kan komme senere.
- **Forældresamtykke for alle, også 15–17.** Strengere end § 6 kræver, fordi det er
  helbredsoplysninger om en mindreårig. Den unge giver sit eget samtykke ved siden af.
- **Børneattest for alle coaches**, der skriver med unge, uanset om loven kræver det for
  15–17-årige. Det er god praksis og en forudsætning, hvis aldersgrænsen senere sænkes.

---

## 2. Konti og samtykke

1. **Forælderen** opretter eller bruger en voksen konto (fyldt 18, bekræftet), vælger
   *MakeIt Ung* og betaler via Stripe. I iOS-appen skjules køb som i dag (Apple 3.1.1).
2. Forælderen **inviterer den unge** med e-mail og fødselsår og giver samtykke pr. område:
   træning og form-check-videoer · søvn og HRV fra wearable · Mind (check-in og journal).
   Hvert område kan fravælges.
3. **Den unge** opretter sit eget login fra invitationen, ser præcis de samme områder og
   giver sit eget samtykke. Den unge får vist, hvornår forælderen får besked (afsnit 5).
4. **Tilbagetrækning:** forælderen eller den unge kan trække et område tilbage; data for
   området slettes. Opsiges abonnementet, slettes den unges konto efter privatlivspolitikken.
5. **Når den unge fylder 18**, tilbydes et skifte til en almindelig konto med nyt, eget
   samtykke. Forælderens adgang til overblikket ophører.

**Forælderen ser:** træningsfrekvens, hviledage, søvnens rytme (ikke nattens detaljer) og
coachens notater til forældre. **Forælderen ser ikke:** journal, beskeder, mind-check-svar
eller form-check-videoer. Den unges fortrolighed er en forudsætning for ærlige svar.

---

## 3. Produktet

| Område | MakeIt Ung |
|---|---|
| **Træning** | Med. Programmer til unge med fokus på teknik og progression. Ingen maksimalforsøg (1RM); topsæt højst RPE 8. HQ tilpasser stadig efter søvn og HRV, men gør kun lettere, aldrig tungere. |
| **Form-check** | Med. Kun Munk og den tilknyttede coach ser videoerne; de deles aldrig i Crew; slettes efter 90 dage. |
| **Søvn og restitution** | Med, som restitution ("din krop har brug for en rolig dag"), aldrig som præstationstal. |
| **Mad** | Måltider og idéer til energi omkring træning, **uden tal**: ingen kalorier, makroer, HQ-estimat af måltider, vægt, pejlemærke eller kropssammensætning. |
| **Mind** | Med. Check-in og journal er private for den unge. Hjælp henviser til Børnetelefonen og headspace, og ved akut fare til 112. |
| **Crew** | Ikke i første version. Senere evt. et lukket crew kun for unge, modereret. Ingen direkte beskeder mellem unge og voksne medlemmer. |
| **Reps** | Med, men uden fysiske events og 1:1-tid uden forælder til stede. |
| **Beskeder med coach** | Kun gennem appen, logget og revisionsbart, aldrig private kanaler. Coachen kender protokollen i afsnit 5. |

---

## 4. Tegn på et anstrengt forhold til træning og mad

Fastlægges sammen med en **klinisk rådgiver** (psykolog med speciale i spiseforstyrrelser)
før bygning. Udgangspunkt:

| Tegn | Kilde i appen |
|---|---|
| Træning næsten hver dag i to uger uden hviledag, eller flere pas samme dag | træningslog |
| Træning trods gentaget meget lav HRV og dårlig søvn | HRV, søvn, log |
| Svar i mind-check om, at træning eller mad føles tvangspræget, skyldbetonet eller styrende | mind-check (nye, validerede spørgsmål) |
| Sprog om selvskade eller at ville forsvinde | den eksisterende sikkerhedspipeline (mental_safety_alerts) |
| Pludseligt fald i træning, check-in og søvn samtidig | aggregeret mønster |

Signaler vises aldrig som en advarsel til den unge og tolkes aldrig af AI alene.

---

## 5. Varsling: gennem et menneske, efter en fast protokol

Tom ønskede, at forældre varsles automatisk. Specen anbefaler i stedet, at varslingen går
gennem et menneske, af tre grunde: automatiske signaler giver falske alarmer; en ung, der ved,
at alt meldes videre, holder op med at svare ærligt; og i nogle hjem er forælderen en del af
problemet.

| Niveau | Hvad sker der | Hvornår får forælderen besked |
|---|---|---|
| **Akut** (selvskade, fare for liv) | Den eksisterende sikkerhedspipeline. Den unge ser straks 112, Børnetelefonen og headspace. | **Med det samme**, sammen med de samme henvisninger. |
| **Bekymring** (tegn fra afsnit 4) | Signalet lander i coach-køen. Coachen ser på det inden for 24 timer og taler med den unge. | Inden for 72 timer efter coachens vurdering, med en neutral besked og et tilbud om en samtale. |
| **Opmærksomhed** (enkeltstående tegn) | Coachen holder øje; ingen handling over for den unge ud over almindelig coaching. | Ikke særskilt; indgår i det månedlige overblik, hvis det gentager sig. |

**Gennemsigtighed:** Den unge får ved samtykket at vide præcis, hvornår forælderen kontaktes,
og ser hver gang, at det er sket: "Vi har kontaktet din forælder, fordi …". Ingen hemmelig
overvågning.

**Beskeden til forælderen** beskriver det observerede ("har trænet 13 af de sidste 14 dage og
sovet under 6 timer"), aldrig en diagnose, og peger på LMS (Landsforeningen mod
spiseforstyrrelser og selvskade) og egen læge.

---

## 6. Data

| Tabel/felt | Formål |
|---|---|
| `members.account_type` (`adult` · `youth`) | styrer, hvad appen viser |
| `members.birth_year` | kun for unge; skifte ved 18 |
| `guardianships` | forælder, ung, samtykke pr. område, tidspunkter, tilbagetrækning |
| `youth_signals` | tegn, niveau, status, ansvarlig coach, hvornår forælderen fik besked |
| `guardian_notices` | hver besked til en forælder, også synlig for den unge |

Alle tabeller med RLS: den unge ser sit eget; forælderen ser kun overblikket; coachen ser
det, protokollen kræver. Med i dataudtræk efter art. 20.

---

## 7. Åbne spørgsmål til Tom

1. **Aldersgrænse:** 15–17 i første version (anbefalet), eller også 13–14?
2. **Klinisk rådgiver:** Hvem? Uden én bygges afsnit 4 og 5 ikke.
3. **Pris:** eget abonnement for Ung, eller et tillæg til forælderens?
4. **Coaches:** Er Munk og co-coaches klar til at indhente børneattest og følge protokollen?
5. **Pilot:** lukket pilot med 5–10 familier, før Ung åbnes bredt? (anbefalet)

---

## 8. Leverance

1. **Konti og samtykke** (afsnit 2 og 6): forælder, invitation, samtykke pr. område,
   tilbagetrækning, skifte ved 18.
2. **Produktet** (afsnit 3): `account_type = youth` slår områder til og fra, og en gate sikrer,
   at ingen kalorie-, vægt- eller pejlemærke-flade kan nå en ung konto.
3. **Signaler og protokol** (afsnit 4 og 5), efter den kliniske rådgivers input.
4. **Pilot**, derefter bred lancering.
