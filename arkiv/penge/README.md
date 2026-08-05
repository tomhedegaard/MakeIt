# Penge — privatøkonomi-dashboard

Genoptaget fra [tomhedegaard/Penge](https://github.com/tomhedegaard/Penge),
som bestod af én statisk fil (`dashboard.html`, rapport genereret 4. marts
2026). Originalen er bevaret urørt her som `dashboard-original.html`.

## Hvor bor det nu?

Dashboardet er porteret til en rigtig side i denne app:

- **Rute:** `/penge` (ikke bag login — se note nedenfor)
- **Side/UI:** `src/app/penge/` — `page.tsx`, `PengeDashboard.tsx`,
  `charts.tsx`, `penge.module.css`
- **Data:** `src/lib/penge/data.ts` — alle konti, måneds-cashflow, løn og
  saldi som typede konstanter, udtrukket 1:1 fra originalen

Funktionaliteten svarer til originalen: tre faner (Privat / Virksomhed /
Tværsnit), periodefilter (1/3/6 mdr., 2024/2025/2026, hele perioden),
KPI-kort pr. konto, månedlige cashflow-søjler, netto-sparklines, samlet
cashflow-graf med nettolinje samt tværsnitskortene for løn og
omsætning vs. privat forbrug. Designet (papir/guld, DM Serif Display +
DM Mono) er bevaret, og porten har fået et simpelt responsivt lag oveni.

## Noter

- **Synlighed:** Tallene stammer fra det offentlige Penge-repo (markeret
  "Anonymiseret" i originalens footer). Dette repo er også offentligt, og
  `/penge` er ikke på middlewarens PROTECTED-liste. Skal siden bag login,
  tilføjes `"/penge"` i `PROTECTED` i `src/middleware.ts`.
- **Dataopdatering:** Nye måneder tilføjes i `src/lib/penge/data.ts`.
  Periodedefinitionerne i `getPeriod()` (fx "3 mdr.") er stadig forankret
  til rapportdatoen 4. marts 2026, som i originalen — de bør gøres
  dynamiske, når der kommer løbende data.

## Oplagte næste skridt

- CSV-import fra bank (Spar Nord/AL Bank-eksport → månedsaggregater)
- Dynamiske perioder relative til nyeste datamåned
- Persistens i Supabase i stedet for hardcodede konstanter
- Login-beskyttelse af ruten
