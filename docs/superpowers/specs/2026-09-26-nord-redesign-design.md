# Designbrief: MakeIt // HQ-appen i retning 05 Nord (revideret)

Selvstændig beskrivelse til at få lavet app-mockups i en anden chat. Alt nødvendigt står her; kildehenvisninger nederst er kun til den, der vil grave dybere. Dato: 26.09.2026.

---

## 0. Prompt til at sætte ind i den anden chat

> Lav mockups af mobilappen **MakeIt // HQ** (dansk coaching-app til styrketræning) i designretningen **05 Nord (revideret)** som beskrevet i den vedlagte brief. Overhold tokens, typografi og regler i briefen præcist. Lav skærmene i afsnit 6 som iPhone-skærme på 390 × 844 px (2x eksport), hver som en færdig, realistisk skærm med det indhold, der står i briefen. Brug kun eksempeldata fra briefen, opfind ingen tal, og skriv "Eksempeldata" diskret i toppen af hver skærm. Sentence case overalt, radius 0, 1 px linjer, én skrift (Schibsted Grotesk), hvid handelsflade, mosgrøn kun som accent, domænefarver kun som data-blæk. Sessionsskærmen og coach-skærmen er mørke (Nord nat); alle andre er lyse. Lever også ét designsystem-ark (tokens, typografi, komponenter) i samme stil.

---

## 1. Hvad appen er (kontekst på ti linjer)
- **MakeIt** er et dansk styrkebrand (løftestropper StrapIt, kabelmanchetter HookIt, wrist wraps, syet i Karlslunde). Webshoppen nowmakeit.eu relanceres i en ny designretning, og **webshoppen sætter tonen; appen følger**. Appen må ikke få sit eget udtryk.
- **MakeIt // HQ** er brandets coaching-app (lukket beta). "HQ" er appens motor: hver nat læser den nattens HRV, søvn og mind-check og skriver dagens pas om. Medlemmet ser altid hvorfor og kan trykke **Behold original**. Form-checks får et AI-udkast, som hovedcoachen retter og skriver under på. Løfte: "AI gør det generiske. Mennesker gør det vigtige."
- Seks systemer med faste numre i navigationen: **01 I dag · 02 Træn · 03 Mad · 04 Crew · 05 HRV · 06 Mind**, plus **07 Reps** (loyalitet, fire niveauer: Lifter → Athlete → Beast → Legend), 08 Forskning, 09 Mig, 10 Beskeder. Coach-konsollen er en separat, mørk flade.
- Målgruppe: begge køn, 25–45, Danmark og Sverige. Nye kunder i shoppen er 51 % kvinder. Alt skal virke unisex.
- Sprog: dansk først (svensk og engelsk sekundært). Copy er kort, konkret, uden udråbstegn.

## 2. Retning 05 Nord (revideret) – idéen
Nordisk minimalisme bygget til Sverige: hvid flade, én skrift i sentence case, tynde linjer, produkt og data på hvid, mosgrøn som eneste brand-accent. **Revisionen** låner tre ting fra den mørke retning: store fotos i full-bleed, **mørke fortællebånd** (blæk-flader til historie, kit og spec) og store tal som social proof. Handel og data forbliver hvide. Tone: "Grebet holder. Du løfter." / "Greppet håller. Du lyfter." Kort, saglig, to-sproget.

Det udtryk, svenskere læser som premium (Casall, On, Björn Borg-niveau) – ikke Gymgrossisten, ikke Gasp. Risikoen er anonymitet ("Scandi-washing"); derfor lever retningen af præcise fotos, præcis copy og store, ærlige tal.

## 3. Tokens

### 3.1 Nord lys (alle medlemsflader, onboarding, login)
| Token (appens navne) | Værdi | Rolle |
|---|---|---|
| `--bg` | `#FFFFFF` | Side |
| `--bg-2` | `#F2F2F0` | Sektioner, kort, produkt-/datafelter |
| `--bg-3` | `#E9E9E6` | Indlejrede felter, stepper, inaktive spor |
| `--bg-elev` | `#FFFFFF` | Sheets, popovers (med 1 px linje, ingen skygge) |
| `--fg` | `#111111` | Overskrifter, tal, primærknap |
| `--fg-body` | `#333333` | Brødtekst |
| `--fg-dim` | `#6B6B66` | Sekundær tekst, metadata |
| `--fg-faint` | `#B9B9B4` | Placeholder, inaktive ikoner (kun over 18 px eller dekorativt) |
| `--line` | `#E1E1DE` | Alle linjer, 1 px |
| `--line-strong` | `#CFCFCA` | Fokus, aktive rammer |
| `--signal` | `#2E4A3B` (mos) | Eneste brand-accent: kickers uden domæne, links, progress, aktiv tab-markør, valgt tilstand. Aldrig som knapfyld, aldrig på store flader |
| `--signal-ink` | `#2E4A3B` | Mos som tekst (AA på hvid: 8,9:1) |
| Produktfarver (kun på produktbilleder/swatches) | Rosa `#E5A8B0` · Salvie `#9DB18C` · Sand `#D9C9A8` · Læder `#5B3A22` · Navy `#22304A` · Oliven `#4E5A3E` | Swatches i Reps-shoppen og kit-kort |

### 3.2 Nord nat (kun `/session` under et pas og coach-konsollen)
| Token | Værdi | Rolle |
|---|---|---|
| `--bg` | `#111111` | Side |
| `--bg-2` | `#1A1A19` | Kort |
| `--bg-3` | `#232322` | Felter |
| `--fg` | `#FFFFFF` | Tekst, tal |
| `--fg-body` | `#E6E6E2` | Brødtekst |
| `--fg-dim` | `#B9B9B4` | Sekundær |
| `--line` | `rgba(255,255,255,0.12)` | Linjer |
| `--signal` | `#FFFFFF` | På mørkt er hvid emfasen (ingen mos på mørkt) |

Samme mørke flade bruges som **fortællebånd** inde i lyse skærme (fx "Sådan læste HQ natten", kit-kort i Reps-shoppen): en blæk-blok `#111111` med hvid tekst, 24 px indvendig margin, ingen radius.

### 3.3 Domænefarver (farve er retning, ikke dekoration)
Bruges **kun** som: kicker for domænet (13 px), data-blæk i grafer (linjer, punkter, bånd), aktiv nav-markør, små dots, badge-tint (12 % flade + 32 % kant + farvet tekst). **Aldrig** i knapper, brødtekst, overskrifter, kort-baggrunde eller alerts. Maks. ca. 10 % af en flade.

| Domæne | Lys (AA på hvid) | Mørk | Dækker |
|---|---|---|---|
| Krop (02 Træn) | `#A8380B` | `#FF9C41` | program, pas, øvelser |
| Mad (03) | `#116A35` | `#45C487` | måltider, indkøb, vægt |
| Hjerte (05 HRV) | `#BE123C` | `#F2545B` | HRV, puls, søvn-sync |
| Sind (06 Mind) | `#1D4ED8` | `#5B9DF5` | mind-check, journal, sessioner |

Status (kun i fyldte alerts med ikon og tekst): ok `#116A35`, advarsel `#8A6A00`, fare `#B42318`. Ingen "info"-farve; info er monokrom.

## 4. Typografi
- **Én skrift: Schibsted Grotesk** (Google Fonts), vægte 400 og 500. Ingen uppercase-kickers, ingen kondenseret display, ingen monospace. Sentence case overalt, også knapper.
- Tal: `font-variant-numeric: tabular-nums`. Store tal i 500.

| Rolle | Størrelse / linjehøjde / tracking | Vægt |
|---|---|---|
| Hero-tal (HRV 43 ms, Reps 1.420, topsæt 135 kg) | 64 / 0,95 / −0,04em (88 på tablet) | 500 |
| Sidetitel ("Din uge.", "Brændstof.") | 34 / 1,0 / −0,03em | 500 |
| Sektionstitel | 22 / 1,1 / −0,02em | 500 |
| Korttitel / øvelsesnavn | 17 / 1,25 / −0,01em | 500 |
| Brødtekst | 15 / 1,5 / 0 | 400 |
| Metadata, kicker | 13 / 1,35 / 0 | 500 (kicker i mos eller domænefarve), 400 (meta i `--fg-dim`) |
| Mikrotekst (tabelhoveder, tidsstempler) | 12 / 1,3 / 0 | 400 |

Titler slutter med punktum, som i shoppen ("Din uge." "Kalk sælger altid.").

## 5. Layout og komponenter
- **Grid:** 390 px bred skærm, 20 px sidemargin, 16 px mellem kort, 32 px mellem sektioner, 12 px mellem tekstblokke. Alt er venstrestillet.
- **Radius 0** overalt. **1 px linjer** i `--line` i stedet for skygger. Ingen gradienter, ingen korn, ingen glow.
- **Topbjælke:** logo "MakeIt // HQ" (ordmærke i `--fg`, 15 px 500) til venstre; beskeder og profil som 24 px linjeikoner til højre; 1 px linje under. På demo-skærme en 12 px linje under bjælken: "Demo · eksempeldata".
- **Tab-bar (bund):** hvid, 1 px linje over, 5 punkter: I dag · Træn · Mad · Crew · Mere (Mere åbner HRV, Mind, Reps, Forskning, Mig). Ikoner 24 px, 1,5 px streg, monokrome; label 11 px 500. Aktiv: `--fg` + 2 px mos-streg øverst i tabben; domæne-tabs viser en 6 px domæne-dot ved nummeret.
- **Kort:** `--bg-2` flade eller hvid med 1 px linje, 20 px indvendig margin. Kicker øverst (13 px 500), titel, indhold, evt. link nederst i mos ("Til Mind →").
- **Knapper:** primær = `--fg`-fyldt rektangel, hvid tekst, 48 px høj, 15 px 500, sentence case ("Start pas", "Log sæt"). Sekundær = 1 px `--fg` outline. Tertiær = mos tekstlink. Destruktiv = outline med fare-tekst. Ingen mos-fyldte knapper.
- **Chips/tags:** 1 px linje, 12 px tekst, 6 × 10 px padding ("Live", "HQ · 05:30", "Eksempeldata"). Valgt chip: `--fg` fyld, hvid tekst.
- **Skydere:** 4 px spor i `--bg-3`, fyld i mos, 20 px cirkulær knop i `--fg` med hvid kant. Bruges til RPE, mind-check (1–5) og vægt.
- **Grafer:** akser og grid i `--line`, kun data i domænefarve. HRV: 14 punkter + medlemmets eget bånd som lys domæne-tint bag punkterne. Ingen 0–100-scores nogen steder – vis ms, kg, minutter, dage.
- **Talfelter:** hero-tal + enhed i 22 px 400 `--fg-dim` ("43 ms", "1.420 Reps"), etiket under i 13 px.
- **Strimlen "HQ's begrundelse":** 1 px linje øverst, kicker "HQ · 05:30" i domænefarve, 2–3 linjer 15 px, to knapper: "Se hvorfor" (mos link) og "Behold original" (sekundær).
- **Fortællebånd (fra Mørke):** blæk-blok `#111111`, hvid titel 22 px, hvid brød 15 px `#E6E6E2`, evt. foto i 3:2 med let affarvning (grayscale 0,3). Bruges til "Sådan læste HQ natten", "Et menneske skriver under", kit i Reps-shoppen.
- **Foto:** dagslys, rigtige mennesker i samme alvor uanset køn (casting 2 kvinder / 2 mænd, 22–45 år), produkt på hvid eller `#F2F2F0`. Ingen kropsidealer, ingen "before/after".
- **Ikoner:** linjeikoner, 1,5 px streg, kvadratiske ender, monokrome. Ikke emoji.
- **Bevægelse:** nøgtern. 200 ms ease-out på tilstandsskift; tal tæller op på 600 ms; ingen konfetti.

## 6. Skærme, der skal mockes (med indhold – eksempeldata)
Alle lyse i Nord lys, medmindre andet står. Skriv "Demo · eksempeldata" i den tynde linje under topbjælken.

1. **01 I dag** – Kicker "Træn · coach Mikael Munk · HQ adaptive engine" (domænefarve krop). Titel "Din uge." Undertitel: "HQ planlægger vægtene. Munk skriver under, når det kræver et menneske." Uge-strip: Man 21 Squat · Tir 22 Push · Ons 23 Pull · Tor 24 Deadlift (i dag markeret med mos-streg). Kort "I dag · STR-12 · uge 4": "Dag A · Squat" · "Squat · topsæt @ RPE 8, 3×3 backoff" · HQ-strimmel: "Adaptive Engine tilpasser ugen. Munk er din coach." · tal: Øvelser 4 · Sæt 16 · Est. tid 65 min · primærknap "Start pas →" · sekundær "Behold original". Morgensignal-række: HRV 43 ms · Lav (hjerte) · Mind-check 3/5 (sind) · Kcal 0 af 2.740 (mad). Stribe 12 dage. Nøgletal: Volumen 4 uger 18.420 kg · PR'er 3 · Reps 1.240. Fortællebånd nederst: "Mikael Munk har besvaret 1 form-check" med link "Se svaret →".
2. **02 Session (Nord nat)** – Topbjælke: "STR-12 · uge 4 · Dag A · 0/16 sæt". Titel "Back squat" med "1/4" øvelse. Video-loop af øvelsen som mørkt felt 16:9 med cues: "Bryst op og spænd, mave fat", "Knæ sporer tæerne", "Sid lavt, hofte under knæ". Sæt-liste: Sæt 1 · 135 × 3 · RPE 8 (logget), Sæt 2 · 135 × 3, Sæt 3 aktiv med felter Vægt 135 kg · Reps 3 · RPE-skyder. Hviletimer "2:30". Knap "Log sæt →" (hvid fyld, sort tekst på mørk). Kort "Optag sæt 3 · sendes til coach Munk" med kamera-ikon. Note-felt "Sæt 2 føltes tungt i bunden." Strimmel: "HQ lettede topsættet fra 150 til 135 kg i nat: HRV under dit bånd." + "Behold original".
3. **05 HRV** – Kicker "Hjerte" (rød). Titel "HRV." Tekst: "Din hjerterytmevariabilitet: et dagligt mål for, hvor klar din krop er til at træne." Faner: I dag · Forløb · Indsigt · Lær. Hero: "43 ms · Lav" med "Dit normalområde 54–68 ms" og 14-nætters graf med bånd. Kilde-chip "Oura · synket 05:14". Kort "Seneste morgener": Søndag 66 · Mandag 58 · Tirsdag 52 · I dag 43. Kort "HQ's note" (fortællebånd): "Tredje dag i træk under båndet. Topsættet er lettet i dag. Pause og deload beslutter Munk – ikke HQ." Kort "Ugeindsigt · søndag": "Søvn under 7 t tre nætter i træk hang sammen med de laveste målinger." Toggle "Del med coach" (til/fra).
4. **03 Mad** – Kicker "Mad" (grøn). Titel "Brændstof." Undertitel "Spiste noget andet" som mos-link og "Indkøbsliste" som chip. Tekst: "HQ lægger ugens måltider inden for brand-rammen. Olivenolie og smør, ikke rapsolie. Skyr og hytteost, ikke proteinbarer." Dagens plan: Træningsdag · 2.740 kcal · 182 g protein. Måltider: Morgen "Skyr, havre, blåbær" 42 g · Frokost "Rugbrød, æg, avocado" 38 g · Aften "Laks, kartofler, bønner" 52 g · Mellem "Hytteost, rugknækbrød" 30 g. Vand 1,8 af 3 l (mos progress). Knap "+ Spiste noget andet" (sekundær). Indkøb: "14 varer · 4 i kurven".
5. **06 Mind** – Kicker "Mind · søjle 5" (blå). Titel "Mental sundhed. Vores 5. søjle." Mind-check-kort: tre skydere Energi · Stress · Fokus (1–5), knap "Tjek ind". Journal-felt med eksempel "Sov kort, men hovedet er klart. Glæder mig til squat." Kort "Forslag: Åndedræt · 3 min · før du sover. Sænker pulsen." Stribe "9 dage med mind-check". Sikkerhedslinje nederst i `--fg-dim`: "Appen er ikke behandling. Livslinien 70 201 201 · akut 112."
6. **04 Crew** – Kicker "Crew". Titel "Crew-feed." Knap "+ Del" (sekundær, lille). Buddy-række: avatarer med initialer (MU, NI, KA, MA, FR, SI, OL). Opslag: "Sara K. · Ny PR: dødløft 140 kg · 2 t · 14 heppere" · "Jonas L. · Form-check besvaret af Munk · 4 t" · "Mette R. · 12 pas i træk · 6 t". Kort "Ugens reps": Sara K. 310 · Dig 265 · Jonas L. 240. Kort "Maj challenge · 11 dage tilbage · 128 deltagere": "100K volumen-club" med progress 68,4 af 100K og belønning "Limited sølv-cuff + 1.000 Reps". Knap "Hep" på opslag.
7. **07 Reps** – Kicker "Reps-program". Titel "Du arbejder. Du får." Hero "1.420 · Niveau: Athlete · 3.580 til Beast" med progress i mos. Fire niveauer som vandret skala: Lifter 0–999 · Athlete 1.000–4.999 · Beast 5.000–14.999 · Legend 15.000+ ("Coach School åbner ved Beast"). Shop-kort med produktfoto på `#F2F2F0`: "Limited Cuff · Olive · 1.200 Reps · 80 stk" · "1:1 form-check med Mikael · 2.000" · "Broderet StrapIt · 3.500" · "Open House VIP · 8.000". Fortællebånd: "Sådan optjenes reps: pas · form-checks · PR'er · hjælp til andre."
8. **Coach-indbakke (Nord nat, desktop 1440 × 900)** – Venstre rail med 12 numre: 01 Overview · 02 Members · 03 Programmer · 04 Øvelser · 05 Form-check kø · 06 Reps-indløsninger · 07 Analytics · 08 Co-coaches · 09 Cirkler · 10 Safety · 11 Mønstre · 12 System. Titel "Indbakke." Undertitel: "Én kø: hvem der har brug for et menneske nu. AI har allerede gjort det generiske." Liste: @nina_dl · HRV · 25. sep. 08:00 · @tobias · HRV · 04:38 · @kasper_s · HQ · 08:58 · @kasper_s · Back squat · 03:38 · @maria.lift · Paused bench · 07:38 · @anders · 22 dage stille · 3. sep. Højre panel: form-check med AI-udkast ("Der ses let valgus i knæleddet under den excentriske fase.") og coachens redigerede svar ("Knæene falder ind i bunden. Tænk: skub gulvet fra hinanden.") med knap "Send som Munk".
9. **Svensk variant af 01 I dag** – samme skærm på svensk: "Din vecka." · "Dag A · Knäböj" · "Starta pass →" · "Behåll original" · "HRV 43 ms · Låg" · "Streak 12 dagar". Viser, at systemet bærer to sprog uden at ændre layout.
10. **Designsystem-ark (1920 × 1080)** – paletter (lys/nat/domæner), typografiskala, knapper, chips, kort, tab-bar, skyder, graf-eksempel, fortællebånd, foto-retning, do/don't.

## 7. Regler (må ikke brydes)
1. **Sentence case** overalt. Ingen uppercase-kickers, ingen kondenseret display-skrift. Det er den største forskel fra appens nuværende design.
2. **Radius 0, 1 px linjer, ingen skygger, ingen gradienter, intet korn.**
3. **Mos er accent, ikke fyld.** Aldrig mos-fyldte knapper, aldrig mos-baggrunde. Primærknap er blæk.
4. **Domænefarver kun som data-blæk og kicker.** Knapper, tekst og flader er monokrome.
5. **Ingen 0–100-scores.** HRV i ms, vægt i kg, tid i minutter, streak i dage.
6. **Ingen opfundne tal.** Brug eksempeldataene i afsnit 6 og mærk skærmene "Eksempeldata".
7. **Unisex:** ingen kønnede farver, ingen "kvinde-version". Fotos i samme alvor for alle.
8. **Et menneske skriver under:** hvor AI har lavet noget, står det ("AI-udkast" · "Munk retter og sender"), og medlemmet kan altid vælge "Behold original".
9. **Mørkt kun to steder:** live-sessionen og coach-konsollen. Alt andet er hvidt.
10. **Webshoppen sætter tonen.** Appen genbruger shoppens tokens under de samme navne (`--bg`, `--bg-2`, `--fg`, `--fg-dim`, `--line`, `--signal`) og samme skrift. Ingen særlige app-farver ud over domænefarverne.

## 8. Det, der er anderledes end appen i dag (til den, der kender den)
Appen kører i dag et lyst "Kalk"-tema (`#E7E9EB`, orange signal `#E4570F`, display-skriften Big Shoulders i uppercase) og et mørkt "Nat"-tema (`#0A0A0B`, `#F5F2EC`). I Nord skiftes: baggrund til hvid/`#F2F2F0`, signal til mos `#2E4A3B`, display til Schibsted Grotesk 500 i sentence case, kickers fra 11 px mono uppercase til 13 px sentence case, korn og glow slås fra, mørkt tema til `#111111`/hvid. Token-navnene og komponentstrukturen (AppShell, tab-bar med numre, AdaptationCard med "Behold original", MorningSignal, kort med kicker) er de samme. Domænefarvernes lyse værdier er de samme som i Kalk (de er allerede AA på lys flade).

## 9. Kilder (kun til den, der vil dybere)
- Retningens tokens og idé: research/06-brandretninger.md (retning 05) · revisionen: research/09-beslutningsgrundlag-finale.md ("05 Nord · revideret") · mockups af webshoppen: canvas https://claude.ai/artifact/XAc3TQ6BFXByoeXw8FNgES (siden "05 Nord · revideret") og research/mockups/N2-*.dc.html.
- Appens nuværende tokens og regler: /Users/tomhedegaard/MakeIt/src/app/globals.css, docs/DOMAIN_COLOR_SYSTEM.md, docs/superpowers/specs/2026-09-17-kalk-redesign-design.md. Rigtige skærmbilleder af appen i dag: research/pitch/renders/app/.
- Appens indhold og flows: research/11-app-pitch.md.

---

## 10. Afvigelser fra briefen (implementering)

Briefen er kilden. Her står de steder, hvor koden bevidst afviger, og hvorfor.

### 10.1 To grå der holder AA

Briefens `--fg-dim: #6B6B66` rammer 4,40:1 på `--bg-3` (`#E9E9E6`) og `--fg-faint: #B9B9B4`
rammer 1,62:1. Begge falder igennem AA-gaten i `src/lib/design/nord-theme.test.ts`, som
kræver 4,5:1 for al neutral tekst på alle tre flader. Gaten er ikke til forhandling
(a11y-review 2026-09-19), så de to grå er skubbet ned:

| Token | Brief | Kode | Hvid / `--bg-2` / `--bg-3` |
|---|---|---|---|
| `--fg-dim` | `#6B6B66` | `#5E5E59` | 6,52 · 5,82 · 5,36 |
| `--fg-faint` | `#B9B9B4` | `#696964` | 5,52 · 4,92 · 4,54 |

`#B9B9B4` lever videre som `--line-bright`, hvor den kun er dekorativ streg.

### 10.2 Radius 0 uden at røre 379 klasser

Radius 0 er sat som Tailwind-tema (`--radius-xs … --radius-4xl: 0`), så hver eksisterende
`rounded-sm/md/lg/xl/2xl` bliver 0 uden en eneste filændring. `rounded-full` er en egen
værdi og rammes ikke: cirkler (avatarer, dots, skyder-knop) bliver cirkler, som briefen
selv beskriver. Pillepiller og `rounded-[14px]` ryddes i sweep-fasen.

### 10.3 Én skrift, tre stakke

Briefen kræver én skrift. I stedet for at rette 119 filer, der bruger `font-display`, og
167 der bruger `font-mono`/`.numeric`, peger alle tre token-stakke (`--font-sans-stack`,
`--font-display-stack`, `--font-mono-stack`) på Schibsted Grotesk. `.numeric` beholder
`tabular-nums`, `.font-display` mister `text-transform: uppercase`, `.eyebrow` bliver
13 px sentence case i mos. De 302 eksplicitte `uppercase`-klasser ryddes i sweep-fasen.

### 10.4 Faser

1. **Fundament** (denne): skrift, tokens, radius, type-klasser, knapper, felter, korn og
   glow slukket, tema omdøbt kalk → nord, gates opdateret.
2. **Sweep**: `uppercase`, spærret tracking, `rounded-full`-piller, `rounded-[14px]`.
3. **Skærme**: de ti skærme i afsnit 6 mod grid, topbjælke, tab-bar, kort, skydere, grafer.
4. **Landing og native**: landingssiden, app-ikon og splash i Nord.

### 10.5 Type-skalaen i koden

Skalaen fra §4 er Tailwind-størrelser, der hver bærer linjehøjde, spærring og vægt:
`text-hero` (64), `text-hero-lg` (88), `text-title` (34), `text-section` (22),
`text-card` (17), `text-copy` (15), `text-meta` (13), `text-micro` (12). Brød hedder
`text-copy`, fordi `text-body` allerede er domænefarven Krop.

Briefen giver kun sidetitlen én størrelse (34). På telefon holder koden sig til det.
Fra `md` vokser en fane-titel (`PageTitle size="page"`) til 44 px, mens en underside
(`size="compact"`) bliver på 34, så hierarkiet mellem fane og underside holder på
desktop uden at opfinde en ny størrelse på telefonen.

Sidetitler slutter med punktum i begge sprog (34 strenge rettet).
