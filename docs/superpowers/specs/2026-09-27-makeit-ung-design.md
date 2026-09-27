# Spec: MakeIt Ung — styrketræning for 15–17-årige med forældresamtykke

Dato: 27.09.2026 · Status: Toms beslutninger 27.09.2026 indarbejdet (afsnit 7) · Relateret: 18-årsgrænsen (PR #126),
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
- **Tegn på et usundt forhold til træning eller mad varsler forælderen automatisk** (Toms
  beslutning), med fuld gennemsigtighed over for den unge og forsigtige tærskler.

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
- **Ingen coach-kontakt med unge i første version** (beslutning 4): coaches indhenter ikke
  børneattest nu, så Ung har ingen beskeder med coaches og ingen form-checks, som et menneske
  skriver under på. Kommer coaches til senere, sker det med børneattest for alle, der har
  kontakt med unge, uanset om loven kræver det for 15–17-årige.

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
hvert varsel, der er sendt. **Forælderen ser ikke:** journal, beskeder, mind-check-svar
eller form-check-videoer. Den unges fortrolighed er en forudsætning for ærlige svar.

---

## 3. Produktet

| Område | MakeIt Ung |
|---|---|
| **Træning** | Med. Programmer til unge med fokus på teknik og progression. Ingen maksimalforsøg (1RM); topsæt højst RPE 8. HQ tilpasser stadig efter søvn og HRV, men gør kun lettere, aldrig tungere. |
| **Form-check** | Ikke i første version. Brandets løfte er, at et menneske skriver under, og ingen coach har kontakt med unge endnu (beslutning 4). HQ giver tekniske cues fra øvelsesbiblioteket i stedet. |
| **Søvn og restitution** | Med, som restitution ("din krop har brug for en rolig dag"), aldrig som præstationstal. |
| **Mad** | Måltider og idéer til energi omkring træning, **uden tal**: ingen kalorier, makroer, HQ-estimat af måltider, vægt, pejlemærke eller kropssammensætning. |
| **Mind** | Med. Check-in og journal er private for den unge. Hjælp henviser til Børnetelefonen og headspace, og ved akut fare til 112. |
| **Crew** | Ikke i første version. Senere evt. et lukket crew kun for unge, modereret. Ingen direkte beskeder mellem unge og voksne medlemmer. |
| **Reps** | Med, men uden fysiske events og uden 1:1-tid med coach. |
| **Beskeder med coach** | Ikke i første version (beslutning 4). |

---

## 4. Tegn på et anstrengt forhold til træning og mad

Første version bruger alene varsling af forælderen og ingen klinisk rådgiver (beslutning 2).
Tegnene er derfor få, konkrete og målbare, så de kan forklares i én sætning til både den unge
og forælderen. En klinisk rådgiver anbefales stadig, før listen udvides.

| Tegn | Kilde i appen |
|---|---|
| Træning næsten hver dag i to uger uden hviledag, eller flere pas samme dag | træningslog |
| Træning trods gentaget meget lav HRV og dårlig søvn | HRV, søvn, log |
| Svar i mind-check om, at træning eller mad føles tvangspræget, skyldbetonet eller styrende | mind-check (to nye spørgsmål; kun med i første version, hvis de formuleres, så de ikke kræver klinisk tolkning) |
| Sprog om selvskade eller at ville forsvinde | den eksisterende sikkerhedspipeline (mental_safety_alerts) |
| Pludseligt fald i træning, check-in og søvn samtidig | aggregeret mønster |

Tegnene beregnes af faste regler, ikke af AI, så det altid kan forklares præcist, hvorfor et
varsel blev sendt.

---

## 5. Varsling af forælderen (beslutning 2 og 4)

Varslet går automatisk til forælderen. Tom har valgt det frem for en coach-vurdering; specen
havde anbefalet en coach først (falske alarmer, ærlighed, hjem hvor forælderen er en del af
problemet). Værnene er derfor bygget ind i selve varslingen:

| Niveau | Hvornår | Hvad sker der |
|---|---|---|
| **Akut** | Sprog om selvskade eller at ville forsvinde (den eksisterende sikkerhedspipeline) | Den unge ser straks 112, Børnetelefonen og headspace. Forælderen får besked med det samme med de samme henvisninger. |
| **Bekymring** | Et tegn fra afsnit 4, der har stået på i mindst 7 dage | Forælderen får én neutral besked. Samme tegn varsles højst én gang pr. 14 dage. |

**Værn:**

- **Den unge ser hvert varsel**, i appen og samtidig med forælderen: "Vi har sendt din
  forælder denne besked, fordi …". Ingen hemmelig overvågning. Den unge har fået at vide ved
  samtykket, præcis hvilke tegn der udløser et varsel.
- **Beskeden beskriver det observerede**, aldrig en diagnose eller en vurdering: "har trænet
  13 af de sidste 14 dage og sovet under 6 timer 5 nætter". Den peger på en rolig samtale,
  egen læge og LMS (Landsforeningen mod spiseforstyrrelser og selvskade).
- **Forsigtige tærskler og loft:** hellere et varsel for lidt end en strøm af alarmer, der
  gør den unge utryg. Tærsklerne står i koden med begrundelse og tests.
- **Den unge kan altid række ud:** Børnetelefonen og headspace står fast i Mind, uafhængigt af
  varsler.

---

## 6. Data

| Tabel/felt | Formål |
|---|---|
| `members.account_type` (`adult` · `youth`) | styrer, hvad appen viser |
| `members.birth_year` | kun for unge; skifte ved 18 |
| `guardianships` | forælder, ung, samtykke pr. område, tidspunkter, tilbagetrækning |
| `youth_signals` | tegn, niveau, hvornår det blev set, hvornår forælderen fik besked |
| `guardian_notices` | hver besked til en forælder, også synlig for den unge |

Alle tabeller med RLS: den unge ser sit eget; forælderen ser kun overblikket; coachen ser
det, protokollen kræver. Med i dataudtræk efter art. 20.

---

## 7. Beslutninger (Tom, 27.09.2026)

1. **Alder:** 15–17 år i første version.
2. **Klinisk rådgiver:** ikke til en start; første version er alene varsling af forælderen.
3. **Pris:** Ung er et eget abonnement (prisen fastsættes sammen med de øvrige priser).
4. **Coaches og børneattest:** nej, ikke nu. Derfor ingen coach-kontakt, ingen form-checks
   med menneskelig underskrift og ingen beskeder med coaches i Ung.
5. **Pilot:** ja, lukket pilot med 5–10 familier før bred lancering.

---

## 8. Leverance

1. **Konti og samtykke** (afsnit 2 og 6): forælder, invitation, samtykke pr. område,
   tilbagetrækning, skifte ved 18.
2. **Produktet** (afsnit 3): `account_type = youth` slår områder til og fra, og en gate sikrer,
   at ingen kalorie-, vægt- eller pejlemærke-flade kan nå en ung konto.
3. **Tegn og varsling** (afsnit 4 og 5): faste regler, varsel til forælder og den unge samtidig.
4. **Pilot**, derefter bred lancering.
