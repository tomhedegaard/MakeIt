# Evaluering af HQ-estimatet (før lancering)

Spec: `docs/superpowers/specs/2026-09-27-food-estimate-and-today-cards.md`, afsnit A.2.

HQ-estimatet er slået til for coaches. Det åbnes for alle medlemmer (`NUTRITION_ESTIMATE_ENABLED=1`
i Vercel) først, når det har bestået denne evaluering.

## Sådan laves sættet

1. Vælg 30 måltider: danske hverdagsretter, brand-rammens måltider (skyr, rugbrød, laks,
   kartofler), kantine- og restaurantmad, et par drikke og snacks.
2. Vej hver ingrediens, før den spises, og regn kcal ud fra varedeklaration eller
   Frida (fødevaredatabanken). Skriv totalen ned.
3. Tag ét foto oppefra og lidt fra siden, som et medlem ville gøre, i almindeligt lys.
4. Læg fotos i en mappe uden for repoet (fx `~/meal-eval/`) sammen med `manifest.json`:

```json
[
  { "file": "01.jpg", "kcal": 640, "dish": "Cobb salad" },
  { "file": "02.jpg", "kcal": 410, "dish": "Rugbrød med æg og avocado", "text": "2 skiver" }
]
```

`text` er valgfri (det medlemmet ville skrive). `answers` kan svare på HQ's spørgsmål
(`{ "1": "Soyasauce" }`); ellers bruges HQ's første bud.

Fotos er private og må ikke committes.

## Kør

```bash
MEAL_EVAL_DIR=~/meal-eval npx vitest run src/lib/data/nutrition-estimate.eval.test.ts
```

Testen skriver en tabel med vejet kcal, HQ's tal, intervallet, sikkerhed og HQ's antagelse.

## Krav

- Det vejede tal ligger inden for HQ's interval i mindst 80 % af måltiderne.
- Gennemlæs antagelserne: en ret, der er genkendt forkert uden at HQ spurgte, er en fejl,
  også hvis tallet tilfældigvis ramte.

Falder den igennem, justeres prompt og interval i `src/lib/data/nutrition-estimate-claude.ts`,
og evalueringen køres igen.
