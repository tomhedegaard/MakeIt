# Mærket: HQ by MAKEIT

HQ er produktet. MakeIt er afsenderen. Som når et lille mærke laver en
collab med et stort: produktets navn står først, og det store mærke
signerer med sit eget logo. Beslutning 2026-11-05 efter tre runder
(A: logo som skilt, forkastet. B: A'et som signatur foran
"MakeIt // HQ", bygget og afløst. C: "HQ by MAKEIT" overalt, valgt).

## Mærket

`HQ` i husets skrift, `by` i dim, og ordmærket MAKEIT bagefter.
`components/Logo.tsx` har det i to stillinger:

| Stilling | Hvor | Hvordan |
|---|---|---|
| **Én linje** (`full`) | App-sidebar og topbar, coach-konsol, onboarding, vilkår, privatliv, ung-invitation, landing-nav, mail-header | "HQ" i `text-section`, by-linjen på samme grundlinje i `text-micro` |
| **Stablet** (`sender`) | Login, ny adgangskode, landingens footer | "HQ" stort, by-linjen under |
| **Ikon** | App-ikon, favicon, splash | A'et alene i fuld størrelse på blæk |

Ordmærket er tegnet fra `Logos/MAKEIT (only).ai` som `MakeItWordmark`
i `components/brand/MakeItMark.tsx`. Altid `currentColor`: MAKE i fuld
styrke og IT i 60 %, som i filen. Ingen mos i mærket.

## Regler

- Ordmærket står kun i by-linjen. Aldrig alene, aldrig større end "HQ".
- By-linjen er aldrig højere end versalhøjden i den tekst, den står i
  (`h-[0.8em]`). I footeren følger den sidens bredde, men "HQ" er altid
  mindst fem gange så højt.
- A'et står ikke længere foran navnet. Det står alene i ikonet og som
  data (nedenfor).
- De to skråstreger er HQ's stemmemærke inde i appen ("// HQ" foran det,
  HQ siger). De er ikke en del af navnet.
- Hvor det ikke står: hero, overskrifter, knapper, kort, kapitler, tomme
  tilstande, som punkttegn eller mønster.
- Ung-mails signerer "Ung by MAKEIT" efter samme mønster.

Navnet i løbende tekst, fanetitel, vilkår og App Store er stadig
"MakeIt // HQ" (`COMPANY.product`). Om det skal følge mærket er en
navnebeslutning, der ikke er taget.

## Tegnet som data

To læsninger af A'et, så brandet går igennem tallene uden et andet
ikonsprog:

- **Klar-måleren** (`ReadyMark`): A'et som tre trin af klar. Inderste
  chevron altid tændt; den yderste er omrids ved Midt og fyldt ved Ro,
  svag ved Lav. Står ved HRV-tallet på /hrv og /hrv/trends, i
  domænefarven, altid med ordet ved siden af.
- **Op-tegnet** (`UpMark`): den yderste chevron alene, hvor noget gik op
  (hep på landingen). Ned er en streg, aldrig en vendt chevron.

## Filer

- `components/brand/MakeItMark.tsx`: A'et, `MakeItWordmark`, `ReadyMark`, `UpMark`.
- `components/Logo.tsx`: full, sender, mark.
- `lib/email/footer.ts`: `emailBrandHtml()` til mail-headers.
- `scripts/generate-app-icons.mjs`: ikoner, splash og
  `public/brand/makeit-wordmark.png` (2× PNG til mails, der ikke viser SVG).
- Gate: `nord-graphics-gate.test.ts` tillader SVG i `MakeItMark.tsx`
  som brandmærke.
