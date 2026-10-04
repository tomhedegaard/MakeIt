# Taste-audit (design-taste-frontend) · Nord-nøgleskærme · 2026-10-04

Kun skillens regler om AI-tells, konsistens og copy er brugt. Nord-briefen vinder ved konflikt.
Skærmbillederne i `after/` er taget før 6ecb0d1, så tusindtallene i Reps- og Crew-listerne er siden rettet.

## A · Klare fejl
1. **Niveauet modsiger sig selv.** Sidebaren og I dag siger "Legend", Reps siger "Athlete". Årsagen er, at `src/lib/auth.ts:40` hardcoder `tier: "Legend"`.
2. **"84 / 100"-score i coach-panelet** (`CoachReview.tsx:109`). Det bryder briefens regel om ingen 0–100-scores.
3. **Tankestreger.**
   - Coach.json har 17 em-dashes. Den synlige er `:227` "Munks udkast — rediger inline".
   - `MindDisclaimer.tsx:71/75/79`.
   - "—" bruges som tom værdi i `HrvBandHero.tsx:82`, `WeeklyInsightsView.tsx:104` og `PriorityInboxList.tsx:40`.
4. **Dobbelt CTA på I dag.** "Start pas →" og "Åbn dagens pas" (`Adaptive.json:43,47`).
5. **Indbakken.**
   - Rækken har "→", og panelet har "Åbn hele sagen →".
   - HRV- og HQ-sager giver et tomt panel.
   - "← Overview" dublerer punkt 01 i sidebaren.
6. **Crew: samme ord, to formål.** "+ Del" opretter et opslag, mens "Del" pr. opslag deler det.
7. **Grammatik og copy.**
   - "Sæt i dette øvelse" (`Session.json:21`).
   - Demo-banneret siger "crew" på HRV, Mad og Mind (`Nav.json:19`).
   - Mind siger "+100 Reps", men chippen siger "+150" (`Mind.json:333`), og "tikkede ind" er en anglicisme.
   - "restitutions-signal" (`Hrv.json:28`).
   - "Lørdag-aften niveau" (`mock-plan.ts:446`).
8. **Engelske rester.**
   - "Top set … backoff" (`Dashboard.json:28`).
   - "Coach console", "Overview", "Members" og "AI-tip" (Coach.json).
   - "Sessions" (`Mind.json:7`).
   - "Supplerings-nudge", "macros" og "adherence-stats" (Nutrition.json).
   - "cues mere" (`Session.json:57`).
   - "Maj challenge" og "100K Volumen Club" (Community.json).
   - "65m" som forkortelse for minutter.
9. **Tal.**
   - RPE "6 . 5" (`.pill` har tabular-nums, `globals.css:634`).
   - "137.5kg" i sessionen.
   - "2400", "1103" og "2399" i Mad og "0/2400" på I dag står uden tusindtalsskilletegn.
10. **Forældede demo-datoer.** "Maj challenge · 11 dage tilbage", "Maj 2026" og "Lørdag 24/05".
11. **Mobil.**
    - Reps "Seneste Reps" har 4 kolonner ved 375 px.
    - Mad-ugestrippen skærer "Fre" over.
    - "122 heppere" brydes over to linjer.
12. **Ser ud som knapper uden at være det.**
    - "Mangler 580 Reps" ser ud som en knap.
    - Stjerne-chippen i Top 3 ligner en knap.
    - PR'er vises som "03".
13. **Mind-grafen.** Udglattede kurver skyder over 5 og under 1, og der er arealfyld under alle tre serier.
14. **Dubleret tekst.**
    - "Adaptive Engine tilpasser ugen…" står 2 gange på I dag.
    - "HQ · Adaptive Engine" står 4 gange.
    - Mind siger "tjekket ind" to gange.
15. **Kort, hvor linjer var nok.** "Resten af ugen" i Mad, og opslagene i Crew-feedet.

## B · Briefen vs. taste (Tom afgør)
- **Nummereret navigation** (01–10, og coach 01–12) er foreskrevet i briefen, men skillen forbyder sektionsnumre.
- **Midterpunkter "·".** Briefen bruger dem overalt. Kun 15 strenge har mere end ét, og de værste er i Coach analytics, MealCard og Nutrition planOverlay.
- **Eyebrow/kicker på hvert kort.** Briefen kræver det, og det giver 7 på Reps. Skillens loft er 2. Den dobbelte "Hjerte" på HRV kan fjernes uden at bryde briefen.
- **Domæneprikker foran labels**, fx Reps-kategorier og "I dag"-prosa. Briefen tillader "små dots".
- **En-dash i intervaller** ("51–57 ms") er korrekt dansk og står i briefen.
- **Kort, punchy copy.** "Du arbejder. Du får." står i briefen. "De er dine. Punktum." og "30 dage. Solidt." gør ikke.

## C · Holder
- **Former:** Radius 0 holder visuelt, og `rounded-full` bruges kun på cirkler. Der er 10 overflødige `rounded-xl` tilbage i koden.
- **Knapper:** Kontrasten er god, og ingen CTA brydes over flere linjer.
- **Flader:** Ingen glød, gradient eller skygge, og mos bruges kun som accent.
- **Indhold og sikkerhed:** Demo er mærket, og sikkerhedslinjen i Mind er på plads.
