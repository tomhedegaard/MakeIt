# Mærket: MakeIt i HQ

HQ er produktet. MakeIt er afsenderen. Som når et lille mærke laver en
collab med et stort: det lille navn står under det store, og det store
mærkes tegn går igen uden at råbe. Beslutning 2026-11-04 efter to
canvas-runder (A: logo som skilt, forkastet; B: signatur, valgt).

## Tegnet

A'et fra MAKEIT-ordmærket: to stablede chevroner, tegnet som
`components/brand/MakeItMark.tsx` fra `Logos/A only.ai`. Altid
`currentColor`, så det følger blæk og nat uden egen variant. Ingen mos i
mærket. Ordmærket MAKEIT bruges ikke i HQ; det tilhører moderbrandet.

## Tre doser

| Dosis | Hvor | Hvordan |
|---|---|---|
| **Signatur** | App-topbar, coach-konsol, onboarding, vilkår, landing-nav, mail-header | `Logo` (full): A'et i x-højde foran "MakeIt // HQ". Aldrig større end navnet |
| **Afsender** | Login, ny adgangskode, landingens sidste linje | `Logo variant="sender"`: "HQ" stort, "by ▲ MakeIt" under. Footeren: "Et produkt fra MakeIt · København" |
| **Ikon** | App-ikon, favicon, splash | A'et i fuld størrelse på blæk. Det ene sted, afsenderen fylder |

Hvor det ikke står: hero, overskrifter, knapper, kort, kapitler, tomme
tilstande, som punkttegn eller mønster. Samme regel som mos: aldrig
maling, altid signal.

## Tegnet som data

To læsninger af samme form, så brandet går igennem tallene uden et andet
ikonsprog:

- **Klar-måleren** (`ReadyMark`): A'et som tre trin af klar. Inderste
  chevron altid tændt; den yderste er omrids ved Midt og fyldt ved Ro,
  svag ved Lav. Står ved HRV-tallet på /hrv og /hrv/trends, i
  domænefarven, altid med ordet ved siden af.
- **Op-tegnet** (`UpMark`): den yderste chevron alene, hvor noget gik op
  (hep på landingen). Ned er en streg, aldrig en vendt chevron.

## Filer

- `components/brand/MakeItMark.tsx`: mærket, `ReadyMark`, `UpMark`.
- `components/Logo.tsx`: full, mark, sender.
- `scripts/generate-app-icons.mjs`: ikoner og splash fra samme stier.
- `public/brand/a-mark.png`: 2× PNG til mails, der ikke viser SVG.
- Gate: `nord-graphics-gate.test.ts` tillader SVG i `MakeItMark.tsx`
  som brandmærke.
