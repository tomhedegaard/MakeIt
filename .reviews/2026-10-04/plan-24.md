# Plan: Nord-nøgleskærme fra 16/24 mod 24/24

Godkendt af Tom 2026-10-04. Udgangspunkt: `UI-REVIEW-2.md` (16/24). `cn()`, @Munk-niveau og Mind-copy er rettet efter målingen.

**Faste stop:** før `supabase db push` og før merge. En PR pr. bølge, mod `main`.
**Måling efter hver bølge:** gsd-ui-auditor med samme kontrakt, samme skærme og samme demodata (`capture.js`). Taste-audit til sidst.

## Bølge 0: Tom merger #135

## Bølge 1: Typografi 2 → 4 (hele medlemsapp + coach; landing/marketing undtaget)
- Skriv `DESIGN.md` (impeccable `document`) ud fra Nord-spec'en og den shippede kode, og læg skalaen fast.
- Lav en mapping fra rå størrelser til Nord-tokens (`text-xs/sm/base/lg/xl/2xl/3xl` → `micro/meta/copy/card/section/title/hero`). Gennemgå den pr. område: medlemsapp, coach, `ui/`.
- Flyt `.btn`, `.surface`, `.hairline` m.fl. ind i `@layer components`. Fjern derefter lokale workarounds, fx OffPlanLogButton.
- Fjern `tabular-nums` fra `.stepper-num`.
- Tilføj en gate, der forbyder rå `text-(xs|sm|base|lg|xl|2xl|3xl…)` og `text-[…]` på medlems- og coach-flader.
- Verificér med før/efter-billeder af alle skærme.

## Bølge 2: Briefens manglende dele, Visuals 2 → 4
- Byg en `NarrativeBand`-komponent (blæk `#111111`, spec §5) og brug den på:
  - I dag: form-check-svaret
  - HRV: HQ's note
  - Reps: "Sådan optjenes reps"
- HRV I dag-fanen skal have 14-nætters graf med bånd, kildechip og "Seneste morgener".
- Reps-hero på desktop: tallet skal stå sammen med titlen.
- I dag-pas-kortet: fjern "HQ · Adaptive Engine" og glossen.
- Vis varianter af bånd og HRV til Tom, før de bygges.

## Bølge 3: Copy, Color, Spacing og Experience → 4
- **Copy:**
  - Erstat de engelske rester ("Skip-dage", "volumen-club").
  - Omskriv øvelses-cuen "drukner under baren".
  - Brug forskellige labels til "+ Del" (opret) og "Del" (videresend).
  - Ret "0 / 16 sæt" så det passer med de filmede sæt.
  - Ret "0-999" til "0–999" i Reps.
  - Tilføj en sproggate.
- **Color:** Gør session-cue-stregen monokrom, og tilføj en gate mod domænefarve i nat.
- **Spacing:**
  - Venstrestil Mind på desktop.
  - Giv Minds undernavigation en fade.
  - Ret Reps "Limited C…".
  - Ryd stakken af kort øverst i Mad.
- **Experience:**
  - Tilføj `src/app/coach/inbox/loading.tsx`.
  - Erstat `confirm()` med `ConfirmSheet` på de fire coach-flader.
  - Fjern den dublerede identitet i coach-panelet.
  - Gør "Aktiv"-chippen tydelig.

## Bølge 4: "Del med coach" (HRV)
- Skriv spec for samtykkemodellen og lav migration med RLS.
- Tom godkender samtykketeksten.
- Byg toggle på HRV og læseadgang for coach.
- Stop før `db push`.
