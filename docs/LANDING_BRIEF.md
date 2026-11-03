# Landing brief: Under stangen, igennem natten

Self-authored under explicit creative delegation (Tom, 2026-11-03: "Ja,
frie rammer"). Rammerne er husets Nord-system; reglerne, der bøjes, står
nederst med begrundelse. Scroll-craft-metoden (følelseskurve, én top,
ét signaturtræk) ligger under; ingen af dens motorer eller biblioteker.

## De otte svar

1. **Stemning:** saglig, tung, lys. Referencer: en printet
   træningsjournal, et måleinstrument i et laboratorium, et stillbillede
   fra et løft i et tomt rum.
2. **Rejsen:** du står under stangen (hero) → de fire systemer som
   kapitler (Træning, Mad, HRV) → natten og morgenen, hvor passet bliver
   skrevet om (motoren) → Sind → én dag i appen → crewet, Munk, stemmer →
   FAQ → adgang.
3. **Energi:** rolig åbning med én stor bevægelse (squatten), stigende
   gennem kapitlerne, mørk og stille i natten, toppen når morgenen bryder,
   derefter varmt og jævnt til afgørelsen.
4. **Følelse pr. akt og toppen:** se kurven nedenfor. Det ene øjeblik:
   *morgenen bryder, og vægten på stangen bliver skrevet om foran dig.*
5. **Det, ingen anden side gør:** du scroller igennem natten. Uret kører
   fra 23:40 til 06:45 under din hånd, HRV-kurven tegner sig, tre tal
   lander, og så bliver det morgen.
6. **Afstand fra premium-minimal:** editorial. Ikke brutalist, ikke
   maximalist. Print-kapitler med ét levende instrument.
7. **Én verden eller kapitler:** kapitler. Siden er en printet feature
   med hard cuts; motoren er det ene kapitel, der er et instrument.
8. **Assets:** de 577 MoveKit-demoer (3D-lerfigur, røde muskler, hvid
   bund), Munks portræt, appens rigtige skærme. Ingen genererede
   billeder; ingen kie.ai-nøgle.

## Grammatik

Chaptered editorial med ét live-instrument. Nav med kapitelmarkør,
kg-linealer som kapitelgrænser, FAQ komprimeret, afgørelsen mørk til
sidst. Hero'en er ikke en titelside: den er figuren i rummet, fordi
produktet er løftet.

## Følelseskurve

| # | Akt | Følelse | Hvad på skærmen gør det |
|---|---|---|---|
| 1 | Hero: under stangen | Genkendelse | Løfteren i 3D står foran overskriften og squatter én rep under din scroll; dørene rejser sig fra forgrunden |
| 2 | Træning | Appetit | 577 i 3D, galleriet glider under den pinnede overskrift |
| 3 | Mad | Varme | Tallerkenerne sættes, listen samler sig |
| 4 | HRV | Uro | Mørk blok, dit eget bånd, nattens tal |
| 5 | **Motor: natten** | **Stilhed, så ærefrygt** | Instrumentet: uret løber, kurven tegner sig, tre tal lander i mørke. Så bryder morgenen, og passet skrives om: 150 → 135 |
| 6 | Sind | Ro | Uændret |
| 7 | Appen, i dagslys | Tillid | Den stille telefon, skærmene skifter |
| 8 | Crew | Tilhør | Væggen af ansigter, kortene stiger |
| 9 | Munk | Nærhed | Signaturen skriver sig |
| 10 | Stemmer, FAQ | (administrativt, kort) | Ingen bevægelse |
| 11 | Adgang | Beslutning | Mørk blok, overskriften rejser sig, én formular |

**Stilhed før toppen:** HRV-kapitlet er mørkt og stille; natten åbner
tomt, kun uret. Det er authored silence, ikke dødt scroll.

**Toppen** er akt 5 og får mest scroll-plads på siden (pinnet stage på
brede skærme, ca. 3,2 svh, mere end racken på 3,1 og hero'en på 1,8).

**Tell-someone:** Det er siden, hvor du scroller igennem natten, uret
kører fra 23:40 til 06:45, og når morgenen bryder, er vægten på stangen
skrevet om foran dig.

## Signaturtræk

Uret, der scroller. Et rent CSS-ur (registreret `<integer>`, tællere
med `round()` og `mod()`) drevet af nattens view-timeline. Ingen JS, ingen
scroll-listener. Det bor i toppen, som feel.md kræver.

## Hero: planer

| Plan | Hvad | Bevægelse ved scroll (≥ 1024 px, pinnet) |
|---|---|---|
| Bagest | H1 "Bygget til dem der løfter." | Rejser langsomt op og dæmpes |
| Motiv | Løfteren (back squat, 117 frames, alfa-WebP) | Squatter én hel rep, står på grundlinjen, dækker H1's nederste del |
| Forrest | De fire døre | Kommer op fra forgrunden hurtigere end alt andet og lander, når figuren står igen |
| Luft | Kg-lineal i bunden | Følger dørene |

Mobil (< 1024 px): ingen pin. H1 øverst, figuren under den til højre
(ca. 60 vw høj), squatten følger blokkens egen rejse gennem viewporten,
dørene som swipe-række. Reduceret bevægelse og uden JS: posteren (stående
løfter) og den statiske komposition.

Pointer: på fin pointer forskydes figuren få px mod musen, overskriften
den modsatte vej (én legemliggørelse, som feel.md §4 anbefaler).

## Toppen: Instrumentet (MotorStory)

Et nyt, mørkt stage (lokal `data-theme="nat"`, godkendt mønster) øverst i
motor-sektionen, før overskriften:

- Uret 23:40 → 06:45 i display-størrelse, drevet af scroll.
- Nattens HRV-kurve i fuld bredde tegner sig (`pathLength=1`,
  `stroke-dashoffset` på view-timeline).
- Tre aflæsninger lander, hver i sin domænefarve, mens kurven passerer
  dem: Søvn 5 t 12 m, HRV 48 ms, Stress 4/5.
- Nat til morgen forankres til stagets slutning i stedet for
  beslutningslinjen: morgenen bryder, når stagets sidste scroll er brugt,
  og overskriften "Passet bliver skrevet om, mens du sover." står i lys.
- Resten af sektionen (rapportlinjer, telefonrig, Prøv selv, grænser)
  står som før, i dagslys.

Pinnet på ≥ 1024 px (stage 100 svh + 220 svh rejse). Under 1024 px: ingen
pin, stagets eget view-timeline driver ur og kurve, mens det passerer.

## Regler, der bøjes, og hvorfor

| Regel | Hvad der sker | Hvorfor det er i orden |
|---|---|---|
| Ét dokumenteret dark-block-sæt | Nattens stage er en fjerde mørk blok (lokal nat) | Mørket fortæller, hvad indholdet er: natten. Linje tilføjes i DESIGN.md |
| Grafik-allowlist | `NightStage.tsx` tegner SVG | Det er en graf (data), samme begrundelse som NightCurve |
| Hero uden pin | Hero'en pinnes på ≥ 1024 px | Squatten skal have rejse; pin-forbuddet under 1024 px holdes |
| Kun transform/opacity/tokens | `stroke-dashoffset` og CSS-tællere animeres | Dashoffset bruges allerede (NightCurve, Munk). Tællere er tekstindhold, ikke layout |

Ikke rørt: Sind, racken, crew, Munk, adgang, FAQ. Ingen animations-
biblioteker. Hvilestanden læses uden JS.
