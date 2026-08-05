# Penge — privatøkonomi-dashboard

Selvstændigt projekt, genoptaget fra
[tomhedegaard/Penge](https://github.com/tomhedegaard/Penge). Det er med
vilje **helt adskilt fra MakeIt-appen** — ingen kode i `src/` afhænger af
denne mappe, og mappen afhænger ikke af appen.

## Brug

Åbn `dashboard.html` direkte i en browser — ingen build, ingen server.

Dashboardet viser samlet privat- og virksomhedsøkonomi (Spar Nord ·
AL Bank) med tre faner (Privat / Virksomhed / Tværsnit), periodefilter
(1/3/6 mdr., 2024/2025/2026, hele perioden), KPI-kort pr. konto,
månedlige cashflow-søjler, netto-sparklines og tværsnitskort for løn og
omsætning vs. privat forbrug. Rapport genereret 4. marts 2026; data
aug 2024 – mar 2026.

## Dataopdatering

Alle tal er hardcodet i `<script>`-blokken nederst i `dashboard.html`
(konstanterne `PRIVAT`, `VIRK`, `LOEN`, `SALDO_PRIVAT`, `SALDO_VIRK`).
Nye måneder tilføjes dér. Bemærk at periodedefinitionerne i
`getPeriod()` (fx "3 mdr.") er forankret til rapportdatoen 4. marts
2026 og bør flyttes med, når der kommer nye tal.

## Noter

- **Synlighed:** Tallene stammer fra det offentlige Penge-repo (footeren
  siger "Anonymiseret"). Dette repo er også offentligt — gør repoet
  privat eller anonymisér tallene, hvis det ikke er ønsket.
- Oplagte næste skridt: CSV-import fra bank, dynamiske perioder
  relative til nyeste datamåned, evt. flytning til eget privat repo.
